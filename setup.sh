#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_MISSING=true
DEVOS_HOME="${DEVOS_HOME:-$HOME/devos}"
DEVOS_SOURCE="${DEVOS_SOURCE:-}"
NODE_MAJOR_REQUIRED=22
NODE_LTS_MAJOR="${NODE_LTS_MAJOR:-24}"
NVM_VERSION="${NVM_VERSION:-v0.40.7}"

SCRIPT_PATH="${BASH_SOURCE[0]:-}"
if [[ -n "$SCRIPT_PATH" && -f "$SCRIPT_PATH" ]]; then
  ROOT="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
else
  ROOT="$(pwd)"
fi

OS="$(uname -s)"
TEMP_DIR=""

cleanup() {
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT

ok()   { printf "\033[32m[OK]\033[0m %s\n" "$*"; }
info() { printf "\033[36m[INFO]\033[0m %s\n" "$*"; }
warn() { printf "\033[33m[WARN]\033[0m %s\n" "$*"; }
fail() { printf "\033[31m[ERROR]\033[0m %s\n" "$*" >&2; exit 1; }
has()  { command -v "$1" >/dev/null 2>&1; }

for arg in "$@"; do
  case "$arg" in
    --check-only) INSTALL_MISSING=false ;;
    --help|-h)
      cat <<'EOF'
DEVOS Setup

Usage:
  ./setup.sh
  ./setup.sh --check-only

OS detection:
  macOS -> Homebrew
  Linux -> apt/dnf/yum/pacman/zypper + nvm

When DEVOS_SOURCE points to devos-starter.zip, the DEVOS CLI package is
downloaded and linked automatically.
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

node_major() {
  if ! has node; then echo 0; return; fi
  node -p 'Number(process.versions.node.split(".")[0])'
}

run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif has sudo; then
    sudo "$@"
  else
    fail "패키지 설치에 sudo/root 권한이 필요합니다."
  fi
}

install_linux_packages() {
  if has apt-get; then
    run_root apt-get update
    run_root apt-get install -y "$@"
  elif has dnf; then
    run_root dnf install -y "$@"
  elif has yum; then
    run_root yum install -y "$@"
  elif has pacman; then
    run_root pacman -Sy --needed --noconfirm "$@"
  elif has zypper; then
    run_root zypper --non-interactive install "$@"
  else
    fail "지원 패키지 매니저(apt/dnf/yum/pacman/zypper)를 찾지 못했습니다."
  fi
}

ensure_unzip_linux() {
  if has unzip; then return; fi
  $INSTALL_MISSING || fail "unzip이 필요합니다."
  install_linux_packages unzip
}

load_nvm() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  [[ -s "$NVM_DIR/nvm.sh" ]] || return 1
  . "$NVM_DIR/nvm.sh"
}

setup_macos() {
  info "macOS 감지"
  if ! has brew; then
    $INSTALL_MISSING || fail "Homebrew가 없습니다."
    info "Homebrew 설치"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    if [[ -x /opt/homebrew/bin/brew ]]; then eval "$(/opt/homebrew/bin/brew shellenv)";
    elif [[ -x /usr/local/bin/brew ]]; then eval "$(/usr/local/bin/brew shellenv)"; fi
  fi
  has brew || fail "Homebrew 설치 후 brew를 찾지 못했습니다."
  ok "Homebrew"
  if ! has git; then $INSTALL_MISSING || fail "Git이 없습니다."; brew install git; fi
  ok "Git $(git --version | awk '{print $3}')"
  if ! has curl; then $INSTALL_MISSING || fail "curl이 없습니다."; brew install curl; fi
  local major
  major="$(node_major)"
  if (( major < NODE_MAJOR_REQUIRED )); then
    $INSTALL_MISSING || fail "Node.js 22+가 필요합니다."
    info "Node.js ${NODE_LTS_MAJOR} 설치"
    if brew list "node@${NODE_LTS_MAJOR}" >/dev/null 2>&1; then brew upgrade "node@${NODE_LTS_MAJOR}" || true; else brew install "node@${NODE_LTS_MAJOR}"; fi
    local prefix
    prefix="$(brew --prefix "node@${NODE_LTS_MAJOR}")"
    export PATH="$prefix/bin:$PATH"
    local rc="$HOME/.zshrc"
    if ! grep -Fq "$prefix/bin" "$rc" 2>/dev/null; then printf '\n# DEVOS Node.js\nexport PATH="%s/bin:$PATH"\n' "$prefix" >> "$rc"; fi
  fi
  ok "Node $(node -v)"
  if ! has pnpm; then $INSTALL_MISSING || warn "pnpm 없음"; $INSTALL_MISSING && npm install -g pnpm; fi
  has pnpm && ok "pnpm $(pnpm -v)" || true
  if ! has codex; then $INSTALL_MISSING || warn "Codex CLI 없음"; $INSTALL_MISSING && npm install -g @openai/codex; fi
  has codex && ok "Codex CLI" || true
}

setup_linux() {
  info "Linux 감지"
  local missing=()
  has git || missing+=("git")
  has curl || missing+=("curl")
  if ((${#missing[@]})); then $INSTALL_MISSING || fail "필수 도구 없음: ${missing[*]}"; install_linux_packages "${missing[@]}"; fi
  ensure_unzip_linux
  ok "Git $(git --version | awk '{print $3}')"
  ok "curl"
  local major
  major="$(node_major)"
  if (( major < NODE_MAJOR_REQUIRED )); then
    if ! load_nvm; then
      $INSTALL_MISSING || fail "Node.js 22+가 필요합니다."
      info "nvm ${NVM_VERSION} 설치"
      curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
      load_nvm || fail "nvm 설치 후 로드하지 못했습니다."
    fi
    info "Node.js ${NODE_LTS_MAJOR} 설치"
    nvm install "$NODE_LTS_MAJOR"
    nvm alias default "$NODE_LTS_MAJOR"
    nvm use "$NODE_LTS_MAJOR"
  fi
  ok "Node $(node -v)"
  if ! has pnpm; then $INSTALL_MISSING || warn "pnpm 없음"; $INSTALL_MISSING && npm install -g pnpm; fi
  has pnpm && ok "pnpm $(pnpm -v)" || true
  if ! has codex; then $INSTALL_MISSING || warn "Codex CLI 없음"; $INSTALL_MISSING && npm install -g @openai/codex; fi
  has codex && ok "Codex CLI" || true
}

resolve_package_root() {
  if [[ -f "$ROOT/package.json" ]]; then printf "%s" "$ROOT"; return; fi
  if [[ -n "$DEVOS_SOURCE" ]]; then
    has curl || fail "DEVOS package 다운로드에 curl이 필요합니다."
    has unzip || fail "DEVOS package 압축 해제에 unzip이 필요합니다."
    TEMP_DIR="$(mktemp -d)"
    info "DEVOS Starter 다운로드"
    curl -fsSL "$DEVOS_SOURCE" -o "$TEMP_DIR/devos-starter.zip"
    unzip -q "$TEMP_DIR/devos-starter.zip" -d "$TEMP_DIR/unpacked"
    local pkg
    pkg="$(find "$TEMP_DIR/unpacked" -maxdepth 3 -name package.json -type f | head -1 || true)"
    [[ -n "$pkg" ]] || fail "Starter ZIP에서 package.json을 찾지 못했습니다."
    dirname "$pkg"
    return
  fi
  fail "DEVOS CLI package를 찾을 수 없습니다. Starter ZIP 폴더에서 실행하거나 DEVOS_SOURCE를 지정하세요."
}

install_devos() {
  local package_root
  package_root="$(resolve_package_root)"
  info "DEVOS CLI 설치: $package_root"
  (cd "$package_root" && npm link)
  has devos || fail "npm link 후 devos 명령을 찾지 못했습니다."
  ok "DEVOS CLI"
  DEVOS_HOME="$DEVOS_HOME" devos init
  ok "DEVOS workspace: $DEVOS_HOME"
}

echo
echo "DEVOS Setup"
echo "==========="
echo
case "$OS" in
  Darwin) setup_macos ;;
  Linux) setup_linux ;;
  *) fail "지원하지 않는 OS: $OS. Windows에서는 setup.ps1을 사용하세요." ;;
esac
install_devos
echo
ok "설정 완료"
echo
echo "다음 단계:"
echo "  devos doctor"
echo "  codex"

#!/usr/bin/env bash
set -Eeuo pipefail

DEVOS_HOME="${DEVOS_HOME:-$HOME/devos}"
REPO="${DEVOS_REPO:-https://github.com/kini-agent/kini-agent.github.io.git}"
NODE_MAJOR_REQUIRED=22
NODE_LTS_MAJOR=24
NVM_VERSION=v0.40.7
TMP=""
trap '[[ -n "$TMP" && -d "$TMP" ]] && rm -rf "$TMP"' EXIT

ok(){ printf "\033[32m[OK]\033[0m %s\n" "$*"; }
info(){ printf "\033[36m[INFO]\033[0m %s\n" "$*"; }
fail(){ printf "\033[31m[ERROR]\033[0m %s\n" "$*" >&2; exit 1; }
has(){ command -v "$1" >/dev/null 2>&1; }
run_root(){ if [[ "$(id -u)" -eq 0 ]]; then "$@"; elif has sudo; then sudo "$@"; else fail "sudo/root 권한이 필요합니다."; fi; }
node_major(){ has node && node -p 'Number(process.versions.node.split(".")[0])' || echo 0; }

install_linux_packages(){
  if has apt-get; then run_root apt-get update; run_root apt-get install -y "$@";
  elif has dnf; then run_root dnf install -y "$@";
  elif has yum; then run_root yum install -y "$@";
  elif has pacman; then run_root pacman -Sy --needed --noconfirm "$@";
  elif has zypper; then run_root zypper --non-interactive install "$@";
  else fail "지원 패키지 매니저를 찾지 못했습니다."; fi
}

if [[ "$(uname -s)" == "Darwin" ]]; then
  info "macOS 감지"
  if ! has brew; then /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; [[ -x /opt/homebrew/bin/brew ]] && eval "$(/opt/homebrew/bin/brew shellenv)"; [[ -x /usr/local/bin/brew ]] && eval "$(/usr/local/bin/brew shellenv)"; fi
  has git || brew install git
  if (( $(node_major) < NODE_MAJOR_REQUIRED )); then brew install "node@${NODE_LTS_MAJOR}" || true; PREFIX="$(brew --prefix "node@${NODE_LTS_MAJOR}")"; export PATH="$PREFIX/bin:$PATH"; fi
elif [[ "$(uname -s)" == "Linux" ]]; then
  info "Linux 감지"
  has git || install_linux_packages git
  has curl || install_linux_packages curl
  if (( $(node_major) < NODE_MAJOR_REQUIRED )); then
    export NVM_DIR="$HOME/.nvm"
    [[ -s "$NVM_DIR/nvm.sh" ]] || curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
    . "$NVM_DIR/nvm.sh"
    nvm install "$NODE_LTS_MAJOR"; nvm alias default "$NODE_LTS_MAJOR"; nvm use "$NODE_LTS_MAJOR"
  fi
else fail "지원하지 않는 OS입니다."; fi

ok "Git $(git --version | awk '{print $3}')"
ok "Node $(node -v)"
has pnpm || npm install -g pnpm
has codex || npm install -g @openai/codex
ok "pnpm $(pnpm -v)"
ok "Codex CLI"

TMP="$(mktemp -d)"
info "DEVOS repository 다운로드"
git clone --depth 1 "$REPO" "$TMP/repo" >/dev/null 2>&1
[[ -f "$TMP/repo/starter/package.json" ]] || fail "starter/package.json을 찾지 못했습니다."
(cd "$TMP/repo/starter" && npm link)
has devos || fail "DEVOS CLI 설치 실패"
DEVOS_HOME="$DEVOS_HOME" devos init
ok "DEVOS workspace: $DEVOS_HOME"
echo
echo "다음 단계:"
echo "  devos doctor"
echo "  devos new \"만들고 싶은 아이디어\""
echo "  codex"

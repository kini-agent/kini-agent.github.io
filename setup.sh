#!/usr/bin/env bash
set -Eeuo pipefail

KINI_HOME="${KINI_HOME:-$HOME/kini}"
REPO="${KINI_REPO:-https://github.com/kini-agent/kini-agent.github.io.git}"
NODE_MAJOR_REQUIRED=22
NODE_LTS_MAJOR=24
NVM_VERSION=v0.40.7

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
# pnpm 은 없어도 KINI 가 돕니다. 설치가 실패했다고 전체 설치를 멈추면 안 됩니다.
# set -e 아래에서는 `ok "pnpm $(pnpm -v)"` 한 줄이 그대로 설치 중단이 됩니다.
has pnpm || npm install -g pnpm || info "pnpm 설치를 건너뜁니다. (선택 사항)"
if has pnpm; then ok "pnpm $(pnpm -v)"; fi

# 코딩 에이전트는 **강제로 깔지 않습니다.**
# 예전에는 @openai/codex 를 무조건 설치했는데, 이미 다른 에이전트를 쓰는
# 사람에게는 안 쓸 CLI 와 별도 계정이 조용히 하나 늘어나는 일이었습니다.
# 하나라도 있으면 넘어가고, 없을 때만 무엇을 깔 수 있는지 알려줍니다.
if has claude || has codex || has gemini; then
  ok "코딩 에이전트: $(has claude && printf 'Claude Code '; has codex && printf 'Codex CLI '; has gemini && printf 'Gemini CLI ')"
else
  info "코딩 에이전트가 없습니다. 원하는 것을 하나 설치하세요:"
  info "  Claude Code : npm install -g @anthropic-ai/claude-code"
  info "  Codex CLI   : npm install -g @openai/codex"
  info "  (설치 후 kini dev agent list 로 확인)"
fi

# ⚠️ **임시 폴더에 clone 하면 안 됩니다.** npm link 는 복사가 아니라 심볼릭
# 링크라, 임시 폴더를 지우는 순간 전역 kini 가 끊어진 링크가 됩니다. 설치
# 중에는 멀쩡해 보이고(kini init 까지 성공) 스크립트가 끝난 뒤부터 안 됩니다.
# 그래서 워크스페이스 안에 영구히 둡니다.
SRC="$KINI_HOME/.repo"
info "KINI repository 다운로드"
mkdir -p "$KINI_HOME"
if [[ -d "$SRC/.git" ]]; then git -C "$SRC" pull --ff-only >/dev/null 2>&1 || true
else git clone --depth 1 "$REPO" "$SRC" >/dev/null 2>&1; fi
[[ -f "$SRC/starter/package.json" ]] || fail "starter/package.json을 찾지 못했습니다."
(cd "$SRC/starter" && npm link)
has kini || fail "KINI CLI 설치 실패"
KINI_HOME="$KINI_HOME" kini init
ok "KINI workspace: $KINI_HOME"
echo
echo "다음 단계:"
echo "  kini doctor"
echo "  kini systems"
echo "  kini dev new \"만들고 싶은 아이디어\""
echo "  kini dev agent"

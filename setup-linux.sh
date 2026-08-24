#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "[ERROR] 이 설치 파일은 Linux 전용입니다." >&2
  exit 1
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

printf '[INFO] DEVOS Linux installer\n'
printf '[INFO] 공통 설치 스크립트를 다운로드합니다.\n'
curl -fsSL https://kini-agent.github.io/setup.sh -o "$TMP"
chmod +x "$TMP"
exec bash "$TMP" "$@"

# DEVOS GitHub Pages

DEVOS는 AI가 코드를 쓰기 전에 필요한 결정을 먼저 정리하고, 프로젝트 구조·Tool·CLI·MCP·Agent 규칙을 통일해 긴 작업을 안정적으로 진행하기 위한 AI 개발 운영체계입니다.

## Site

https://kini-agent.github.io/

## 설치 방식

페이지가 브라우저에서 운영체제를 감지합니다.

- Windows → PowerShell 설치 명령
- macOS → `setup.sh`
- Linux → 같은 `setup.sh`

macOS/Linux는 `setup.sh` 내부에서 실제 OS를 다시 확인합니다.

## Repository files

- `index.html` — 설치/가이드 페이지
- `setup.sh` — macOS + Linux 공용 설치기
- `setup.ps1` — Windows 설치기
- `setup.cmd` — Windows 로컬 실행 래퍼
- `devos-starter.zip` — DEVOS CLI Starter
- `.nojekyll` — GitHub Pages용

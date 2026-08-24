# KINI CLI

KINI는 여러 AI 작업 시스템을 하나의 진입점에서 연결하기 위한 상위 CLI입니다.

현재 포함된 실행 시스템은 **KINI Dev** 하나입니다.

```text
KINI
├─ KINI Dev       built-in
├─ KINI Data      planned
├─ KINI Content   planned
└─ KINI Ops       planned
```

## 로컬 테스트

```bash
npm link
kini init
kini doctor
kini systems
kini dev new "사진 기록 앱"
```

아이디어를 바로 입력할 수도 있습니다.

```bash
kini "사진 기록 앱 만들어볼까?"
```

현재는 KINI Dev만 실행 가능하므로 새 개발 프로젝트 만들기로 연결됩니다.

## 묻지 않고 만들기

`kini dev new`는 옵션 없이 부르면 하나씩 물어봅니다.
스크립트나 AI 에이전트가 부를 때는 옵션으로 답을 넘깁니다.

```bash
kini dev new "할 일 관리 앱" \
  --slug todo --problem "할 일이 흩어져 있음" --mvp "등록,완료,오늘 보기" \
  --yes --json
```

`--json`은 stdout에 결과 한 줄만 남깁니다. 사람이 읽는 안내는 stderr로 갑니다.
만들고 싶은 것, 해결하려는 문제, 첫 버전 기능이 없으면 만들지 않고 종료 코드 1로 끝냅니다.

옵션으로 주지 않은 값은 `~/kini/profile/DEFAULTS.json`을 따릅니다.
항목 이름은 옵션 이름과 같습니다.

```json
{ "mode": "standard", "language": "typescript", "platform": "web", "autonomy": "standard", "db": "postgresql" }
```

## Claude Code에서 /idea 로 시작하기

`integrations/claude-code/idea`를 스킬 폴더에 연결하면 `/idea`로 프로젝트를 시작할 수 있습니다.

```bash
ln -s ~/kini/.repo/integrations/claude-code/idea ~/.claude/skills/idea
```

복사하지 않고 연결합니다.
복사본을 두면 KINI를 갱신해도 스킬은 옛날 것으로 남습니다.

## 코딩 에이전트

KINI Dev는 프로젝트 폴더에서 코딩 에이전트를 띄웁니다.
특정 회사 CLI에 묶여 있지 않고, 설치된 것을 씁니다.

```bash
kini dev agent          # 설치된 에이전트로 시작
kini dev agent list     # 무엇을 쓸 수 있는지 확인
kini dev claude         # 특정 에이전트 지정
KINI_AGENT=codex kini dev agent
```

목록에 없는 도구는 `~/kini/profile/AGENTS.json`에 더합니다.

```json
[{ "id": "gemini", "label": "Gemini CLI", "cmd": "gemini", "install": "npm install -g @google/gemini-cli", "contextFile": "GEMINI.md" }]
```

`contextFile`은 그 에이전트가 프로젝트 규칙을 자동으로 읽는 파일 이름입니다.
에이전트마다 이름이 다릅니다.
Claude Code는 `CLAUDE.md`만 읽고 `AGENTS.md`는 읽지 않습니다.

규칙 원본은 언제나 `AGENTS.md` 하나입니다.
KINI는 규칙을 파일마다 복사하지 않고, 원본을 불러오기만 하는 얇은 파일을 놓습니다.
`AGENTS.md`를 그대로 읽는 에이전트에게는 아무것도 만들지 않습니다.

## 테스트

```bash
npm test
```

CLI를 실제 프로세스로 띄우고 대화형 질문에 답하는 방식으로 확인합니다.

## 기존 DevOS 명령

이전 `devos` 명령은 호환을 위해 남겨 둡니다.

```bash
devos new "아이디어"
```

새 사용법은 아래를 권장합니다.

```bash
kini dev new "아이디어"
```

## npm package

패키지 이름은 `@kini-agent/kini`로 준비되어 있습니다. 실제 npm Registry 공개 전까지는 GitHub 설치 스크립트 또는 저장소의 `starter` 폴더에서 테스트할 수 있습니다.

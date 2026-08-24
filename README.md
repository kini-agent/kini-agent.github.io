# KINI

KINI는 여러 AI 작업 시스템을 하나의 진입점에서 연결하는 상위 CLI입니다.

현재 첫 번째 실행 시스템은 **KINI Dev**입니다.

```text
KINI
├─ KINI Dev       built-in
├─ KINI Data      planned
├─ KINI Content   planned
└─ KINI Ops       planned
```

## Core와 개인 Profile

KINI Core는 공개 저장소와 npm에 배포되는 깨끗한 공통 버전입니다.
사용하면서 생기는 개인 선호와 규칙은 Core에 섞지 않고 `~/kini/profile/`에 저장합니다.

```text
KINI Core
   ├─ User A Profile
   ├─ User B Profile
   └─ User C Profile
```

개인 Profile은 다음처럼 관리합니다.

```bash
kini profile show
kini profile export ./my-kini-profile
kini profile import ./my-kini-profile
kini profile reset --dry-run
kini profile reset --yes
```

`reset`은 프로젝트나 KINI Core를 삭제하지 않으며, 기존 Profile을 `~/kini/backups/`에 먼저 백업합니다.

> API Key, 비밀번호, 인증 토큰 같은 Secret은 Profile에 저장하지 마세요.

## KINI Dev

```bash
kini init
kini doctor
kini systems
kini dev new "사진 기록 앱"
kini dev status
kini dev agent
```

아이디어를 바로 입력할 수도 있습니다.

```bash
kini "사진 기록 앱 만들어볼까?"
```

현재는 KINI Dev만 실행 가능하므로 새 개발 프로젝트 만들기로 연결됩니다.

KINI Dev 작업을 시작할 때 현재 개인 Profile은 프로젝트의 `.kini/KINI_PROFILE.md`에 동기화되어 Agent가 참고합니다. 안전 규칙과 프로젝트 규칙이 개인 Profile보다 항상 우선합니다.

## 기존 DevOS 명령

이전 `devos` 명령은 호환을 위해 남겨 둡니다. 새 사용법은 `kini dev ...`를 권장합니다.

## npm package

패키지 이름은 `@kini-agent/kini`로 준비되어 있습니다.
버전은 `starter/package.json` 하나를 따릅니다.
실제 npm Registry 공개 전까지는 GitHub 설치 스크립트 또는 저장소의 `starter` 폴더에서 테스트할 수 있습니다.

## Documentation

https://kini-agent.github.io/

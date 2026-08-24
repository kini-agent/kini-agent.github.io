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

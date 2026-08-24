# KINI

**One command. Many systems.**

KINI는 여러 AI 작업 시스템을 하나의 CLI에서 연결하기 위한 상위 레이어입니다.

현재 첫 번째 실행 시스템은 **KINI Dev**입니다.

```text
KINI
├─ KINI Dev       software development · built-in
├─ KINI Data      planned
├─ KINI Content   planned
└─ KINI Ops       planned
```

## Website

https://kini-agent.github.io/

## 빠른 시작

운영체제별 설치 파일을 사용할 수 있습니다.

- Windows: `setup.ps1`
- macOS: `setup-macos.sh`
- Linux: `setup-linux.sh`

설치 후:

```bash
kini doctor
kini systems
kini dev new "만들고 싶은 앱"
```

현재는 KINI Dev만 실행 가능하므로 아래처럼 아이디어를 바로 입력해도 개발 프로젝트 만들기로 연결됩니다.

```bash
kini "타임라인 앱 만들어볼까?"
```

## CLI source

현재 KINI CLI 소스는 `starter/`에 있습니다.

패키지 이름은 npm 공개 배포를 위해 `@kini-agent/kini`로 준비되어 있습니다.

기존 `devos` 명령은 호환을 위해 당분간 유지하지만, 새 문서에서는 `kini dev ...`를 권장합니다.

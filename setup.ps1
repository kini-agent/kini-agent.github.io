param()

$ErrorActionPreference = "Stop"
$KiniHome = if ($env:KINI_HOME) { $env:KINI_HOME } else { Join-Path $HOME "kini" }
$Repo = if ($env:KINI_REPO) { $env:KINI_REPO } else { "https://github.com/kini-agent/kini-agent.github.io.git" }
$NodeMajorRequired = 22

function Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m) { Write-Host "[OK] $m" -ForegroundColor Green }
function Has($n) { return [bool](Get-Command $n -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}
function WingetInstall($id) {
  if (-not (Has "winget")) { throw "winget이 없습니다." }
  winget install --id $id --exact --accept-package-agreements --accept-source-agreements
  Refresh-Path
}
function NodeMajor {
  if (-not (Has "node")) { return 0 }
  try { return [int](& node -p "process.versions.node.split('.')[0]") } catch { return 0 }
}

Write-Host ""
Write-Host "KINI Windows Setup"
Write-Host "=================="

if (-not (Has "git")) { Info "Git 설치"; WingetInstall "Git.Git" }

# Node 는 "있느냐" 가 아니라 "버전이 되느냐" 를 봅니다. KINI 는 Node 22 이상이 필요한데
# 옛날 Node 가 깔린 PC 에서는 설치가 그냥 통과된 뒤 실행할 때 터집니다.
if ((NodeMajor) -lt $NodeMajorRequired) { Info "Node.js LTS 설치 (Node $NodeMajorRequired 이상 필요)"; WingetInstall "OpenJS.NodeJS.LTS" }
if ((NodeMajor) -lt $NodeMajorRequired) { throw "Node $NodeMajorRequired 이상이 필요합니다. 새 PowerShell 창에서 다시 실행해주세요." }
if (-not (Has "npm")) { throw "npm을 찾을 수 없습니다. 새 PowerShell을 열고 다시 실행하세요." }

Ok ("Git " + (& git --version))
Ok ("Node " + (& node --version))

if (-not (Has "pnpm")) { Info "pnpm 설치"; npm install -g pnpm; Refresh-Path }
if (Has "pnpm") { Ok ("pnpm " + (& pnpm --version)) }

# 코딩 에이전트는 강제로 깔지 않습니다 (setup.sh 의 같은 자리 주석 참고).
# ⚠️ 예전에는 여기서 무조건 "[OK] Codex CLI" 를 찍었습니다. 깔지도 않은 것을
# 깔렸다고 말하는 화면이라, 사용자는 왜 안 되는지 알 방법이 없었습니다.
$agents = @()
if (Has "claude") { $agents += "Claude Code" }
if (Has "codex")  { $agents += "Codex CLI" }
if (Has "gemini") { $agents += "Gemini CLI" }
if ($agents.Count -gt 0) {
  Ok ("코딩 에이전트: " + ($agents -join ", "))
} else {
  Info "코딩 에이전트가 없습니다. 원하는 것을 하나 설치하세요:"
  Info "  Claude Code : npm install -g @anthropic-ai/claude-code"
  Info "  Codex CLI   : npm install -g @openai/codex"
  Info "  (설치 후 kini dev agent list 로 확인)"
}

# ⚠️ **임시 폴더에 clone 하면 안 됩니다.** npm link 는 복사가 아니라 링크라,
# 스크립트 끝에서 임시 폴더를 지우는 순간 전역 kini 가 끊어진 링크가 됩니다.
# 설치 중에는 멀쩡해 보이고(kini init 까지 성공) 창을 닫은 뒤부터 안 됩니다.
# setup.sh 는 이미 고쳤는데 Windows 쪽만 그대로였습니다. 워크스페이스 안에 둡니다.
$Src = Join-Path $KiniHome ".repo"
Info "KINI repository 다운로드"
New-Item -ItemType Directory -Force -Path $KiniHome | Out-Null
if (Test-Path (Join-Path $Src ".git")) {
  git -C $Src pull --ff-only 2>&1 | Out-Null
} else {
  git clone --depth 1 $Repo $Src | Out-Null
}

$Starter = Join-Path $Src "starter"
if (-not (Test-Path (Join-Path $Starter "package.json"))) { throw "starter/package.json을 찾지 못했습니다." }

Push-Location $Starter
try { npm link } finally { Pop-Location }
Refresh-Path
if (-not (Has "kini")) { throw "KINI CLI 설치 실패" }

$env:KINI_HOME = $KiniHome
kini init
Ok ("KINI workspace: " + $KiniHome)

Write-Host ""
Write-Host "다음 단계:"
Write-Host "  kini doctor"
Write-Host "  kini systems"
Write-Host '  kini dev new "만들고 싶은 아이디어"'
Write-Host "  kini dev agent"

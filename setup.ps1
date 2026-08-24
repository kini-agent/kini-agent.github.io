param()

$ErrorActionPreference = "Stop"
$DevosHome = if ($env:DEVOS_HOME) { $env:DEVOS_HOME } else { Join-Path $HOME "devos" }
$Repo = if ($env:DEVOS_REPO) { $env:DEVOS_REPO } else { "https://github.com/kini-agent/kini-agent.github.io.git" }
$TempDir = $null

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

try {
  Write-Host ""
  Write-Host "DEVOS Windows Setup"
  Write-Host "==================="

  if (-not (Has "git")) { Info "Git 설치"; WingetInstall "Git.Git" }
  if (-not (Has "node")) { Info "Node.js LTS 설치"; WingetInstall "OpenJS.NodeJS.LTS" }
  if (-not (Has "npm")) { throw "npm을 찾을 수 없습니다. 새 PowerShell을 열고 다시 실행하세요." }

  Ok ("Git " + (& git --version))
  Ok ("Node " + (& node --version))

  if (-not (Has "pnpm")) { Info "pnpm 설치"; npm install -g pnpm; Refresh-Path }
  if (-not (Has "codex")) { Info "OpenAI Codex CLI 설치"; npm install -g @openai/codex; Refresh-Path }
  Ok "pnpm"
  Ok "Codex CLI"

  $TempDir = Join-Path ([IO.Path]::GetTempPath()) ("devos-" + [Guid]::NewGuid().ToString("N"))
  Info "DEVOS repository 다운로드"
  git clone --depth 1 $Repo $TempDir | Out-Null
  $Starter = Join-Path $TempDir "starter"
  if (-not (Test-Path (Join-Path $Starter "package.json"))) { throw "starter/package.json을 찾지 못했습니다." }

  Push-Location $Starter
  try { npm link } finally { Pop-Location }
  Refresh-Path
  if (-not (Has "devos")) { throw "DEVOS CLI 설치 실패" }

  $env:DEVOS_HOME = $DevosHome
  devos init
  Ok ("DEVOS workspace: " + $DevosHome)

  Write-Host ""
  Write-Host "다음 단계:"
  Write-Host "  devos doctor"
  Write-Host "  devos new \"만들고 싶은 아이디어\""
  Write-Host "  codex"
}
finally {
  if ($TempDir -and (Test-Path $TempDir)) { Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue }
}

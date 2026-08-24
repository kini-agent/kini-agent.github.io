param(
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$DevosHome = if ($env:DEVOS_HOME) { $env:DEVOS_HOME } else { Join-Path $HOME "devos" }
$DevosSource = $env:DEVOS_SOURCE
$TempDir = $null

function Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "[OK]   $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Has($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

function WingetInstall($id) {
  if (-not (Has "winget")) {
    throw "winget이 없습니다. Git/Node.js를 수동 설치한 뒤 다시 실행하세요."
  }
  winget install --id $id --exact --accept-package-agreements --accept-source-agreements
}

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

function Resolve-PackageRoot {
  $scriptPath = $MyInvocation.ScriptName
  if ($scriptPath) {
    $localRoot = Split-Path -Parent $scriptPath
    if (Test-Path (Join-Path $localRoot "package.json")) {
      return $localRoot
    }
  }

  if ($DevosSource) {
    Info "DEVOS Starter 다운로드"
    $script:TempDir = Join-Path ([IO.Path]::GetTempPath()) ("devos-" + [Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $script:TempDir | Out-Null
    $zip = Join-Path $script:TempDir "devos-starter.zip"
    $unpacked = Join-Path $script:TempDir "unpacked"

    Invoke-WebRequest -UseBasicParsing -Uri $DevosSource -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $unpacked -Force

    $pkg = Get-ChildItem -Path $unpacked -Filter package.json -File -Recurse | Select-Object -First 1
    if (-not $pkg) { throw "Starter ZIP에서 package.json을 찾지 못했습니다." }
    return $pkg.Directory.FullName
  }

  throw "DEVOS CLI package를 찾을 수 없습니다. Starter ZIP 폴더에서 실행하거나 DEVOS_SOURCE를 지정하세요."
}

try {
  Write-Host ""
  Write-Host "DEVOS Windows Setup"
  Write-Host "==================="

  if (-not (Has "git")) {
    if ($CheckOnly) { throw "Git이 없습니다." }
    Info "Git 설치"
    WingetInstall "Git.Git"
    Refresh-Path
  }
  Ok "Git"

  if (-not (Has "node")) {
    if ($CheckOnly) { throw "Node.js가 없습니다." }
    Info "Node.js LTS 설치"
    WingetInstall "OpenJS.NodeJS.LTS"
    Refresh-Path
  }
  if (-not (Has "node")) { throw "Node 설치 후 현재 PowerShell에서 node를 찾지 못했습니다. 새 PowerShell에서 다시 실행하세요." }
  Ok ("Node " + (& node --version))

  if (-not (Has "npm")) { throw "npm을 찾을 수 없습니다." }

  if (-not (Has "pnpm")) {
    if ($CheckOnly) { Warn "pnpm 없음" }
    else {
      Info "pnpm 설치"
      npm install -g pnpm
      Refresh-Path
    }
  }
  if (Has "pnpm") { Ok "pnpm" }

  if (-not (Has "codex")) {
    if ($CheckOnly) { Warn "Codex CLI 없음" }
    else {
      Info "OpenAI Codex CLI 설치"
      npm install -g @openai/codex
      Refresh-Path
    }
  }
  if (Has "codex") { Ok "Codex CLI" }

  $packageRoot = Resolve-PackageRoot
  Info "DEVOS CLI 설치: $packageRoot"
  Push-Location $packageRoot
  try { npm link } finally { Pop-Location }

  Refresh-Path
  if (-not (Has "devos")) { throw "npm link 후 devos 명령을 찾지 못했습니다." }
  Ok "DEVOS CLI"

  $env:DEVOS_HOME = $DevosHome
  devos init
  Ok "DEVOS workspace: $DevosHome"

  Write-Host ""
  Ok "설정 완료"
  Write-Host "다음 단계:"
  Write-Host "  devos doctor"
  Write-Host "  codex"
}
finally {
  if ($TempDir -and (Test-Path $TempDir)) {
    Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
  }
}

param(
  [string]$Model = "llama3.1:8b",
  [switch]$Rebuild
)

$ErrorActionPreference = "Stop"

function Test-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function New-OpenBoBSDesktopShortcut {
  param([string]$Url)

  $desktop = [Environment]::GetFolderPath('Desktop')
  $shortcutPath = Join-Path $desktop 'OpenBoBS.url'
  @(
    '[InternetShortcut]'
    "URL=$Url"
    'IconFile=%SystemRoot%\System32\SHELL32.dll'
    'IconIndex=220'
  ) | Set-Content -Path $shortcutPath -Encoding ASCII
  return $shortcutPath
}

function Open-WslTerminalHint {
  if (Test-Command "wsl") {
    Write-Host "[OpenBoBS] Opening WSL terminal for troubleshooting..."
    Start-Process wsl.exe -ArgumentList "-e", "bash", "-lc", "echo 'OpenBoBS: verify docker desktop integration and rerun Start-OpenBoBS.ps1'; exec bash"
  } else {
    Write-Host "[OpenBoBS] WSL not available on this host."
  }
}

if (-not (Test-Command "docker")) {
  Open-WslTerminalHint
  throw "Docker CLI not found. Install Docker Desktop first."
}

Write-Host "[OpenBoBS] Validating Docker Desktop engine..."
try {
  docker info | Out-Null
} catch {
  Open-WslTerminalHint
  throw "Docker engine is not available. Start Docker Desktop and retry."
}

$envFile = Join-Path $PSScriptRoot ".env"
@(
  "OLLAMA_MODEL=$Model"
  "OLLAMA_PULL_TIMEOUT=240"
  "KALI_INSTALL_ON_START=1"
) | Set-Content -Path $envFile -Encoding UTF8

Write-Host "[OpenBoBS] Using model: $Model"
Write-Host "[OpenBoBS] Launching deterministic stack (openbobs + ollama)..."

$composeArgs = @("compose", "up", "-d")
if ($Rebuild) {
  $composeArgs += "--build"
}

docker @composeArgs | Out-Null

Write-Host "[OpenBoBS] Waiting for application health..."
$deadline = (Get-Date).AddMinutes(5)
$ready = $false
while ((Get-Date) -lt $deadline) {
  try {
    $response = Invoke-RestMethod -Uri "http://localhost:4173/api/runtime" -Method Get -TimeoutSec 4
    if ($response.ok) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (-not $ready) {
  Write-Host "[OpenBoBS] Application did not report healthy runtime in time. Capturing diagnostics..."
  docker compose ps
  docker compose logs --tail=200 openbobs ollama
  Open-WslTerminalHint
  throw "OpenBoBS health wait timed out. Review logs above."
}

$dashboardUrl = 'http://localhost:4173'
$shortcutPath = New-OpenBoBSDesktopShortcut -Url $dashboardUrl

Write-Host "[OpenBoBS] Runtime healthy. Opening dashboard..."
Start-Process $dashboardUrl

Write-Host "[OpenBoBS] Done."
Write-Host "  Dashboard: $dashboardUrl"
Write-Host "  Desktop shortcut: $shortcutPath"
Write-Host "  Ollama API: http://localhost:11434"
Write-Host "  Stop stack: docker compose down"

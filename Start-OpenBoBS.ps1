param(
  [string]$Model = "llama3.1:8b",
  [switch]$Rebuild
)

$ErrorActionPreference = "Stop"

function Test-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command "docker")) {
  throw "Docker CLI not found. Install Docker Desktop first."
}

Write-Host "[OpenBoBS] Validating Docker Desktop engine..."
try {
  docker info | Out-Null
} catch {
  throw "Docker engine is not available. Start Docker Desktop and retry."
}

$envFile = Join-Path $PSScriptRoot ".env"
"OLLAMA_MODEL=$Model" | Set-Content -Path $envFile -Encoding UTF8

Write-Host "[OpenBoBS] Using model: $Model"
Write-Host "[OpenBoBS] Launching deterministic stack (openbobs + ollama)..."

$composeArgs = @("compose", "up", "-d")
if ($Rebuild) {
  $composeArgs += "--build"
}

docker @composeArgs

Write-Host "[OpenBoBS] Waiting for application health..."
$deadline = (Get-Date).AddMinutes(6)
$ready = $false
while ((Get-Date) -lt $deadline) {
  try {
    $response = Invoke-RestMethod -Uri "http://localhost:4173/api/runtime" -Method Get -TimeoutSec 5
    if ($response.ok) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 3
  }
}

if (-not $ready) {
  throw "OpenBoBS did not become ready within timeout. Run: docker compose logs --tail=200"
}

Write-Host "[OpenBoBS] Running. Opening dashboard..."
Start-Process "http://localhost:4173"

Write-Host "[OpenBoBS] Done."
Write-Host "  Dashboard: http://localhost:4173"
Write-Host "  Ollama API: http://localhost:11434"
Write-Host "  Stop stack: docker compose down"

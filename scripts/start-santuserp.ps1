param(
  [int]$Port = 4173,
  [switch]$Check,
  [switch]$CheckOnly,
  [switch]$Open
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "SantusERP - ambiente local" -ForegroundColor Green
Write-Host "Pasta: $Root"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js nao encontrado no PATH. Instale ou ajuste o PATH antes de iniciar o SantusERP."
}

if (-not (Test-Path ".env")) {
  Write-Host "Aviso: arquivo .env nao encontrado. O sistema pode usar JSON local como fallback." -ForegroundColor Yellow
}

if ($Check -or $CheckOnly) {
  Write-Host "Executando checklist operacional..." -ForegroundColor Cyan
  node scripts\ops-check.js
}

if ($CheckOnly) {
  Write-Host "Checklist concluido. Servidor nao iniciado por causa de -CheckOnly." -ForegroundColor Green
  exit 0
}

$env:PORT = [string]$Port
$env:HOST = "127.0.0.1"
$Url = "http://127.0.0.1:$Port"

Write-Host ""
Write-Host "URL: $Url" -ForegroundColor Green
Write-Host "Login demo: admin@santus.com"
Write-Host "Senha demo: santus123"
Write-Host "Para encerrar, pressione Ctrl+C nesta janela."
Write-Host ""

if ($Open) {
  Start-Process $Url
}

node server.js

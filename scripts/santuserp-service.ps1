param(
  [ValidateSet("start", "stop", "restart", "status")]
  [string]$Action = "status",
  [string]$EnvFile = ".env",
  [int]$Port = 0,
  [string]$HostName = "",
  [switch]$Open
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$arguments = @("scripts\santuserp-service.js", $Action, "--env", $EnvFile)
if ($Port -gt 0) {
  $arguments += @("--port", [string]$Port)
}
if ($HostName) {
  $arguments += @("--host", $HostName)
}

node @arguments

if ($Open -and ($Action -eq "start" -or $Action -eq "restart")) {
  $envValues = @{}
  if (Test-Path $EnvFile) {
    Get-Content -LiteralPath $EnvFile | ForEach-Object {
      $line = $_.Trim()
      if (-not $line -or $line.StartsWith("#")) { return }
      $separator = $line.IndexOf("=")
      if ($separator -lt 1) { return }
      $key = $line.Substring(0, $separator).Trim()
      $value = $line.Substring($separator + 1).Trim().Trim("'").Trim('"')
      $envValues[$key] = $value
    }
  }
  $urlHost = if ($HostName) { $HostName } elseif ($envValues["HOST"] -and $envValues["HOST"] -ne "0.0.0.0") { $envValues["HOST"] } else { "127.0.0.1" }
  $urlPort = if ($Port -gt 0) { [string]$Port } elseif ($envValues["PORT"]) { $envValues["PORT"] } else { "4173" }
  Start-Process "http://$urlHost`:$urlPort"
}

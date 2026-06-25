param(
  [string]$TaskName = "SantusERP Backup Diario",
  [string]$Time = "02:00",
  [string]$ProjectPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [int]$RetentionDays = 14
)

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  Write-Error "Node.js nao encontrado no PATH."
  exit 1
}

$script = Join-Path $ProjectPath "scripts\backup-postgres.js"
if (-not (Test-Path $script)) {
  Write-Error "Script de backup nao encontrado: $script"
  exit 1
}

$argument = "`"$script`" --retention-days=$RetentionDays"
$action = New-ScheduledTaskAction -Execute $node -Argument $argument -WorkingDirectory $ProjectPath
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Backup automatico diario do PostgreSQL do SantusERP." -Force | Out-Null

Write-Host "Tarefa agendada criada/atualizada: $TaskName"
Write-Host "Horario: $Time"
Write-Host "Projeto: $ProjectPath"
Write-Host "Retencao: $RetentionDays dias"

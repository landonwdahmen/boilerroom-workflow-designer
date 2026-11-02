#requires -Version 7.2
. (Join-Path $PSScriptRoot 'LocalDevelopment.ps1')
$settings = Get-LocalSettings
Assert-LocalDockerEngine
$existing = Get-LocalContainer
if ($existing) { $null = Assert-LocalDatabaseContainer $settings }
$volumeNames = @(& docker volume ls --format '{{.Name}}')
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect existing volumes.' }
if ($script:VolumeName -in $volumeNames) {
    $labels = (& docker volume inspect --format '{{json .Labels}}' $script:VolumeName) | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect project volume.' }
    Assert-ResourceLabels $labels
}
$networkName = $script:ProjectName + '_default'
$networkNames = @(& docker network ls --format '{{.Name}}')
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect existing networks.' }
if ($networkName -in $networkNames) {
    $projectLabel = & docker network inspect --format '{{index .Labels "com.docker.compose.project"}}' $networkName
    if ($LASTEXITCODE -ne 0 -or $projectLabel -ne $script:ProjectName) { throw 'Network name collision; refusing reuse.' }
}
if (-not $existing -or $existing.State -ne 'running') {
    $listeners = [Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    if (@($listeners | Where-Object Port -eq ([int]$settings.TDS_POSTGRES_PORT)).Count) { throw 'Configured local PostgreSQL port is occupied; choose a free port in .env.' }
}
Invoke-LocalCompose @('config', '--quiet')
Invoke-LocalCompose @('up', '-d', '--wait', '--wait-timeout', '90', 'postgres')
$null = Assert-LocalDatabaseContainer $settings
Assert-LocalSchema
Write-Host 'Isolated PostgreSQL is healthy; schema version 1 is reachable through the application database role.'

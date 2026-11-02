#requires -Version 7.2
param([Parameter(Mandatory)][string]$PlaywrightModule)
. (Join-Path $PSScriptRoot 'LocalDevelopment.ps1')
Assert-LocalSchema
$apiListeners = @(Get-NetTCPConnection -LocalPort 8836 -State Listen -ErrorAction Stop)
if ($apiListeners.Count -ne 1 -or $apiListeners[0].LocalAddress -ne '127.0.0.1') { throw 'Unexpected API listener.' }
$apiIdentity = Get-CimInstance Win32_Process -Filter "ProcessId = $($apiListeners[0].OwningProcess)"
$apiDll = Join-Path $script:ProjectRoot 'Backend/bin/Release/net10.0/ZitaDataSystem.dll'
if (-not $apiIdentity -or $apiIdentity.Name -ne 'dotnet.exe' -or -not $apiIdentity.CommandLine.Contains($apiDll)) { throw 'Unexpected API process.' }
$spaListeners = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction Stop)
if ($spaListeners.Count -ne 1 -or $spaListeners[0].LocalAddress -notin @('127.0.0.1','::1')) { throw 'Unexpected frontend listener.' }
$spaIdentity = Get-CimInstance Win32_Process -Filter "ProcessId = $($spaListeners[0].OwningProcess)"
$spaScript = Join-Path $script:ProjectRoot 'TDS-Frontend-main/node_modules/vite/bin/vite.js'
if (-not $spaIdentity -or $spaIdentity.Name -ne 'node.exe' -or -not $spaIdentity.CommandLine.Contains($spaScript)) { throw 'Unexpected frontend process.' }
if (-not (Test-Path -LiteralPath $PlaywrightModule)) { throw 'Supply an existing Playwright module; no automatic installation.' }
$oldModule = $env:TDS_PLAYWRIGHT_MODULE
try {
    $env:TDS_PLAYWRIGHT_MODULE = (Resolve-Path -LiteralPath $PlaywrightModule).Path
    Push-Location $script:ProjectRoot
    try {
        & node (Join-Path $script:ProjectRoot 'tools/browser-workflows.cjs') $apiIdentity.ProcessId $spaIdentity.ProcessId
        if ($LASTEXITCODE -ne 0) { throw 'Browser verification failed; inspect sanitized report.' }
    } finally { Pop-Location }
} finally { $env:TDS_PLAYWRIGHT_MODULE = $oldModule }

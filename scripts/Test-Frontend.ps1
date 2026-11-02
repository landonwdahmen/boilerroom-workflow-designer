#requires -Version 7.2
param([ValidateSet('Unit','Build','Lint','Restore')][string]$Task='Unit')
$ErrorActionPreference='Stop'
$root = Split-Path $PSScriptRoot -Parent
Push-Location (Join-Path $root 'TDS-Frontend-main')
try {
    $npm = if ($IsWindows) { 'npm.cmd' } else { 'npm' }
    switch ($Task) {
        Restore { & $npm ci --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000 }
        Unit { & $npm test }
        Build { & $npm run build }
        Lint { & $npm run lint }
    }
    if ($LASTEXITCODE -ne 0) { throw "Frontend $Task failed (exit $LASTEXITCODE)." }
} finally { Pop-Location }

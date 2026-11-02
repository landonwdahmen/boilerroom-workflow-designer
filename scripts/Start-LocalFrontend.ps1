#requires -Version 7.2
# October 2026: use the same trusted localhost certificate as the API.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$certificate = Join-Path $projectRoot '.local/https/localhost.pem'
$key = Join-Path $projectRoot '.local/https/localhost.key'
if (-not (Test-Path -LiteralPath $certificate) -or -not (Test-Path -LiteralPath $key)) {
    throw 'Create and trust the localhost certificate; see FRONTEND_INTEGRATION.md.'
}
$values = @{ VITE_API_URL = 'https://localhost:8836/api' }
$previous = @{}
try {
    foreach ($name in $values.Keys) {
        $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
        [Environment]::SetEnvironmentVariable($name, $values[$name], 'Process')
    }
    Push-Location (Join-Path $projectRoot 'TDS-Frontend-main')
    # Explicit workspace script path lets browser guards verify the listener identity.
    # Vite fixes localhost:3000 HTTPS and reads the private TLS files in Node only.
    try { & node (Join-Path $projectRoot 'TDS-Frontend-main/node_modules/vite/bin/vite.js'); if ($LASTEXITCODE -ne 0) { throw 'Frontend server exited with an error.' } }
    finally { Pop-Location }
} finally {
    foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}

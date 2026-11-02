#requires -Version 7.2
# Explicit additive migration only; no HTTP, reset, or credential output.
. (Join-Path $PSScriptRoot 'LocalDevelopment.ps1')
Assert-LocalSchema
$sql = [IO.File]::ReadAllText((Join-Path $script:ProjectRoot 'database/init/002-auth-invitations.sql'))
$command = 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -X -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q'
$result = $sql | & docker exec -i $script:ContainerName sh -c $command 2>&1
if ($LASTEXITCODE -ne 0) { throw 'Authentication schema migration failed; database details withheld.' }
if ((Invoke-LocalSql "SELECT project_key FROM portfolio_schema_versions WHERE version=2;") -ne 'boilerroom-tds-portfolio-auth-v2') { throw 'Authentication schema marker mismatch.' }
Write-Host 'Authentication schema version 2 is available; existing business rows preserved.'

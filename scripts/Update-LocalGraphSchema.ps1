#requires -Version 7.2
# Explicit additive migration; shared guard verifies this project's isolated Docker resource first.
. (Join-Path $PSScriptRoot 'LocalDevelopment.ps1')
Assert-LocalSchema
if ((Invoke-LocalSql "SELECT project_key FROM portfolio_schema_versions WHERE version=2;") -ne 'boilerroom-tds-portfolio-auth-v2') { throw 'Apply authentication schema version 2 first.' }
$sql = [IO.File]::ReadAllText((Join-Path $script:ProjectRoot 'database/init/003-project-graphs.sql'))
$command = 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -X -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q'
$result = $sql | & docker exec -i $script:ContainerName sh -c $command 2>&1
if ($LASTEXITCODE -ne 0) { throw 'Graph migration failed; database details withheld.' }
if ((Invoke-LocalSql "SELECT project_key FROM portfolio_schema_versions WHERE version=3;") -ne 'boilerroom-tds-portfolio-graphs-v3') { throw 'Graph schema marker mismatch.' }
Write-Host 'Graph schema version 3 available; existing business rows preserved.'

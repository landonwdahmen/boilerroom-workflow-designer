#requires -Version 7.2
param([ValidateRange(1, 30)][int]$SessionMinutes = 30)
. (Join-Path $PSScriptRoot 'LocalDevelopment.ps1')
Assert-LocalSchema
if ((Invoke-LocalSql "SELECT project_key FROM portfolio_schema_versions WHERE version=2;") -ne 'boilerroom-tds-portfolio-auth-v2') { throw 'Run scripts/Update-LocalAuthenticationSchema.ps1 first.' }
if ((Invoke-LocalSql "SELECT project_key FROM portfolio_schema_versions WHERE version=3;") -ne 'boilerroom-tds-portfolio-graphs-v3') { throw 'Run scripts/Update-LocalGraphSchema.ps1 first.' }
$settings = Get-LocalSettings
$dll = Join-Path $script:ProjectRoot 'Backend/bin/Release/net10.0/ZitaDataSystem.dll'
if (-not (Test-Path -LiteralPath $dll)) { throw 'Build the backend Release configuration first.' }
$oldEnvironment = $env:ASPNETCORE_ENVIRONMENT
$oldConnection = $env:ConnectionStrings__PrimaryDatabase
$oldCertificate = $env:ASPNETCORE_Kestrel__Certificates__Default__Path
$oldKey = $env:ASPNETCORE_Kestrel__Certificates__Default__KeyPath
$certificate = Join-Path $script:ProjectRoot '.local/https/localhost.pem'
$key = Join-Path $script:ProjectRoot '.local/https/localhost.key'
if (-not (Test-Path -LiteralPath $certificate) -or -not (Test-Path -LiteralPath $key)) { throw 'Create the local HTTPS certificate first; see database/AUTHENTICATION.md.' }
try {
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $env:ConnectionStrings__PrimaryDatabase = Get-LocalConnectionString $settings
    $env:ASPNETCORE_Kestrel__Certificates__Default__Path = $certificate
    $env:ASPNETCORE_Kestrel__Certificates__Default__KeyPath = $key
    & dotnet $dll --contentRoot (Join-Path $script:ProjectRoot 'Backend') --Authentication:SessionMinutes $SessionMinutes
    if ($LASTEXITCODE -ne 0) { throw 'Local API exited with an error.' }
} finally {
    $env:ASPNETCORE_ENVIRONMENT = $oldEnvironment
    $env:ConnectionStrings__PrimaryDatabase = $oldConnection
    $env:ASPNETCORE_Kestrel__Certificates__Default__Path = $oldCertificate
    $env:ASPNETCORE_Kestrel__Certificates__Default__KeyPath = $oldKey
}

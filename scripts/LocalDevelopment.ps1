#requires -Version 7.2
# Shared local-only helpers. No application source or authentication redesign.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:ProjectRoot = Split-Path $PSScriptRoot -Parent
$script:ContainerName = 'boilerroom-tds-portfolio-postgres'
$script:VolumeName = 'boilerroom-tds-portfolio-pgdata'
$script:ProjectName = 'boilerroom-tds-portfolio'
$script:ScopeLabel = 'local-synthetic-only'
$script:DatabaseImage = 'postgres:16.15@sha256:1a6ab3f5345eb6dbe04a1349529caabdb0ab09293a09590fad07b2246bfa4b54'

function Get-LocalSettings {
    $file = Join-Path $script:ProjectRoot '.env'
    if (-not (Test-Path -LiteralPath $file)) { throw 'Run scripts/Initialize-LocalEnvironment.ps1 first.' }
    $settings = @{}
    foreach ($line in [IO.File]::ReadAllLines($file)) {
        if ($line -match '^\s*(#|$)') { continue }
        if ($line -notmatch '^([A-Z_]+)=([^\r\n]*)$') { throw 'Unsupported .env syntax; use the generated simple KEY=value format.' }
        if ($settings.ContainsKey($Matches[1])) { throw 'Duplicate key in .env.' }
        $settings[$Matches[1]] = $Matches[2]
    }
    foreach ($key in @('POSTGRES_DB', 'POSTGRES_USER', 'TDS_APP_DB_USER')) {
        if (-not $settings.ContainsKey($key) -or $settings[$key] -notmatch '^[a-z_][a-z0-9_]{0,62}$') { throw "Invalid local identifier setting: $key" }
    }
    foreach ($key in @('POSTGRES_PASSWORD', 'TDS_APP_DB_PASSWORD')) {
        if (-not $settings.ContainsKey($key) -or $settings[$key] -notmatch '^[a-fA-F0-9]{64}$') { throw "Use an independent generated 64-character hexadecimal local secret for $key; do not use the example placeholder." }
    }
    if ($settings.POSTGRES_USER -eq $settings.TDS_APP_DB_USER -or $settings.POSTGRES_PASSWORD -eq $settings.TDS_APP_DB_PASSWORD) { throw 'Bootstrap and application accounts must be distinct.' }
    if (-not $settings.ContainsKey('TDS_POSTGRES_PORT') -or $settings.TDS_POSTGRES_PORT -notmatch '^\d{4,5}$' -or [int]$settings.TDS_POSTGRES_PORT -lt 1024 -or [int]$settings.TDS_POSTGRES_PORT -gt 65535) { throw 'Invalid local PostgreSQL port.' }
    return $settings
}

function Assert-LocalDockerEngine {
    if ($env:DOCKER_HOST -and $env:DOCKER_HOST -notmatch '^(npipe://|unix://)') { throw 'Remote Docker hosts are outside this local setup.' }
    $context = & docker context show
    if ($LASTEXITCODE -ne 0) { throw 'Cannot read Docker context.' }
    $endpoint = & docker context inspect $context --format '{{.Endpoints.docker.Host}}'
    if ($LASTEXITCODE -ne 0 -or $endpoint -notmatch '^(npipe://|unix://)') { throw 'A local Docker Desktop/Linux engine is required.' }
    $osType = & docker info --format '{{.OSType}}'
    if ($LASTEXITCODE -ne 0 -or $osType -ne 'linux') { throw 'Start Docker Desktop with Linux containers.' }
}

function Get-LocalContainer {
    $names = @(& docker container ls -a --format '{{.Names}}')
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect Docker containers.' }
    if ($script:ContainerName -notin $names) { return $null }
    $format = '{"Id":{{json .Id}},"Labels":{{json .Config.Labels}},"Mounts":{{json .Mounts}},"Ports":{{json .HostConfig.PortBindings}},"Image":{{json .Config.Image}},"State":{{json .State.Status}}}'
    $data = & docker container inspect --format $format $script:ContainerName
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect the local database container.' }
    return ($data | ConvertFrom-Json)
}

function Assert-ResourceLabels($Labels) {
    if (-not $Labels -or $Labels.'com.docker.compose.project' -ne $script:ProjectName -or $Labels.'io.boilerroom-tds.scope' -ne $script:ScopeLabel) {
        throw 'Docker resource ownership mismatch. Stop and investigate; do not overwrite or reuse it.'
    }
}

function Assert-LocalDatabaseContainer($Settings) {
    $container = Get-LocalContainer
    if (-not $container) { throw 'Start the project-specific database first.' }
    Assert-ResourceLabels $container.Labels
    $mount = @($container.Mounts | Where-Object { $_.Type -eq 'volume' -and $_.Name -eq $script:VolumeName -and $_.Destination -eq '/var/lib/postgresql/data' })
    $bindings = @($container.Ports.'5432/tcp')
    if ($container.Image -ne $script:DatabaseImage -or $mount.Count -ne 1 -or $bindings.Count -ne 1 -or $bindings[0].HostIp -ne '127.0.0.1' -or $bindings[0].HostPort -ne $Settings.TDS_POSTGRES_PORT) { throw 'Unexpected database image, volume, or localhost port mapping; refusing to proceed.' }
    return $container
}

function Invoke-LocalCompose([string[]]$Command) {
    $settings = Get-LocalSettings
    $saved = @{}
    try {
        # Keep shell overrides from accidentally selecting another project's settings.
        foreach ($key in $settings.Keys) { $saved[$key] = [Environment]::GetEnvironmentVariable($key, 'Process'); [Environment]::SetEnvironmentVariable($key, $settings[$key], 'Process') }
        & docker compose --project-name $script:ProjectName --file (Join-Path $script:ProjectRoot 'compose.yaml') --env-file (Join-Path $script:ProjectRoot '.env') @Command
        if ($LASTEXITCODE -ne 0) { throw 'Project-specific Docker Compose command failed.' }
    } finally {
        foreach ($key in $saved.Keys) { [Environment]::SetEnvironmentVariable($key, $saved[$key], 'Process') }
    }
}

function Invoke-LocalSql([string]$Sql) {
    $null = Assert-LocalDatabaseContainer (Get-LocalSettings)
    # Password travels only in the container environment, never CLI arguments/output.
    $command = 'export PGPASSWORD="$TDS_APP_DB_PASSWORD"; exec psql -X -h 127.0.0.1 -U "$TDS_APP_DB_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -qAt'
    $result = $Sql | & docker exec -i $script:ContainerName sh -c $command 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Local SQL check failed; database output withheld to avoid exposing row contents.' }
    return (($result | ForEach-Object { $_.ToString() }) -join "`n").Trim()
}

function Assert-LocalSchema {
    Assert-LocalDockerEngine
    $marker = Invoke-LocalSql "SELECT project_key FROM portfolio_schema_versions WHERE version = 1;"
    if ($marker -ne 'boilerroom-tds-portfolio-local-v1') { throw 'Schema marker mismatch; no smoke writes are permitted.' }
}

function Get-LocalConnectionString($Settings) {
    $builder = [System.Data.Common.DbConnectionStringBuilder]::new()
    $builder['Host'] = '127.0.0.1'
    $builder['Port'] = $Settings.TDS_POSTGRES_PORT
    $builder['Database'] = $Settings.POSTGRES_DB
    $builder['Username'] = $Settings.TDS_APP_DB_USER
    $builder['Password'] = $Settings.TDS_APP_DB_PASSWORD
    $builder['SSL Mode'] = 'Disable'
    $builder['Include Error Detail'] = 'false'
    $builder['Timeout'] = '5'
    $builder['Command Timeout'] = '10'
    return $builder.ConnectionString
}

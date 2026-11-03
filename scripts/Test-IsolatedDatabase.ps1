#requires -Version 7.2
param(
    [ValidateSet('Database','Security','Graph','Browser')][string]$Suite='Database',
    [string]$PlaywrightModule
)
. (Join-Path $PSScriptRoot 'TestSupport.ps1')
if ($Suite -ne 'Database' -and -not $IsWindows) { throw 'Existing HTTP/Edge probes require Windows process/socket identity checks. Use Database on Linux CI.' }
if ($Suite -eq 'Browser' -and (-not $PlaywrightModule -or -not (Test-Path -LiteralPath $PlaywrightModule))) { throw 'Supply an existing Playwright module; no automatic installation.' }
if ($Suite -ne 'Database') { . (Join-Path $PSScriptRoot 'WindowsListenerGuard.ps1') }
$run = [Guid]::NewGuid().ToString('N')
$containerName = "boilerroom-tds-m6a-$run"
$volumeName = "boilerroom-tds-m6a-$run-data"
$projectName = "boilerroom-tds-m6a-$run"
$runDirectory = Join-Path $script:TestRoot ".local/m6a/$run"
$scratch = Join-Path $runDirectory 'workspace'
New-Item -ItemType Directory -Force $scratch | Out-Null
$environmentValues = @{ TDS_TEST_RUN=$run; TDS_TEST_CONTAINER=$containerName; TDS_TEST_VOLUME=$volumeName }
$emptyEnvironment = Join-Path $runDirectory 'compose.empty.env'
[IO.File]::WriteAllText($emptyEnvironment, '')
$composeArguments = @('compose','--project-name',$projectName,'--project-directory',$script:TestRoot,
    '--file',(Join-Path $script:TestRoot 'compose.tests.yaml'),'--env-file',$emptyEnvironment)
$connection = 'Host=127.0.0.1;Port=55433;Database=tds_m6a_test;Username=app_m6a;Password='+('2'*64)+';Timeout=5;Command Timeout=10;Include Error Detail=false;SSL Mode=Disable'
$api = $null; $frontend = $null; $testContainerId = $null; $created = $false; $success = $false
function Docker([string[]]$Arguments, [int]$Timeout=25, [string]$InputText='') {
    $result = Invoke-TestProcess docker $Arguments -TimeoutSeconds $Timeout -EnvironmentValues $environmentValues -InputText $InputText
    Assert-TestExit $result 'Bounded isolated Docker operation'
    return $result.Output.Trim()
}
function Sql([string]$Text) {
    Docker @('exec','-i',$testContainerId,'sh','-c','export PGPASSWORD="$TDS_APP_DB_PASSWORD"; exec psql -X -h 127.0.0.1 -U "$TDS_APP_DB_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -qAt') -InputText $Text
}
function Inventory {
    $containers = Docker @('ps','-a','--format','{{.ID}}|{{.Names}}|{{.State}}|{{.Image}}','--no-trunc')
    $volumes = Docker @('volume','ls','--format','{{.Name}}|{{.Driver}}')
    return [ordered]@{ Containers=@($containers -split "`n" | Where-Object { $_ -and $_ -notlike "*|$containerName|*" } | Sort-Object);
        Volumes=@($volumes -split "`n" | Where-Object { $_ -and $_ -notlike "$volumeName|*" } | Sort-Object) }
}
function DevelopmentFingerprint {
    $names = Docker @('ps','-a','--format','{{.Names}}')
    if ('boilerroom-tds-portfolio-postgres' -notin ($names -split "`n")) { return 'absent-on-this-host' }
    # Read-only data check; no development settings/credentials are loaded into this runner.
    $sql = @'
BEGIN READ ONLY;
SET LOCAL statement_timeout='10s';
SELECT md5(concat(
 (SELECT jsonb_agg(to_jsonb(v) ORDER BY version)::text FROM portfolio_schema_versions v),
 (SELECT coalesce(jsonb_agg(to_jsonb(u) ORDER BY id)::text,'[]') FROM users u),
 (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY id)::text,'[]') FROM projects p),
 (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY organizationid)::text,'[]') FROM companycodes c),
 (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY text)::text,'[]') FROM test t),
 (SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY id)::text,'[]') FROM invitations i),
 (SELECT coalesce(jsonb_agg(to_jsonb(g) ORDER BY project_id)::text,'[]') FROM project_graphs g)));
COMMIT;
'@
    Docker @('exec','-i','boilerroom-tds-portfolio-postgres','sh','-c','export PGPASSWORD="$TDS_APP_DB_PASSWORD"; exec psql -X -h 127.0.0.1 -U "$TDS_APP_DB_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -qAt') -InputText $sql
}
function Assert-Owned {
    $identity = (Docker @('inspect','--format','{{json .}}',$testContainerId)) | ConvertFrom-Json
    $labels = $identity.Config.Labels
    $mount = @($identity.Mounts | Where-Object { $_.Type -eq 'volume' -and $_.Name -eq $volumeName -and $_.Destination -eq '/var/lib/postgresql/data' })
    $port = @($identity.HostConfig.PortBindings.'5432/tcp')
    if ($identity.Id -ne $testContainerId -or $identity.Name -ne "/$containerName" -or
        $labels.'com.docker.compose.project' -ne $projectName -or $labels.'io.boilerroom-tds.test-run' -ne $run -or
        $labels.'io.boilerroom-tds.scope' -ne 'isolated-synthetic-tests' -or $mount.Count -ne 1 -or
        $port.Count -ne 1 -or $port[0].HostIp -ne '127.0.0.1' -or $port[0].HostPort -ne '55433' -or
        $identity.Config.Image -ne 'postgres:16.15@sha256:1a6ab3f5345eb6dbe04a1349529caabdb0ab09293a09590fad07b2246bfa4b54') { throw 'Test resource identity mismatch; no cleanup/restart permitted.' }
    $volume = (Docker @('volume','inspect',$volumeName)) | ConvertFrom-Json
    if ($volume.Name -ne $volumeName -or $volume.Labels.'io.boilerroom-tds.test-run' -ne $run -or
        $volume.Labels.'io.boilerroom-tds.scope' -ne 'isolated-synthetic-tests') { throw 'Test volume identity mismatch.' }
}
function Start-OwnedProcess([string]$File, [string[]]$Arguments, [hashtable]$Values, [string]$Directory=$scratch) {
    $start = [Diagnostics.ProcessStartInfo]::new($File)
    $start.UseShellExecute=$false; $start.CreateNoWindow=$true; $start.WorkingDirectory=$Directory
    $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
    foreach ($argument in $Arguments) { $start.ArgumentList.Add($argument) }
    foreach ($key in $Values.Keys) { $start.Environment[$key]=[string]$Values[$key] }
    $child=[Diagnostics.Process]::Start($start)
    return @{ Process=$child; Output=$child.StandardOutput.ReadToEndAsync(); Error=$child.StandardError.ReadToEndAsync() }
}
function Stop-OwnedProcess($Child) {
    if ($Child -and -not $Child.Process.HasExited) { $Child.Process.Kill($true); $null=$Child.Process.WaitForExit(10000) }
}
function Assert-Listener($Child, [int]$Port, [string]$ExpectedPath, [string]$ExpectedName) {
    Assert-OwnedWindowsHttpsEndpoint $Child $Port $ExpectedPath $ExpectedName $runDirectory
}

function Start-TestApi([int]$Minutes) {
    Assert-Owned
    $healthDeadline=[DateTime]::UtcNow.AddSeconds(35)
    do {
        if ((Docker @('inspect','--format','{{.State.Health.Status}}',$testContainerId)) -eq 'healthy') { break }
        if ([DateTime]::UtcNow -gt $healthDeadline) { throw 'Isolated PostgreSQL did not become healthy.' }
        Start-Sleep -Milliseconds 300
    } while ($true)
    $dll=Join-Path $scratch 'Backend/bin/Release/net10.0/ZitaDataSystem.dll'
    $values=@{ ASPNETCORE_ENVIRONMENT='Development'; ConnectionStrings__PrimaryDatabase=$connection;
        ASPNETCORE_Kestrel__Certificates__Default__Path=(Join-Path $script:TestRoot '.local/https/localhost.pem');
        ASPNETCORE_Kestrel__Certificates__Default__KeyPath=(Join-Path $script:TestRoot '.local/https/localhost.key') }
    $child=Start-OwnedProcess dotnet @($dll,'--contentRoot',(Join-Path $scratch 'Backend'),'--Authentication:SessionMinutes',"$Minutes") $values
    try { Assert-Listener $child 8836 $dll 'dotnet.exe'; return $child } catch { Stop-OwnedProcess $child; throw }
}
Push-Location $script:TestRoot
try {
    $endpoint=Docker @('context','inspect','--format','{{.Endpoints.docker.Host}}')
    if ($endpoint -notmatch '^(npipe:////\./pipe/dockerDesktopLinuxEngine|unix:///var/run/docker.sock)$' -or (Docker @('info','--format','{{.OSType}}')) -ne 'linux') { throw 'Use the local Linux Docker engine.' }
    $before=Inventory; $baseline=DevelopmentFingerprint
    [IO.File]::WriteAllText((Join-Path $runDirectory 'development-fingerprint-before.txt'),$baseline)
    $before | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $runDirectory 'resources-before.json')
    if ((Docker @('ps','-a','--format','{{.Names}}')) -split "`n" -contains $containerName -or (Docker @('volume','ls','--format','{{.Name}}')) -split "`n" -contains $volumeName) { throw 'Test resource already exists; refusing adoption.' }
    # A collision fails; no existing listener/container is stopped to make room.
    $probe=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,55433)
    try { $probe.Start() } finally { $probe.Stop() }
    if ($Suite -ne 'Database') {
        Assert-WindowsPortsAvailable @(8836,3000)
    }
    $null=Docker ($composeArguments+@('config','--quiet'))
    $null=Docker ($composeArguments+@('up','-d','--no-deps','--pull','never','--wait','--wait-timeout','90','postgres')) 115
    $testContainerId=Docker @('inspect','--format','{{.Id}}',$containerName)
    @{Run=$run; Container=$containerName; ContainerId=$testContainerId; Volume=$volumeName; Project=$projectName} | ConvertTo-Json | Set-Content (Join-Path $runDirectory 'owned-resources.json')
    $created=$true; Assert-Owned
    if ((Sql "SELECT current_database()='tds_m6a_test' AND (SELECT scope='isolated-synthetic-tests' FROM m6a_test_identity);") -ne 't') { throw 'Isolated database marker mismatch.' }
    Write-Host "Isolated $Suite environment ready; development database is not a test target."
    # This SQL is inspected transactional fixture verification, not the blocked PowerShell script.
    $null=Sql ([IO.File]::ReadAllText((Join-Path $script:TestRoot 'database/tests/verify.sql')))
    if ($Suite -eq 'Database') {
        $result=Invoke-TestProcess dotnet @('test','tests/BoilerRoom.Tests/BoilerRoom.Tests.csproj','-c','Release','--no-build','--no-restore','--filter','Category=Database','--logger','console;verbosity=normal') -TimeoutSeconds 180 -EnvironmentValues @{TDS_M6A_CONNECTION=$connection}
        Write-Host $result.Output
        Assert-TestExit $result 'PostgreSQL controller/SQL tests'
    } else {
        New-Item -ItemType Directory -Force (Join-Path $scratch 'Backend/bin/Release/net10.0'),(Join-Path $scratch '.local/https'),(Join-Path $scratch 'tools') | Out-Null
        Copy-Item -LiteralPath (Join-Path $script:TestRoot 'Backend/ZitaDataSystem.csproj') -Destination (Join-Path $scratch 'Backend')
        Copy-Item -LiteralPath (Join-Path $script:TestRoot 'Backend/appsettings.json') -Destination (Join-Path $scratch 'Backend')
        Copy-Item -Path (Join-Path $script:TestRoot 'Backend/bin/Release/net10.0/*') -Destination (Join-Path $scratch 'Backend/bin/Release/net10.0') -Recurse
        Copy-Item -LiteralPath (Join-Path $script:TestRoot '.local/https/localhost.pem') -Destination (Join-Path $scratch '.local/https')
        Copy-Item -LiteralPath (Join-Path $script:TestRoot 'compose.tests.yaml') -Destination (Join-Path $scratch 'compose.yaml')
        [IO.File]::WriteAllLines((Join-Path $scratch '.env'),@('POSTGRES_DB=tds_m6a_test','TDS_APP_DB_USER=app_m6a',('TDS_APP_DB_PASSWORD='+('2'*64)),'TDS_POSTGRES_PORT=55433'))
        $api=Start-TestApi $(if ($Suite -eq 'Graph') {30} else {1})
        if ($Suite -eq 'Browser') {
            $fixture=Join-Path $scratch 'tools/BrowserWorkflowFixture/bin/Release/net10.0'
            New-Item -ItemType Directory -Force $fixture | Out-Null
            Copy-Item -Path (Join-Path $script:TestRoot 'tools/BrowserWorkflowFixture/bin/Release/net10.0/*') -Destination $fixture -Recurse
            $vite=Join-Path $script:TestRoot 'TDS-Frontend-main/node_modules/vite/bin/vite.js'
            # Tailwind's content paths resolve from cwd; retain the verified frontend cwd.
            $frontend=Start-OwnedProcess node @($vite,'--config',(Join-Path $script:TestRoot 'TDS-Frontend-main/vite.config.mjs')) @{} (Join-Path $script:TestRoot 'TDS-Frontend-main')
            Assert-Listener $frontend 3000 $vite 'node.exe'
            $result=Invoke-TestProcess node @((Join-Path $script:TestRoot 'tools/browser-workflows.cjs'),"$($api.Process.Id)","$($frontend.Process.Id)") -Directory $scratch -TimeoutSeconds 420 -EnvironmentValues @{TDS_PLAYWRIGHT_MODULE=(Resolve-Path -LiteralPath $PlaywrightModule).Path}
            Assert-TestExit $result 'Existing real Edge regression'
        } elseif ($Suite -eq 'Security') {
            $result=Invoke-TestProcess dotnet @((Join-Path $script:TestRoot 'tools/SecurityRegressionProbe/bin/Release/net10.0/SecurityRegressionProbe.dll'),"$($api.Process.Id)") -Directory $scratch -TimeoutSeconds 300
            Assert-TestExit $result 'Existing security regression'
        } else {
            $start=[Diagnostics.ProcessStartInfo]::new('dotnet')
            $start.UseShellExecute=$false; $start.CreateNoWindow=$true; $start.WorkingDirectory=$scratch
            $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
            $start.ArgumentList.Add((Join-Path $script:TestRoot 'tools/GraphIntegrationProbe/bin/Release/net10.0/GraphIntegrationProbe.dll'))
            $start.ArgumentList.Add("$($api.Process.Id)")
            $graph=[Diagnostics.Process]::Start($start); $errors=$graph.StandardError.ReadToEndAsync()
            try {
                $line=$graph.StandardOutput.ReadLineAsync(); $checkpoint=0; $deadline=[DateTime]::UtcNow.AddSeconds(420)
                while ([DateTime]::UtcNow -lt $deadline) {
                    if ($line.IsCompleted) {
                        $value=$line.GetAwaiter().GetResult()
                        if ($null -eq $value) { break }
                        if ($value.StartsWith('RESTART CHECKPOINT:')) {
                            $checkpoint++; Stop-OwnedProcess $api
                            if ($checkpoint -eq 2) { Assert-Owned; $null=Docker @('restart',$testContainerId) 40 }
                            $api=Start-TestApi 30
                            $reports=@(Get-ChildItem (Join-Path $scratch '.local/graph-probe') -Directory)
                            if ($reports.Count -ne 1 -or $checkpoint -gt 2) { throw 'Unexpected graph checkpoint identity.' }
                            $file=if($checkpoint -eq 1){'continue-api-pid.txt'}else{'continue-pid.txt'}
                            [IO.File]::WriteAllText((Join-Path $reports[0].FullName $file),"$($api.Process.Id)")
                        }
                        $line=$graph.StandardOutput.ReadLineAsync()
                    } else { Start-Sleep -Milliseconds 150 }
                }
                if (-not $graph.WaitForExit(1000)) { throw 'Graph probe timeout; inspect retained isolated environment.' }
                if ($graph.ExitCode -ne 0 -or $checkpoint -ne 2) { throw 'Existing graph regression failed; sanitized reports retained.' }
            } finally { if (-not $graph.HasExited) { $graph.Kill($true) }; $graph.Dispose() }
        }
        $directory=if($Suite -eq 'Browser'){'browser-probe'}elseif($Suite -eq 'Security'){'security-probe'}else{'graph-probe'}
        $reports=@(Get-ChildItem (Join-Path $scratch ".local/$directory") -Filter report.json -Recurse)
        if ($reports.Count -ne 1) { throw 'Expected exactly one report.' }
        $report=Get-Content -LiteralPath $reports[0].FullName -Raw | ConvertFrom-Json -AsHashtable
        if (-not ($report['Completed'] -or $report['completed'])) { throw 'Probe did not complete.' }
        if ($Suite -ne 'Browser' -and (-not $report['Cleaned'] -or -not $report['OriginalStateRestored'])) { throw 'Probe cleanup/fingerprint failed.' }
        if ($Suite -eq 'Browser' -and (-not $report['cleaned'] -or -not $report['originalStateRestored'])) { throw 'Browser cleanup/fingerprint failed.' }
        $report | ConvertTo-Json -Depth 30 | Set-Content (Join-Path $runDirectory 'probe-report.json')
        Write-Host "Existing $Suite probe passed; sanitized report retained under .local/m6a/$run."
    }
    if ((Sql 'SELECT (SELECT count(*) FROM users)+(SELECT count(*) FROM projects)+(SELECT count(*) FROM companycodes)+(SELECT count(*) FROM test)+(SELECT count(*) FROM invitations)+(SELECT count(*) FROM project_graphs);') -ne '0') { throw 'Test fixture cleanup did not restore empty business tables.' }
    if ((DevelopmentFingerprint) -ne $baseline) { throw 'Development fingerprint changed; stop and investigate.' }
    $after=Inventory
    if (($before | ConvertTo-Json -Compress) -ne ($after | ConvertTo-Json -Compress)) { throw 'Unrelated resource inventory changed; stop and investigate.' }
    $success=$true
} finally {
    Stop-OwnedProcess $frontend; Stop-OwnedProcess $api
    if ($success -and $created) {
        Assert-Owned
        # Remove ONLY this invocation's newly created, verified resources, never development data.
        $null=Docker @('rm','--force',$testContainerId) 30
        $null=Docker @('volume','rm',$volumeName) 25
        $networkName="$projectName`_default"
        $network=(Docker @('network','inspect',$networkName)) | ConvertFrom-Json
        if ($network.Labels.'com.docker.compose.project' -ne $projectName -or @($network.Containers.PSObject.Properties).Count -ne 0) { throw 'Unexpected test network; cleanup refused.' }
        $null=Docker @('network','rm',$network.Id)
        if (($before | ConvertTo-Json -Compress) -ne ((Inventory) | ConvertTo-Json -Compress) -or (DevelopmentFingerprint) -ne $baseline) { throw 'Final preservation check failed.' }
        @{ Suite=$Suite; Passed=$true; DevelopmentFingerprintUnchanged=$true; ExistingResourcesUnchanged=$true; TestResourcesRemoved=$true } | ConvertTo-Json | Set-Content (Join-Path $runDirectory 'result.json')
        Write-Host "PASS $Suite; development state preserved; only new test resources removed."
    } elseif ($created) { Write-Warning "Test failed: isolated container $containerName and volume $volumeName retained for inspection. No automatic destructive recovery." }
    Pop-Location
}

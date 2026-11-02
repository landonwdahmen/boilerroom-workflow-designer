#requires -Version 7.2
param([ValidateSet('All','Npm','NuGet')][string]$Check='All')
. (Join-Path $PSScriptRoot 'TestSupport.ps1')
$evidence = Join-Path $script:TestRoot '.local/dependency-checks'
New-Item -ItemType Directory -Force $evidence | Out-Null
$npm = if ($IsWindows) { 'npm.cmd' } else { 'npm' }
if ($Check -ne 'NuGet') {
    # Actual full/prod/signature commands still run; the exact owner-reviewed exception
    # fails closed on changed source, paths, production exposure or upstream evidence.
    $result = Invoke-TestProcess node @('scripts/npm-audit-policy.cjs') -TimeoutSeconds 420
    Write-Host $result.Output
    if ($result.Error) { Write-Host $result.Error }
    Assert-TestExit $result 'Full dependency audit and reviewed exception policy'
}
if ($Check -ne 'Npm') {
foreach ($project in @('Backend/ZitaDataSystem.csproj','tests/BoilerRoom.Tests/BoilerRoom.Tests.csproj')) {
    $result = Invoke-TestProcess dotnet @('list',$project,'package','--vulnerable','--include-transitive','--format','json','--no-restore') -TimeoutSeconds 120
    $name = if ($project.StartsWith('Backend')) { 'backend' } else { 'tests' }
    $result.Output | Set-Content (Join-Path $evidence "nuget-$name.json")
    Assert-TestExit $result "NuGet $name audit"
    if ($result.Error.Trim()) { throw "NuGet $name returned diagnostics; audit completeness must be reviewed." }
    $audit = $result.Output | ConvertFrom-Json -AsHashtable
    if ($audit['errors']) { throw 'NuGet advisory query incomplete.' }
    if (@($audit['projects']).Count -ne 1) { throw 'Unexpected NuGet project inventory.' }
    foreach ($item in $audit['projects']) { foreach ($framework in $item['frameworks']) {
        foreach ($package in @($framework['topLevelPackages'])+@($framework['transitivePackages'])) {
            if ($null -ne $package -and $package['vulnerabilities'] -and @($package['vulnerabilities']).Count -gt 0) { throw "NuGet $name reported advisories." }
        }
    } }
    Write-Host "NuGet $name complete graph check passed."
}
}

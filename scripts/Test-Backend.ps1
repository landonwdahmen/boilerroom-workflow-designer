#requires -Version 7.2
param([ValidateSet('Unit','Build','Restore','Tools')][string]$Task='Unit')
. (Join-Path $PSScriptRoot 'TestSupport.ps1')
Push-Location $script:TestRoot
try {
    $project = 'tests/BoilerRoom.Tests/BoilerRoom.Tests.csproj'
    switch ($Task) {
        Restore { Invoke-TestDotnet @('restore',$project,'--locked-mode','--source','https://api.nuget.org/v3/index.json','--disable-parallel','-p:NuGetAuditMode=all') }
        Build { Invoke-TestDotnet @('build','Backend/ZitaDataSystem.csproj','-c','Release','--no-restore'); Invoke-TestDotnet @('build',$project,'-c','Release','--no-restore') }
        Unit { Invoke-TestDotnet @('test',$project,'-c','Release','--no-restore','--filter','Category=Unit','--logger','console;verbosity=normal') }
        Tools { foreach ($name in @('SecurityRegressionProbe','GraphIntegrationProbe','BrowserWorkflowFixture','LocalAdministrator')) {
            Invoke-TestDotnet @('build',"tools/$name/$name.csproj",'-c','Release','--no-restore')
        } }
    }
} finally { Pop-Location }

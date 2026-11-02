#requires -Version 7.2
param([Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{32}$')][string]$Run)
. (Join-Path $PSScriptRoot 'TestSupport.ps1')
$directory=Join-Path $script:TestRoot ".local/m6a/$Run"
$journal=Get-Content -LiteralPath (Join-Path $directory 'owned-resources.json') -Raw | ConvertFrom-Json
$name="boilerroom-tds-m6a-$Run"; $volumeName="$name-data"; $project=$name
if ($journal.Run -ne $Run -or $journal.Container -ne $name -or $journal.Volume -ne $volumeName -or $journal.Project -ne $project) { throw 'Ownership journal mismatch.' }
function Docker([string[]]$Arguments) {
    $result=Invoke-TestProcess docker $Arguments -TimeoutSeconds 30
    Assert-TestExit $result 'Test resource cleanup'
    return $result.Output.Trim()
}
$identity=(Docker @('container','inspect',$journal.ContainerId)) | ConvertFrom-Json
$volume=(Docker @('volume','inspect',$volumeName)) | ConvertFrom-Json
if ($identity.Id -ne $journal.ContainerId -or $identity.Name -ne "/$name" -or
    $identity.Config.Labels.'com.docker.compose.project' -ne $project -or
    $identity.Config.Labels.'io.boilerroom-tds.test-run' -ne $Run -or
    $identity.Config.Labels.'io.boilerroom-tds.scope' -ne 'isolated-synthetic-tests' -or
    $volume.Labels.'io.boilerroom-tds.test-run' -ne $Run -or
    $volume.Labels.'io.boilerroom-tds.scope' -ne 'isolated-synthetic-tests' -or
    @($identity.Mounts | Where-Object { $_.Type -eq 'volume' -and $_.Name -eq $volumeName -and $_.Destination -eq '/var/lib/postgresql/data' }).Count -ne 1) { throw 'Fresh test resource checks failed; refusing cleanup.' }
$attachments=Docker @('ps','-aq','--filter',"volume=$volumeName",'--no-trunc')
if ($attachments -ne $journal.ContainerId) { throw 'Test volume has unexpected attachments.' }
$network=(Docker @('network','inspect',"$project`_default")) | ConvertFrom-Json
if ($network.Labels.'com.docker.compose.project' -ne $project -or @($network.Containers.PSObject.Properties).Count -gt 1) { throw 'Unexpected test network.' }
$null=Docker @('rm','--force',$journal.ContainerId)
$null=Docker @('volume','rm',$volumeName)
$null=Docker @('network','rm',$network.Id)
@{ Removed=$true; Run=$Run; OnlyOwnedTestResources=$true } | ConvertTo-Json | Set-Content (Join-Path $directory 'cleanup.json')
Write-Host 'Removed only the journaled M6A test container, volume and network; evidence retained.'

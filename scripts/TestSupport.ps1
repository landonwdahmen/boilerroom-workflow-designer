#requires -Version 7.2
# Shared mechanics only; verification layers have separate entry points.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:TestRoot = Split-Path $PSScriptRoot -Parent
function Invoke-TestProcess {
    param([string]$File, [string[]]$Arguments, [string]$Directory=$script:TestRoot,
        [int]$TimeoutSeconds=180, [hashtable]$EnvironmentValues=@{}, [string]$InputText='')
    $start = [Diagnostics.ProcessStartInfo]::new($File)
    $start.UseShellExecute = $false; $start.CreateNoWindow = $true
    $start.WorkingDirectory = $Directory
    $start.RedirectStandardOutput = $true; $start.RedirectStandardError = $true; $start.RedirectStandardInput = $true
    foreach ($argument in $Arguments) { $start.ArgumentList.Add($argument) }
    foreach ($key in $EnvironmentValues.Keys) { $start.Environment[$key] = [string]$EnvironmentValues[$key] }
    if ($File -eq 'docker') {
        foreach ($key in @($start.Environment.Keys)) {
            if ($key -like 'COMPOSE_*' -or $key -eq 'DOCKER_HOST' -or $key -eq 'DOCKER_CONTEXT') { $null = $start.Environment.Remove($key) }
        }
    }
    $process = [Diagnostics.Process]::Start($start)
    $stdout = $process.StandardOutput.ReadToEndAsync(); $stderr = $process.StandardError.ReadToEndAsync()
    try {
        if ($InputText) { $process.StandardInput.WriteLine($InputText) }
        $process.StandardInput.Close()
        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            $process.Kill($true)
            throw "Timed out running $File; only this test-owned CLI process was terminated. Inspect resources before retrying."
        }
        return [pscustomobject]@{ ExitCode=$process.ExitCode; Output=$stdout.GetAwaiter().GetResult(); Error=$stderr.GetAwaiter().GetResult() }
    } finally { $process.Dispose() }
}
function Assert-TestExit($Result, [string]$Label) {
    if ($Result.ExitCode -ne 0) { throw "$Label failed (exit $($Result.ExitCode)); raw output withheld where it may contain sensitive data." }
}
function Invoke-TestDotnet([string[]]$Arguments) {
    $result = Invoke-TestProcess dotnet $Arguments -TimeoutSeconds 240
    # Standard compilation/unit output contains no connection configuration.
    Write-Host $result.Output
    if ($result.Error) { Write-Host $result.Error }
    Assert-TestExit $result 'dotnet verification'
}

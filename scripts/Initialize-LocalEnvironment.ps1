#requires -Version 7.2
. (Join-Path $PSScriptRoot 'LocalDevelopment.ps1')
$file = Join-Path $script:ProjectRoot '.env'
if (Test-Path -LiteralPath $file) {
    $null = Get-LocalSettings
    Write-Host 'Existing local .env is valid; it was not overwritten.'
    return
}
$template = [IO.File]::ReadAllText((Join-Path $script:ProjectRoot '.env.example'))
$template = $template.Replace('REPLACE_WITH_RANDOM_BOOTSTRAP_PASSWORD', [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)))
$template = $template.Replace('REPLACE_WITH_DIFFERENT_RANDOM_APP_PASSWORD', [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)))
$stream = [IO.File]::Open($file, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
try { $bytes = [Text.UTF8Encoding]::new($false).GetBytes($template); $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
$null = Get-LocalSettings
Write-Host 'Created ignored .env with independent random local-only credentials. Values are not displayed.'

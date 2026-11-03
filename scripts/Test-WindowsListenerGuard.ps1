#requires -Version 7.2
$ErrorActionPreference='Stop'
if (-not $IsWindows) { throw 'These focused native/HTTPS checks require Windows; Linux Database CI does not load this helper.' }
. (Join-Path $PSScriptRoot 'WindowsListenerGuard.ps1')
$testRoot=Split-Path -Parent $PSScriptRoot
$evidence=Join-Path $testRoot ('.local/windows-listener-tests/'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
$cases=[Collections.Generic.List[object]]::new()
function Case([string]$Name,[scriptblock]$Body) {
    try { & $Body; $cases.Add(@{Name=$Name;Passed=$true}) }
    catch { $cases.Add(@{Name=$Name;Passed=$false;Reason=$_.Exception.Message}) }
}
function Reject([scriptblock]$Body) {
    $rejected=$false;try { & $Body | Out-Null } catch { $rejected=$true }
    if (-not $rejected) { throw 'Unsafe test input was accepted.' }
}
function Row([string]$Address='127.0.0.1',[int]$Owner=123,[int]$State=0,[int]$Port=3000) {
    [pscustomobject]@{LocalAddress=$Address;LocalPort=$Port;OwningProcess=$Owner;RawState=$State;Classification='TCP_TABLE_OWNER_PID_LISTENER'}
}
$fixtureStart=[DateTime]::UtcNow
function Identity {
    [pscustomobject]@{ProcessId=123;ParentProcessId=456;Name='node.exe';ExecutablePath='C:\reviewed\node.exe';CreationDate=$fixtureStart;CommandLine='"C:\reviewed\node.exe" "C:\reviewed\vite.js"'}
}
function Accept([object[]]$Rows,$Identity=(Identity),[int]$Port=3000) {
    $null=Assert-WindowsListenerSnapshot $Rows $Port 123 $Identity 'node.exe' 'C:\reviewed\vite.js' 'C:\reviewed\node.exe' 456 $fixtureStart
}
Case 'IPv4 loopback with misleading raw state zero accepted' { Accept @((Row)) }
Case 'IPv6 loopback with misleading raw state one accepted' { Accept @((Row '::1' 123 1)) }
Case 'IPv6 normally reported state accepted' { Accept @((Row '::1' 123 2)) }
Case 'Dual loopback with one exact owner accepted' { Accept @((Row),(Row '::1')) }
Case 'No listener rejected even with successful startup-log text' { $i=Identity;$i|Add-Member NoteProperty StartupLog 'Now listening on https://localhost:3000';Reject { Accept @() $i } }
Case 'Wrong target port rejected' { Reject { Accept @((Row '127.0.0.1' 123 0 3001)) } }
Case 'Wrong owner PID rejected' { Reject { Accept @((Row '127.0.0.1' 999)) } }
Case 'Conflicting owner on the same port rejected' { Reject { Accept @((Row),(Row '::1' 999)) } }
Case 'Duplicate ambiguous listener rejected' { Reject { Accept @((Row),(Row)) } }
Case 'IPv4 wildcard rejected' { Reject { Accept @((Row '0.0.0.0')) } }
Case 'IPv6 wildcard rejected' { Reject { Accept @((Row '::')) } }
Case 'Nonloopback endpoint rejected' { Reject { Accept @((Row '192.0.2.1')) } }
Case 'Backend unexpected IPv6 endpoint rejected' { Reject { Accept @((Row '::1' 123 0 8836)) (Identity) 8836 } }
Case 'State alone cannot prove listening' { $r=Row '127.0.0.1' 123 2;$r.Classification='State says Listen';Reject { Accept @($r) } }
Case 'All-connections classification rejected' { $r=Row;$r.Classification='TCP_TABLE_OWNER_PID_ALL';Reject { Accept @($r) } }
Case 'Wrong identity PID rejected' { $i=Identity;$i.ProcessId=999;Reject { Accept @((Row)) $i } }
Case 'Wrong executable name rejected' { $i=Identity;$i.Name='other.exe';Reject { Accept @((Row)) $i } }
Case 'Wrong executable path rejected' { $i=Identity;$i.ExecutablePath='C:\other\node.exe';Reject { Accept @((Row)) $i } }
Case 'Wrong parent rejected' { $i=Identity;$i.ParentProcessId=999;Reject { Accept @((Row)) $i } }
Case 'Creation-time/PID reuse mismatch rejected' { $i=Identity;$i.CreationDate=$fixtureStart.AddSeconds(10);Reject { Accept @((Row)) $i } }
Case 'Missing creation time rejected' { $i=Identity;$i.CreationDate=$null;Reject { Accept @((Row)) $i } }
Case 'Wrong command argument rejected' { $i=Identity;$i.CommandLine='node C:\other\vite.js';Reject { Accept @((Row)) $i } }
Case 'Expected path prefix is not an exact argument' { $i=Identity;$i.CommandLine='node C:\reviewed\vite.js.untrusted';Reject { Accept @((Row)) $i } }
Case 'Missing command line rejected' { $i=Identity;$i.CommandLine='';Reject { Accept @((Row)) $i } }
Case 'Multiple process identities rejected' { Reject { Accept @((Row)) @((Identity),(Identity)) } }
Case 'Unfiltered CIM corroborates misleading state without classifying it' {
    Assert-WindowsListenerCorroboration @((Row)) @([pscustomobject]@{LocalAddress='127.0.0.1';LocalPort=3000;OwningProcess=123;RemotePort=0;State=$null})
}
Case 'Missing CIM corroboration rejected' { Reject { Assert-WindowsListenerCorroboration @((Row)) @() } }
Case 'Ambiguous CIM corroboration rejected' {
    $r=[pscustomobject]@{LocalAddress='127.0.0.1';LocalPort=3000;OwningProcess=123;RemotePort=0}
    Reject { Assert-WindowsListenerCorroboration @((Row)) @($r,$r) }
}
Case 'Connected-only CIM tuple is not listener corroboration' {
    Reject { Assert-WindowsListenerCorroboration @((Row)) @([pscustomobject]@{LocalAddress='127.0.0.1';LocalPort=3000;OwningProcess=123;RemotePort=1234}) }
}
Case 'Truncated native table rejected' { Reject { [BoilerRoom.Verification.WindowsTcpListeners]::Decode([byte[]]@(1,0,0,0),2) } }
Case 'Negative native table count rejected' { Reject { [BoilerRoom.Verification.WindowsTcpListeners]::Decode([byte[]]@(255,255,255,255),2) } }
Case 'Missing native table header rejected' { Reject { [BoilerRoom.Verification.WindowsTcpListeners]::Decode([byte[]]@(0,0,0),2) } }
Case 'Unexpected native address family rejected' { Reject { [BoilerRoom.Verification.WindowsTcpListeners]::Decode([byte[]]@(0,0,0,0),99) } }
Case 'Native IPv4 row decoded with network-order port and raw state preserved' {
    $b=[byte[]]::new(28);[BitConverter]::GetBytes([int]1).CopyTo($b,0);$b[8]=127;$b[11]=1;$b[12]=0x12;$b[13]=0x34;[BitConverter]::GetBytes([uint32]123).CopyTo($b,24)
    $r=@([BoilerRoom.Verification.WindowsTcpListeners]::Decode($b,2))
    if($r.Count -ne 1 -or $r[0].LocalAddress -ne '127.0.0.1' -or $r[0].LocalPort -ne 4660 -or $r[0].RawState -ne 0 -or $r[0].OwningProcess -ne 123){throw 'IPv4 native decoding differs.'}
}
Case 'Native IPv6 row decoded with misleading state retained' {
    $b=[byte[]]::new(60);[BitConverter]::GetBytes([int]1).CopyTo($b,0);$b[19]=1;$b[24]=0x12;$b[25]=0x34;[BitConverter]::GetBytes([uint32]1).CopyTo($b,52);[BitConverter]::GetBytes([uint32]123).CopyTo($b,56)
    $r=@([BoilerRoom.Verification.WindowsTcpListeners]::Decode($b,23))
    if($r.Count -ne 1 -or $r[0].LocalAddress -ne '::1' -or $r[0].LocalPort -ne 4660 -or $r[0].RawState -ne 1 -or $r[0].OwningProcess -ne 123){throw 'IPv6 native decoding differs.'}
}
Case 'Exited owned process rejected before inspection' {
    $child=@{Process=[pscustomobject]@{HasExited=$true;Id=123;StartTime=$fixtureStart}}
    Reject { Assert-VerifiedWindowsListener $child 3000 'C:\reviewed\vite.js' 'node.exe' }
}
Case 'Failed native inspection cannot fall back to CIM or logs' {
    $saved=(Get-Command Get-VerifiedWindowsListeners).ScriptBlock
    try {
        Set-Item Function:script:Get-VerifiedWindowsListeners { throw 'Synthetic native inspection failure' }
        $child=@{Process=[pscustomobject]@{HasExited=$false;Id=123;StartTime=$fixtureStart}}
        Reject { Assert-VerifiedWindowsListener $child 3000 'C:\reviewed\vite.js' 'node.exe' }
        Reject { Assert-WindowsPortsAvailable @(3000,8836) }
    } finally { Set-Item Function:script:Get-VerifiedWindowsListeners $saved }
}
Case 'No listener times out safely despite a successful startup log' {
    $saved=(Get-Command Get-VerifiedWindowsListeners).ScriptBlock
    try {
        Set-Item Function:script:Get-VerifiedWindowsListeners { @() }
        $child=@{Process=[pscustomobject]@{HasExited=$false;Id=123;StartTime=$fixtureStart};StartupLog='Now listening on https://localhost:3000'}
        $watch=[Diagnostics.Stopwatch]::StartNew()
        Reject { Assert-VerifiedWindowsListener $child 3000 'C:\reviewed\vite.js' 'node.exe' }
        if($watch.Elapsed.TotalSeconds -lt 39 -or $watch.Elapsed.TotalSeconds -gt 50){throw 'Missing-listener observation bound differs.'}
    } finally { Set-Item Function:script:Get-VerifiedWindowsListeners $saved }
}
Case 'Process exit after a first native observation is rejected' {
    $savedNative=(Get-Command Get-VerifiedWindowsListeners).ScriptBlock;$savedCim=(Get-Command Get-CimInstance).ScriptBlock
    try {
        Set-Item Function:script:Get-VerifiedWindowsListeners { @((Row)) }
        function script:Get-CimInstance {
            $i=Identity;$i.ParentProcessId=$PID;$i.ExecutablePath=@(Get-Command node -CommandType Application)[0].Source;return $i
        }
        $process=[pscustomobject]@{Id=123;StartTime=$fixtureStart;Checks=0}
        $process|Add-Member ScriptProperty HasExited { $this.Checks++;return $this.Checks -gt 1 }
        Reject { Assert-VerifiedWindowsListener @{Process=$process} 3000 'C:\reviewed\vite.js' 'node.exe' }
        if($process.Checks -lt 2){throw 'Test did not reach the second process-liveness check.'}
    } finally {
        Set-Item Function:script:Get-VerifiedWindowsListeners $savedNative
        if($savedCim){Set-Item Function:script:Get-CimInstance $savedCim}else{
            # Remove the actual function item; a scoped provider path can leave
            # the shadow in place and make later real-process checks use it.
            Remove-Item Function:Get-CimInstance -ErrorAction Stop
            if((Get-Command Get-CimInstance).CommandType -ne 'Cmdlet'){throw 'CIM test double was not removed.'}
        }
    }
}
foreach($address in @('127.0.0.1','::1')) {
    Case "Real $address native ownership, connected-only exclusion and disposal" {
        $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Parse($address),0);$client=$null;$accepted=$null
        try {
            $listener.Start();$port=$listener.LocalEndpoint.Port
            $r=@(Get-VerifiedWindowsListeners|Where-Object{$_.LocalAddress -eq $address -and $_.LocalPort -eq $port})
            if($r.Count -ne 1 -or $r[0].OwningProcess -ne $PID){throw 'Native loopback ownership differs.'}
            Reject { Assert-WindowsPortsAvailable @($port) }
            $client=[Net.Sockets.TcpClient]::new();if(-not $client.ConnectAsync($address,$port).Wait(3000)){throw 'Synthetic connection timed out.'};$accepted=$listener.AcceptTcpClient()
            $clientPort=$client.Client.LocalEndPoint.Port
            if(@(Get-VerifiedWindowsListeners|Where-Object{$_.LocalPort -eq $clientPort -and $_.OwningProcess -eq $PID}).Count){throw 'Connected-only endpoint was classified as listening.'}
            if(@(Get-VerifiedWindowsListeners|Where-Object{$_.LocalPort -eq $port -and $_.OwningProcess -eq $PID}).Count -ne 1){throw 'Listening socket was duplicated by its accepted connection.'}
        } finally {if($accepted){$accepted.Dispose()};if($client){$client.Dispose()};$listener.Stop()}
        if(@(Get-VerifiedWindowsListeners|Where-Object{$_.LocalPort -eq $port -and $_.LocalAddress -eq $address -and $_.OwningProcess -eq $PID}).Count){throw 'Disposed test listener remains.'}
    }
}
Case 'Real child verification and safe cleanup after rejected identity' {
    $file=Join-Path $evidence 'socket-child.cjs'
    [IO.File]::WriteAllText($file,"const net=require('node:net');const s=net.createServer(c=>c.end());s.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:s.address().port})));setTimeout(()=>s.close(),60000);")
    $control=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0);$child=$null
    try {
        $control.Start();$controlPort=$control.LocalEndpoint.Port
        $start=[Diagnostics.ProcessStartInfo]::new(@(Get-Command node -CommandType Application)[0].Source);$start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true;$start.ArgumentList.Add($file)
        $child=[Diagnostics.Process]::Start($start);$ready=$child.StandardOutput.ReadLineAsync()
        if(-not $ready.Wait(5000)){throw 'Synthetic owned child did not become ready.'}
        $port=($ready.GetAwaiter().GetResult()|ConvertFrom-Json).port
        Assert-VerifiedWindowsListener @{Process=$child} $port $file 'node.exe' $evidence
        Reject { Assert-VerifiedWindowsListener @{Process=$child} $port ($file+'.wrong') 'node.exe' }
        # The Process instance was created here; independently recheck the correct
        # identity before cleaning up. Never kill a process found by port/name.
        Assert-VerifiedWindowsListener @{Process=$child} $port $file 'node.exe'
    } finally {
        if($child){if(-not $child.HasExited){$child.Kill($true);if(-not $child.WaitForExit(5000)){throw 'Owned child cleanup timed out.'}};$child.Dispose()}
        $controlStillPresent=@(Get-VerifiedWindowsListeners|Where-Object{$_.LocalPort -eq $controlPort -and $_.OwningProcess -eq $PID}).Count -eq 1
        $control.Stop()
        if(-not $controlStillPresent){throw 'Unrelated control listener was disturbed by child cleanup.'}
    }
    if(@(Get-VerifiedWindowsListeners|Where-Object LocalPort -eq $port).Count){throw 'Failed-verification owned listener remains.'}
}

# Deliberately untrusted certificate lives only in memory; no export, OS trust
# change or certificate-validation bypass. This tests the actual shipped HTTPS guard.
Add-Type -TypeDefinition @'
using System;
using System.Net;
using System.Net.Sockets;
using System.Net.Security;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Security.Authentication;
using System.Text;
using System.Threading.Tasks;
public sealed class ListenerGuardTlsFixture : IDisposable {
 readonly TcpListener listener;readonly Task work;readonly RSA rsa;readonly X509Certificate2 certificate;TcpClient peer;
 public int Port {get;private set;}
 public ListenerGuardTlsFixture(bool tls) {
  rsa=RSA.Create(2048);var request=new CertificateRequest("CN=localhost",rsa,HashAlgorithmName.SHA256,RSASignaturePadding.Pkcs1);
  var names=new SubjectAlternativeNameBuilder();names.AddDnsName("localhost");request.CertificateExtensions.Add(names.Build());
  certificate=request.CreateSelfSigned(DateTimeOffset.UtcNow.AddMinutes(-1),DateTimeOffset.UtcNow.AddMinutes(5));
  listener=new TcpListener(IPAddress.Loopback,0);listener.Start();Port=((IPEndPoint)listener.LocalEndpoint).Port;
  work=Task.Run(async()=>{try {peer=await listener.AcceptTcpClientAsync();using(var stream=peer.GetStream()){if(tls){using(var ssl=new SslStream(stream,false)){await ssl.AuthenticateAsServerAsync(certificate,false,SslProtocols.None,false);}}else{var bytes=Encoding.ASCII.GetBytes("HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n");await stream.WriteAsync(bytes,0,bytes.Length);}}}catch{}finally{peer?.Dispose();}});
 }
 public void Dispose(){listener.Stop();peer?.Dispose();if(!work.Wait(3000))throw new InvalidOperationException("TLS fixture did not stop");certificate.Dispose();rsa.Dispose();}
}
'@
Case 'Untrusted localhost HTTPS certificate rejected' {
    $fixture=[ListenerGuardTlsFixture]::new($true)
    try { Reject { Assert-TrustedLoopbackHttps $fixture.Port } } finally { $fixture.Dispose() }
}
Case 'Plain HTTP cannot satisfy HTTPS verification' {
    $fixture=[ListenerGuardTlsFixture]::new($false)
    try { Reject { Assert-TrustedLoopbackHttps $fixture.Port } } finally { $fixture.Dispose() }
}
$failed=@($cases|Where-Object{-not $_.Passed}).Count
$summary=[ordered]@{Passed=$cases.Count-$failed;Failed=$failed;Cases=$cases;EvidenceDirectory=$evidence;PrivateCertificatesExported=$false;WindowsOnly=$true}
$summary|ConvertTo-Json -Depth 7|Set-Content (Join-Path $evidence 'result.json')
Write-Host "Focused Windows listener checks: $($summary.Passed) passed; $failed failed. Evidence: $evidence"
if($failed){$cases|Where-Object{-not $_.Passed}|ForEach-Object{Write-Host ($_.Name+': '+$_.Reason)};throw 'Focused Windows listener verification failed.'}

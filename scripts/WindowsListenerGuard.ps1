# Windows-only verification tooling; never loaded by the Linux Database suite.
# Listener classification comes from the native owner-PID LISTENER table, not
# Get-NetTCPConnection.State. Raw state is retained only as diagnostic metadata.
if (-not $IsWindows) { throw 'Windows listener inspection requires Windows.' }
if (-not ('BoilerRoom.Verification.WindowsTcpListeners' -as [type])) {
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Net;
using System.Runtime.InteropServices;
namespace BoilerRoom.Verification {
 public static class WindowsTcpListeners {
  const int OwnerPidListener = 3, MaxBytes = 32 * 1024 * 1024;
  [DllImport("iphlpapi.dll")] static extern uint GetExtendedTcpTable(IntPtr table, ref int size, bool order, uint family, int kind, uint reserved);
  [DllImport("shell32.dll", CharSet=CharSet.Unicode, ExactSpelling=true, SetLastError=true)] static extern IntPtr CommandLineToArgvW(string command, out int count);
  [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr memory);
  public sealed class Row {
   public string LocalAddress {get;set;}
   public int LocalPort {get;set;}
   public uint OwningProcess {get;set;}
   public uint RawState {get;set;}
   public uint Family {get;set;}
   public string Classification {get;set;}
  }
  // Public for focused malformed-buffer tests; Read always obtains its own table.
  public static Row[] Decode(byte[] bytes, uint family) {
   if(family!=2 && family!=23) throw new ArgumentException("Unexpected address family");
   if(bytes==null || bytes.Length<4 || bytes.Length>MaxBytes) throw new InvalidOperationException("Invalid listener table size");
   int count=BitConverter.ToInt32(bytes,0), stride=family==2?24:56;
   if(count<0 || 4L+(long)count*stride>bytes.Length) throw new InvalidOperationException("Truncated listener table");
   var rows=new List<Row>();
   for(int i=0;i<count;i++) {
    int offset=4+i*stride; string address; uint port,state,pid;
    if(family==2) {
     address=new IPAddress(BitConverter.ToUInt32(bytes,offset+4)).ToString();
     state=BitConverter.ToUInt32(bytes,offset);port=BitConverter.ToUInt32(bytes,offset+8);pid=BitConverter.ToUInt32(bytes,offset+20);
    } else {
     var ip=new byte[16];Array.Copy(bytes,offset,ip,0,16);
     address=new IPAddress(ip,BitConverter.ToUInt32(bytes,offset+16)).ToString();
     port=BitConverter.ToUInt32(bytes,offset+20);state=BitConverter.ToUInt32(bytes,offset+48);pid=BitConverter.ToUInt32(bytes,offset+52);
    }
    rows.Add(new Row {LocalAddress=address,LocalPort=(int)(((port&255)<<8)|((port>>8)&255)),OwningProcess=pid,RawState=state,Family=family,Classification="TCP_TABLE_OWNER_PID_LISTENER"});
   }
   return rows.ToArray();
  }
  public static Row[] Read(uint family) {
   if(family!=2 && family!=23) throw new ArgumentException("Unexpected address family");
   int size=0;uint code=GetExtendedTcpTable(IntPtr.Zero,ref size,false,family,OwnerPidListener,0);
   if(code!=122) throw new Win32Exception((int)code,"Listener table sizing failed");
   for(int attempt=0;attempt<3;attempt++) {
    if(size<4 || size>MaxBytes) throw new InvalidOperationException("Invalid listener allocation size");
    int allocated=size;IntPtr buffer=Marshal.AllocHGlobal(allocated);
    try {
     code=GetExtendedTcpTable(buffer,ref size,false,family,OwnerPidListener,0);
     if(code==122) continue;
     if(code!=0) throw new Win32Exception((int)code,"Listener table inspection failed");
     if(size<4 || size>allocated) throw new InvalidOperationException("Invalid returned listener table size");
     var bytes=new byte[size];Marshal.Copy(buffer,bytes,0,size);return Decode(bytes,family);
    } finally {Marshal.FreeHGlobal(buffer);}
   }
   throw new InvalidOperationException("Listener table size did not stabilize");
  }
  public static string[] Arguments(string command) {
   if(String.IsNullOrWhiteSpace(command)) throw new ArgumentException("Missing process command line");
   int count;IntPtr pointer=CommandLineToArgvW(command,out count);
   if(pointer==IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(),"Cannot inspect process command line");
   try {if(count<1 || count>4096) throw new InvalidOperationException("Invalid argument count");var result=new string[count];for(int i=0;i<count;i++)result[i]=Marshal.PtrToStringUni(Marshal.ReadIntPtr(pointer,i*IntPtr.Size));return result;}
   finally {LocalFree(pointer);}
  }
 }
}
'@
}

function Get-VerifiedWindowsListeners {
    @([BoilerRoom.Verification.WindowsTcpListeners]::Read(2)) + @([BoilerRoom.Verification.WindowsTcpListeners]::Read(23))
}

function Assert-WindowsListenerSnapshot {
    param([AllowEmptyCollection()][object[]]$Rows, [int]$Port, [int]$ExpectedPID,
        $Identity, [string]$ExpectedName, [string]$ExpectedPath, [string]$ExpectedExecutable,
        [int]$ExpectedParent, [datetime]$ExpectedStartTime)
    if ($Port -lt 1 -or $Port -gt 65535 -or $ExpectedPID -le 0 -or $ExpectedParent -le 0) { throw 'Invalid expected listener identity.' }
    $listeners = @($Rows | Where-Object LocalPort -eq $Port)
    if (-not $listeners.Count) { throw 'No independently classified listener.' }
    foreach ($row in $listeners) {
        if ($row.Classification -cne 'TCP_TABLE_OWNER_PID_LISTENER' -or $row.OwningProcess -ne $ExpectedPID -or
            $row.LocalAddress -notin @('127.0.0.1','::1')) { throw 'Listener classification, owner or loopback mismatch.' }
        if ($Port -eq 8836 -and $row.LocalAddress -ne '127.0.0.1') { throw 'Backend fixed IPv4 endpoint differs.' }
    }
    if (@($listeners | Group-Object LocalAddress,LocalPort,OwningProcess | Where-Object Count -ne 1).Count) { throw 'Ambiguous duplicate listeners.' }
    if ($null -eq $Identity -or @($Identity).Count -ne 1 -or $Identity.ProcessId -ne $ExpectedPID -or $Identity.ParentProcessId -ne $ExpectedParent -or
        $Identity.Name -ine $ExpectedName -or -not $Identity.ExecutablePath -or -not $Identity.CreationDate) { throw 'Owned child process identity mismatch.' }
    if (-not [IO.Path]::IsPathRooted($ExpectedPath) -or -not [IO.Path]::IsPathRooted($ExpectedExecutable) -or
        [IO.Path]::GetFullPath($Identity.ExecutablePath) -ine [IO.Path]::GetFullPath($ExpectedExecutable) -or
        [Math]::Abs((([datetime]$Identity.CreationDate).ToUniversalTime()-$ExpectedStartTime.ToUniversalTime()).TotalSeconds) -gt 1) { throw 'Executable path or process creation time mismatch.' }
    $arguments = [BoilerRoom.Verification.WindowsTcpListeners]::Arguments($Identity.CommandLine)
    $pathArguments = @($arguments | Where-Object { [IO.Path]::IsPathRooted($_) } | ForEach-Object { [IO.Path]::GetFullPath($_) })
    if ($pathArguments -inotcontains [IO.Path]::GetFullPath($ExpectedPath)) { throw 'Expected command argument path mismatch.' }
    return $listeners
}

function Assert-WindowsPortsAvailable([int[]]$Ports) {
    $rows = @(Get-VerifiedWindowsListeners)
    if (@($rows | Where-Object LocalPort -in $Ports).Count) { throw 'Required test port already has a listener; no existing resource is stopped.' }
}

function Assert-WindowsListenerCorroboration([object[]]$Rows,[AllowEmptyCollection()][object[]]$CimRows) {
    foreach ($row in $Rows) {
        if (@($CimRows | Where-Object { $_.LocalAddress -eq $row.LocalAddress -and $_.LocalPort -eq $row.LocalPort -and $_.OwningProcess -eq $row.OwningProcess -and $_.RemotePort -eq 0 }).Count -ne 1) { throw 'Unfiltered CIM does not corroborate the exact native listener tuple.' }
    }
}

function Assert-TrustedLoopbackHttps([int]$Port) {
    if ($Port -lt 1 -or $Port -gt 65535) { throw 'Invalid HTTPS verification port.' }
    $handler = [Net.Http.HttpClientHandler]::new()
    $handler.UseProxy=$false; $handler.AllowAutoRedirect=$false
    $client = [Net.Http.HttpClient]::new($handler); $client.Timeout=[TimeSpan]::FromSeconds(10)
    $response=$null
    try {
        # Default platform certificate validation: no callback, HTTP fallback or redirects.
        $response=$client.GetAsync("https://localhost:$Port/",[Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
        if ([int]$response.StatusCode -ge 500) { throw 'HTTPS endpoint returned a server error.' }
    } catch { throw 'Normally trusted localhost HTTPS verification failed; no certificate bypass permitted.' }
    finally { if ($response) { $response.Dispose() }; $client.Dispose() }
}

function Assert-VerifiedWindowsListener {
    param($Child, [int]$Port, [string]$ExpectedPath, [string]$ExpectedName, [string]$JournalDirectory)
    $executable = @(Get-Command $(if ($ExpectedName -ieq 'dotnet.exe') {'dotnet'} elseif ($ExpectedName -ieq 'node.exe') {'node'} else {throw 'Unexpected application executable.'}) -CommandType Application -ErrorAction Stop)[0].Source
    $expectedStart=$Child.Process.StartTime
    $deadline=[DateTime]::UtcNow.AddSeconds(40); $previous=''; $consecutive=0; $observations=@()
    do {
        if ($Child.Process.HasExited) { throw 'Test-owned child exited before listener verification.' }
        $rows=@(Get-VerifiedWindowsListeners); $matching=@($rows | Where-Object LocalPort -eq $Port)
        if ($matching.Count) {
            $identity=Get-CimInstance Win32_Process -Filter "ProcessId = $($Child.Process.Id)" -ErrorAction Stop
            $matching=@(Assert-WindowsListenerSnapshot $rows $Port $Child.Process.Id $identity $ExpectedName $ExpectedPath $executable $PID $expectedStart)
            $signature=($matching | ForEach-Object { "$($_.LocalAddress)|$($_.LocalPort)|$($_.OwningProcess)" } | Sort-Object) -join ';'
            $consecutive=if ($signature -ceq $previous) {$consecutive+1} else {1}; $previous=$signature
            $observations+=@{UTC=[DateTime]::UtcNow.ToString('o');Rows=$matching;ProcessId=$identity.ProcessId;ParentProcessId=$identity.ParentProcessId;ExecutablePath=$identity.ExecutablePath;CreationTimeMatches=$true}
        } else { $consecutive=0; $previous='' }
        if ($consecutive -ge 2) { break }
        Start-Sleep -Milliseconds 300
    } while ([DateTime]::UtcNow -lt $deadline)
    if ($consecutive -lt 2) { throw 'Bounded independent listener observations did not stabilize.' }
    $cim=@(Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop)
    Assert-WindowsListenerCorroboration $matching $cim
    if ($Child.Process.HasExited) { throw 'Child exited during listener corroboration.' }
    if ($JournalDirectory) { $observations | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $JournalDirectory "listener-$Port.json") }
}

function Assert-OwnedWindowsHttpsEndpoint {
    param($Child,[int]$Port,[string]$ExpectedPath,[string]$ExpectedName,[string]$JournalDirectory)
    Assert-VerifiedWindowsListener $Child $Port $ExpectedPath $ExpectedName $JournalDirectory
    Assert-TrustedLoopbackHttps $Port
    # Re-establish ownership after TLS so a successful response cannot replace it.
    Assert-VerifiedWindowsListener $Child $Port $ExpectedPath $ExpectedName $JournalDirectory
}

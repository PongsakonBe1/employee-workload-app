$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $repoRoot '.tools/calendar-emulator'
New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null
$assets = @(
  @{ Name='temurin-21.zip'; Url='https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.13%2B9/OpenJDK21U-jdk_x64_windows_hotspot_21.0.13_9.zip'; Hash='a4dbaa05fca4bd89d84584e58c459bd732efebb1722af80ab13c6516832004f9' },
  @{ Name='cloud-firestore-emulator-v1.21.0.jar'; Url='https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.21.0.jar'; Hash='c3d3680a89d946a90a027365ea14c26c6472a162bcf37f099bbb1ebd66d25e8e' }
)
foreach ($asset in $assets) {
  $target = Join-Path $toolRoot $asset.Name
  if (-not (Test-Path -LiteralPath $target)) { Invoke-WebRequest -Uri $asset.Url -OutFile $target }
  if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $asset.Hash) { throw "Checksum mismatch: $($asset.Name)" }
}
$javaExe = Join-Path $toolRoot 'jdk-21.0.13+9/bin/java.exe'
if (-not (Test-Path -LiteralPath $javaExe)) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $toolRoot 'temurin-21.zip'))
  try {
    $prefix = [System.IO.Path]::GetFullPath($toolRoot) + [System.IO.Path]::DirectorySeparatorChar
    foreach ($entry in $zip.Entries) {
      $resolved = [System.IO.Path]::GetFullPath((Join-Path $toolRoot $entry.FullName))
      if (-not $resolved.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Archive path escapes the tool directory' }
    }
  } finally { $zip.Dispose() }
  Expand-Archive -LiteralPath (Join-Path $toolRoot 'temurin-21.zip') -DestinationPath $toolRoot
}
& $javaExe -version
if ($LASTEXITCODE -ne 0) { throw 'Portable Java validation failed' }
Write-Output 'Verified portable Java 21 and Firestore emulator 1.21.0; system PATH unchanged.'

param([string]$ArchivePath = 'artifacts/aurzen-coolify.zip', [switch]$Extract)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$zipPath = (Resolve-Path -LiteralPath $ArchivePath).Path
$zip = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $manifestEntry = $zip.GetEntry('aurzen/RELEASE-MANIFEST.json')
  if (-not $manifestEntry) { throw 'Release manifest is missing' }
  $reader = New-Object IO.StreamReader($manifestEntry.Open())
  try { $manifest = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
  if ($zip.Entries.Count -ne $manifest.files.Count + 1) { throw 'Unexpected archive file count' }
  foreach ($entry in $zip.Entries) {
    if (-not $entry.FullName.StartsWith('aurzen/') -or $entry.FullName -match '(^|/)\.\.(/|$)' -or $entry.FullName.Contains('\')) { throw 'Unsafe archive path' }
    if ($entry.FullName -match '(^|/)(node_modules|\.git|\.next|data|dist|artifacts)/' -or $entry.FullName -match '(^|/)\.env(?!\.example$)' -or $entry.FullName -match '\.(sqlite|pem|key|tsbuildinfo)$') { throw ('Excluded file in archive: ' + $entry.FullName) }
  }
  foreach ($file in $manifest.files) {
    $entry = $zip.GetEntry($file.path)
    if (-not $entry -or $entry.Length -ne $file.bytes) { throw ('Missing or invalid file: ' + $file.path) }
    $stream = $entry.Open()
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $actual = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() } finally { $stream.Dispose(); $sha.Dispose() }
    if ($actual -ne $file.sha256) { throw ('Hash mismatch: ' + $file.path) }
  }
  foreach ($required in @('README.md', '.gitignore', '.dockerignore', '.env.example', 'package-lock.json', 'compose.yaml', 'apps/api/Dockerfile', 'apps/web/Dockerfile', 'docs/VALIDATION.md')) {
    if (-not $zip.GetEntry('aurzen/' + $required)) { throw ('Required file is missing: ' + $required) }
  }
  Write-Output ('Verified archive paths and SHA-256 hashes for ' + $manifest.files.Count + ' source files.')
} finally { $zip.Dispose() }
$expected = ((Get-Content -LiteralPath ($zipPath + '.sha256') -Raw) -split '\s+')[0]
if ((Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'ZIP checksum mismatch' }
if ($Extract) {
  $destination = [IO.Path]::GetFullPath((Join-Path $workspace ('data/release-check-' + [Guid]::NewGuid().ToString('N'))))
  if (-not $destination.StartsWith($workspace + [IO.Path]::DirectorySeparatorChar)) { throw 'Extraction must stay in the workspace' }
  [IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $destination)
  Write-Output ('Extracted clean source: ' + (Join-Path $destination 'aurzen'))
}

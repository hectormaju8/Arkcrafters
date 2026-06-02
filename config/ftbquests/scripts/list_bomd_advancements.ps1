Add-Type -AssemblyName System.IO.Compression.FileSystem
$mods = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft\mods'
$jar = Get-ChildItem (Join-Path $mods '*bosses*') -ErrorAction SilentlyContinue | Select-Object -First 1
if ($jar) {
    $z = [IO.Compression.ZipFile]::OpenRead($jar.FullName)
    $z.Entries | Where-Object { $_.FullName -match 'advancement.*\.json$' } | ForEach-Object { $_.FullName }
    $z.Dispose()
}

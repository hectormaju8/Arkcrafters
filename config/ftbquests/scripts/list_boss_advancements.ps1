Add-Type -AssemblyName System.IO.Compression.FileSystem
$mods = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft\mods'
foreach ($pattern in @('*mowzie*', '*bosses_of_mass*')) {
    $jar = Get-ChildItem (Join-Path $mods $pattern) -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $jar) { Write-Host "Missing $pattern"; continue }
    Write-Host "=== $($jar.Name) ===" -ForegroundColor Cyan
    $z = [IO.Compression.ZipFile]::OpenRead($jar.FullName)
    $z.Entries | Where-Object {
        $_.FullName -match '\.json$' -and $_.FullName -match 'kill|defeat|boss|sculptor|frostmaw|umvuthi|ferrous|lich|gauntlet|obsidilith|void'
    } | ForEach-Object { $_.FullName }
    $z.Dispose()
}

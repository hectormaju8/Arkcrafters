param(
    [string]$SavePath = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft\saves\Mundo nuevo\ftbquests\7929c813-503c-47cb-85b1-a1e150b41dc9.snbt'
)

$utf8 = New-Object System.Text.UTF8Encoding $false
$lines = [System.IO.File]::ReadAllLines($SavePath, [System.Text.Encoding]::UTF8)
$prefixes = @('5C21FB2EFB41A585', '5C000000000000', '5D000000000000', '5E000000000000')
$removed = 0
$newLines = foreach ($line in $lines) {
    $trim = $line.Trim()
    $drop = $false
    foreach ($p in $prefixes) {
        if ($trim.StartsWith($p)) { $drop = $true; break }
    }
    if (-not $drop -and $trim -match ':5E000000000000') { $drop = $true }
    if ($drop) { $removed++ } else { $line }
}
[System.IO.File]::WriteAllLines($SavePath, $newLines, $utf8)
Write-Host "Removed $removed jewelry-forge progress lines from $SavePath"

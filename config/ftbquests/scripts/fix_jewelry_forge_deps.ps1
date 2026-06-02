$forgePath = Join-Path $PSScriptRoot '..\quests\chapters\jewelry_forge.snbt'
$utf8 = New-Object System.Text.UTF8Encoding $false
$content = [System.IO.File]::ReadAllText($forgePath, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
$content = $content.Replace('progression_mode: "linear"', 'progression_mode: "flexible"')
$content = [regex]::Replace($content, '(?m)^(\t\t\tcan_repeat: true\r?\n)(\t\t\ticon: \{)', {
    param($m)
    $m.Groups[1].Value + "`t`t`tdependencies: [`"5C00000000000001`"]`n" + $m.Groups[2].Value
})
[System.IO.File]::WriteAllText($forgePath, $content, $utf8)
$depCount = ([regex]::Matches($content, 'dependencies: \["5C00000000000001"\]')).Count
Write-Host "jewelry_forge.snbt: $depCount dependencies, progression_mode flexible"

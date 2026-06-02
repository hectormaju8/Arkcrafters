$langPath = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'config\ftbquests\quests\lang\es_es.snbt'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$lines = [System.IO.File]::ReadAllLines($langPath, [System.Text.Encoding]::UTF8)
$out = New-Object System.Collections.Generic.List[string]

function Fix-Text($t) {
    $t = $t.Trim()
    $t = $t -replace '\.\.\.\?\s*->\s*', ' -> '
    $t = $t -replace '\.\.\.\?\s*-\s*', ' - '
    $t = $t -replace '\.\.\.\?\.\.\.', '...'
    $t = $t -replace '\.\.\.\?', '...'
    return $t
}

foreach ($line in $lines) {
    if ($line -match '^(?<indent>\t+)\s-\s+(?<val>.*)\s-\s*$') {
        $val = Fix-Text $matches['val']
        if ($val -eq '') { $out.Add("$($matches['indent'])`"`"") }
        else { $out.Add("$($matches['indent'])`"$val`"") }
    } else {
        $out.Add($line)
    }
}

$text = ($out -join [Environment]::NewLine) + [Environment]::NewLine
[System.IO.File]::WriteAllText($langPath, $text, $utf8NoBom)
Write-Host 'Lineas multilinea reparadas.'

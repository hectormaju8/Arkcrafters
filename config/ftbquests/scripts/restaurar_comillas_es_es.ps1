# Restaura comillas SNBT tras corrupcion accidental
$langPath = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'config\ftbquests\quests\lang\es_es.snbt'
if (-not (Test-Path $langPath)) {
    $langPath = Join-Path (Get-Location) 'config\ftbquests\quests\lang\es_es.snbt'
}
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$lines = [System.IO.File]::ReadAllLines($langPath, [System.Text.Encoding]::UTF8)
$out = New-Object System.Collections.Generic.List[string]

function Fix-Text($t) {
    if ($null -eq $t) { return '' }
    $t = $t.Trim()
    $t = $t -replace '\.\.\.\?\s*->\s*', ' -> '
    $t = $t -replace '\.\.\.\?\s*-\s*', ' - '
    $t = $t -replace '\.\.\.\?\.\.\.', '...'
    $t = $t -replace '\.\.\.\?', '...'
    return $t
}

$i = 0
while ($i -lt $lines.Count) {
    $line = $lines[$i]

    if ($line -match '^(?<indent>\t)(?<key>chapter\.[^:]+|quest\.[^:]+):\s+\[\s+-\s+(?<val>.+)\s+-\s+\]\s*$') {
        $val = Fix-Text $matches['val']
        $out.Add("$($matches['indent'])$($matches['key']): [`"$val`"]")
    }
    elseif ($line -match '^(?<indent>\t)(?<key>chapter\.[^:]+|quest\.[^:]+):\s+\[\s*$') {
        $out.Add("$($matches['indent'])$($matches['key']): [")
        $i++
        while ($i -lt $lines.Count -and $lines[$i] -notmatch '^\t\]\s*$') {
            $inner = $lines[$i]
            if ($inner -match '^\t+\-\s+(?<val>.*)\s+\-\s*$') {
                $val = Fix-Text $matches['val']
                if ($val -eq '') { $out.Add("`t`t`"`"") }
                else { $out.Add("`t`t`"$val`"") }
            } else {
                $out.Add($inner)
            }
            $i++
        }
        if ($i -lt $lines.Count) { $out.Add($lines[$i]) }
    }
    elseif ($line -match '^(?<indent>\t)(?<key>chapter\.[^:]+|quest\.[^:]+):\s+-\s+(?<val>.+)\s+-\s*$') {
        $val = Fix-Text $matches['val']
        $out.Add("$($matches['indent'])$($matches['key']): `"$val`"")
    }
    else {
        $out.Add($line)
    }
    $i++
}

$text = ($out -join [Environment]::NewLine) + [Environment]::NewLine
if (-not $text.TrimStart().StartsWith('{')) { $text = '{' + [Environment]::NewLine + $text.TrimStart() }
[System.IO.File]::WriteAllText($langPath, $text, $utf8NoBom)
Write-Host "Comillas restauradas en es_es.snbt" -ForegroundColor Green

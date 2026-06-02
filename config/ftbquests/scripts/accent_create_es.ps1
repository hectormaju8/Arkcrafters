# Aplica acentos al bloque Create en es_es.snbt (UTF-8)
$packRoot = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft'
$langPath = Join-Path $packRoot 'config\ftbquests\quests\lang\es_es.snbt'
$pairsPath = Join-Path $PSScriptRoot 'create_accent_pairs.json'
$utf8 = New-Object System.Text.UTF8Encoding $false
$marker = 'chapter.27900E4479E6E12D'

$json = [System.IO.File]::ReadAllText($pairsPath, $utf8)
$pairs = ($json | ConvertFrom-Json) | Sort-Object { $_[0].Length } -Descending

$lang = [System.IO.File]::ReadAllText($langPath, $utf8).TrimStart([char]0xFEFF)
$lines = $lang -split "`r?`n"
$out = New-Object System.Collections.Generic.List[string]
$inCreate = $false

foreach ($line in $lines) {
    if ($line.StartsWith("`t$marker")) { $inCreate = $true }
    if ($inCreate) {
        $fixed = $line
        foreach ($pair in $pairs) {
            $fixed = $fixed.Replace($pair[0], $pair[1])
        }
        [void]$out.Add($fixed)
    }
    else { [void]$out.Add($line) }
}

[System.IO.File]::WriteAllText($langPath, ($out -join [Environment]::NewLine), $utf8)
Write-Host 'Acentos Create aplicados' -ForegroundColor Green
& (Join-Path $PSScriptRoot 'validar_lang.ps1')

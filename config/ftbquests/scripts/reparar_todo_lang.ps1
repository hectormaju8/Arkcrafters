# Repara es_es.snbt: quita BOM de .snbt (NO tocar ?" legitimo en espanol)
# Uso: powershell -File config/ftbquests/scripts/reparar_todo_lang.ps1

$packRoot = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft'
$questsRoot = Join-Path $packRoot 'config\ftbquests\quests'
$langPath = Join-Path $questsRoot 'lang\es_es.snbt'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$rep = [char]0xFFFD

# --- 1. Quitar BOM de todos los .snbt ---
Get-ChildItem -Path (Join-Path $packRoot 'config\ftbquests') -Recurse -Filter '*.snbt' | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) {
        $text = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
        [System.IO.File]::WriteAllText($_.FullName, $text, $utf8NoBom)
        Write-Host "BOM quitado: $($_.Name)" -ForegroundColor Yellow
    }
}

# --- 2. Solo bytes de reemplazo Unicode corruptos (NUNCA ?" ni ?' sueltos) ---
$content = [System.IO.File]::ReadAllText($langPath, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
$content = $content.Replace($rep + "?'", ' -> ')
$content = $content.Replace($rep + '?"', ' - ')
$content = $content.Replace($rep + '?' + $rep, '...')
$content = $content.Replace($rep + '?', '...')
$content = $content.Replace('comienzo - ]', 'comienzo?"]')

if (-not $content.TrimStart().StartsWith('{')) {
    $content = '{' + [Environment]::NewLine + $content.TrimStart()
}

[System.IO.File]::WriteAllText($langPath, $content, $utf8NoBom)
Write-Host 'es_es.snbt: BOM/corruptos reparados (sin tocar interrogaciones validas).' -ForegroundColor Green

& (Join-Path $PSScriptRoot 'validar_lang.ps1')

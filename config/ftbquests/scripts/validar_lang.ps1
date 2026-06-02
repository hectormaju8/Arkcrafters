# Valida es_es.snbt: BOM, estructura SNBT, arrays huerfanos, claves duplicadas
$packRoot = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft'
$langPath = Join-Path $packRoot 'config\ftbquests\quests\lang\es_es.snbt'
$errors = @()

if (-not (Test-Path $langPath)) {
    Write-Error "No se encontro $langPath"
    exit 1
}

$bytes = [System.IO.File]::ReadAllBytes($langPath)
$content = [System.IO.File]::ReadAllText($langPath, [System.Text.Encoding]::UTF8)
$lines = $content -split "`r?`n"

if ($bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) {
    $errors += 'BOM UTF-8 en es_es.snbt'
}
if (-not $content.TrimStart().StartsWith('{')) {
    $errors += 'Falta { inicial en es_es.snbt'
}
if (-not $content.TrimEnd().EndsWith('}')) {
    $errors += 'Falta } final en es_es.snbt'
}
if ($content -match 'CabaÃ±a|DespuÃ©s|mÃ¡s') {
    $errors += 'Mojibake en es_es.snbt'
}
if ($content -match ':\s+\[\s+-\s+') {
    $errors += 'Arrays de una linea sin comillas SNBT'
}

# Strings de una linea sin cerrar
foreach ($line in $lines) {
    if ($line -match ':\s*\["' -and $line -notmatch '"\s*\]\s*$' -and $line -notmatch '^\s*\]') {
        $errors += "String SNBT sin cerrar: $($line.Substring(0, [Math]::Min(80, $line.Length)))..."
    }
}

# Arrays multilinea huerfanos (rompen TODO el lang -> 0 entries -> Sin nombre)
$inMultilineDesc = $false
$prevLine = ''
foreach ($line in $lines) {
    if ($line -match '^\t(chapter|quest|reward)\.[0-9A-Fa-f]+\.(title|quest_subtitle|quest_desc):\s*\[' -and $line -notmatch '\]\s*$') {
        $inMultilineDesc = $true
    }
    elseif ($inMultilineDesc) {
        if ($line -match '^\s*\]\s*$') { $inMultilineDesc = $false }
    }
    elseif ($line -match '^\t\t+"') {
        if ($prevLine -notmatch ':\s*\[$' -and $prevLine -notmatch '^\t\t+"') {
            $errors += "Array multilinea huerfano (SNBT roto): $($line.Substring(0, [Math]::Min(70, $line.Length)))..."
        }
    }
    elseif ($line -match '^\t\t+\]\s*$') {
        if ($prevLine -notmatch '^\t\t+"' -and $prevLine -notmatch '^\t\t+""') {
            $errors += 'Cierre ] huerfano en es_es.snbt'
        }
    }
    $prevLine = $line
}

# Claves duplicadas
$seenKeys = @{}
foreach ($line in $lines) {
    if ($line -match '^\t((?:chapter|quest|reward)\.[0-9A-Fa-f]+\.(?:title|quest_subtitle|quest_desc)):\s*') {
        $key = $Matches[1]
        if ($seenKeys.ContainsKey($key)) {
            $errors += "Clave duplicada: $key"
        }
        else {
            $seenKeys[$key] = $true
        }
    }
}

Get-ChildItem -Path (Join-Path $packRoot 'config\ftbquests') -Recurse -Filter '*.snbt' | ForEach-Object {
    $b = [System.IO.File]::ReadAllBytes($_.FullName)
    if ($b.Length -ge 3 -and $b[0] -eq 239 -and $b[1] -eq 187 -and $b[2] -eq 191) {
        $errors += "BOM en $($_.FullName)"
    }
}

if ($errors.Count -eq 0) {
    Write-Host "OK: es_es.snbt (byte $($bytes[0]), $($seenKeys.Count) claves)" -ForegroundColor Green
    exit 0
}

Write-Host 'PROBLEMAS:' -ForegroundColor Red
foreach ($e in $errors) { Write-Host "  - $e" }
Write-Host 'Ejecuta: powershell -File config/ftbquests/scripts/reparar_todo_lang.ps1'
exit 1

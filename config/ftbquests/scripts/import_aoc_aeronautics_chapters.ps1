# Importa capítulos Simulated + Aeronautics de All of Create Aeronautics (GitHub)
# Uso: powershell -File config/ftbquests/scripts/import_aoc_aeronautics_chapters.ps1

$packRoot = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft'
$chaptersDir = Join-Path $packRoot 'config\ftbquests\quests\chapters'
$langDest = Join-Path $packRoot 'config\ftbquests\quests\lang\es_es.snbt'
$cacheDir = Join-Path $packRoot 'config\ftbquests\scripts\_aoc_aero_import'
$utf8 = New-Object System.Text.UTF8Encoding $false
$baseUrl = 'https://raw.githubusercontent.com/qwek1/All-of-Create-Aeronautics/main/quests'

New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null

$chapterMap = @(
    @{
        SrcFile = 'aeronautics.snbt'
        DestFile = 'simulated.snbt'
        ChapterId = '048AB9655BAEC29A'
        OrderIndex = 6
        TitleEs = 'Simulated'
    }
    @{
        SrcFile = 'simulated.snbt'
        DestFile = 'create_aeronautics.snbt'
        ChapterId = '2E4EDF68FD3370DA'
        OrderIndex = 7
        TitleEs = 'Aeronautics'
    }
)

function Fix-AeroChapter([string]$text, [hashtable]$cfg) {
    $text = $text -replace 'group:\s*"[^"]*"', 'group: ""'
    $text = $text -replace 'order_index:\s*\d+', ('order_index: ' + $cfg.OrderIndex)
    $text = $text -replace 'filename:\s*"[^"]*"', ('filename: "' + ($cfg.DestFile -replace '\.snbt$','') + '"')
    if ($text -notmatch 'progression_mode:') {
        $text = $text -replace '(order_index:\s*\d+)', "`$1`r`n`tprogression_mode: `"flexible`""
    }
    $text = $text -replace 'dndecor:industrial_plating_block', 'create:industrial_iron_block'
    $text = [regex]::Replace($text, '(?ms)\t\t\trewards:\s*\[\{\s*exclude_from_claim_all:\s*true\s*id:\s*"([^"]+)"\s*table_id:\s*\d+L\s*type:\s*"(?:loot|all_table|random)"\s*\}\]', {
        param($m)
        "`t`t`trewards: [{ id: `"$($m.Groups[1].Value)`", type: `"xp`", xp: 20 }]"
    })
    $text = [regex]::Replace($text, '(?ms)\{\s*exclude_from_claim_all:\s*true\s*id:\s*"([^"]+)"\s*table_id:\s*\d+L\s*type:\s*"(?:loot|all_table|random)"\s*\}', {
        param($m)
        "{ id: `"$($m.Groups[1].Value)`", type: `"xp`", xp: 15 }"
    })
    if ($text -match 'portable_engine') {
        $text = [regex]::Replace($text, 'item: \{ components: \{ "ftbfiltersystem:filter": "[^"]*" \}, count: 1, id: "ftbfiltersystem:smart_filter" \}', 'item: { count: 1, id: "simulated:white_portable_engine" }')
        if ($text -match 'id: "6BC0D978E293515F"' -and $text -notmatch 'id: "6BC0D978E293515F"[\s\S]{0,120}icon:') {
            $text = $text -replace '(id: "6BC0D978E293515F")', "`$1`r`n`t`t`ticon: {`r`n`t`t`t`tid: `"simulated:white_portable_engine`"`r`n`t`t`t}"
        }
    }
    return $text
}

function Get-AllIds([string]$text) {
    $ids = New-Object System.Collections.Generic.HashSet[string]
    foreach ($m in [regex]::Matches($text, 'id:\s*"([0-9A-Fa-f]+)"')) {
        [void]$ids.Add($m.Groups[1].Value)
    }
    return $ids
}

Write-Host 'Descargando All of Create Aeronautics...' -ForegroundColor Cyan
$langUrl = "$baseUrl/lang/en_us.snbt"
$langEnPath = Join-Path $cacheDir 'en_us.snbt'
Invoke-WebRequest -Uri $langUrl -OutFile $langEnPath -UseBasicParsing

$allChapterIds = New-Object System.Collections.Generic.HashSet[string]
$allQuestIds = New-Object System.Collections.Generic.HashSet[string]

foreach ($cfg in $chapterMap) {
    $srcPath = Join-Path $cacheDir $cfg.SrcFile
    Invoke-WebRequest -Uri "$baseUrl/chapters/$($cfg.SrcFile)" -OutFile $srcPath -UseBasicParsing
    $raw = [System.IO.File]::ReadAllText($srcPath, [System.Text.Encoding]::UTF8)
    $fixed = Fix-AeroChapter $raw $cfg
    $dest = Join-Path $chaptersDir $cfg.DestFile
    [System.IO.File]::WriteAllText($dest, $fixed, $utf8)
    [void]$allChapterIds.Add($cfg.ChapterId)
    foreach ($id in (Get-AllIds $fixed)) { [void]$allQuestIds.Add($id) }
    $qCount = ([regex]::Matches($fixed, '(?m)^\t\t\{')).Count
    Write-Host "OK $($cfg.DestFile): $qCount misiones" -ForegroundColor Green
}

# --- Lang ---
$langEn = [System.IO.File]::ReadAllText($langEnPath, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
$langEs = [System.IO.File]::ReadAllText($langDest, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)

$chapterMarkers = @('chapter.048AB9655BAEC29A', 'chapter.2E4EDF68FD3370DA')
$keptLang = New-Object System.Collections.Generic.List[string]
$skipMultiline = $false
foreach ($line in ($langEs -split "`r?`n")) {
    $drop = $false
    foreach ($mk in $chapterMarkers) {
        if ($line -match "^\t$([regex]::Escape($mk))") { $drop = $true; break }
    }
    if (-not $drop -and $line -match '^\tquest\.([0-9A-Fa-f]+)\.') {
        if ($allQuestIds.Contains($Matches[1])) { $drop = $true }
    }
    if (-not $drop -and $line -match '^\treward\.([0-9A-Fa-f]+)\.') {
        if ($allQuestIds.Contains($Matches[1])) { $drop = $true }
    }
    if ($drop) {
        if ($line -match 'quest_desc:\s*\[' -and $line -notmatch '\]\s*$') { $skipMultiline = $true }
        continue
    }
    if ($skipMultiline) {
        if ($line -match '^\s*\]\s*$') { $skipMultiline = $false }
        continue
    }
    $keptLang.Add($line)
}
$langEs = ($keptLang -join [Environment]::NewLine).TrimEnd()

$langMap = @{}
$linesEn = $langEn -split "`r?`n"
$idx = 0
while ($idx -lt $linesEn.Count) {
    $line = $linesEn[$idx]
    if ($line -match '^\t((?:chapter|quest|reward)\.[0-9A-Fa-f]+\.(?:title|quest_subtitle|quest_desc)):\s*(.+)$') {
        $key = $Matches[1]
        $rest = $Matches[2]
        if ($rest -eq '[' -or ($rest -match '^\[' -and $rest -notmatch '\]\s*$')) {
            $blockLines = New-Object System.Collections.Generic.List[string]
            $blockLines.Add("`t$key`: [")
            $idx++
            while ($idx -lt $linesEn.Count -and $linesEn[$idx] -notmatch '^\s*\]\s*$') {
                $blockLines.Add($linesEn[$idx])
                $idx++
            }
            if ($idx -lt $linesEn.Count) { $blockLines.Add($linesEn[$idx]) }
            $langMap[$key] = ($blockLines -join [Environment]::NewLine)
        }
        else { $langMap[$key] = "`t$key`: $rest" }
    }
    $idx++
}

$newLang = New-Object System.Collections.Generic.List[string]
$newLang.Add('	chapter.048AB9655BAEC29A.title: "Simulated"')
$newLang.Add('	chapter.2E4EDF68FD3370DA.title: "Aeronautics"')

foreach ($key in ($langMap.Keys | Sort-Object)) {
    if ($key -match '^chapter\.(048AB9655BAEC29A|2E4EDF68FD3370DA)') { continue }
    $parts = $key -split '\.'
    if ($parts.Length -lt 2) { continue }
    $id = $parts[1]
    if (-not $allQuestIds.Contains($id) -and -not $allChapterIds.Contains($id)) { continue }
    $val = $langMap[$key] -replace '&e\s*', ''
    $newLang.Add($val)
}

$langEs = $langEs -replace '\r?\n\}$', ([Environment]::NewLine + ($newLang -join [Environment]::NewLine) + [Environment]::NewLine + '}')
[System.IO.File]::WriteAllText($langDest, $langEs, $utf8)
Write-Host "Lang: $($newLang.Count) entradas nuevas" -ForegroundColor Green
& (Join-Path $PSScriptRoot 'validar_lang.ps1')
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host 'Listo. /ftbquests reload' -ForegroundColor Cyan

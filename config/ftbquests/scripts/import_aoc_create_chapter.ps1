# Importa create.snbt de All of Create (GitHub) adaptado a Arkcraft
# Uso: powershell -File config/ftbquests/scripts/import_aoc_create_chapter.ps1

$packRoot = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft'
$chapterDest = Join-Path $packRoot 'config\ftbquests\quests\chapters\create.snbt'
$langDest = Join-Path $packRoot 'config\ftbquests\quests\lang\es_es.snbt'
$cacheDir = Join-Path $packRoot 'config\ftbquests\scripts\_aoc_import'
$utf8 = New-Object System.Text.UTF8Encoding $false

$createUrl = 'https://raw.githubusercontent.com/qwek1/All-of-Create/main/quests/chapters/create.snbt'
$langUrl = 'https://raw.githubusercontent.com/qwek1/All-of-Create/main/quests/lang/en_us.snbt'

New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null
$createPath = Join-Path $cacheDir 'create.snbt'
$langEnPath = Join-Path $cacheDir 'en_us.snbt'

Write-Host 'Descargando All of Create (GitHub)...' -ForegroundColor Cyan
Invoke-WebRequest -Uri $createUrl -OutFile $createPath -UseBasicParsing
Invoke-WebRequest -Uri $langUrl -OutFile $langEnPath -UseBasicParsing

$blockedNamespaces = @('create_things_and_misc', 'farmersdelight', 'create_mobile_packages')

function Test-BlockedItem($block) {
    foreach ($ns in $blockedNamespaces) {
        if ($block -match ('id:\s*"' + [regex]::Escape($ns) + ':')) { return $true }
        if ($block -match ('item\(' + [regex]::Escape($ns) + ':')) { return $true }
    }
    return $false
}

function Get-QuestBlocks([string]$text) {
    $lines = $text -split "`r?`n"
    $blocks = New-Object System.Collections.Generic.List[string]
    $i = 0
    while ($i -lt $lines.Count) {
        if ($lines[$i] -match '^\t\t\{') {
            $sb = New-Object System.Text.StringBuilder
            $depth = 0
            do {
                $line = $lines[$i]
                [void]$sb.AppendLine($line)
                $depth += ([regex]::Matches($line, '\{')).Count
                $depth -= ([regex]::Matches($line, '\}')).Count
                $i++
            } while ($i -le $lines.Count -and $depth -gt 0)
            $blocks.Add($sb.ToString().TrimEnd())
        }
        else { $i++ }
    }
    return $blocks
}

$createRaw = [System.IO.File]::ReadAllText($createPath, [System.Text.Encoding]::UTF8)
$questsIdx = $createRaw.IndexOf("`tquests: [")
if ($questsIdx -lt 0) { Write-Error 'No quests: ['; exit 1 }
$header = $createRaw.Substring(0, $questsIdx + "`tquests: [".Length)
$questsPart = $createRaw.Substring($questsIdx + "`tquests: [".Length)
$questsPart = $questsPart.Substring(0, $questsPart.LastIndexOf("`t]"))

$questBlocks = Get-QuestBlocks "`tquests: [`n$questsPart"
# First match is fake from prefix - remove if empty
$questBlocks = @($questBlocks | Where-Object { $_ -match 'id:\s*"' })

Write-Host "Misiones en AoC: $($questBlocks.Count)"

$kept = New-Object System.Collections.Generic.List[string]
$removedIds = New-Object System.Collections.Generic.List[string]
$keptIds = New-Object System.Collections.Generic.HashSet[string]

foreach ($block in $questBlocks) {
    if ($block -notmatch 'id:\s*"([0-9A-Fa-f]+)"') { continue }
    $qid = $Matches[1]
    if (Test-BlockedItem $block) {
        $removedIds.Add($qid) | Out-Null
        continue
    }
    [void]$keptIds.Add($qid)
    $kept.Add($block)
}

Write-Host "Eliminadas (mods ausentes): $($removedIds.Count)" -ForegroundColor Yellow
Write-Host "Conservadas: $($kept.Count)" -ForegroundColor Green

$cleaned = New-Object System.Collections.Generic.List[string]
foreach ($block in $kept) {
    $b = $block
    if ($b -match 'dependencies:\s*\[([^\]]*)\]') {
        $deps = [regex]::Matches($Matches[1], '"([0-9A-Fa-f]+)"') | ForEach-Object { $_.Groups[1].Value }
        $newDeps = @($deps | Where-Object { $keptIds.Contains($_) })
        if ($newDeps.Count -eq 0) {
            $b = [regex]::Replace($b, '\t\tdependencies:\s*\[[^\]]*\]\r?\n', '')
        }
        else {
            $newDepStr = ($newDeps | ForEach-Object { "`"$_`"" }) -join ', '
            $b = [regex]::Replace($b, 'dependencies:\s*\[[^\]]*\]', "dependencies: [$newDepStr]")
        }
    }
    $cleaned.Add($b)
}

function Fix-AocSmartFilters([string]$text) {
    if ($text -match 'ftbfiltersystem:smart_filter') {
        if ($text -match 'create:cogwheel') {
            $text = [regex]::Replace($text, 'item: \{ components: \{ "ftbfiltersystem:filter": "[^"]*" \}, count: 1, id: "ftbfiltersystem:smart_filter" \}', 'item: { count: 1, id: "create:cogwheel" }')
        }
        elseif ($text -match 'create:white_seat') {
            $text = [regex]::Replace($text, 'item: \{ components: \{ "ftbfiltersystem:filter": "[^"]*" \}, count: 1, id: "ftbfiltersystem:smart_filter" \}', 'item: { count: 1, id: "create:white_seat" }')
        }
        elseif ($text -match 'createaddition:copper_wire') {
            $text = [regex]::Replace($text, 'item: \{ components: \{ "ftbfiltersystem:filter": "[^"]*" \}, count: 1, id: "ftbfiltersystem:smart_filter" \}', 'item: { count: 1, id: "createaddition:copper_wire" }')
        }
    }
    if ($text -match 'id: "410BEC9893112A43"' -and $text -notmatch 'icon:\s*\{') {
        $text = $text -replace '(id: "410BEC9893112A43")', "`$1`r`n`t`t`ticon: {`r`n`t`t`t`tid: `"create:cogwheel`"`r`n`t`t`t}"
    }
    if ($text -match 'id: "0FB4FFD361C5DF69"' -and $text -notmatch 'icon:\s*\{') {
        $text = $text -replace '(id: "0FB4FFD361C5DF69")', "`$1`r`n`t`t`ticon: {`r`n`t`t`t`tid: `"create:white_seat`"`r`n`t`t`t}"
    }
    return $text
}

$cleaned2 = New-Object System.Collections.Generic.List[string]
foreach ($block in $cleaned) {
    $cleaned2.Add((Fix-AocSmartFilters $block))
}
$cleaned = $cleaned2

$header = $header -replace 'group:\s*"[^"]*"', 'group: ""'
$header = $header -replace 'order_index:\s*\d+', 'order_index: 5'
if ($header -notmatch 'progression_mode:') {
    $header = $header -replace '(order_index:\s*5)', "`$1`r`n`tprogression_mode: `"flexible`""
}

$body = ($cleaned -join [Environment]::NewLine)
$chapterOut = $header + [Environment]::NewLine + $body + [Environment]::NewLine + "`t]" + [Environment]::NewLine + '}'
[System.IO.File]::WriteAllText($chapterDest, $chapterOut, $utf8)
Write-Host "Escrito: $chapterDest" -ForegroundColor Green

# --- Lang ---
$allIds = New-Object System.Collections.Generic.HashSet[string]
[void]$allIds.Add('27900E4479E6E12D')
foreach ($block in $cleaned) {
    foreach ($m in [regex]::Matches($block, 'id:\s*"([0-9A-Fa-f]+)"')) {
        [void]$allIds.Add($m.Groups[1].Value)
    }
}

$langEn = [System.IO.File]::ReadAllText($langEnPath, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
$langEs = [System.IO.File]::ReadAllText($langDest, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)

$keptLang = New-Object System.Collections.Generic.List[string]
$skipMultiline = $false
$chapterId = '27900E4479E6E12D'
foreach ($line in ($langEs -split "`r?`n")) {
    if ($line -match "^\tchapter\.$chapterId") {
        if ($line -match 'quest_desc:\s*\[' -and $line -notmatch '\]\s*$') { $skipMultiline = $true }
        continue
    }
    if ($line -match '^\tquest\.([0-9A-Fa-f]+)\.') {
        if ($allIds.Contains($Matches[1])) {
            if ($line -match 'quest_desc:\s*\[' -and $line -notmatch '\]\s*$') { $skipMultiline = $true }
            continue
        }
    }
    if ($line -match '^\treward\.([0-9A-Fa-f]+)\.') {
        if ($allIds.Contains($Matches[1])) { continue }
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
        else {
            $langMap[$key] = "`t$key`: $rest"
        }
    }
    $idx++
}

$newLang = New-Object System.Collections.Generic.List[string]
$newLang.Add('	chapter.27900E4479E6E12D.title: "Create"')

foreach ($key in ($langMap.Keys | Sort-Object)) {
    if ($key -match '^chapter\.27900E4479E6E12D') { continue }
    $parts = $key -split '\.'
    if ($parts.Length -lt 2) { continue }
    $id = $parts[1]
    if (-not $allIds.Contains($id)) { continue }
    $newLang.Add($langMap[$key])
}

$langEs = $langEs -replace '\r?\n\}$', ([Environment]::NewLine + ($newLang -join [Environment]::NewLine) + [Environment]::NewLine + '}')
[System.IO.File]::WriteAllText($langDest, $langEs, $utf8)

Write-Host "Lang: $($newLang.Count) entradas" -ForegroundColor Green
& (Join-Path $PSScriptRoot 'validar_lang.ps1')
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host 'Listo. /ftbquests reload' -ForegroundColor Cyan

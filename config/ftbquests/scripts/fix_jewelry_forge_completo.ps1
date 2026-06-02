# Quita deps bloqueantes, recompensas item -> custom (KubeJS), arregla lang roto
$packRoot = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft'
$forgePath = Join-Path $packRoot 'config\ftbquests\quests\chapters\jewelry_forge.snbt'
$langPath = Join-Path $packRoot 'config\ftbquests\quests\lang\es_es.snbt'
$utf8 = New-Object System.Text.UTF8Encoding $false

# --- jewelry_forge.snbt ---
$forge = [System.IO.File]::ReadAllText($forgePath, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
$forge = $forge.Replace('progression_mode: "linear"', 'progression_mode: "flexible"')
$forge = [regex]::Replace($forge, '(?m)^\t\t\tdependencies: \["5C00000000000001"\]\r?\n', '')
$forge = [regex]::Replace($forge, '(?ms)\{\s*count: 1\s*id: "(5E000000000000\d+)"\s*item: \{\s*count: 1\s*id: "jewelry:[^"]+"\s*\}\s*type: "item"\s*\}', '{ id: "$1" type: "custom" }')
[System.IO.File]::WriteAllText($forgePath, $forge, $utf8)
$customCount = ([regex]::Matches($forge, 'type: "custom"')).Count
Write-Host "jewelry_forge.snbt: $customCount recompensas custom, sin dependencies"

# --- es_es.snbt: restaurar cierre SNBT roto por reparacion agresiva ---
$lang = [System.IO.File]::ReadAllText($langPath, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
$lang = $lang.Replace('comienzo - ]', 'comienzo?"]')
[System.IO.File]::WriteAllText($langPath, $lang, $utf8)
Write-Host 'es_es.snbt: cadenas SNBT rotas reparadas'

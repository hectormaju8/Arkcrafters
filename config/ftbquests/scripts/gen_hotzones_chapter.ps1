# Genera config/ftbquests/quests/chapters/hotzones.snbt + entradas lang
$packRoot = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft'
$chapterPath = Join-Path $packRoot 'config\ftbquests\quests\chapters\hotzones.snbt'
$langPath = Join-Path $packRoot 'config\ftbquests\quests\lang\es_es.snbt'
$utf8 = New-Object System.Text.UTF8Encoding $false

$chapterId = '6C21FB2EFB41A586'
$introId = '6C00000000000001'

$bosses = @(
    @{ q = 10; adv = 'mowziesmobs:sculptor_challenge'; icon = 'mowziesmobs:sculptor_spawn_egg'; coin = 'lightmanscurrency:coin_gold'; coinCount = 8; coinLabel = '8 monedas de oro'; x = -4.5; y = 5.0; title = 'Jefe HZ III: Tongbi, el Escultor'; subtitle = 'Derrota al Escultor en una Zona Caliente III'; taskTitle = 'Logro: desafio del Escultor' }
    @{ q = 11; adv = 'mowziesmobs:kill_umvuthi'; icon = 'mowziesmobs:umvuthi_spawn_egg'; coin = 'lightmanscurrency:coin_gold'; coinCount = 8; coinLabel = '8 monedas de oro'; x = -1.5; y = 5.0; title = 'Jefe HZ III: Umvuthi, el Ave Solar'; subtitle = 'Derrota a Umvuthi en una Zona Caliente III'; taskTitle = 'Logro: matar a Umvuthi' }
    @{ q = 12; adv = 'mowziesmobs:kill_frostmaw'; icon = 'mowziesmobs:frostmaw_spawn_egg'; coin = 'lightmanscurrency:coin_gold'; coinCount = 8; coinLabel = '8 monedas de oro'; x = 1.5; y = 5.0; title = 'Jefe HZ III: Frostmaw'; subtitle = 'Derrota a Frostmaw en una Zona Caliente III'; taskTitle = 'Logro: matar a Frostmaw' }
    @{ q = 13; adv = 'mowziesmobs:kill_ferrous_wroughtnaut'; icon = 'mowziesmobs:earthrend_gauntlet'; coin = 'lightmanscurrency:coin_gold'; coinCount = 8; coinLabel = '8 monedas de oro'; x = 4.5; y = 5.0; title = 'Jefe HZ III: Ferrous Wroughtnaut'; subtitle = 'Derrota al Ferrous Wroughtnaut en HZ III'; taskTitle = 'Logro: matar al Ferrous Wroughtnaut' }
    @{ q = 14; adv = 'bosses_of_mass_destruction:adventure/lich_defeat'; icon = 'bosses_of_mass_destruction:soul_star'; coin = 'lightmanscurrency:coin_emerald'; coinCount = 6; coinLabel = '6 monedas de esmeralda'; x = -4.5; y = 8.5; title = 'Jefe HZ IV: Night Lich'; subtitle = 'Derrota al Night Lich en una Zona Caliente IV'; taskTitle = 'Logro: derrotar al Night Lich' }
    @{ q = 15; adv = 'bosses_of_mass_destruction:adventure/gauntlet_defeat'; icon = 'bosses_of_mass_destruction:charged_ender_pearl'; coin = 'lightmanscurrency:coin_emerald'; coinCount = 6; coinLabel = '6 monedas de esmeralda'; x = -1.5; y = 8.5; title = 'Jefe HZ IV: Nether Gauntlet'; subtitle = 'Derrota al Nether Gauntlet en HZ IV'; taskTitle = 'Logro: derrotar al Nether Gauntlet' }
    @{ q = 16; adv = 'bosses_of_mass_destruction:adventure/obsidilith_defeat'; icon = 'bosses_of_mass_destruction:obsidian_heart'; coin = 'lightmanscurrency:coin_emerald'; coinCount = 6; coinLabel = '6 monedas de esmeralda'; x = 1.5; y = 8.5; title = 'Jefe HZ IV: Obsidilith'; subtitle = 'Derrota al Obsidilith en una Zona Caliente IV'; taskTitle = 'Logro: derrotar al Obsidilith' }
    @{ q = 17; adv = 'bosses_of_mass_destruction:adventure/void_blossom_defeat'; icon = 'bosses_of_mass_destruction:void_thorn'; coin = 'lightmanscurrency:coin_emerald'; coinCount = 6; coinLabel = '6 monedas de esmeralda'; x = 4.5; y = 8.5; title = 'Jefe HZ IV: Void Blossom'; subtitle = 'Derrota al Void Blossom en HZ IV'; taskTitle = 'Logro: derrotar al Void Blossom' }
)

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('{')
[void]$sb.AppendLine('	default_hide_dependency_lines: false')
[void]$sb.AppendLine('	default_quest_shape: "rsquare"')
[void]$sb.AppendLine('	filename: "hotzones"')
[void]$sb.AppendLine('	group: ""')
[void]$sb.AppendLine('	icon: {')
[void]$sb.AppendLine('		id: "lightmanscurrency:coin_copper"')
[void]$sb.AppendLine('	}')
[void]$sb.AppendLine("	id: `"$chapterId`"")
[void]$sb.AppendLine('	order_index: 4')
[void]$sb.AppendLine('	progression_mode: "flexible"')
[void]$sb.AppendLine('	quest_links: [ ]')
[void]$sb.AppendLine('	quests: [')

[void]$sb.AppendLine('		{')
[void]$sb.AppendLine('			icon: { id: "minecraft:nether_star" }')
[void]$sb.AppendLine('			id: "6C00000000000001"')
[void]$sb.AppendLine('			rewards: [{ id: "6E00000000000001" type: "xp" xp: 20 }]')
[void]$sb.AppendLine('			shape: "diamond"')
[void]$sb.AppendLine('			size: 2.5d')
[void]$sb.AppendLine('			tasks: [{ id: "6D00000000000001" type: "checkmark" }]')
[void]$sb.AppendLine('			x: 0.0d')
[void]$sb.AppendLine('			y: 0.0d')
[void]$sb.AppendLine('		}')

foreach ($b in $bosses) {
    $qHex = '{0:X2}' -f $b.q
    $qid = "6C000000000000$qHex"
    $did = "6D000000000000$qHex"
    $eXpId = ('6E0000000000{0:X4}' -f ($b.q * 2))
    $eItemId = ('6E0000000000{0:X4}' -f ($b.q * 2 + 1))

    [void]$sb.AppendLine('		{')
    [void]$sb.AppendLine("			dependencies: [`"$introId`"]")
    [void]$sb.AppendLine("			icon: { id: `"$($b.icon)`" }")
    [void]$sb.AppendLine("			id: `"$qid`"")
    [void]$sb.AppendLine('			rewards: [')
    [void]$sb.AppendLine("				{ id: `"$eXpId`" type: `"xp`" xp: 50 }")
    [void]$sb.AppendLine('				{')
    [void]$sb.AppendLine("					count: $($b.coinCount)")
    [void]$sb.AppendLine("					id: `"$eItemId`"")
    [void]$sb.AppendLine('					item: {')
    [void]$sb.AppendLine('						count: 1')
    [void]$sb.AppendLine("						id: `"$($b.coin)`"")
    [void]$sb.AppendLine('					}')
    [void]$sb.AppendLine('					type: "item"')
    [void]$sb.AppendLine('				}')
    [void]$sb.AppendLine('			]')
    [void]$sb.AppendLine('			shape: "hexagon"')
    [void]$sb.AppendLine('			tasks: [{')
    [void]$sb.AppendLine("				advancement: `"$($b.adv)`"")
    [void]$sb.AppendLine('				criterion: ""')
    [void]$sb.AppendLine("				id: `"$did`"")
    [void]$sb.AppendLine("				title: `"$($b.taskTitle)`"")
    [void]$sb.AppendLine('				type: "advancement"')
    [void]$sb.AppendLine('			}]')
    [void]$sb.AppendLine("			x: $($b.x)d")
    [void]$sb.AppendLine("			y: $($b.y)d")
    [void]$sb.AppendLine('		}')
}

[void]$sb.AppendLine('	]')
[void]$sb.AppendLine('}')

[System.IO.File]::WriteAllText($chapterPath, $sb.ToString(), $utf8)

# Lang: quitar bloque HZ viejo (incluye quest_desc multilinea) y reescribir
$lang = [System.IO.File]::ReadAllText($langPath, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
$kept = New-Object System.Collections.Generic.List[string]
$skipMultiline = $false
$hzKey = '^\t(chapter\.6C21FB2EFB41A586|quest\.6C0000000000000[0-9A-F]|reward\.6E000000000000(1[4-9A-F]|2[0-3]))'
foreach ($line in ($lang -split "`r?`n")) {
    if ($line -match $hzKey) {
        if ($line -match 'quest_desc:\s*\[' -and $line -notmatch '\]\s*$') { $skipMultiline = $true }
        continue
    }
    if ($skipMultiline) {
        if ($line -match '^\s*\]\s*$') { $skipMultiline = $false }
        continue
    }
    $kept.Add($line)
}
$lang = ($kept -join [Environment]::NewLine).TrimEnd()

$langLines = New-Object System.Collections.Generic.List[string]
$langLines.Add('	chapter.6C21FB2EFB41A586.title: "Zonas Calientes"')
$langLines.Add('	quest.6C00000000000001.quest_desc: [')
$langLines.Add('		"&eZonas Calientes&r aparecen cada ~20 min cerca de un jugador online (150-400 bloques). Duran 5 min (T1-T3) o 10 min (T4). PvP activo; marcador en JourneyMap."')
$langLines.Add('		""')
$langLines.Add('		"&71.&r T1: mobs vanilla. Monedas cobre."')
$langLines.Add('		"&72.&r T2: vanilla + 1 elite potenciado. Monedas hierro (elite: oro)."')
$langLines.Add('		"&73.&r T3: adds Mowzie + 1 jefe aleatorio. Monedas hierro (jefe: oro)."')
$langLines.Add('		"&74.&r T4: adds vanilla + 1 jefe BOMD. Monedas hierro (jefe: esmeralda + joya unica)."')
$langLines.Add('		""')
$langLines.Add('		"Las monedas sirven para tributos en MineColonies. Al matar un jefe y obtener su logro, reclama aqui monedas extra (una sola vez por mision)."')
$langLines.Add('		""')
$langLines.Add('		"Comandos: &e/hotzone info&r, &e/hotzone stop&r. Si la zona expira, los mobs desaparecen: mata al jefe antes."')
$langLines.Add('	]')
$langLines.Add('	quest.6C00000000000001.quest_subtitle: "Monedas, PvP y jefes"')
$langLines.Add('	quest.6C00000000000001.title: "Guia de Zonas Calientes"')

foreach ($b in $bosses) {
    $qHex = '{0:X2}' -f $b.q
    $qid = "6C000000000000$qHex"
    $eItemId = ('6E0000000000{0:X4}' -f ($b.q * 2 + 1))
    $langLines.Add("	quest.$qid.title: `"$($b.title)`"")
    $langLines.Add("	quest.$qid.quest_subtitle: `"$($b.subtitle)`"")
    $langLines.Add("	quest.$qid.quest_desc: [`"Consigue el logro del mod al derrotar al jefe. Vuelve aqui y pulsa Recompensas (solo una vez).`"]")
    $langLines.Add("	reward.$eItemId.title: `"$($b.coinLabel)`"")
}

$lang = $lang -replace '\r?\n\}$', ([Environment]::NewLine + ($langLines -join [Environment]::NewLine) + [Environment]::NewLine + '}')
[System.IO.File]::WriteAllText($langPath, $lang, $utf8)
Write-Host "Generado: $chapterPath (recompensas = monedas)"
& (Join-Path $PSScriptRoot 'validar_lang.ps1')
if ($LASTEXITCODE -ne 0) { exit 1 }

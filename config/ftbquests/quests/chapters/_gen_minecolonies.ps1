# Genera minecolonies.snbt — ejecutar una vez si hace falta regenerar
$out = Join-Path $PSScriptRoot "minecolonies.snbt"

function Reward-Id($questId, $suffix = '') { return ($questId -replace '^1A','3A') + $suffix }
function Task-Id($questId, $suffix = '') { return ($questId -replace '^1A','2A') + $suffix }

function Join-Dep($deps) {
    if (-not $deps -or $deps.Count -eq 0) { return "" }
    return ($deps | ForEach-Object { "`"$_`"" }) -join ", "
}

function Quest-Checkmark($id, $deps, $icon, $x, $y, $shape, $size, $xp) {
    $depLine = if ($deps) { "`n			dependencies: [$(Join-Dep $deps)]" } else { "" }
    $shapeLine = if ($shape) { "`n			shape: `"$shape`"" } else { "" }
    $sizeLine = if ($size) { "`n			size: ${size}d" } else { "" }
    @"
		{$depLine
			id: "$id"
			icon: { count: 1, id: "$icon" }
			rewards: [{ id: "$(Reward-Id $id)", type: "xp", xp: $xp }]
			tasks: [{ id: "$(Task-Id $id)", type: "checkmark" }]$shapeLine$sizeLine
			x: ${x}d
			y: ${y}d
		}
"@
}

function Quest-Advancement($id, $deps, $icon, $adv, $x, $y, $xp, $shape, $size, $extraTasks) {
    $depLine = "`n			dependencies: [$(Join-Dep $deps)]"
    $shapeLine = if ($shape) { "`n			shape: `"$shape`"" } else { "" }
    $sizeLine = if ($size) { "`n			size: ${size}d" } else { "" }
    $tasks = @"
				{
					advancement: "$adv"
					criterion: ""
					id: "$(Task-Id $id '_0')"
					type: "advancement"
				}
"@
    if ($extraTasks) { $tasks += $extraTasks }
    @"
		{$depLine
			id: "$id"
			icon: { count: 1, id: "$icon" }
			rewards: [{ id: "$(Reward-Id $id)", type: "xp", xp: $xp }]
			tasks: [
$tasks
			]$shapeLine$sizeLine
			x: ${x}d
			y: ${y}d
		}
"@
}

function Quest-Item($id, $deps, $icon, $item, $x, $y, $xp) {
    @"
		{
			dependencies: [$(Join-Dep $deps)]
			id: "$id"
			icon: { count: 1, id: "$icon" }
			rewards: [{ id: "$(Reward-Id $id)", type: "xp", xp: $xp }]
			tasks: [{ id: "$(Task-Id $id)", item: { count: 1, id: "$item" }, type: "item" }]
			x: ${x}d
			y: ${y}d
		}
"@
}

function Quest-SupplyCamp($id, $deps, $x, $y) {
    @"
		{
			dependencies: [$(Join-Dep $deps)]
			id: "$id"
			icon: { count: 1, id: "minecolonies:supplycampdeployer" }
			rewards: [
				{ id: "$(Reward-Id $id 'a')", type: "xp", xp: 10 }
				{ count: 16, id: "$(Reward-Id $id 'b')", item: { count: 1, id: "minecraft:bread" }, type: "item" }
				{ count: 32, id: "$(Reward-Id $id 'c')", item: { count: 1, id: "minecraft:oak_planks" }, type: "item" }
			]
			tasks: [{ id: "$(Task-Id $id)", item: { count: 1, id: "minecolonies:supplycampdeployer" }, type: "item" }]
			x: ${x}d
			y: ${y}d
		}
"@
}

function Quest-Townhall($id, $deps, $x, $y) {
    @"
		{
			dependencies: [$(Join-Dep $deps)]
			id: "$id"
			icon: { count: 1, id: "minecolonies:blockhuttownhall" }
			rewards: [
				{ id: "$(Reward-Id $id 'a')", type: "xp", xp: 20 }
				{ count: 16, id: "$(Reward-Id $id 'b')", item: { count: 1, id: "lightmanscurrency:coin_copper" }, type: "item" }
				{ count: 32, id: "$(Reward-Id $id 'c')", item: { count: 1, id: "minecraft:torch" }, type: "item" }
			]
			shape: "diamond"
			size: 2.0d
			tasks: [{
				advancement: "minecolonies:minecolonies/place_townhall"
				criterion: ""
				id: "$(Task-Id $id)"
				type: "advancement"
			}]
			x: ${x}d
			y: ${y}d
		}
"@
}

function Quest-Builder($id, $deps, $x, $y) {
    @"
		{
			dependencies: [$(Join-Dep $deps)]
			id: "$id"
			icon: { count: 1, id: "minecolonies:blockhutbuilder" }
			rewards: [
				{ id: "$(Reward-Id $id 'a')", type: "xp", xp: 15 }
				{ count: 64, id: "$(Reward-Id $id 'b')", item: { count: 1, id: "minecraft:oak_planks" }, type: "item" }
				{ count: 64, id: "$(Reward-Id $id 'c')", item: { count: 1, id: "minecraft:cobblestone" }, type: "item" }
			]
			shape: "octagon"
			size: 2.0d
			tasks: [
				{
					advancement: "minecolonies:minecolonies/build_builder"
					criterion: ""
					id: "$(Task-Id $id 'a')"
					type: "advancement"
				}
				{
					advancement: "minecolonies:minecolonies/build_town_hall"
					criterion: ""
					id: "$(Task-Id $id 'b')"
					type: "advancement"
				}
			]
			x: ${x}d
			y: ${y}d
		}
"@
}

function Quest-University($id, $deps, $x, $y) {
    @"
		{
			dependencies: [$(Join-Dep $deps)]
			id: "$id"
			icon: { count: 1, id: "minecolonies:blockhutuniversity" }
			rewards: [
				{ id: "$(Reward-Id $id 'a')", type: "xp", xp: 30 }
				{ count: 8, id: "$(Reward-Id $id 'b')", item: { count: 1, id: "minecraft:book" }, type: "item" }
				{ count: 32, id: "$(Reward-Id $id 'c')", item: { count: 1, id: "minecraft:paper" }, type: "item" }
				{ count: 16, id: "$(Reward-Id $id 'd')", item: { count: 1, id: "lightmanscurrency:coin_copper" }, type: "item" }
			]
			shape: "diamond"
			size: 2.5d
			tasks: [{
				advancement: "arkcraft:minecolonies/university_1"
				criterion: ""
				id: "2$id"
				type: "advancement"
			}]
			x: ${x}d
			y: ${y}d
		}
"@
}

function Quest-TownhallTier($id, $deps, $icon, $adv, $x, $y, $xp, $shape, $size) {
    $shapeLine = if ($shape) { "`n			shape: `"$shape`"" } else { "" }
    $sizeLine = if ($size) { "`n			size: ${size}d" } else { "" }
    @"
		{
			dependencies: [$(Join-Dep $deps)]
			id: "$id"
			icon: { count: 1, id: "$icon" }
			rewards: [{ id: "$(Reward-Id $id)", type: "xp", xp: $xp }]$shapeLine$sizeLine
			tasks: [{
				advancement: "$adv"
				criterion: ""
				id: "$(Task-Id $id)"
				type: "advancement"
			}]
			x: ${x}d
			y: ${y}d
		}
"@
}

$q = @()
# TRONCO
$q += Quest-Checkmark "1A00000000000001" @() "minecolonies:blockhuttownhall" 0 -14 "diamond" 1.5 5
$q += Quest-SupplyCamp "1A00000000000002" @("1A00000000000001") 0 -12
$q += Quest-Townhall "1A00000000000003" @("1A00000000000002") 0 -10
$q += Quest-Builder "1A00000000000004" @("1A00000000000003") 0 -8
$q += Quest-University "1A00000000000013" @("1A00000000000004") 0 -5.5
$q += Quest-Checkmark "1A0000000000001B" @("1A00000000000013") "lightmanscurrency:coin_copper" 0 -3.5 "gear" 1.5 20

# HUB ramas desde universidad
$uni = "1A00000000000013"
$coins = "1A0000000000001B"
$q += Quest-Checkmark "1A00000000000020" @($uni) "minecraft:white_bed" -4 -1.5 "hexagon" 1.25 5
$q += Quest-Checkmark "1A00000000000021" @($coins) "minecolonies:blockhutfarmer" -9 -1.5 "hexagon" 1.25 5
$q += Quest-Checkmark "1A00000000000030" @($coins) "minecolonies:blockhuttownhall" 5 -1.5 "hexagon" 1.25 5
$q += Quest-Checkmark "1A00000000000040" @($uni) "minecraft:book" 9 -1.5 "hexagon" 1.25 5
$q += Quest-Checkmark "1A00000000000050" @($uni) "minecolonies:blockhutwarehouse" 0 1.5 "hexagon" 1.25 5

# VIVIENDA (izq)
$hubV = "1A00000000000020"
$q += Quest-Advancement "1A00000000000005" @($hubV) "minecolonies:blockhutcitizen" "minecolonies:minecolonies/build_citizen" -4 0.5 10
$q += Quest-Advancement "1A00000000000015" @($hubV) "minecolonies:blockhuttavern" "minecolonies:minecolonies/build_tavern" -5.5 0.5 10
$q += Quest-Advancement "1A00000000000006" @("1A00000000000005") "minecolonies:blockhutcook" "minecolonies:production/build_cook" -4 2.0 10
$q += Quest-Advancement "1A00000000000012" @("1A00000000000006") "minecolonies:blockhutbaker" "minecolonies:production/build_baker" -2.5 3.5 5

# RECURSOS ARKCRAFT (izq-ext)
$hubR = "1A00000000000021"
$q += Quest-Checkmark "1A00000000000022" @($hubR) "minecraft:wheat" -9 0.5 "" 0 3
$q += Quest-Advancement "1A00000000000010" @("1A00000000000022") "minecolonies:blockhutfarmer" "minecolonies:production/build_farmer" -9 3.5 5
$q += Quest-Advancement "1A00000000000011" @("1A00000000000022") "minecolonies:blockhutfisherman" "minecolonies:production/build_fisherman" -6 3.5 5
$q += Quest-Checkmark "1A00000000000023" @($hubR) "minecolonies:blockhutbuilder" -11 0.5 "" 0 3
$q += Quest-Advancement "1A00000000000007" @($hubR) "minecolonies:blockhutlumberjack" "minecolonies:production/build_lumberjack" -7.5 0.5 10
$q += Quest-Advancement "1A00000000000008" @($hubR) "minecolonies:blockhutminer" "minecolonies:production/build_miner" -10.5 0.5 10
$q += Quest-Checkmark "1A00000000000024" @("1A00000000000022") "lightmanscurrency:coin_iron" -9 2.0 "" 0 10
$q += Quest-Checkmark "1A00000000000025" @("1A00000000000007") "lightmanscurrency:coin_iron" -7.5 2.0 "" 0 10
$q += Quest-Checkmark "1A00000000000026" @("1A00000000000008") "lightmanscurrency:coin_iron" -10.5 2.0 "" 0 10
$q += Quest-Checkmark "1A00000000000027" @("1A00000000000011") "lightmanscurrency:coin_iron" -6 5.0 "" 0 10
$q += Quest-Checkmark "1A00000000000028" @("1A00000000000023") "lightmanscurrency:coin_iron" -11 2.0 "" 0 10

# LOGISTICA (centro-abajo)
$hubL = "1A00000000000050"
$q += Quest-Advancement "1A00000000000009" @($hubL) "minecolonies:blockhutwarehouse" "minecolonies:production/build_warehouse" 0 3.0 15
$q += Quest-Advancement "1A0000000000000A" @("1A00000000000009") "minecolonies:blockhutdeliveryman" "minecolonies:production/build_delivery_person" 1.5 3.0 10
$q += Quest-Checkmark "1A00000000000029" @("1A00000000000009") "lightmanscurrency:coin_iron" 0 4.5 "" 0 10

# EXPANSION (der)
$hubE = "1A00000000000030"
$q += Quest-Checkmark "1A0000000000000B" @($hubE) "minecraft:nether_star" 5 0.5 "gear" 1.5 25
$q += Quest-TownhallTier "1A0000000000000C" @("1A0000000000000B") "lightmanscurrency:coin_copper" "arkcraft:minecolonies/townhall_2" 4 2.0 30 "hexagon" 1.5
$q += Quest-TownhallTier "1A0000000000000D" @("1A0000000000000C") "lightmanscurrency:coin_iron" "arkcraft:minecolonies/townhall_3" 5 2.0 50 "hexagon" 1.5
$q += Quest-TownhallTier "1A0000000000000E" @("1A0000000000000D") "lightmanscurrency:coin_gold" "arkcraft:minecolonies/townhall_4" 6 2.0 75 "hexagon" 1.5
$q += Quest-TownhallTier "1A0000000000000F" @("1A0000000000000E") "minecraft:nether_star" "arkcraft:minecolonies/townhall_5" 5 3.5 100 "hexagon" 2.0
$q += Quest-Checkmark "1A00000000000031" @($hubE) "minecolonies:blockhutuniversity" 7 0.5 "" 0 10
$q += Quest-Checkmark "1A00000000000032" @($hubE) "minecolonies:blockhutwarehouse" 8 0.5 "" 0 10

# VANILLA INVESTIGACION (der-ext) — hubs + edificios
$hubVn = "1A00000000000040"
$q += Quest-Checkmark "1A00000000000041" @($hubVn) "minecolonies:blockhutsawmill" 9 0.5 "" 0 3
$q += Quest-Advancement "1A00000000000018" @("1A00000000000041") "minecolonies:blockhutsawmill" "minecolonies:production/build_sawmill" 8.5 2.0 10
$q += Quest-Advancement "1A00000000000019" @("1A00000000000041") "minecolonies:blockhutstonemason" "minecolonies:production/build_stonemason" 9.5 2.0 10
$q += Quest-Item "1A00000000000042" @("1A00000000000041") "minecolonies:blockhutblacksmith" "minecolonies:blockhutblacksmith" 10.5 2.0 10
$q += Quest-Advancement "1A00000000000043" @("1A00000000000041") "minecolonies:blockhutsmeltery" "minecolonies:production/build_smeltery" 8 3.5 10
$q += Quest-Advancement "1A00000000000044" @("1A00000000000041") "minecolonies:blockhutcrusher" "minecolonies:production/build_crusher" 9 3.5 10
$q += Quest-Advancement "1A00000000000045" @("1A00000000000041") "minecolonies:blockhutsifter" "minecolonies:production/build_sifter" 10 3.5 10
$q += Quest-Item "1A00000000000046" @("1A00000000000041") "minecolonies:blockhutcomposter" "minecolonies:blockhutcomposter" 11 3.5 10

$q += Quest-Checkmark "1A00000000000051" @($hubVn) "minecolonies:blockhutlibrary" 12 -1.5 "" 0 3
$q += Quest-Advancement "1A00000000000014" @("1A00000000000051") "minecolonies:blockhutlibrary" "minecolonies:production/build_library" 11.5 0 10
$q += Quest-Item "1A00000000000052" @("1A00000000000051") "minecolonies:blockhutschool" "minecolonies:blockhutschool" 12.5 0 10
$q += Quest-Item "1A00000000000053" @("1A00000000000051") "minecolonies:blockhutgraveyard" "minecolonies:blockhutgraveyard" 13.5 0 10
$q += Quest-Item "1A0000000000001A" @("1A00000000000051") "minecolonies:blockhuthospital" "minecolonies:blockhuthospital" 12 1.5 10

$q += Quest-Checkmark "1A00000000000060" @($hubVn) "minecraft:iron_sword" 15 -1.5 "" 0 3
$q += Quest-Advancement "1A00000000000016" @("1A00000000000060") "minecolonies:blockhutguardtower" "minecolonies:minecolonies/build_guard_tower" 14.5 0 10
$q += Quest-Advancement "1A00000000000017" @("1A00000000000016") "minecolonies:blockhutbarracks" "minecolonies:military/build_barracks" 15.5 0 10
$q += Quest-Advancement "1A00000000000061" @("1A00000000000060") "minecolonies:blockhutarchery" "minecolonies:military/build_archery" 14 1.5 10
$q += Quest-Advancement "1A00000000000062" @("1A00000000000060") "minecolonies:blockhutcombatacademy" "minecolonies:military/build_combat_academy" 16 1.5 10

$q += Quest-Checkmark "1A00000000000070" @($hubVn) "minecraft:enchanting_table" 18 -1.5 "" 0 3
$q += Quest-Item "1A00000000000071" @("1A00000000000070") "minecolonies:blockhutmechanic" "minecolonies:blockhutmechanic" 17.5 0 10
$q += Quest-Item "1A00000000000072" @("1A00000000000070") "minecolonies:blockhutdyer" "minecolonies:blockhutdyer" 18.5 0 10
$q += Quest-Item "1A00000000000073" @("1A00000000000070") "minecolonies:blockhutglassblower" "minecolonies:blockhutglassblower" 19.5 0 10
$q += Quest-Advancement "1A00000000000074" @("1A00000000000070") "minecolonies:blockhutflorist" "minecolonies:production/build_florist" 17 1.5 10
$q += Quest-Item "1A00000000000075" @("1A00000000000070") "minecolonies:blockhutfletcher" "minecolonies:blockhutfletcher" 18 1.5 10
$q += Quest-Item "1A00000000000076" @("1A00000000000070") "minecolonies:blockhutalchemist" "minecolonies:blockhutalchemist" 19 1.5 10
$q += Quest-Item "1A00000000000077" @("1A00000000000070") "minecolonies:blockhutplantation" "minecolonies:blockhutplantation" 20 1.5 10
$q += Quest-Item "1A00000000000078" @("1A00000000000070") "minecolonies:blockhutnetherworker" "minecolonies:blockhutnetherworker" 17.5 3.0 10
$q += Quest-Item "1A00000000000079" @("1A00000000000070") "minecolonies:blockhutconcretemixer" "minecolonies:blockhutconcretemixer" 18.5 3.0 10
$q += Quest-Advancement "1A0000000000007A" @("1A00000000000070") "minecolonies:blockhutmysticalsite" "minecolonies:minecolonies/build_mysticalsite" 19.5 3.0 15
$q += Quest-Advancement "1A0000000000007B" @("1A00000000000043") "minecolonies:blockhutstonesmeltery" "minecolonies:production/build_stone_smeltery" 8.5 4.5 10
$q += Quest-Advancement "1A0000000000007C" @("1A00000000000041") "minecolonies:blockhutcomposter" "minecolonies:production/build_composter" 10.5 4.5 10

$body = $q -join ",`n"
$content = @"
{
	default_hide_dependency_lines: false
	default_quest_shape: ""
	filename: "minecolonies"
	group: ""
	id: "0E21FB2EFB41A583"
	images: [{
		height: 3.867403314917127d
		image: "questinstaller:textures/quests/minecolonies_logo_medium.png"
		rotation: 0.0d
		width: 10.0d
		x: 0.0d
		y: -16.0d
	}]
	order_index: 0
	progression_mode: "flexible"
	quest_links: [ ]
	quests: [
$body
	]
}
"@

[System.IO.File]::WriteAllText($out, $content, [Text.UTF8Encoding]::new($false))
Write-Host "Written $($q.Count) quests to $out"

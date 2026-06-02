# Icono + titulo en recompensas custom de Forja (quita "Personalizado" en UI)
$packRoot = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft'
$forgePath = Join-Path $packRoot 'config\ftbquests\quests\chapters\jewelry_forge.snbt'
$langPath = Join-Path $packRoot 'config\ftbquests\quests\lang\es_es.snbt'
$utf8 = New-Object System.Text.UTF8Encoding $false

$rewards = @(
    @('5E00000000000003', 'jewelry:ruby_ring', 'Anillo de Rubí (Oro)'),
    @('5E00000000000005', 'jewelry:sapphire_ring', 'Anillo de Zafiro (Oro)'),
    @('5E00000000000007', 'jewelry:jade_ring', 'Anillo de Jade (Oro)'),
    @('5E00000000000009', 'jewelry:topaz_ring', 'Anillo de Topacio (Oro)'),
    @('5E00000000000011', 'jewelry:citrine_ring', 'Anillo de Citrino (Oro)'),
    @('5E00000000000013', 'jewelry:tanzanite_ring', 'Anillo de Tanzanita (Oro)'),
    @('5E00000000000015', 'jewelry:ruby_necklace', 'Collar de Rubí (Oro)'),
    @('5E00000000000017', 'jewelry:sapphire_necklace', 'Collar de Zafiro (Oro)'),
    @('5E00000000000019', 'jewelry:jade_necklace', 'Collar de Jade (Oro)'),
    @('5E00000000000021', 'jewelry:topaz_necklace', 'Collar de Topacio (Oro)'),
    @('5E00000000000023', 'jewelry:citrine_necklace', 'Collar de Citrino (Oro)'),
    @('5E00000000000025', 'jewelry:tanzanite_necklace', 'Collar de Tanzanita (Oro)'),
    @('5E00000000000027', 'jewelry:netherite_ruby_ring', 'Anillo de Rubí (Netherite)'),
    @('5E00000000000029', 'jewelry:netherite_sapphire_ring', 'Anillo de Zafiro (Netherite)'),
    @('5E00000000000031', 'jewelry:netherite_jade_ring', 'Anillo de Jade (Netherite)'),
    @('5E00000000000033', 'jewelry:netherite_topaz_ring', 'Anillo de Topacio (Netherite)'),
    @('5E00000000000035', 'jewelry:netherite_citrine_ring', 'Anillo de Citrino (Netherite)'),
    @('5E00000000000037', 'jewelry:netherite_tanzanite_ring', 'Anillo de Tanzanita (Netherite)'),
    @('5E00000000000039', 'jewelry:netherite_ruby_necklace', 'Collar de Rubí (Netherite)'),
    @('5E00000000000041', 'jewelry:netherite_sapphire_necklace', 'Collar de Zafiro (Netherite)'),
    @('5E00000000000043', 'jewelry:netherite_jade_necklace', 'Collar de Jade (Netherite)'),
    @('5E00000000000045', 'jewelry:netherite_topaz_necklace', 'Collar de Topacio (Netherite)'),
    @('5E00000000000047', 'jewelry:netherite_citrine_necklace', 'Collar de Citrino (Netherite)'),
    @('5E00000000000049', 'jewelry:netherite_tanzanite_necklace', 'Collar de Tanzanita (Netherite)')
)

$forge = [System.IO.File]::ReadAllText($forgePath, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
$lang = [System.IO.File]::ReadAllText($langPath, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)

foreach ($r in $rewards) {
    $rid = $r[0]
    $item = $r[1]
    $title = $r[2]
    $old = "{ id: `"$rid`" type: `"custom`" }"
    $new = @"
				{
					icon: { id: "$item" }
					id: "$rid"
					type: "custom"
				}
"@
    $forge = $forge.Replace($old, $new)
    $langKey = "reward.$rid.title"
    if ($lang -notmatch [regex]::Escape($langKey)) {
        $lang = $lang -replace '\r?\n\}$', ([Environment]::NewLine + "	$langKey`: `"$title`"" + [Environment]::NewLine + '}')
    }
}

[System.IO.File]::WriteAllText($forgePath, $forge, $utf8)
[System.IO.File]::WriteAllText($langPath, $lang, $utf8)
Write-Host "Forja: $($rewards.Count) recompensas con icono + titulo en lang"

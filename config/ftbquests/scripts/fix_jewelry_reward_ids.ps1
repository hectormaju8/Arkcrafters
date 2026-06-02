# Alinea IDs de recompensa de jewelry_forge con el patron del Mercado
$path = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft\config\ftbquests\quests\chapters\jewelry_forge.snbt'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)

for ($i = 2; $i -le 25; $i++) {
    $suffix = $i.ToString('00')
    $questId = "5C000000000000$suffix"
    $xpId = ('5E000000000000{0:D2}' -f (2 + 2 * ($i - 2)))
    $itemId = ('5E000000000000{0:D2}' -f (3 + 2 * ($i - 2)))
    $oldItemId = "5E000000000110$suffix"

    $pattern = "(id: `"$questId`"[\s\S]*?rewards: \[[\s\S]*?id: `")([^`"]+)(`"[\s\S]*?type: `"xp`"[\s\S]*?id: `")([^`"]+)(`"[\s\S]*?type: `"item`")"
    # Simpler: two targeted replaces inside file for this quest's known old ids
    $content = $content.Replace("id: `"$oldItemId`"", "id: `"$itemId`"")

    # Fix XP reward id for quests 3+ (quest 2 xp id 02 stays)
    if ($i -ge 3) {
        $oldXpId = ('5E000000000000{0:D2}' -f ($i))
        if ($oldXpId -ne $xpId) {
            $content = $content.Replace("id: `"$oldXpId`"`r`n`t`t`t`ttype: `"xp`"", "id: `"$xpId`"`r`n`t`t`t`ttype: `"xp`"")
            $content = $content.Replace("id: `"$oldXpId`"`n`t`t`t`ttype: `"xp`"", "id: `"$xpId`"`n`t`t`t`ttype: `"xp`"")
        }
    }
}

[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
Write-Host 'Reward IDs actualizados estilo Mercado (5E...02/03, 04/05, ...)'

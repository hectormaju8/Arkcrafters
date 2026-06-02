// Recompensas Forja de Joyas: custom reward FTB + KubeJS (mas fiable que type item con mod Jewelry)
var JEWELRY_FORGE_REWARDS = [
    ['5E00000000000003', 'jewelry:ruby_ring'],
    ['5E00000000000005', 'jewelry:sapphire_ring'],
    ['5E00000000000007', 'jewelry:jade_ring'],
    ['5E00000000000009', 'jewelry:topaz_ring'],
    ['5E00000000000011', 'jewelry:citrine_ring'],
    ['5E00000000000013', 'jewelry:tanzanite_ring'],
    ['5E00000000000015', 'jewelry:ruby_necklace'],
    ['5E00000000000017', 'jewelry:sapphire_necklace'],
    ['5E00000000000019', 'jewelry:jade_necklace'],
    ['5E00000000000021', 'jewelry:topaz_necklace'],
    ['5E00000000000023', 'jewelry:citrine_necklace'],
    ['5E00000000000025', 'jewelry:tanzanite_necklace'],
    ['5E00000000000027', 'jewelry:netherite_ruby_ring'],
    ['5E00000000000029', 'jewelry:netherite_sapphire_ring'],
    ['5E00000000000031', 'jewelry:netherite_jade_ring'],
    ['5E00000000000033', 'jewelry:netherite_topaz_ring'],
    ['5E00000000000035', 'jewelry:netherite_citrine_ring'],
    ['5E00000000000037', 'jewelry:netherite_tanzanite_ring'],
    ['5E00000000000039', 'jewelry:netherite_ruby_necklace'],
    ['5E00000000000041', 'jewelry:netherite_sapphire_necklace'],
    ['5E00000000000043', 'jewelry:netherite_jade_necklace'],
    ['5E00000000000045', 'jewelry:netherite_topaz_necklace'],
    ['5E00000000000047', 'jewelry:netherite_citrine_necklace'],
    ['5E00000000000049', 'jewelry:netherite_tanzanite_necklace']
]

for (var i = 0; i < JEWELRY_FORGE_REWARDS.length; i++) {
    ;(function (rewardId, itemId) {
        FTBQuestsEvents.customReward(rewardId, function (event) {
            event.player.give(itemId)
        })
    })(JEWELRY_FORGE_REWARDS[i][0], JEWELRY_FORGE_REWARDS[i][1])
}

console.info('[Arkcraft] Forja de Joyas: ' + JEWELRY_FORGE_REWARDS.length + ' recompensas custom KubeJS')

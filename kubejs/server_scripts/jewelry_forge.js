// ARKCRAFT - Joyería: gemas solo vía FTB Forja (no mesa de craft directo a joya)
// Paquetes shapeless = materiales del trueque; FTB consume 1 paquete (igual que Mercado).

var ARK_GEM_JEWELRY = [
    'jewelry:ruby_ring', 'jewelry:ruby_necklace',
    'jewelry:sapphire_ring', 'jewelry:sapphire_necklace',
    'jewelry:jade_ring', 'jewelry:jade_necklace',
    'jewelry:topaz_ring', 'jewelry:topaz_necklace',
    'jewelry:citrine_ring', 'jewelry:citrine_necklace',
    'jewelry:tanzanite_ring', 'jewelry:tanzanite_necklace',
    'jewelry:netherite_ruby_ring', 'jewelry:netherite_ruby_necklace',
    'jewelry:netherite_sapphire_ring', 'jewelry:netherite_sapphire_necklace',
    'jewelry:netherite_jade_ring', 'jewelry:netherite_jade_necklace',
    'jewelry:netherite_topaz_ring', 'jewelry:netherite_topaz_necklace',
    'jewelry:netherite_citrine_ring', 'jewelry:netherite_citrine_necklace',
    'jewelry:netherite_tanzanite_ring', 'jewelry:netherite_tanzanite_necklace'
]

var ARK_FORGE_PAYMENTS = [
    { payment: 'unenchanted_ruby_ring', gem: 'jewelry:ruby', gold: 3, string: 0, base: null, coins: 5, coin: 'lightmanscurrency:coin_gold' },
    { payment: 'unenchanted_sapphire_ring', gem: 'jewelry:sapphire', gold: 3, string: 0, base: null, coins: 5, coin: 'lightmanscurrency:coin_gold' },
    { payment: 'unenchanted_jade_ring', gem: 'jewelry:jade', gold: 3, string: 0, base: null, coins: 5, coin: 'lightmanscurrency:coin_gold' },
    { payment: 'unenchanted_topaz_ring', gem: 'jewelry:topaz', gold: 3, string: 0, base: null, coins: 5, coin: 'lightmanscurrency:coin_gold' },
    { payment: 'unenchanted_citrine_ring', gem: 'jewelry:citrine', gold: 3, string: 0, base: null, coins: 5, coin: 'lightmanscurrency:coin_gold' },
    { payment: 'unenchanted_tanzanite_ring', gem: 'jewelry:tanzanite', gold: 3, string: 0, base: null, coins: 5, coin: 'lightmanscurrency:coin_gold' },
    { payment: 'unenchanted_ruby_necklace', gem: 'jewelry:ruby', gold: 1, string: 1, base: null, coins: 5, coin: 'lightmanscurrency:coin_gold' },
    { payment: 'unenchanted_sapphire_necklace', gem: 'jewelry:sapphire', gold: 1, string: 1, base: null, coins: 5, coin: 'lightmanscurrency:coin_gold' },
    { payment: 'unenchanted_jade_necklace', gem: 'jewelry:jade', gold: 1, string: 1, base: null, coins: 5, coin: 'lightmanscurrency:coin_gold' },
    { payment: 'unenchanted_topaz_necklace', gem: 'jewelry:topaz', gold: 1, string: 1, base: null, coins: 5, coin: 'lightmanscurrency:coin_gold' },
    { payment: 'unenchanted_citrine_necklace', gem: 'jewelry:citrine', gold: 1, string: 1, base: null, coins: 5, coin: 'lightmanscurrency:coin_gold' },
    { payment: 'unenchanted_tanzanite_necklace', gem: 'jewelry:tanzanite', gold: 1, string: 1, base: null, coins: 5, coin: 'lightmanscurrency:coin_gold' },
    { payment: 'unenchanted_netherite_ruby_ring', gem: null, gold: 0, string: 0, base: 'jewelry:ruby_ring', coins: 4, coin: 'lightmanscurrency:coin_emerald' },
    { payment: 'unenchanted_netherite_sapphire_ring', gem: null, gold: 0, string: 0, base: 'jewelry:sapphire_ring', coins: 4, coin: 'lightmanscurrency:coin_emerald' },
    { payment: 'unenchanted_netherite_jade_ring', gem: null, gold: 0, string: 0, base: 'jewelry:jade_ring', coins: 4, coin: 'lightmanscurrency:coin_emerald' },
    { payment: 'unenchanted_netherite_topaz_ring', gem: null, gold: 0, string: 0, base: 'jewelry:topaz_ring', coins: 4, coin: 'lightmanscurrency:coin_emerald' },
    { payment: 'unenchanted_netherite_citrine_ring', gem: null, gold: 0, string: 0, base: 'jewelry:citrine_ring', coins: 4, coin: 'lightmanscurrency:coin_emerald' },
    { payment: 'unenchanted_netherite_tanzanite_ring', gem: null, gold: 0, string: 0, base: 'jewelry:tanzanite_ring', coins: 4, coin: 'lightmanscurrency:coin_emerald' },
    { payment: 'unenchanted_netherite_ruby_necklace', gem: null, gold: 0, string: 0, base: 'jewelry:ruby_necklace', coins: 4, coin: 'lightmanscurrency:coin_emerald' },
    { payment: 'unenchanted_netherite_sapphire_necklace', gem: null, gold: 0, string: 0, base: 'jewelry:sapphire_necklace', coins: 4, coin: 'lightmanscurrency:coin_emerald' },
    { payment: 'unenchanted_netherite_jade_necklace', gem: null, gold: 0, string: 0, base: 'jewelry:jade_necklace', coins: 4, coin: 'lightmanscurrency:coin_emerald' },
    { payment: 'unenchanted_netherite_topaz_necklace', gem: null, gold: 0, string: 0, base: 'jewelry:topaz_necklace', coins: 4, coin: 'lightmanscurrency:coin_emerald' },
    { payment: 'unenchanted_netherite_citrine_necklace', gem: null, gold: 0, string: 0, base: 'jewelry:citrine_necklace', coins: 4, coin: 'lightmanscurrency:coin_emerald' },
    { payment: 'unenchanted_netherite_tanzanite_necklace', gem: null, gold: 0, string: 0, base: 'jewelry:tanzanite_necklace', coins: 4, coin: 'lightmanscurrency:coin_emerald' }
]

ServerEvents.recipes(function (event) {
    for (var i = 0; i < ARK_GEM_JEWELRY.length; i++) {
        event.remove({ output: ARK_GEM_JEWELRY[i] })
    }

    for (var j = 0; j < ARK_FORGE_PAYMENTS.length; j++) {
        var trade = ARK_FORGE_PAYMENTS[j]
        var ingredients = []

        if (trade.gem) {
            ingredients.push(trade.gem)
        }
        if (trade.gold > 0) {
            ingredients.push(trade.gold + 'x minecraft:gold_ingot')
        }
        if (trade.string > 0) {
            ingredients.push('minecraft:string')
        }
        if (trade.base) {
            ingredients.push(trade.base)
            ingredients.push('minecraft:netherite_ingot')
        }
        ingredients.push(trade.coins + 'x ' + trade.coin)

        event.shapeless('arkcraft:' + trade.payment, ingredients)
    }
})

console.info('[Arkcraft] Jewelry forge: ' + ARK_GEM_JEWELRY.length + ' joyas bloqueadas, ' + ARK_FORGE_PAYMENTS.length + ' sin encantar')

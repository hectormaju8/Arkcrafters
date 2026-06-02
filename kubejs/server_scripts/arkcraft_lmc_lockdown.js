// ============================================================
// ARKCRAFT — Lightman's Currency reducido (no tiendas / tax / etc.)
// Permitido: monedas, wallets hasta diamante (ver arkcraft_wallet_limits.js), ATM
// ============================================================

var ARKCRAFT_LMC_ALLOWED_PREFIXES = [
    'lightmanscurrency:coin_',
    'lightmanscurrency:wallet',
    'lightmanscurrency:atm'
]

var ARKCRAFT_LMC_STRIP_PREFIXES = [
    'lightmanscurrency:upgrade_wallet',
    'lightmanscurrency:tax',
    'lightmanscurrency:auction',
    'lightmanscurrency:vending',
    'lightmanscurrency:ticket',
    'lightmanscurrency:terminal',
    'lightmanscurrency:trader',
    'lightmanscurrency:item_trader',
    'lightmanscurrency:network',
    'lightmanscurrency:trading_core',
    'lightmanscurrency:money_bag',
    'lightmanscurrency:coin_chest',
    'lightmanscurrency:portable_atm',
    'lightmanscurrency:coinmint',
    'lightmanscurrency:cash_register',
    'lightmanscurrency:paygate',
    'lightmanscurrency:slot_machine',
    'lightmanscurrency:display',
    'lightmanscurrency:shelf',
    'lightmanscurrency:armor_display',
    'lightmanscurrency:card_display',
    'lightmanscurrency:gacha',
    'lightmanscurrency:command_trader',
    'lightmanscurrency:coinjar',
    'lightmanscurrency:piggy_bank',
    'lightmanscurrency:bank_card',
    'lightmanscurrency:prepaid',
    'lightmanscurrency:magnet',
    'lightmanscurrency:interaction_upgrade',
    'lightmanscurrency:capacity_upgrade',
    'lightmanscurrency:security_upgrade',
    'lightmanscurrency:exchange_upgrade',
    'lightmanscurrency:auction_stand'
]

var ARKCRAFT_LMC_REMOVED_RECIPES = [
    'lightmanscurrency:coinmint',
    'lightmanscurrency:portable_atm',
    'lightmanscurrency:portable_atm_swap',
    'lightmanscurrency:tax_block'
]

var McItemStackEmptyLock = null
try {
    McItemStackEmptyLock = Java.loadClass('net.minecraft.world.item.ItemStack').EMPTY
} catch (eInit) {}

var ARKCRAFT_LMC_REMOVED_OUTPUTS = [
    'lightmanscurrency:portable_atm',
    'lightmanscurrency:coinmint',
    'lightmanscurrency:tax_block',
    'lightmanscurrency:terminal',
    'lightmanscurrency:network_terminal',
    'lightmanscurrency:trading_core',
    'lightmanscurrency:money_bag',
    'lightmanscurrency:coin_chest',
    'lightmanscurrency:cash_register',
    'lightmanscurrency:paygate',
    'lightmanscurrency:slot_machine',
    'lightmanscurrency:ticket_kiosk',
    'lightmanscurrency:network_trader',
    'lightmanscurrency:trader_interface',
    'lightmanscurrency:command_trader',
    'lightmanscurrency:gacha_machine',
    'lightmanscurrency:gacha_ball'
]

function isAllowedLmcItemId(id) {
    if (!id || id.indexOf('lightmanscurrency:') !== 0) return false
    if (id.indexOf('lightmanscurrency:coin_chocolate') === 0) return false
    if (id === 'lightmanscurrency:wallet_netherite') return false
    if (id === 'lightmanscurrency:wallet_nether_star') return false
    if (id === 'lightmanscurrency:wallet_ender_dragon') return false
    var i
    for (i = 0; i < ARKCRAFT_LMC_ALLOWED_PREFIXES.length; i++) {
        if (id.indexOf(ARKCRAFT_LMC_ALLOWED_PREFIXES[i]) === 0) return true
    }
    if (id === 'lightmanscurrency:atm') return true
    return false
}

function shouldStripLmcItemId(id) {
    if (!id || id.indexOf('lightmanscurrency:') !== 0) return false
    if (isAllowedLmcItemId(id)) return false
    var i
    for (i = 0; i < ARKCRAFT_LMC_STRIP_PREFIXES.length; i++) {
        if (id.indexOf(ARKCRAFT_LMC_STRIP_PREFIXES[i]) === 0) return true
    }
    return true
}

function stripBlockedLmcFromPlayer(player, silent) {
    if (!player) return false
    var mc = null
    try {
        if (player.getEntity) mc = player.getEntity()
    } catch (e0) {}
    if (!mc) return false

    var removed = false
    try {
        var inv = mc.getInventory()
        for (var i = 0; i < 36; i++) {
            var stack = inv.getItem(i)
            if (!stack || stack.isEmpty()) continue
            var id = String(stack.getItem().builtInRegistryHolder().key().location())
            if (!shouldStripLmcItemId(id)) continue
            if (McItemStackEmptyLock) inv.setItem(i, McItemStackEmptyLock)
            removed = true
        }
    } catch (eInv) {}

    if (removed && !silent) {
        player.tell('§6[Arkcraft] §7Ese objeto de Lightman\'s §cno esta permitido§7.')
        player.tell('§7Usa §fmonedas§7, §fwallet §7(hasta diamante) y §fATM §7en colonia.')
    }
    return removed
}

ServerEvents.recipes(function(event) {
    ARKCRAFT_LMC_REMOVED_RECIPES.forEach(function(rid) {
        event.remove({ id: rid })
    })
    ARKCRAFT_LMC_REMOVED_OUTPUTS.forEach(function(out) {
        event.remove({ output: out })
    })
    event.remove({ output: /lightmanscurrency:auction_stand/ })
    event.remove({ output: /lightmanscurrency:.*vending.*/ })
    event.remove({ output: /lightmanscurrency:.*display.*/ })
    event.remove({ output: /lightmanscurrency:.*shelf.*/ })
    event.remove({ output: /lightmanscurrency:.*freezer.*/ })
    event.remove({ output: /lightmanscurrency:item_trader.*/ })
})

PlayerEvents.loggedIn(function(event) {
    stripBlockedLmcFromPlayer(event.player, false)
})

PlayerEvents.inventoryChanged(function(event) {
    var stack = event.item
    if (!stack) return
    var id = ''
    try {
        id = String(stack.id)
    } catch (eId) {
        try {
            id = String(stack.getItem().builtInRegistryHolder().key().location())
        } catch (eId2) {}
    }
    if (!id || id.indexOf('lightmanscurrency:') !== 0) return
    if (!shouldStripLmcItemId(id)) return
    stripBlockedLmcFromPlayer(event.player, true)
})

BlockEvents.placed(function(event) {
    var blockId = ''
    try {
        blockId = String(event.block.id)
    } catch (eB) {}
    if (!blockId || blockId.indexOf('lightmanscurrency:') !== 0) return
    if (blockId === 'lightmanscurrency:atm') return
    try {
        event.cancel()
    } catch (eCancel) {}
    var player = event.player
    if (player && player.tell) {
        player.tell('§6[Arkcraft] §7Solo puedes colocar el §fATM §7de Lightman\'s en tu colonia.')
    }
})

console.info('[ArkcraftLMC] Traders/tax/mint bloqueados — monedas + wallets + ATM OK')

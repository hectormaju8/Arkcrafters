// ============================================================
// ARKCRAFT — Sin wallets OP (banco portátil / ATM desde cualquier sitio)
// Máximo: wallet diamante. Banco solo en ATM de colonia (bankAbility=[] en config)
// ============================================================

var ARKCRAFT_MAX_WALLET = 'lightmanscurrency:wallet_diamond'

var ARKCRAFT_BLOCKED_WALLETS = {
    'lightmanscurrency:wallet_netherite': true,
    'lightmanscurrency:wallet_nether_star': true,
    'lightmanscurrency:wallet_ender_dragon': true
}

var ARKCRAFT_BLOCKED_RECIPE_IDS = [
    'lightmanscurrency:wallet_netherite',
    'lightmanscurrency:wallet_nether_star',
    'lightmanscurrency:upgrade_wallet_netherite_to_wallet_nether_star',
    'lightmanscurrency:upgrade_wallet_iron_to_wallet_netherite',
    'lightmanscurrency:upgrade_wallet_copper_to_wallet_netherite',
    'lightmanscurrency:upgrade_wallet_iron_to_wallet_nether_star',
    'lightmanscurrency:upgrade_wallet_gold_to_wallet_netherite',
    'lightmanscurrency:upgrade_wallet_diamond_to_wallet_netherite',
    'lightmanscurrency:upgrade_wallet_gold_to_wallet_nether_star',
    'lightmanscurrency:upgrade_wallet_diamond_to_wallet_nether_star',
    'lightmanscurrency:upgrade_wallet_copper_to_wallet_nether_star',
    'lightmanscurrency:upgrade_wallet_emerald_to_wallet_nether_star',
    'lightmanscurrency:upgrade_wallet_emerald_to_wallet_netherite'
]

var LmcWalletItemLimits = null
var LmcWalletHandlerLimits = null

try {
    LmcWalletItemLimits = Java.loadClass('io.github.lightman314.lightmanscurrency.common.items.WalletItem')
    LmcWalletHandlerLimits = Java.loadClass('io.github.lightman314.lightmanscurrency.common.attachments.WalletHandler')
} catch (e) {
    console.warn('[ArkcraftWallet] API wallet no cargada: ' + e)
}

function isBlockedWalletId(id) {
    return id && ARKCRAFT_BLOCKED_WALLETS[String(id)] === true
}

function transferWalletContents(fromMcStack, toMcStack) {
    if (!LmcWalletItemLimits || !fromMcStack || !toMcStack) return
    try {
        if (!LmcWalletItemLimits.isWallet(fromMcStack)) return
        if (!LmcWalletItemLimits.isWallet(toMcStack)) return
        var fromW = LmcWalletItemLimits.getDataWrapper(fromMcStack)
        var container = fromW.getContents()
        var toW = LmcWalletItemLimits.getDataWrapper(toMcStack)
        toW.setContents(container, null)
    } catch (err) {
        console.warn('[ArkcraftWallet] transferWalletContents: ' + err)
    }
}

function createMaxWalletMcStack() {
    try {
        var kube = Item.of(ARKCRAFT_MAX_WALLET, 1)
        if (kube.itemStack) return kube.itemStack
        if (kube.getItem) return kube
    } catch (e0) {}
    try {
        var RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
        var ItemStack = Java.loadClass('net.minecraft.world.item.ItemStack')
        var BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
        var item = BuiltInRegistries.ITEM.get(RL.parse(ARKCRAFT_MAX_WALLET))
        return new ItemStack(item, 1)
    } catch (e1) {
        return null
    }
}

function downgradeMcWalletStack(blockedStack) {
    var repMc = createMaxWalletMcStack()
    if (!repMc) return null
    try {
        if (blockedStack && LmcWalletItemLimits && LmcWalletItemLimits.isWallet(blockedStack)) {
            transferWalletContents(blockedStack, repMc)
        }
    } catch (e) {}
    return repMc
}

function downgradePlayerWallets(player, silent) {
    if (!player) return false
    var changed = false
    var mc = null
    try {
        if (player.getEntity) mc = player.getEntity()
    } catch (e0) {}

    if (mc && LmcWalletHandlerLimits) {
        try {
            var handler = LmcWalletHandlerLimits.get(mc)
            if (handler) {
                var equipped = handler.getWallet()
                if (equipped && !equipped.isEmpty()) {
                    var eqId = String(equipped.getItem().builtInRegistryHolder().key().location())
                    if (isBlockedWalletId(eqId)) {
                        var newMc = downgradeMcWalletStack(equipped)
                        if (newMc) handler.setWallet(newMc)
                        changed = true
                    }
                }
            }
        } catch (eH) {}
    }

    if (mc) {
        try {
            var inv = mc.getInventory()
            for (var i = 0; i < 36; i++) {
                var stack = inv.getItem(i)
                if (!stack || stack.isEmpty()) continue
                var id = String(stack.getItem().builtInRegistryHolder().key().location())
                if (!isBlockedWalletId(id)) continue
                var newMc = downgradeMcWalletStack(stack)
                if (newMc) {
                    inv.setItem(i, newMc)
                    changed = true
                }
            }
        } catch (eInv) {}
    }

    if (changed && !silent) {
        player.tell('§6[Arkcraft] §7Las wallets §cnetherite+ §7estan §cdeshabilitadas§7.')
        player.tell('§7Maximo: §bdiamante§7. El §fbanco §7solo en el §fATM §7de tu colonia.')
    }
    return changed
}

ServerEvents.recipes(function(event) {
    ARKCRAFT_BLOCKED_RECIPE_IDS.forEach(function(rid) {
        event.remove({ id: rid })
    })
    event.remove({ output: 'lightmanscurrency:wallet_netherite' })
    event.remove({ output: 'lightmanscurrency:wallet_nether_star' })
    event.remove({ output: 'lightmanscurrency:wallet_ender_dragon' })
})

PlayerEvents.loggedIn(function(event) {
    downgradePlayerWallets(event.player, false)
})

Object.keys(ARKCRAFT_BLOCKED_WALLETS).forEach(function(walletId) {
    PlayerEvents.inventoryChanged(walletId, function(event) {
        downgradePlayerWallets(event.player, true)
    })
})

console.info('[ArkcraftWallet] Wallets OP bloqueadas — max ' + ARKCRAFT_MAX_WALLET)

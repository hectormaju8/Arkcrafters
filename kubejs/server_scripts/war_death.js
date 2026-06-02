// ============================================================
// ARKCRAFT — Muerte: guerra (0 drops, vidas) + PvP mundial (drops parciales)
// Monedas en contenedores Lightman's Currency (no Sophisticated Backpacks)
// ============================================================

var PVP_INV_DROP_RATE = 0.20
var PVP_LMC_BAG_COIN_RATE = 0.30
var PVP_ATTACKER_MEMORY_TICKS = 20 * 30

var pvpLastAttackerByVictimUuid = {}
var pvpKeptStacksByPlayerName = {}
var pvpPendingDropStacksByPlayerName = {}
var pvpEquippedExtrasByPlayerName = {}
var pvpWalletCoinDropsByPlayerName = {}

var COIN_ID_PREFIX = 'lightmanscurrency:coin_'

var LMC_PROTECTED_WHOLE_ITEM = {}

var WarEquipSlot = null
var McItemStackEmpty = null
var JavaArrayList = null

var LmcWalletItem = null
var LmcMoneyBagItem = null
var LmcCoinJarItem = null
var LmcWalletHandler = null
var AccessoriesCapability = null
var ModGameRules = null

try {
    WarEquipSlot = Java.loadClass('net.minecraft.world.entity.EquipmentSlot')
    McItemStackEmpty = Java.loadClass('net.minecraft.world.item.ItemStack').EMPTY
    JavaArrayList = Java.loadClass('java.util.ArrayList')
} catch (eqErr) {}

try {
    LmcWalletItem = Java.loadClass('io.github.lightman314.lightmanscurrency.common.items.WalletItem')
    LmcMoneyBagItem = Java.loadClass('io.github.lightman314.lightmanscurrency.common.items.MoneyBagItem')
    LmcCoinJarItem = Java.loadClass('io.github.lightman314.lightmanscurrency.common.items.CoinJarItem')
    LmcWalletHandler = Java.loadClass('io.github.lightman314.lightmanscurrency.common.attachments.WalletHandler')
    console.info('[WarDeath] API Lightman\'s Currency OK (wallet, money_bag, coin_jar)')
} catch (lmcErr) {
    console.warn('[WarDeath] API Lightman\'s Currency parcial/no disponible: ' + lmcErr)
}

try {
    ModGameRules = Java.loadClass('io.github.lightman314.lightmanscurrency.common.gamerule.ModGameRules')
} catch (grErr) {
    console.warn('[WarDeath] ModGameRules no cargado: ' + grErr)
}

try {
    AccessoriesCapability = Java.loadClass('io.wispforest.accessories.api.AccessoriesCapability')
    console.info('[WarDeath] API Accessories OK (mochila espalda)')
} catch (accErr) {
    console.warn('[WarDeath] API Accessories no disponible: ' + accErr)
}

function isBackpackId(id) {
    return id && id.indexOf('sophisticatedbackpacks:') === 0 && id.indexOf('backpack') >= 0
}

function getAccessoriesCapability(mc) {
    if (!AccessoriesCapability || !mc) return null
    try {
        var opt = AccessoriesCapability.getOptionally(mc)
        if (!opt) return null
        try {
            if (opt.isPresent && opt.isPresent()) return opt.get()
        } catch (e1) {}
        try {
            if (opt.present) return opt.get()
        } catch (e2) {}
        return opt
    } catch (e) {
        return null
    }
}

function captureEquippedExtras(mc) {
    var extras = { wallet: McItemStackEmpty, accessories: [] }
    if (!mc) return extras

    if (LmcWalletHandler) {
        try {
            var handler = LmcWalletHandler.get(mc)
            if (handler) {
                var w = handler.getWallet()
                if (w && !w.isEmpty()) extras.wallet = w.copy()
            }
        } catch (eW) {
            console.warn('[WarDeath] capture wallet: ' + eW)
        }
    }

    var cap = getAccessoriesCapability(mc)
    if (cap) {
        try {
            var containers = cap.getContainers()
            if (containers && containers.keySet) {
                var keys = containers.keySet().iterator()
                while (keys.hasNext()) {
                    var slotId = String(keys.next())
                    var container = containers.get(slotId)
                    if (!container || !container.getAccessories) continue
                    var inv = container.getAccessories()
                    var size = container.getSize()
                    for (var s = 0; s < size; s++) {
                        var st = inv.getItem(s)
                        if (!st || st.isEmpty()) continue
                        extras.accessories.push({
                            slotId: slotId,
                            slot: s,
                            stack: st.copy()
                        })
                    }
                }
            }
        } catch (eA) {
            console.warn('[WarDeath] capture accessories: ' + eA)
        }
    }

    if (WarEquipSlot) {
        try {
            var chest = mc.getItemBySlot(WarEquipSlot.CHEST)
            if (chest && !chest.isEmpty() && isBackpackId(mcStackId(chest))) {
                var dup = false
                for (var d = 0; d < extras.accessories.length; d++) {
                    if (extras.accessories[d].slotId === 'armor_chest') dup = true
                }
                if (!dup) {
                    extras.accessories.push({
                        slotId: 'armor_chest',
                        slot: 0,
                        stack: chest.copy(),
                        armorSlot: true
                    })
                }
            }
        } catch (eC) {}
    }

    return extras
}

function restoreEquippedExtras(mc, extras) {
    if (!mc || !extras) return false
    var ok = false

    if (LmcWalletHandler && extras.wallet && !extras.wallet.isEmpty()) {
        try {
            var handler = LmcWalletHandler.get(mc)
            if (handler) {
                handler.setWallet(extras.wallet.copy())
                ok = true
            }
        } catch (eW) {
            console.warn('[WarDeath] restore wallet: ' + eW)
        }
    }

    if (extras.accessories && extras.accessories.length > 0) {
        for (var i = 0; i < extras.accessories.length; i++) {
            var ent = extras.accessories[i]
            if (!ent || !ent.stack || ent.stack.isEmpty()) continue
            if (ent.armorSlot && WarEquipSlot) {
                try {
                    mc.setItemSlot(WarEquipSlot.CHEST, ent.stack.copy())
                    ok = true
                } catch (eArm) {}
                continue
            }
            var cap = getAccessoriesCapability(mc)
            if (!cap) continue
            try {
                var containers = cap.getContainers()
                var container = containers.get(ent.slotId)
                if (container && container.getAccessories) {
                    container.getAccessories().setItem(ent.slot, ent.stack.copy())
                    ok = true
                }
            } catch (eA) {
                console.warn('[WarDeath] restore accessory ' + ent.slotId + ': ' + eA)
            }
        }
    }

    return ok
}

function walletStacksRemovedFromKeep(keepStacks) {
    var out = []
    if (!keepStacks) return out
    for (var i = 0; i < keepStacks.length; i++) {
        var st = keepStacks[i]
        if (!st || st.isEmpty()) continue
        if (isLmcWalletId(mcStackId(st))) continue
        out.push(st)
    }
    return out
}

function removeEquippedWalletDuplicatesInMain(mc) {
    if (!mc || !LmcWalletHandler || !LmcWalletItem) return
    try {
        var handler = LmcWalletHandler.get(mc)
        if (!handler) return
        var equipped = handler.getWallet()
        if (!equipped || equipped.isEmpty()) return
        var inv = mc.getInventory()
        for (var i = 0; i < 36; i++) {
            var st = inv.getItem(i)
            if (!st || st.isEmpty()) continue
            try {
                if (isWalletMcStack(st)) inv.setItem(i, McItemStackEmpty)
            } catch (eW) {}
        }
        if (WarEquipSlot) {
            var off = mc.getItemBySlot(WarEquipSlot.OFFHAND)
            if (off && !off.isEmpty()) {
                try {
                    if (isWalletMcStack(off)) {
                        mc.setItemSlot(WarEquipSlot.OFFHAND, McItemStackEmpty)
                    }
                } catch (eOff) {}
            }
        }
    } catch (e) {}
}

function storeEquippedExtras(mc, extras) {
    var key = getPlayerStorageKey(mc)
    if (!key || !extras) return false
    pvpEquippedExtrasByPlayerName[key] = extras
    return true
}

function saveEquippedExtras(mc) {
    return storeEquippedExtras(mc, captureEquippedExtras(mc))
}

function takeEquippedExtras(mc) {
    var key = getPlayerStorageKey(mc)
    if (!key || !pvpEquippedExtrasByPlayerName[key]) return null
    var extras = pvpEquippedExtrasByPlayerName[key]
    delete pvpEquippedExtrasByPlayerName[key]
    return extras
}

function ark() {
    if (typeof ArkcraftWar !== 'undefined') return ArkcraftWar
    return null
}

function pname(player) {
    var a = ark()
    if (a && a.playerName) return a.playerName(player)
    try { return String(player.username) } catch (e) {}
    return ''
}

function toMc(player) {
    var a = ark()
    if (a && a.toMcPlayer) return a.toMcPlayer(player)
    try { if (player.getEntity) return player.getEntity() } catch (e) {}
    return player
}

function mcStackId(stack) {
    if (!stack || stack.isEmpty()) return ''
    try {
        return String(stack.getItem().builtInRegistryHolder().key().location())
    } catch (e) {}
    return ''
}

function isCoinId(id) {
    return id && id.indexOf(COIN_ID_PREFIX) === 0
}

function isLmcWalletId(id) {
    return id && id.indexOf('lightmanscurrency:wallet') === 0
}

function isWalletMcStack(mcStack) {
    if (!mcStack || mcStack.isEmpty()) return false
    if (isLmcWalletId(mcStackId(mcStack))) return true
    if (!LmcWalletItem) return false
    try { return LmcWalletItem.isWallet(mcStack) } catch (e1) {}
    return false
}

function isLmcCoinJarId(id) {
    if (!id || id.indexOf('lightmanscurrency:') !== 0) return false
    return id.indexOf('piggy_bank') >= 0 || id.indexOf('coinjar') >= 0
}

function isLmcCoinStorageItem(id) {
    if (!id) return false
    if (isLmcWalletId(id)) return true
    return false
}

function isProtectedWholeItem(id) {
    if (!id) return true
    if (LMC_PROTECTED_WHOLE_ITEM[id]) return true
    if (isLmcCoinStorageItem(id)) return true
    if (id.indexOf('sophisticatedbackpacks:') === 0 && id.indexOf('backpack') >= 0) return true
    if (id.indexOf('accessories:') === 0) return true
    if (id.indexOf('jewelry:') === 0) return true
    return false
}

function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1))
}

var McCompoundTag = null
var ItemEntityClass = null
try {
    McCompoundTag = Java.loadClass('net.minecraft.nbt.CompoundTag')
} catch (nbtErr) {}
try {
    ItemEntityClass = Java.loadClass('net.minecraft.world.entity.item.ItemEntity')
} catch (itemEntErr) {}

function getMcUuid(mc) {
    if (!mc) return null
    try { return String(mc.getUUID()) } catch (e1) {}
    try { return String(mc.getUuid()) } catch (e2) {}
    try { return String(mc.uuid()) } catch (e3) {}
    try { return String(mc.uuid) } catch (e4) {}
    return null
}

function mcPlayerName(mc) {
    if (!mc) return ''
    try { return String(mc.getGameProfile().getName()) } catch (e1) {}
    try { return String(mc.getName().getString()) } catch (e2) {}
    return ''
}

function findKubeFromMc(server, mc) {
    if (!server || !mc) return null
    var wantUuid = getMcUuid(mc)
    var wantName = mcPlayerName(mc).toLowerCase()
    var found = null
    try {
        server.players.forEach(function(p) {
            if (found) return
            if (wantName && pname(p).toLowerCase() === wantName) {
                found = p
                return
            }
            if (wantUuid) {
                var mcP = toMc(p)
                var pu = mcP ? getMcUuid(mcP) : null
                if (pu && String(pu) === String(wantUuid)) found = p
            }
        })
    } catch (e) {}
    return found
}

function findKubePlayer(server, mc) {
    var kube = findKubeFromMc(server, mc)
    return kube || mc
}

function isMcPlayerEntity(ent) {
    if (!ent) return false
    try {
        if (ent.isPlayer && ent.isPlayer()) return true
    } catch (e0) {}
    try {
        var cn = String(ent.getClass().getName())
        if (cn.indexOf('ServerPlayer') >= 0 || cn.indexOf('LocalPlayer') >= 0) return true
    } catch (e1) {}
    return false
}

function playerEntityFromDamageSource(source) {
    if (!source) return null
    try {
        if (source.player) {
            var kubeP = source.player
            var mcP = toMc(kubeP)
            if (mcP && isMcPlayerEntity(mcP)) return mcP
        }
    } catch (eKube) {}
    var seen = {}
    function fromEntity(ent) {
        if (!ent || seen[ent]) return null
        seen[ent] = true
        if (isMcPlayerEntity(ent)) return ent
        try {
            var owner = ent.getOwner()
            if (owner && isMcPlayerEntity(owner)) return owner
        } catch (eOwn) {}
        try {
            var shooter = ent.getShooter()
            if (shooter && isMcPlayerEntity(shooter)) return shooter
        } catch (eShoot) {}
        try {
            var thrower = ent.getThrower()
            if (thrower && isMcPlayerEntity(thrower)) return thrower
        } catch (eThrow) {}
        return null
    }
    var list = []
    try { list.push(source.getEntity()) } catch (e0) {}
    try { list.push(source.getDirectEntity()) } catch (e1) {}
    try {
        var root = source.getEntity()
        if (root && root.getVehicle) list.push(root.getVehicle())
    } catch (e2) {}
    for (var i = 0; i < list.length; i++) {
        var p = fromEntity(list[i])
        if (p) return p
    }
    return null
}

function getKillerMcPlayer(source) {
    return playerEntityFromDamageSource(source)
}

function rememberPvpAttacker(victimMc, killerMc, server) {
    var vUuid = getMcUuid(victimMc)
    if (!vUuid || !killerMc) return
    var tick = 0
    try { tick = server.getTickCount() } catch (eTick) {}
    pvpLastAttackerByVictimUuid[String(vUuid)] = {
        killerUuid: getMcUuid(killerMc),
        killerName: mcPlayerName(killerMc),
        tick: tick
    }
}

function getRecentAttackerMc(victimMc, server) {
    if (!victimMc || !server) return null
    var vUuid = getMcUuid(victimMc)
    if (!vUuid) return null
    var rec = pvpLastAttackerByVictimUuid[String(vUuid)]
    if (!rec) return null
    var now = 0
    try { now = server.getTickCount() } catch (eNow) { return null }
    if (now - rec.tick > PVP_ATTACKER_MEMORY_TICKS) {
        delete pvpLastAttackerByVictimUuid[String(vUuid)]
        return null
    }
    if (!rec.killerName) return null
    try {
        var found = server.getPlayerList().getPlayerByName(rec.killerName)
        if (found && isMcPlayerEntity(found)) return found
    } catch (eFind) {}
    return null
}

function resolveKillerMc(source, victimMc, server) {
    var killer = getKillerMcPlayer(source)
    if (!killer) killer = getRecentAttackerMc(victimMc, server)
    return killer
}

function isVictimInWarCombat(mc, name) {
    var a = ark()
    if (!a || !name) return false
    var war = a.getActiveWar()
    return !!(war && a.isWarCombatPhase(war) && a.isWarParticipantName(name))
}

function clearPvpDeathFlags(mc) {
    if (!mc) return
    var key = getPlayerStorageKey(mc)
    if (key) {
        delete pvpKeptStacksByPlayerName[key]
        delete pvpPendingDropStacksByPlayerName[key]
        delete pvpEquippedExtrasByPlayerName[key]
        delete pvpWalletCoinDropsByPlayerName[key]
    }
    try {
        var pd = mc.getPersistentData()
        pd.remove('arkcraft_pvp_death')
        pd.remove('arkcraft_pvp_processed')
        pd.remove('arkcraft_pvp_livingdrops_done')
        pd.remove('arkcraft_war_death')
    } catch (ePd) {}
}

function getPlayerStorageKey(mc) {
    var name = mcPlayerName(mc)
    if (name) return name.toLowerCase()
    var uuid = getMcUuid(mc)
    return uuid ? String(uuid) : null
}

function cloneStackSafe(st) {
    if (!st || st.isEmpty()) return McItemStackEmpty
    return st.copy()
}

function capturePlayerInventorySnapshot(mc) {
    var inv = mc.getInventory()
    var main = []
    for (var i = 0; i < 36; i++) {
        main.push(cloneStackSafe(inv.getItem(i)))
    }
    var armor = []
    var offhand = McItemStackEmpty
    if (WarEquipSlot) {
        armor.push(cloneStackSafe(mc.getItemBySlot(WarEquipSlot.HEAD)))
        armor.push(cloneStackSafe(mc.getItemBySlot(WarEquipSlot.CHEST)))
        armor.push(cloneStackSafe(mc.getItemBySlot(WarEquipSlot.LEGS)))
        armor.push(cloneStackSafe(mc.getItemBySlot(WarEquipSlot.FEET)))
        offhand = cloneStackSafe(mc.getItemBySlot(WarEquipSlot.OFFHAND))
    }
    return { main: main, armor: armor, offhand: offhand }
}

function applyPlayerInventorySnapshot(mc, snap) {
    if (!snap || !snap.main) return false
    var inv = mc.getInventory()
    for (var i = 0; i < 36; i++) {
        var st = i < snap.main.length ? snap.main[i] : McItemStackEmpty
        inv.setItem(i, st && !st.isEmpty() ? st.copy() : McItemStackEmpty)
    }
    if (WarEquipSlot && snap.armor) {
        var slots = [WarEquipSlot.HEAD, WarEquipSlot.CHEST, WarEquipSlot.LEGS, WarEquipSlot.FEET]
        for (var a = 0; a < slots.length && a < snap.armor.length; a++) {
            var ast = snap.armor[a]
            mc.setItemSlot(slots[a], ast && !ast.isEmpty() ? ast.copy() : McItemStackEmpty)
        }
        var off = snap.offhand
        mc.setItemSlot(WarEquipSlot.OFFHAND, off && !off.isEmpty() ? off.copy() : McItemStackEmpty)
    }
    return true
}

function shouldClearPlayerDrops(mc) {
    return isVictimInWarCombat(mc, mcPlayerName(mc))
}

function clearAllDrops(event) {
    clearLivingDrops(event)
    try {
        if (event.drops && event.drops.clear) event.drops.clear()
    } catch (e1) {}
    try {
        if (event.getDrops) event.getDrops().clear()
    } catch (e2) {}
}

function mcTell(mc, msg) {
    if (!mc || !msg) return
    try {
        var Comp = Java.loadClass('net.minecraft.network.chat.Component')
        mc.sendSystemMessage(Comp.literal(String(msg)))
    } catch (e) {}
}

function getMcLevel(mc) {
    if (!mc) return null
    try {
        var lvl0 = mc.level
        if (lvl0) return lvl0
    } catch (e0) {}
    try {
        var lvl1 = mc.level()
        if (lvl1) return lvl1
    } catch (e1) {}
    return null
}

function getMcServer(mc) {
    try {
        if (mc.server) return mc.server
        var lvl = getMcLevel(mc)
        if (lvl && lvl.getServer) return lvl.getServer()
    } catch (e) {}
    return null
}

function saveDeathInventory(mc) {
    if (!mc) return false
    var uuid = getMcUuid(mc)
    if (!uuid) {
        console.warn('[WarDeath] saveDeathInventory: sin UUID')
        return false
    }
    try {
        pvpKeptInventoryByUuid[String(uuid)] = capturePlayerInventorySnapshot(mc)
        return true
    } catch (e) {
        console.warn('[WarDeath] saveDeathInventory: ' + e)
        return false
    }
}

function hasPvpKeptSnapshot(mc) {
    if (!mc) return false
    var uuid = getMcUuid(mc)
    return !!(uuid && pvpKeptInventoryByUuid[String(uuid)])
}

function restoreDeathInventory(mc, consumeBackup) {
    if (!mc) return false
    var uuid = getMcUuid(mc)
    if (!uuid) return false
    var snap = pvpKeptInventoryByUuid[String(uuid)]
    if (!snap) return false
    try {
        if (!applyPlayerInventorySnapshot(mc, snap)) return false
        if (consumeBackup !== false) delete pvpKeptInventoryByUuid[String(uuid)]
        return true
    } catch (e) {
        console.warn('[WarDeath] restoreDeathInventory: ' + e)
        return false
    }
}

function restoreKeptInventoryIfPvp(mc, consumeBackup) {
    if (!mc) return false
    try {
        var pd = mc.getPersistentData()
        if (!pd.getBoolean('arkcraft_pvp_death') && !pd.getBoolean('arkcraft_pvp_processed')) return false
    } catch (eChk) {
        return false
    }
    if (!hasPvpKeptSnapshot(mc)) return false
    return restoreDeathInventory(mc, consumeBackup)
}

function clearLivingDrops(event) {
    try {
        var drops = event.getDrops()
        if (drops && drops.clear) drops.clear()
    } catch (e0) {}
}


function dropMcStack(player, mcStack) {
    if (!mcStack || mcStack.isEmpty()) return false
    var mc = toMc(player)
    if (!mc) return false
    var stack = mcStack.copy()
    try {
        var lvl = getMcLevel(mc)
        if (lvl && ItemEntityClass) {
            var ent = new ItemEntityClass(lvl, mc.getX(), mc.getY() + 0.25, mc.getZ(), stack)
            ent.setPickUpDelay(40)
            lvl.addFreshEntity(ent)
            return true
        }
    } catch (e1) {
        console.warn('[WarDeath] ItemEntity drop: ' + e1)
    }
    try {
        mc.drop(stack, false, true)
        return true
    } catch (e2) {
        try {
            player.drop(Item.of(stack), false, true)
            return true
        } catch (e3) {}
    }
    return false
}

function dropStackFromSlot(player, mc, getter, setter) {
    var st = getter()
    if (!st || st.isEmpty()) return false
    var copy = st.copy()
    if (!dropMcStack(player, copy)) return false
    setter(McItemStackEmpty)
    return true
}

function getLmcCoinDropPercent(mc) {
    var fallback = Math.round(PVP_LMC_BAG_COIN_RATE * 100)
    if (!mc) return fallback
    var lvl = getMcLevel(mc)
    if (!lvl) {
        try {
            var srv = getMcServer(mc)
            if (srv) lvl = srv.getLevel('minecraft:overworld')
        } catch (eSrv) {}
    }
    if (!lvl) return fallback
    if (ModGameRules) {
        try {
            var rule = ModGameRules.COIN_DROP_PERCENT
            return Math.max(0, Math.min(100, ModGameRules.safeGetCustomInt(lvl, rule)))
        } catch (e1) {}
        try {
            return Math.max(0, Math.min(100, ModGameRules.safeGetCustomInt(lvl)))
        } catch (e2) {}
        try {
            var gr = lvl.getGameRules()
            var key = ModGameRules.getRule('coinDropPercent')
            if (gr && key) return Math.max(0, Math.min(100, gr.getInt(key)))
        } catch (e3) {}
    }
    try {
        var gr2 = lvl.getGameRules()
        if (gr2 && gr2.getInt) {
            var k2 = gr2.getRule('coinDropPercent')
            if (k2) return Math.max(0, Math.min(100, gr2.getInt(k2)))
        }
    } catch (e4) {}
    return fallback
}

function walletCoinStacksFromDropList(drops) {
    var out = []
    if (!drops) return out
    for (var i = 0; i < drops.length; i++) {
        var st = drops[i]
        if (!st || st.isEmpty()) continue
        if (isCoinId(mcStackId(st))) out.push(st.copy())
    }
    return out
}

function walletCoinStacksFromLmcEvent(event) {
    var out = []
    if (!event) return out
    try {
        var drops = event.getDrops()
        if (drops) {
            var iter = drops.iterator()
            while (iter.hasNext()) {
                var st = iter.next()
                if (!st || st.isEmpty()) continue
                if (isCoinId(mcStackId(st))) out.push(st.copy())
            }
        }
    } catch (eIt) {}
    if (out.length > 0) return out
    try {
        return walletCoinStacksFromDropList(stacksFromDropCollection(event.getDrops()))
    } catch (e2) {}
    return out
}

function writeRemainingMoneyToWallet(wrapper, remaining) {
    if (!wrapper || !remaining || remaining.isEmpty()) return false
    try {
        var list = remaining.getAsSeperatedItemList()
        if (!list) return false
        var cont = wrapper.getContents()
        if (!cont) return false
        var size = cont.getContainerSize()
        var s
        for (s = 0; s < size; s++) cont.setItem(s, McItemStackEmpty)
        var iter = list.iterator()
        var slot = 0
        while (iter.hasNext() && slot < size) {
            var st = iter.next()
            if (st && !st.isEmpty()) {
                cont.setItem(slot, st.copy())
                slot++
            }
        }
        wrapper.setContents(cont, null)
        return true
    } catch (e) {
        console.warn('[WarDeath] writeRemainingMoneyToWallet: ' + e)
        return false
    }
}

function lootWalletForPvpDeath(walletStack, percentInt) {
    var drops = []
    if (!walletStack || walletStack.isEmpty() || percentInt <= 0 || !LmcWalletItem) return drops
    if (!isWalletMcStack(walletStack)) return drops
    var rate = percentInt / 100.0
    try {
        var wrapper = LmcWalletItem.getDataWrapper(walletStack)

        var container = wrapper.getContents()
        if (container && lootCoinsFromContainerToList(container, rate, drops)) {
            wrapper.setContents(container, null)
            console.info('[WarDeath] PvP monedas wallet (contenedor): ' + drops.length + ' stacks')
            return drops
        }

        var stored = wrapper.getStoredMoney()
        if (!stored || stored.isEmpty()) {
            console.warn('[WarDeath] wallet sin monedas detectables (contenedor+MoneyView vacios)')
            return drops
        }

        var dropMoney = null
        try { dropMoney = stored.percentageOfValue(rate) } catch (ePct1) {}
        if (!dropMoney || dropMoney.isEmpty()) {
            try { dropMoney = stored.percentageOfValue(percentInt) } catch (ePct2) {}
        }
        if (!dropMoney || dropMoney.isEmpty()) return drops

        var list = dropMoney.getAsSeperatedItemList()
        if (list) {
            var iter = list.iterator()
            while (iter.hasNext()) {
                var st = iter.next()
                if (st && !st.isEmpty()) drops.push(st.copy())
            }
        }
        if (drops.length === 0) return drops

        var remaining = stored.subtractValue(dropMoney)
        if (!writeRemainingMoneyToWallet(wrapper, remaining)) {
            console.warn('[WarDeath] no se pudo escribir saldo restante en wallet (MoneyView)')
        }
        console.info('[WarDeath] PvP monedas wallet (MoneyView): ' + drops.length + ' stacks')
    } catch (e) {
        console.warn('[WarDeath] lootWalletForPvpDeath: ' + e)
    }
    return drops
}

function mergePvpWalletCoinsIntoPending(mc, event, pending, equippedExtras) {
    var merged = []
    var i
    if (pending) {
        for (i = 0; i < pending.length; i++) merged.push(pending[i])
    }

    var fromLiving = walletCoinStacksFromDropList(stacksFromDropCollection(event.getDrops()))
    for (i = 0; i < fromLiving.length; i++) merged.push(fromLiving[i])

    var key = getPlayerStorageKey(mc)
    if (key && pvpWalletCoinDropsByPlayerName[key]) {
        var buffered = pvpWalletCoinDropsByPlayerName[key]
        for (i = 0; i < buffered.length; i++) merged.push(buffered[i])
        delete pvpWalletCoinDropsByPlayerName[key]
    }

    var hasCoins = false
    for (i = 0; i < merged.length; i++) {
        if (isCoinId(mcStackId(merged[i]))) {
            hasCoins = true
            break
        }
    }

    if (!hasCoins && equippedExtras && equippedExtras.wallet && !equippedExtras.wallet.isEmpty()) {
        var pct = getLmcCoinDropPercent(mc)
        var walletDrops = lootWalletForPvpDeath(equippedExtras.wallet, pct)
        for (i = 0; i < walletDrops.length; i++) merged.push(walletDrops[i])
    }

    return merged
}

function lootCoinsFromContainerToList(container, rate, dropList) {
    if (!container || !dropList || rate <= 0) return false
    var changed = false
    var size = container.getContainerSize()
    for (var s = 0; s < size; s++) {
        var st = container.getItem(s)
        if (!st || st.isEmpty()) continue
        if (!isCoinId(mcStackId(st))) continue
        var cnt = st.getCount()
        var dropN = Math.max(1, Math.floor(cnt * rate))
        if (dropN > cnt) dropN = cnt
        if (dropN <= 0) continue
        var copy = st.copy()
        copy.setCount(dropN)
        st.shrink(dropN)
        container.setItem(s, st)
        dropList.push(copy)
        changed = true
    }
    return changed
}

function countCoinStacksInList(stacks) {
    var n = 0
    if (!stacks) return 0
    for (var i = 0; i < stacks.length; i++) {
        if (stacks[i] && !stacks[i].isEmpty() && isCoinId(mcStackId(stacks[i]))) n++
    }
    return n
}

function lootCoinsInContainer(player, container, rate) {
    if (!container) return false
    var list = []
    if (!lootCoinsFromContainerToList(container, rate, list)) return false
    for (var i = 0; i < list.length; i++) dropMcStack(player, list[i])
    return true
}

function lootWalletMcStack(player, mcStack) {
    if (!LmcWalletItem || !mcStack || mcStack.isEmpty()) return false
    try {
        var item = mcStack.getItem()
        if (!isWalletMcStack(mcStack)) return false
        var wrapper = LmcWalletItem.getDataWrapper(mcStack)
        var container = wrapper.getContents()
        if (!lootCoinsInContainer(player, container, PVP_LMC_BAG_COIN_RATE)) return false
        wrapper.setContents(container, null)
        return true
    } catch (e) {
        console.warn('[WarDeath] lootWallet: ' + e)
        return false
    }
}

function lootMoneyBagMcStack(player, mcStack) {
    if (!LmcMoneyBagItem || !mcStack || mcStack.isEmpty()) return false
    try {
        var list = LmcMoneyBagItem.getContents(mcStack)
        if (!list || list.isEmpty()) return false
        if (!JavaArrayList) return false
        var out = new JavaArrayList()
        var iter = list.iterator()
        var changed = false
        while (iter.hasNext()) {
            var st = iter.next()
            if (!st || st.isEmpty()) {
                out.add(st)
                continue
            }
            if (!isCoinId(mcStackId(st))) {
                out.add(st.copy())
                continue
            }
            var cnt = st.getCount()
            var dropN = Math.max(1, Math.floor(cnt * PVP_LMC_BAG_COIN_RATE))
            if (dropN > cnt) dropN = cnt
            if (dropN > 0) {
                var d = st.copy()
                d.setCount(dropN)
                dropMcStack(player, d)
                st = st.copy()
                st.shrink(dropN)
                changed = true
            }
            if (!st.isEmpty()) out.add(st)
        }
        if (changed) {
            LmcMoneyBagItem.setContents(mcStack, out)
            return true
        }
    } catch (e) {
        console.warn('[WarDeath] lootMoneyBag: ' + e)
    }
    return false
}

function lootCoinJarMcStack(player, mcStack) {
    if (!LmcCoinJarItem || !mcStack || mcStack.isEmpty()) return false
    try {
        var list = LmcCoinJarItem.getJarContents(mcStack)
        if (!list || list.isEmpty()) return false
        if (!JavaArrayList) return false
        var out = new JavaArrayList()
        var iter = list.iterator()
        var changed = false
        while (iter.hasNext()) {
            var st = iter.next()
            if (!st || st.isEmpty()) {
                out.add(st)
                continue
            }
            if (!isCoinId(mcStackId(st))) {
                out.add(st.copy())
                continue
            }
            var cnt = st.getCount()
            var dropN = Math.max(1, Math.floor(cnt * PVP_LMC_BAG_COIN_RATE))
            if (dropN > cnt) dropN = cnt
            if (dropN > 0) {
                var d = st.copy()
                d.setCount(dropN)
                dropMcStack(player, d)
                st = st.copy()
                st.shrink(dropN)
                changed = true
            }
            if (!st.isEmpty()) out.add(st)
        }
        if (changed) {
            LmcCoinJarItem.setJarContents(mcStack, out)
            return true
        }
    } catch (e) {
        console.warn('[WarDeath] lootCoinJar: ' + e)
    }
    return false
}

function lootLmcStorageMcStack(player, mcStack) {
    var id = mcStackId(mcStack)
    if (isLmcWalletId(id)) return lootWalletMcStack(player, mcStack)
    if (id === 'lightmanscurrency:money_bag') return lootMoneyBagMcStack(player, mcStack)
    if (isLmcCoinJarId(id)) return lootCoinJarMcStack(player, mcStack)
    return false
}

function lootEquippedLmcWallet(player, mc) {
    if (!LmcWalletHandler || !mc) return false
    try {
        var handler = LmcWalletHandler.get(mc)
        if (!handler) return false
        var w = handler.getWallet()
        if (!w || w.isEmpty()) return false
        if (!lootWalletMcStack(player, w)) return false
        handler.setWallet(w)
        return true
    } catch (e) {
        console.warn('[WarDeath] lootEquippedWallet: ' + e)
        return false
    }
}

function processAllLmcCoinStorage(player, mc) {
    var hit = false
    if (lootEquippedLmcWallet(player, mc)) hit = true
    var inv = mc.getInventory()
    for (var i = 0; i < 36; i++) {
        var stack = inv.getItem(i)
        if (!stack || stack.isEmpty()) continue
        if (!isLmcCoinStorageItem(mcStackId(stack))) continue
        if (lootLmcStorageMcStack(player, stack)) {
            inv.setItem(i, stack)
            hit = true
        }
    }
    return hit
}

function isMcToolOrWeapon(mcStack) {
    if (!mcStack || mcStack.isEmpty()) return false
    try {
        if (mcStack.isDamageableItem && mcStack.isDamageableItem()) return true
    } catch (e0) {}
    var id = mcStackId(mcStack)
    return id.indexOf('sword') >= 0 || id.indexOf('axe') >= 0 || id.indexOf('bow') >= 0 ||
        id.indexOf('crossbow') >= 0 || id.indexOf('trident') >= 0 || id.indexOf('mace') >= 0 ||
        id.indexOf('pickaxe') >= 0 || id.indexOf('shovel') >= 0 || id.indexOf('hoe') >= 0
}

function isArmorStack(mcStack) {
    var id = mcStackId(mcStack)
    return id.indexOf('helmet') >= 0 || id.indexOf('chestplate') >= 0 ||
        id.indexOf('leggings') >= 0 || id.indexOf('boots') >= 0 || id.indexOf('elytra') >= 0
}

function stackFromKubeDropEntry(entry) {
    if (!entry) return null
    try {
        if (entry.getItem) {
            var st0 = entry.getItem()
            if (st0 && !st0.isEmpty()) return st0.copy()
        }
    } catch (eEnt) {}
    try {
        if (entry.copy && entry.isEmpty && !entry.isEmpty()) return entry.copy()
    } catch (eMc) {}
    try {
        if (entry.stack && entry.stack.copy) {
            var st1 = entry.stack
            if (!st1.isEmpty()) return st1.copy()
        }
    } catch (eSt) {}
    try {
        if (entry.itemStack && entry.itemStack.copy) {
            var st2 = entry.itemStack
            if (!st2.isEmpty()) return st2.copy()
        }
    } catch (eIs) {}
    try {
        var kid = entry.id != null ? String(entry.id) : ''
        var kcnt = entry.count != null ? entry.count : 1
        if (kid) {
            var wrapped = Item.of(kid, kcnt)
            if (wrapped && wrapped.stack && !wrapped.stack.isEmpty()) return wrapped.stack.copy()
        }
    } catch (eKi) {}
    return null
}

function stacksFromDropCollection(drops) {
    var out = []
    if (!drops) return out
    try {
        var iter = drops.iterator()
        while (iter.hasNext()) {
            var st = stackFromKubeDropEntry(iter.next())
            if (st) out.push(st)
        }
        if (out.length > 0) return out
    } catch (eIt) {}
    try {
        if (drops.forEach) {
            drops.forEach(function(entry) {
                var st = stackFromKubeDropEntry(entry)
                if (st) out.push(st)
            })
        }
    } catch (eFe) {}
    return out
}

function splitStackByPercent(st, ratePercent) {
    var count = st.getCount()
    var pct = ratePercent > 0 ? ratePercent : 0
    if (pct <= 0) return { keep: st.copy(), drop: null }
    var dropN = Math.max(1, Math.floor(count * pct / 100))
    if (dropN >= count) dropN = Math.max(1, count - 1)
    var dCopy = st.copy()
    dCopy.setCount(dropN)
    var kCopy = st.copy()
    kCopy.shrink(dropN)
    return { keep: kCopy.isEmpty() ? null : kCopy, drop: dCopy }
}

function computePartialSplitFromStacks(stacks, coinDropPercent) {
    var keep = []
    var drop = []
    var armor = []
    var tools = []
    var other = []
    var coinPct = coinDropPercent > 0 ? coinDropPercent : 0
    for (var i = 0; i < stacks.length; i++) {
        var st = stacks[i]
        if (!st || st.isEmpty()) continue
        var id = mcStackId(st)
        if (isProtectedWholeItem(id)) {
            keep.push(st.copy())
            continue
        }
        if (isCoinId(id) && coinPct > 0) {
            var coinSplit = splitStackByPercent(st, coinPct)
            if (coinSplit.drop) drop.push(coinSplit.drop)
            if (coinSplit.keep && !coinSplit.keep.isEmpty()) keep.push(coinSplit.keep)
            continue
        }
        if (isArmorStack(st)) armor.push(st.copy())
        else if (isMcToolOrWeapon(st)) tools.push(st.copy())
        else other.push(st.copy())
    }
    if (armor.length > 0) {
        var ap = randInt(0, armor.length - 1)
        for (var a = 0; a < armor.length; a++) {
            if (a === ap) drop.push(armor[a])
            else keep.push(armor[a])
        }
    }
    if (tools.length > 0) {
        var tp = randInt(0, tools.length - 1)
        for (var t = 0; t < tools.length; t++) {
            if (t === tp) drop.push(tools[t])
            else keep.push(tools[t])
        }
    }
    for (var o = 0; o < other.length; o++) {
        var st2 = other[o]
        var count = st2.getCount()
        var dropN = Math.max(1, Math.floor(count * PVP_INV_DROP_RATE))
        if (dropN >= count) dropN = Math.max(1, count - 1)
        var dCopy = st2.copy()
        dCopy.setCount(dropN)
        drop.push(dCopy)
        var kCopy = st2.copy()
        kCopy.shrink(dropN)
        if (!kCopy.isEmpty()) keep.push(kCopy)
    }
    return { keep: keep, drop: drop }
}

function saveKeptStacks(mc, keepStacks) {
    var key = getPlayerStorageKey(mc)
    if (!key) return false
    pvpKeptStacksByPlayerName[key] = keepStacks
    return true
}

function takeKeptStacks(mc) {
    var key = getPlayerStorageKey(mc)
    if (!key || !pvpKeptStacksByPlayerName[key]) return null
    var stacks = pvpKeptStacksByPlayerName[key]
    delete pvpKeptStacksByPlayerName[key]
    return stacks
}

function peekPendingDropStacks(mc) {
    var key = getPlayerStorageKey(mc)
    if (!key) return null
    return pvpPendingDropStacksByPlayerName[key] || null
}

function takePendingDropStacks(mc) {
    var key = getPlayerStorageKey(mc)
    if (!key || !pvpPendingDropStacksByPlayerName[key]) return null
    var stacks = pvpPendingDropStacksByPlayerName[key]
    delete pvpPendingDropStacksByPlayerName[key]
    return stacks
}

function snapshotToFlatStackList(mc) {
    var snap = capturePlayerInventorySnapshot(mc)
    var list = []
    var i
    for (i = 0; i < snap.main.length; i++) {
        var st = snap.main[i]
        if (st && !st.isEmpty()) list.push(st.copy())
    }
    for (i = 0; i < snap.armor.length; i++) {
        var ast = snap.armor[i]
        if (ast && !ast.isEmpty()) list.push(ast.copy())
    }
    if (snap.offhand && !snap.offhand.isEmpty()) list.push(snap.offhand.copy())
    return list
}

function buildSnapshotFromKeepStacks(keepStacks) {
    var main = []
    var armor = [McItemStackEmpty, McItemStackEmpty, McItemStackEmpty, McItemStackEmpty]
    var offhand = McItemStackEmpty
    var i
    for (i = 0; i < 36; i++) main.push(McItemStackEmpty)
    if (!keepStacks) return { main: main, armor: armor, offhand: offhand }
    for (i = 0; i < keepStacks.length; i++) {
        var st = keepStacks[i]
        if (!st || st.isEmpty()) continue
        var id = mcStackId(st)
        if (id.indexOf('helmet') >= 0 || id.indexOf('skull') >= 0) {
            if (armor[0].isEmpty()) armor[0] = st.copy()
            else main.push(st.copy())
        } else if (id.indexOf('chestplate') >= 0) {
            if (armor[1].isEmpty()) armor[1] = st.copy()
            else main.push(st.copy())
        } else if (id.indexOf('leggings') >= 0) {
            if (armor[2].isEmpty()) armor[2] = st.copy()
            else main.push(st.copy())
        } else if (id.indexOf('boots') >= 0) {
            if (armor[3].isEmpty()) armor[3] = st.copy()
            else main.push(st.copy())
        } else if (id.indexOf('elytra') >= 0) {
            if (armor[1].isEmpty()) armor[1] = st.copy()
            else main.push(st.copy())
        } else {
            var placed = false
            var s
            for (s = 0; s < 36; s++) {
                if (main[s].isEmpty()) {
                    main[s] = st.copy()
                    placed = true
                    break
                }
            }
            if (!placed) offhand = st.copy()
        }
    }
    return { main: main, armor: armor, offhand: offhand }
}

function restoreKeptStacksToPlayer(mc, keepStacks) {
    if (!mc || !keepStacks || keepStacks.length === 0) return false
    try {
        return applyPlayerInventorySnapshot(mc, buildSnapshotFromKeepStacks(keepStacks))
    } catch (e) {
        console.warn('[WarDeath] restoreKeptStacksToPlayer: ' + e)
        return false
    }
}

function spawnStacksAtPosition(lvl, x, y, z, dropStacks) {
    if (!lvl || !ItemEntityClass || !dropStacks || dropStacks.length === 0) return 0
    var spawned = 0
    for (var i = 0; i < dropStacks.length; i++) {
        var st = dropStacks[i]
        if (!st || st.isEmpty()) continue
        try {
            var ent = new ItemEntityClass(lvl, x, y + 0.25, z, st.copy())
            ent.setPickUpDelay(40)
            lvl.addFreshEntity(ent)
            spawned++
        } catch (eEnt) {
            console.warn('[WarDeath] spawnStacksAtPosition: ' + eEnt)
        }
    }
    return spawned
}

function spawnPartialDropsOnGround(mc, dropStacks) {
    if (!mc || !dropStacks || dropStacks.length === 0) return 0
    var lvl = getMcLevel(mc)
    if (!lvl) return 0
    return spawnStacksAtPosition(lvl, mc.getX(), mc.getY(), mc.getZ(), dropStacks)
}

function addPartialDropsToLivingEvent(event, mc, dropStacks) {
    clearAllDrops(event)
    var drops = event.getDrops()
    var ents = rebuildDropEntities(mc, dropStacks)
    for (var d = 0; d < ents.length; d++) {
        try { drops.add(ents[d]) } catch (eAdd) {}
    }
    return ents.length
}

function processPvpDeathFromLiveInventory(mc, killerMc, server) {
    var name = mcPlayerName(mc)
    if (!name) return false
    // Sin asesino jugador (PvE) o suicidio: aplicamos drop parcial igual. killerName solo es para el log.
    var killerName = killerMc ? mcPlayerName(killerMc) : '(PvE/entorno)'

    var key = getPlayerStorageKey(mc)
    if (!key) {
        console.warn('[WarDeath] PvP v6: sin clave jugador')
        return false
    }

    clearPvpDeathFlags(mc)

    var pd = mc.getPersistentData()
    if (pd.getBoolean('arkcraft_pvp_processed')) return true

    var allStacks = snapshotToFlatStackList(mc)
    if (allStacks.length === 0) {
        console.warn('[WarDeath] PvP v6: inventario vacio al morir — ' + name)
        return false
    }

    var split = computePartialSplitFromStacks(allStacks, getLmcCoinDropPercent(mc))
    var equippedExtras = captureEquippedExtras(mc)
    var keepStacks = split.keep
    if (equippedExtras.wallet && !equippedExtras.wallet.isEmpty()) {
        keepStacks = walletStacksRemovedFromKeep(keepStacks)
    }
    saveKeptStacks(mc, keepStacks)
    pvpPendingDropStacksByPlayerName[key] = split.drop
    storeEquippedExtras(mc, equippedExtras)

    pd.putBoolean('arkcraft_pvp_processed', true)
    pd.putBoolean('arkcraft_pvp_death', true)

    tellPvpDeathMessages(mc, server, getLmcCoinDropPercent(mc) > 0)
    console.info('[WarDeath] PvP v6 preparado: ' + name + ' <- ' + killerName +
        ' | guardado=' + keepStacks.length + ' suelo=' + split.drop.length +
        ' | coinDrop%=' + getLmcCoinDropPercent(mc))
    return true
}

function rebuildDropEntities(mc, dropStacks) {
    var created = []
    if (!mc || !ItemEntityClass || !dropStacks) return created
    var lvl = getMcLevel(mc)
    if (!lvl) return created
    for (var i = 0; i < dropStacks.length; i++) {
        var st = dropStacks[i]
        if (!st || st.isEmpty()) continue
        try {
            var ent = new ItemEntityClass(lvl, mc.getX(), mc.getY() + 0.25, mc.getZ(), st.copy())
            ent.setPickUpDelay(40)
            created.push(ent)
        } catch (eEnt) {
            console.warn('[WarDeath] crear ItemEntity: ' + eEnt)
        }
    }
    return created
}

function giveKeptStacksToPlayer(kube, keepStacks) {
    if (!kube || !keepStacks) return false
    for (var i = 0; i < keepStacks.length; i++) {
        var st = keepStacks[i]
        if (!st || st.isEmpty()) continue
        try {
            kube.give(Item.of(st))
        } catch (eGive) {
            dropMcStack(kube, st)
        }
    }
    return true
}

function processPvpDropsBackupFromEvent(event, mc, killerMc, server) {
    var stacks = stacksFromDropCollection(event.getDrops())
    if (!stacks || stacks.length === 0) return false

    var name = mcPlayerName(mc)
    var killerName = killerMc ? mcPlayerName(killerMc) : '(PvE/entorno)'
    var key = getPlayerStorageKey(mc)
    if (!key) return false

    clearPvpDeathFlags(mc)
    var pd = mc.getPersistentData()
    var split = computePartialSplitFromStacks(stacks, getLmcCoinDropPercent(mc))
    var equippedExtras = captureEquippedExtras(mc)
    var keepStacks = split.keep
    if (equippedExtras.wallet && !equippedExtras.wallet.isEmpty()) {
        keepStacks = walletStacksRemovedFromKeep(keepStacks)
    }
    saveKeptStacks(mc, keepStacks)
    pvpPendingDropStacksByPlayerName[key] = split.drop
    storeEquippedExtras(mc, equippedExtras)
    pd.putBoolean('arkcraft_pvp_processed', true)
    pd.putBoolean('arkcraft_pvp_death', true)

    var n = addPartialDropsToLivingEvent(event, mc, split.drop)
    tellPvpDeathMessages(mc, server, getLmcCoinDropPercent(mc) > 0)
    console.info('[WarDeath] PvP v6 respaldo (drops vanilla): ' + name + ' <- ' + killerName +
        ' | guardado=' + keepStacks.length + ' suelo=' + n + ' | monedas=' + countCoinStacksInList(split.drop))
    return true
}

function applyPartialPvpDrops(player) {
    var mc = toMc(player)
    if (!mc) return
    var inv = mc.getInventory()
    var lmcHit = processAllLmcCoinStorage(player, mc)

    if (WarEquipSlot) {
        var armorChoices = [WarEquipSlot.HEAD, WarEquipSlot.CHEST, WarEquipSlot.LEGS, WarEquipSlot.FEET]
        var filled = []
        for (var a = 0; a < armorChoices.length; a++) {
            var ast = mc.getItemBySlot(armorChoices[a])
            if (ast && !ast.isEmpty()) filled.push(armorChoices[a])
        }
        if (filled.length > 0) {
            var slotPick = filled[randInt(0, filled.length - 1)]
            dropStackFromSlot(player, mc, function() { return mc.getItemBySlot(slotPick) }, function(empty) {
                mc.setItemSlot(slotPick, empty)
            })
        }
    }

    var toolSlots = []
    for (var h = 0; h < 9; h++) {
        var hs = inv.getItem(h)
        if (hs && !hs.isEmpty() && isMcToolOrWeapon(hs)) toolSlots.push(h)
    }
    if (toolSlots.length > 0) {
        var pickH = toolSlots[randInt(0, toolSlots.length - 1)]
        dropStackFromSlot(player, mc, function() { return inv.getItem(pickH) }, function(empty) {
            inv.setItem(pickH, empty)
        })
    }

    for (var i = 0; i < 36; i++) {
        var stack = inv.getItem(i)
        if (!stack || stack.isEmpty()) continue
        var id = mcStackId(stack)
        if (isProtectedWholeItem(id)) continue
        if (isMcToolOrWeapon(stack)) continue

        var count = stack.getCount()
        var dropN = Math.max(1, Math.floor(count * PVP_INV_DROP_RATE))
        if (dropN >= count) dropN = Math.max(1, count - 1)
        if (dropN <= 0) continue
        var copy = stack.copy()
        copy.setCount(dropN)
        if (dropMcStack(player, copy)) {
            stack.shrink(dropN)
            inv.setItem(i, stack)
        }
    }

    try {
        if (WarEquipSlot) {
            var off = mc.getOffhandItem()
            if (off && !off.isEmpty()) {
                var offId = mcStackId(off)
                if (!isProtectedWholeItem(offId) && !isMcToolOrWeapon(off)) {
                    var offCount = off.getCount()
                    var offDrop = Math.max(1, Math.floor(offCount * PVP_INV_DROP_RATE))
                    if (offDrop > 0 && offDrop < offCount) {
                        var offCopy = off.copy()
                        offCopy.setCount(offDrop)
                        if (dropMcStack(player, offCopy)) {
                            off.shrink(offDrop)
                            mc.setItemSlot(WarEquipSlot.OFFHAND, off)
                        }
                    }
                }
            }
        }
    } catch (eOff) {}

    return lmcHit
}

function readWarBorderRespawn(player, mc) {
    try {
        if (player && player.persistentData && player.persistentData.getBoolean('arkcraft_war_border_respawn')) {
            return {
                x: player.persistentData.getDouble('arkcraft_war_respawn_x'),
                y: player.persistentData.getDouble('arkcraft_war_respawn_y'),
                z: player.persistentData.getDouble('arkcraft_war_respawn_z')
            }
        }
    } catch (e0) {}
    try {
        if (mc && mc.getPersistentData) {
            var pd = mc.getPersistentData()
            if (pd.getBoolean('arkcraft_war_border_respawn')) {
                return {
                    x: pd.getDouble('arkcraft_war_respawn_x'),
                    y: pd.getDouble('arkcraft_war_respawn_y'),
                    z: pd.getDouble('arkcraft_war_respawn_z')
                }
            }
        }
    } catch (e1) {}
    return null
}

function clearWarBorderRespawnFlags(player, mc) {
    try {
        if (player && player.persistentData) {
            player.persistentData.remove('arkcraft_war_border_respawn')
            player.persistentData.remove('arkcraft_war_respawn_x')
            player.persistentData.remove('arkcraft_war_respawn_y')
            player.persistentData.remove('arkcraft_war_respawn_z')
        }
    } catch (e0) {}
    try {
        if (mc && mc.getPersistentData) {
            var pd = mc.getPersistentData()
            pd.remove('arkcraft_war_border_respawn')
            pd.remove('arkcraft_war_respawn_x')
            pd.remove('arkcraft_war_respawn_y')
            pd.remove('arkcraft_war_respawn_z')
        }
    } catch (e1) {}
}

function applyWarBorderRespawn(player, mc) {
    if (!player && !mc) return
    try {
        var pos = readWarBorderRespawn(player, mc)
        if (!pos) return
        var x = pos.x
        var y = pos.y
        var z = pos.z
        clearWarBorderRespawnFlags(player, mc)

        if (mc) {
            try {
                var lvl = mc.server.getLevel('minecraft:overworld')
                if (lvl) mc.teleportTo(lvl, x, y, z, mc.getYRot(), mc.getXRot())
            } catch (eMcTp) {
                console.warn('[WarDeath] mc teleport: ' + eMcTp)
            }
        }
        try {
            player.teleportTo('minecraft:overworld', x, y, z)
        } catch (eTp1) {
            try { player.teleport(x, y, z) } catch (eTp2) {}
        }
        player.tell('§4§l[GUERRA] §r§7Reapareciste cerca del §fborde §7de la colonia enemiga.')
    } catch (eTp) {
        console.warn('[WarDeath] border respawn: ' + eTp)
    }
}

function tellPvpDeathMessages(mc, server, lmcLoot) {
    var pvpMsg = '§c§l[Muerte] §r§7Perdiste parte de tu inventario: §f20%§7 de tus objetos, §f1§7 armadura y §f1§7 herramienta.'
    try {
        var kube = findKubeFromMc(server, mc)
        if (kube && kube.tell) kube.tell(pvpMsg)
        else mcTell(mc, pvpMsg)
    } catch (eTell) {
        mcTell(mc, pvpMsg)
    }
    if (lmcLoot) {
        var pctMsg = getLmcCoinDropPercent(mc)
        var lmcMsg = '§7También se te cayó al suelo el §f' + pctMsg + '%§7 de tus monedas.'
        try {
            var kube2 = findKubeFromMc(server, mc)
            if (kube2 && kube2.tell) kube2.tell(lmcMsg)
            else mcTell(mc, lmcMsg)
        } catch (eTell2) {
            mcTell(mc, lmcMsg)
        }
    }
}

function handlePlayerLivingDeath(event) {
    var mc = event.getEntity()
    if (!mc || !isMcPlayerEntity(mc)) return

    var server = getMcServer(mc)
    if (!server) return

    var name = mcPlayerName(mc)

    if (isVictimInWarCombat(mc, name)) {
        try { event.setCanceled(true) } catch (eWarCancel) {}
        try {
            var pd = mc.getPersistentData()
            pd.remove('arkcraft_war_death')
        } catch (ePd) {}
        return
    }

    // killerMc puede ser null (PvE: mob, caida, lava, ahogo...) o el propio jugador (suicidio).
    // En todos esos casos aplicamos el MISMO drop parcial que en PvP.
    var killerMc = resolveKillerMc(event.getSource(), mc, server)
    processPvpDeathFromLiveInventory(mc, killerMc, server)
}

function handlePlayerLivingDrops(event) {
    var mc = event.getEntity()
    if (!mc || !isMcPlayerEntity(mc)) return

    var server = getMcServer(mc)
    if (!server) return

    var name = mcPlayerName(mc)

    if (isVictimInWarCombat(mc, name)) {
        clearAllDrops(event)
        try { event.setCanceled(true) } catch (eCancel) {}
        return
    }

    var pd = mc.getPersistentData()
    var processed = pd.getBoolean('arkcraft_pvp_processed')

    if (processed) {
        var key = getPlayerStorageKey(mc)
        var pending = peekPendingDropStacks(mc) || []
        var extras = key ? pvpEquippedExtrasByPlayerName[key] : null
        pending = mergePvpWalletCoinsIntoPending(mc, event, pending, extras)
        if (key) {
            pvpPendingDropStacksByPlayerName[key] = pending
            if (extras) storeEquippedExtras(mc, extras)
        }

        try {
            mc.getPersistentData().putBoolean('arkcraft_pvp_livingdrops_done', true)
        } catch (eFlag) {}

        var coinN = countCoinStacksInList(pending)
        if (pending.length > 0) {
            var n = 0
            try {
                n = addPartialDropsToLivingEvent(event, mc, pending)
            } catch (eDrop) {
                console.warn('[WarDeath] PvP v6 LivingDrops error: ' + eDrop)
            }
            if (n <= 0) {
                n = spawnPartialDropsOnGround(mc, pending)
                console.info('[WarDeath] PvP v6 suelo (spawn directo): ' + n + ' — ' + name)
            } else {
                console.info('[WarDeath] PvP v6 suelo (LivingDrops): ' + n + ' stacks — ' + name +
                    (coinN > 0 ? ' | monedas=' + coinN : ''))
            }
            takePendingDropStacks(mc)
        } else {
            clearAllDrops(event)
            console.warn('[WarDeath] PvP v6 LivingDrops sin pending — ' + name)
        }
        return
    }

    var killerMc = resolveKillerMc(event.getSource(), mc, server)
    processPvpDropsBackupFromEvent(event, mc, killerMc, server)
}

NativeEvents.onEvent('net.neoforged.neoforge.event.entity.living.LivingDeathEvent', function(event) {
    try {
        handlePlayerLivingDeath(event)
    } catch (err) {
        console.error('[WarDeath] LivingDeathEvent: ' + err)
    }
})

NativeEvents.onEvent('net.neoforged.neoforge.event.entity.living.LivingDropsEvent', function(event) {
    try {
        handlePlayerLivingDrops(event)
    } catch (err) {
        console.error('[WarDeath] LivingDropsEvent: ' + err)
    }
})

NativeEvents.onEvent('io.github.lightman314.lightmanscurrency.api.events.WalletDropEvent', function(event) {
    try {
        var mc = event.getEntity()
        if (!mc || !isMcPlayerEntity(mc)) return

        var name = mcPlayerName(mc)
        if (isVictimInWarCombat(mc, name)) return

        var processed = false
        try {
            processed = mc.getPersistentData().getBoolean('arkcraft_pvp_processed')
        } catch (eP) {}
        if (!processed) return

        var key = getPlayerStorageKey(mc)
        if (!key) return

        var coinStacks = walletCoinStacksFromLmcEvent(event)
        try {
            var ws = event.getWalletStack()
            if ((!ws || ws.isEmpty()) && event.getWallet) {
                var w2 = event.getWallet()
                if (w2 && !w2.isEmpty()) ws = w2
            }
            var extras = pvpEquippedExtrasByPlayerName[key]
            if (extras && ws && !ws.isEmpty()) extras.wallet = ws.copy()
        } catch (eW) {}

        if (coinStacks.length === 0) return

        var dropsDone = false
        try {
            dropsDone = mc.getPersistentData().getBoolean('arkcraft_pvp_livingdrops_done')
        } catch (eDone) {}

        if (dropsDone) {
            var spawned = spawnPartialDropsOnGround(mc, coinStacks)
            console.info('[WarDeath] PvP monedas WalletDropEvent (tarde): ' + spawned + ' — ' + name)
        } else {
            pvpWalletCoinDropsByPlayerName[key] = coinStacks
            console.info('[WarDeath] PvP monedas WalletDropEvent (buffer): ' + coinStacks.length + ' — ' + name)
        }
    } catch (err) {
        console.error('[WarDeath] WalletDropEvent: ' + err)
    }
})

PlayerEvents.respawned(function(event) {
    try {
        var kube = event.player
        var mc = toMc(kube)
        if (mc) {
            var wasPvp = false
            try {
                wasPvp = mc.getPersistentData().getBoolean('arkcraft_pvp_death')
            } catch (eFlag) {}
            if (wasPvp) {
                var kept = takeKeptStacks(mc)
                if (kept && kept.length > 0) {
                    if (restoreKeptStacksToPlayer(mc, kept)) {
                        console.info('[WarDeath] PvP v6 respawn OK: ' + kept.length + ' stacks — ' + mcPlayerName(mc))
                    } else {
                        giveKeptStacksToPlayer(kube, kept)
                        console.warn('[WarDeath] PvP v6 respawn via give() fallback — ' + mcPlayerName(mc))
                    }
                } else {
                    console.warn('[WarDeath] PvP v6 respawn SIN stacks — ' + mcPlayerName(mc))
                }
                var extras = takeEquippedExtras(mc)
                if (extras) {
                    if (restoreEquippedExtras(mc, extras)) {
                        console.info('[WarDeath] PvP extras OK (wallet/mochila) — ' + mcPlayerName(mc))
                    } else {
                        console.warn('[WarDeath] PvP extras fallo restore — ' + mcPlayerName(mc))
                    }
                    removeEquippedWalletDuplicatesInMain(mc)
                }
                clearPvpDeathFlags(mc)
            }
        }
        applyWarBorderRespawn(kube, mc)
    } catch (err) {
        console.error('[WarDeath] respawned: ' + err)
    }
})

EntityEvents.afterHurt('minecraft:player', function(event) {
    try {
        if (event.level && event.level.isClientSide && event.level.isClientSide()) return
        var victimMc = toMc(event.entity)
        if (!victimMc) return
        var server = getMcServer(victimMc)
        if (!server) return
        if (isVictimInWarCombat(victimMc, mcPlayerName(victimMc))) return
        var killerMc = playerEntityFromDamageSource(event.source)
        if (!killerMc) return
        rememberPvpAttacker(victimMc, killerMc, server)
    } catch (err) {
        console.error('[WarDeath] afterHurt: ' + err)
    }
})

NativeEvents.onEvent('net.neoforged.neoforge.event.entity.player.AttackEntityEvent', function(event) {
    try {
        var attacker = event.getEntity()
        var target = event.getTarget()
        if (!attacker || !target || !isMcPlayerEntity(attacker) || !isMcPlayerEntity(target)) return
        var server = getMcServer(attacker)
        if (!server) return
        if (isVictimInWarCombat(target, mcPlayerName(target))) return
        rememberPvpAttacker(target, attacker, server)
    } catch (err) {
        console.error('[WarDeath] AttackEntityEvent: ' + err)
    }
})

EntityEvents.drops('minecraft:player', function(event) {
    try {
        var mc = toMc(event.entity) || event.entity
        if (!mc || !isMcPlayerEntity(mc)) return

        var name = mcPlayerName(mc)

        if (isVictimInWarCombat(mc, name)) {
            clearAllDrops(event)
            return
        }

        var processed = false
        try {
            processed = mc.getPersistentData().getBoolean('arkcraft_pvp_processed')
        } catch (eDone) {}

        if (!processed) return

        clearAllDrops(event)
    } catch (err) {
        console.error('[WarDeath] EntityEvents.drops player: ' + err)
    }
})

console.info('[WarDeath] PvP v6.8 (monedas inventario/wallet + coinDrop%)')

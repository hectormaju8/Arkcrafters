// ARKCRAFT - Stamina ParCool al atacar (CLIENT)
// Better Combat no usa mc.swinging; consumimos por evento con anti-duplicado por tick.
// Cada PC consume en su LocalPlayer y sincroniza al servidor (ParCool).

var STAMINA_MIN_TO_ATTACK = 1
var DEBOUNCE_FALLBACK_TICKS = 8

var STAMINA_FIST = 25
var STAMINA_LIGHT = 35
var STAMINA_MEDIUM = 50
var STAMINA_POLEARM = 65
var STAMINA_HEAVY = 85

var LIGHT_CATS = {
    dagger: true, claw: true, fist: true, rapier: true, cutlass: true,
    sickle: true, wand: true, coral_blade: true
}
var POLEARM_CATS = {
    lance: true, spear: true, glaive: true, halberd: true,
    battlestaff: true, trident: true
}
var HEAVY_CATS = {
    claymore: true, hammer: true, heavy_axe: true, double_axe: true,
    twin_blade: true, anchor: true, scythe: true, staff: true,
    katana: true, soul_knife: true
}

var StaminaApi = null
var LocalStamina = null
var Minecraft = null
var WeaponRegistry = null
var IntegerClass = null
var lastConsumeTick = {}

try {
    StaminaApi = Java.loadClass('com.alrex.parcool.api.Stamina')
    LocalStamina = Java.loadClass('com.alrex.parcool.common.attachment.client.LocalStamina')
    Minecraft = Java.loadClass('net.minecraft.client.Minecraft')
    WeaponRegistry = Java.loadClass('net.bettercombat.logic.WeaponRegistry')
    IntegerClass = Java.loadClass('java.lang.Integer')
    console.info('[Arkcraft] ParCool combat stamina CLIENT: Stamina API OK')
} catch (err) {
    console.warn('[Arkcraft] ParCool combat stamina CLIENT init: ' + err)
}

function localPlayer() {
    try {
        if (!Minecraft) return null
        return Minecraft.getInstance().player
    } catch (e) {
        return null
    }
}

// Solo gastar stamina del jugador de ESTA PC (no del otro en LAN cuando el evento llega al cliente)
function isLocalMcPlayer(mc) {
    var lp = localPlayer()
    if (!lp || !mc) return false
    try {
        return lp.getUUID().equals(mc.getUUID())
    } catch (e) {
        return lp === mc
    }
}

function toInt(value) {
    return Java.cast(IntegerClass, Math.floor(value)).intValue()
}

function playerId(mc) {
    try {
        return String(mc.getUUID())
    } catch (e) {
        return 'local'
    }
}

function staminaNow(mc) {
    try {
        if (StaminaApi) return StaminaApi.get(mc).getValue()
    } catch (e) {}
    return 9999
}

function isExhaustedNow(mc) {
    try {
        if (StaminaApi) return StaminaApi.get(mc).isExhausted()
    } catch (e) {}
    return false
}

function weaponCategory(attrs) {
    try {
        var cat = attrs.category()
        return cat ? String(cat) : ''
    } catch (e) {
        return ''
    }
}

function swingCost(mc) {
    try {
        var stack = mc.getMainHandItem()
        if (!stack || stack.isEmpty()) return STAMINA_FIST
        if (!WeaponRegistry) return STAMINA_MEDIUM

        var attrs = WeaponRegistry.getAttributes(stack)
        if (!attrs) return STAMINA_MEDIUM

        var cat = weaponCategory(attrs)
        if (LIGHT_CATS[cat]) return STAMINA_LIGHT
        if (POLEARM_CATS[cat]) return STAMINA_POLEARM
        if (HEAVY_CATS[cat]) return STAMINA_HEAVY

        try {
            if (attrs.isTwoHanded()) return STAMINA_HEAVY
        } catch (e2) {}

        return STAMINA_MEDIUM
    } catch (e) {
        return STAMINA_MEDIUM
    }
}

function attackDebounceTicks(mc) {
    try {
        var delay = mc.getCurrentItemAttackStrengthDelay()
        if (delay != null && delay > 0) {
            return Math.max(4, Math.floor(delay + 0.5))
        }
    } catch (e) {}
    return DEBOUNCE_FALLBACK_TICKS
}

function canAttack(mc) {
    if (isExhaustedNow(mc)) return false
    return staminaNow(mc) >= STAMINA_MIN_TO_ATTACK
}

function consumeCombatStamina(mc) {
    if (!StaminaApi || !canAttack(mc)) return false

    var cost = toInt(swingCost(mc))
    if (cost < 1) return false

    var before = staminaNow(mc)
    StaminaApi.get(mc).consume(cost)

    try {
        if (LocalStamina) LocalStamina.get(mc).sync(mc)
    } catch (e) {}

    var after = staminaNow(mc)
    if (after >= before && !isExhaustedNow(mc)) {
        console.warn('[Arkcraft] CLIENT stamina no bajo (antes=' + before + ' despues=' + after + ' coste=' + cost + ')')
        return false
    }
    return true
}

function tryConsumeCombatStamina(mc) {
    if (!mc || !canAttack(mc)) return

    var id = playerId(mc)
    var tick = mc.tickCount
    var last = lastConsumeTick[id]

    if (last === tick) return
    if (last != null && tick - last < attackDebounceTicks(mc)) return

    if (consumeCombatStamina(mc)) {
        lastConsumeTick[id] = tick
    }
}

NativeEvents.onEvent('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$LeftClickEmpty', function (event) {
    try {
        var mc = localPlayer()
        if (!mc) return
        tryConsumeCombatStamina(mc)
    } catch (e) {}
})

NativeEvents.onEvent('net.neoforged.neoforge.event.entity.player.AttackEntityEvent', function (event) {
    try {
        var mc = event.entity
        if (!mc || !isLocalMcPlayer(mc)) return
        if (!canAttack(mc)) {
            event.setCanceled(true)
            return
        }
        tryConsumeCombatStamina(mc)
    } catch (e) {}
})

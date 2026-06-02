// ARKCRAFT - Stamina ParCool al atacar (SERVER)
// Solo bloquea golpe/daño si el jugador esta agotado (stamina sincronizada desde SU cliente).
// El GASTO al pegar lo hace cada PC en client_scripts/parcool_combat_stamina.js

var STAMINA_MIN_TO_ATTACK = 1

var Attachments = null
var PlayerClass = null

try {
    Attachments = Java.loadClass('com.alrex.parcool.common.attachment.Attachments')
    PlayerClass = Java.loadClass('net.minecraft.world.entity.player.Player')
    console.info('[Arkcraft] ParCool combat stamina SERVER: OK (solo bloqueo agotado)')
} catch (err) {
    console.warn('[Arkcraft] ParCool combat stamina SERVER: ' + err)
}

function toMcPlayer(player) {
    if (!player) return null
    try {
        if (player.getEntity) return player.getEntity()
    } catch (e) {}
    return player
}

function getStaminaData(player) {
    if (!Attachments) return null
    try {
        var mc = toMcPlayer(player)
        if (!mc) return null
        return mc.getData(Attachments.STAMINA.get())
    } catch (e) {
        return null
    }
}

function cannotAttack(player) {
    var data = getStaminaData(player)
    if (!data) return false
    try {
        if (data.isExhausted()) return true
    } catch (e) {}
    try {
        return data.value() < STAMINA_MIN_TO_ATTACK
    } catch (e2) {
        return false
    }
}

function getAttackingPlayer(source) {
    if (!source) return null
    try {
        if (source.player) return toMcPlayer(source.player)
    } catch (e) {}
    try {
        var entity = source.getEntity()
        if (entity != null && PlayerClass.isInstance(entity)) return entity
    } catch (e2) {}
    return null
}

NativeEvents.onEvent('net.neoforged.neoforge.event.entity.player.AttackEntityEvent', function (event) {
    try {
        if (cannotAttack(event.entity)) {
            event.setCanceled(true)
        }
    } catch (e) {}
})

EntityEvents.beforeHurt(function (event) {
    try {
        var attacker = getAttackingPlayer(event.source)
        if (cannotAttack(attacker)) {
            event.cancel()
        }
    } catch (e) {}
})

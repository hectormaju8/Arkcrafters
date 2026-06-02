// ============================================================
// ARKCRAFT - Hitos (logros de temporada) + Leyenda (capstone)
// ------------------------------------------------------------
// El capitulo FTB "Hitos" usa estos logros como OBJETIVO.
// La recompensa (XP + poco dinero) la da FTB; aqui NO damos dinero.
//
// Que hace este script:
//  1) Otorga el logro-trofeo de los hitos que NO se otorgan solos
//     (colonia y matanzas), leyendo logros vanilla y marcadores.
//  2) Otorga el logro morado "arkcraft:hitos/leyenda" cuando el
//     jugador tiene los 17 hitos. Asi NO se puede completar a mano.
//
// Los otros 10 hitos (economia, guerra, jefes, metropolis, joyero)
// los otorgan sus propios scripts (economia / guerra / hotzone /
// investigacion). Aqui solo se comprueban.
// ============================================================

var HITOS_POLL = 100          // revisar cada 100 ticks (~5 s)
var hitosAcc = 0
var hitosScoreboardReady = false

// Los 17 logros que, juntos, otorgan "Leyenda".
var HITOS_ALL = [
    'arkcraft:hitos/primer_pueblo',
    'arkcraft:hitos/pueblo_establecido',
    'arkcraft:hitos/capital',
    'arkcraft:hitos/metropolis',
    'arkcraft:hitos/inversor',
    'arkcraft:hitos/magnate',
    'arkcraft:hitos/economia',
    'arkcraft:hitos/guerra1',
    'arkcraft:hitos/guerra3',
    'arkcraft:hitos/guerra5',
    'arkcraft:hitos/caza',
    'arkcraft:hitos/exterminador',
    'arkcraft:hitos/no_muertos',
    'arkcraft:hitos/jefe_t3',
    'arkcraft:hitos/jefe_t4',
    'arkcraft:hitos/joyero',
    'arkcraft:hitos/wither'
]

// Marcadores de estadisticas vanilla (kills). Se autoactualizan.
function ensureScoreboards(srv) {
    if (hitosScoreboardReady) return
    srv.runCommandSilent('scoreboard objectives add ark_mobkills minecraft.custom:minecraft.mob_kills')
    srv.runCommandSilent('scoreboard objectives add ark_zombies minecraft.killed:minecraft.zombie')
    srv.runCommandSilent('scoreboard objectives add ark_skeletons minecraft.killed:minecraft.skeleton')
    srv.runCommandSilent('scoreboard objectives add ark_wither minecraft.killed:minecraft.wither')
    hitosScoreboardReady = true
}

// Otorga el trofeo de los hitos "nativos" (colonia + matanzas).
// Cada comando solo afecta a quien cumple la condicion y aun no lo tiene.
function grantNativeTrophies(srv) {
    // Colonia (logros de MineColonies)
    srv.runCommandSilent('execute as @a[advancements={minecolonies:minecolonies/place_townhall=true,arkcraft:hitos/primer_pueblo=false}] run advancement grant @s only arkcraft:hitos/primer_pueblo')
    srv.runCommandSilent('execute as @a[advancements={arkcraft:minecolonies/townhall_3=true,arkcraft:hitos/pueblo_establecido=false}] run advancement grant @s only arkcraft:hitos/pueblo_establecido')
    srv.runCommandSilent('execute as @a[advancements={arkcraft:minecolonies/townhall_5=true,arkcraft:hitos/capital=false}] run advancement grant @s only arkcraft:hitos/capital')
    // Matanzas (estadisticas vanilla)
    srv.runCommandSilent('execute as @a[scores={ark_mobkills=500..},advancements={arkcraft:hitos/caza=false}] run advancement grant @s only arkcraft:hitos/caza')
    srv.runCommandSilent('execute as @a[scores={ark_mobkills=3000..},advancements={arkcraft:hitos/exterminador=false}] run advancement grant @s only arkcraft:hitos/exterminador')
    srv.runCommandSilent('execute as @a[scores={ark_zombies=250..,ark_skeletons=250..},advancements={arkcraft:hitos/no_muertos=false}] run advancement grant @s only arkcraft:hitos/no_muertos')
    srv.runCommandSilent('execute as @a[scores={ark_wither=1..},advancements={arkcraft:hitos/wither=false}] run advancement grant @s only arkcraft:hitos/wither')
}

// Otorga "Leyenda" a quien tenga los 17 hitos y aun no la tenga.
function grantLeyenda(srv) {
    var adv = ''
    for (var i = 0; i < HITOS_ALL.length; i++) {
        adv += HITOS_ALL[i] + '=true,'
    }
    adv += 'arkcraft:hitos/leyenda=false'
    srv.runCommandSilent('execute as @a[advancements={' + adv + '}] run advancement grant @s only arkcraft:hitos/leyenda')
}

ServerEvents.tick(event => {
    try {
        hitosAcc++
        if (hitosAcc % HITOS_POLL !== 0) return
        var srv = event.server
        if (!srv) return
        ensureScoreboards(srv)
        grantNativeTrophies(srv)
        grantLeyenda(srv)
    } catch (e) {
        console.error('[Hitos] tick error: ' + e)
    }
})

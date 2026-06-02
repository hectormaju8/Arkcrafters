// ============================================================
// ARKCRAFT — Cap de GASTO diario (CEV) — tributos + guerra
// Farmeo/loot libre; progreso limitado por gasto (Uni + declarar guerra)
// ============================================================

// Persistencia vía server.persistentData (NBT). KubeJS bloquea java.io.File / java.nio.file (class filter),
// así que NO usamos archivos: el estado global vive en el persistentData del servidor (se guarda con el mundo).
var econServerRef = null
var ECON_PD = 'arkEcon_' // prefijo de claves en server.persistentData

var ECON_COIN_PREFIX = 'lightmanscurrency:coin_'
var ECON_CEV = {
    'lightmanscurrency:coin_copper': 1,
    'lightmanscurrency:coin_iron': 10,
    'lightmanscurrency:coin_gold': 100,
    'lightmanscurrency:coin_emerald': 1000,
    'lightmanscurrency:coin_diamond': 10000,
    'lightmanscurrency:coin_netherite': 100000
}

var ECON_SEASON_DAYS_MAX = 30
var ECON_MS_PER_DAY = 24 * 60 * 60 * 1000
var ECON_RESET_HOUR_LOCAL = 6 // 06:00 hora del sistema (LAN / host)

// Cap gasto CEV por día (≈ oro = CEV/100) — rebalance 30d: 6k(1-10) / 9k(11-20) / 12k(21-30)
// Capacidad total temporada = 270.000 CEV. Tributos = 191.400. Margen ~78k para mercado/buffer.
// Guerra NO cuenta al cap (decisión 2026-05-31).
var ECON_CAP_BY_SERVER_DAY = [
    6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000,
    9000, 9000, 9000, 9000, 9000, 9000, 9000, 9000, 9000, 9000,
    12000, 12000, 12000, 12000, 12000, 12000, 12000, 12000, 12000, 12000
]

var ECON_MONUMENT_SPEND_CEV = 50000 // hito monumento (~500 oro en tributos+guerra)

// Catch-up POR JUGADOR (solo income HZ del que va detrás de la curva; no global, no toca al tryhard al día)
var ECON_CATCHUP_START_DAY = 5    // antes de este día de temporada no hay catch-up (todos arrancan)
var ECON_CATCHUP_OK_FRAC   = 0.60 // gasto >= 60% de la curva máxima acumulada => al día, x1
var ECON_CATCHUP_FAR_FRAC  = 0.35 // 35-60% => x1.5
var ECON_CATCHUP_VFAR_FRAC = 0.20 // 20-35% => x2 ; por debajo de 20% => x3
var ECON_CATCHUP_MULT_1    = 1.5
var ECON_CATCHUP_MULT_2    = 2.0
var ECON_CATCHUP_MULT_3    = 3.0

var econState = null
var econDirty = false
var econTickAcc = 0

// Devuelve el CompoundTag persistente del servidor (preferimos la ref KubeJS capturada en eventos).
function econRootData(server) {
    var s = econServerRef
    try { if (server && server.persistentData) s = server } catch (eS) {}
    try { return s ? s.persistentData : null } catch (e) { return null }
}

function defaultEconState() {
    return {
        serverDay: 1,
        lastDayResetMs: 0,
        seasonStartMs: Date.now(),
        players: {},
        colonies: {},
        researchCharged: []
    }
}

function loadEconState(server) {
    if (econState) return econState
    econState = defaultEconState()
    try {
        var pd = econRootData(server)
        if (pd && pd.contains(ECON_PD + 'serverDay')) {
            econState.serverDay = pd.getInt(ECON_PD + 'serverDay') || 1
            econState.lastDayResetMs = parseInt(String(pd.getString(ECON_PD + 'lastReset')), 10) || 0
            econState.seasonStartMs = parseInt(String(pd.getString(ECON_PD + 'seasonStart')), 10) || 0
            var rc = String(pd.getString(ECON_PD + 'researchCharged') || '')
            econState.researchCharged = rc.length ? rc.split('|') : []
            var cv = String(pd.getString(ECON_PD + 'colonies') || '')
            econState.colonies = {}
            if (cv.length) {
                var entries = cv.split(';')
                for (var ei = 0; ei < entries.length; ei++) {
                    var parts = entries[ei].split(',')
                    if (parts.length >= 3) {
                        econState.colonies[parts[0]] = {
                            declaresWeek: parseInt(parts[1], 10) || 0,
                            weekId: parseInt(parts[2], 10) || 0
                        }
                    }
                }
            }
        }
    } catch (eLoad) {
        console.warn('[ArkcraftEcon] load: ' + eLoad)
    }
    return econState
}

function saveEconState(server) {
    if (!econState) return
    try {
        var pd = econRootData(server)
        if (!pd) return
        pd.putInt(ECON_PD + 'serverDay', getServerDay())
        pd.putString(ECON_PD + 'lastReset', String(econState.lastDayResetMs || 0))
        pd.putString(ECON_PD + 'seasonStart', String(econState.seasonStartMs || 0))
        pd.putString(ECON_PD + 'researchCharged', (econState.researchCharged || []).join('|'))
        var colKeys = Object.keys(econState.colonies || {})
        var colParts = []
        for (var ci = 0; ci < colKeys.length; ci++) {
            var cr = econState.colonies[colKeys[ci]]
            if (cr) colParts.push(colKeys[ci] + ',' + (cr.declaresWeek || 0) + ',' + (cr.weekId || 0))
        }
        pd.putString(ECON_PD + 'colonies', colParts.join(';'))
    } catch (eSave) {
        console.warn('[ArkcraftEcon] save: ' + eSave)
    }
    econDirty = false
}

function syncPlayerPersistent(player, rec) {
    try {
        var pd = player.persistentData
        pd.putInt('arkcraft_spent_today_cev', rec.spentTodayCev || 0)
        pd.putInt('arkcraft_spent_season_cev', rec.spentSeasonCev || 0)
        pd.putInt('arkcraft_wars_won_attacker', rec.warsWonAttacker || 0)
        pd.putInt('arkcraft_spend_day', rec.spendDay || getServerDay())
    } catch (ePd) {}
}

function loadPlayerFromPersistent(player) {
    var uuid = uuidKey(player)
    if (!uuid) return null
    try {
        var pd = player.persistentData
        if (!pd.contains('arkcraft_spent_season_cev')) return null
        return {
            spentTodayCev: pd.getInt('arkcraft_spent_today_cev'),
            spentSeasonCev: pd.getInt('arkcraft_spent_season_cev'),
            warsWonAttacker: pd.getInt('arkcraft_wars_won_attacker'),
            spendDay: pd.getInt('arkcraft_spend_day')
        }
    } catch (e) {
        return null
    }
}

function markEconDirty() {
    econDirty = true
}

function coinIdToCev(itemId, count) {
    var c = ECON_CEV[String(itemId)]
    if (!c) return 0
    return c * (count || 1)
}

function cevToGoldEquiv(cev) {
    return Math.round((cev || 0) / 100)
}

function getServerDay() {
    if (!econState) return 1
    var d = econState.serverDay || 1
    if (d < 1) return 1
    if (d > ECON_SEASON_DAYS_MAX) return ECON_SEASON_DAYS_MAX
    return d
}

function dailySpendCapCev() {
    var day = getServerDay()
    var idx = day - 1
    if (idx < 0) idx = 0
    if (idx >= ECON_CAP_BY_SERVER_DAY.length) idx = ECON_CAP_BY_SERVER_DAY.length - 1
    return ECON_CAP_BY_SERVER_DAY[idx]
}

// Curva máxima acumulada: cuánto podría haber gastado alguien que toca el cap cada día hasta `day`.
function expectedCumulativeCap(day) {
    var d = day || getServerDay()
    if (d < 1) d = 1
    if (d > ECON_CAP_BY_SERVER_DAY.length) d = ECON_CAP_BY_SERVER_DAY.length
    var sum = 0
    for (var i = 0; i < d; i++) sum += ECON_CAP_BY_SERVER_DAY[i]
    return sum
}

// Multiplicador de drop HZ para un jugador segun lo atrasado que vaya en gasto de temporada.
// Solo afecta a quien va por debajo de la curva; el que va al dia recibe x1.
function getCatchupMultiplier(player) {
    var st = getSpendStatus(player)
    if (!st) return 1.0
    if (st.serverDay < ECON_CATCHUP_START_DAY) return 1.0
    var expected = expectedCumulativeCap(st.serverDay)
    if (expected <= 0) return 1.0
    var ratio = (st.spentSeason || 0) / expected
    if (ratio >= ECON_CATCHUP_OK_FRAC) return 1.0
    if (ratio >= ECON_CATCHUP_FAR_FRAC) return ECON_CATCHUP_MULT_1
    if (ratio >= ECON_CATCHUP_VFAR_FRAC) return ECON_CATCHUP_MULT_2
    return ECON_CATCHUP_MULT_3
}

// UUID CANÓNICO: siempre vía getUUID() de la entidad nativa, para que el jugador KubeJS
// (monitor) y el nativo (comando /econ) den la MISMA clave. (player.uuid difería entre ambos.)
function uuidKey(player) {
    if (!player) return null
    var mc = player
    try { if (player.getEntity) mc = player.getEntity() } catch (e0) {}
    try { if (mc && mc.getUUID) return String(mc.getUUID()) } catch (e1) {}
    try { if (player.getUUID) return String(player.getUUID()) } catch (e2) {}
    try { if (player.uuid) return String(player.uuid) } catch (e3) {}
    return null
}

function ensurePlayerRecord(uuid, player) {
    if (!econState.players[uuid]) {
        var fromPd = player ? loadPlayerFromPersistent(player) : null
        econState.players[uuid] = fromPd || {
            spentTodayCev: 0,
            spentSeasonCev: 0,
            warsWonAttacker: 0,
            spendDay: getServerDay()
        }
    }
    var rec = econState.players[uuid]
    if (rec.spendDay !== getServerDay()) {
        rec.spentTodayCev = 0
        rec.spendDay = getServerDay()
        if (player) syncPlayerPersistent(player, rec)
    }
    return rec
}

function getWeekId(ms) {
    return Math.floor((ms || Date.now()) / (7 * ECON_MS_PER_DAY))
}

function ensureColonyRecord(colonyId) {
    var key = String(colonyId)
    if (!econState.colonies[key]) {
        econState.colonies[key] = { declaresWeek: 0, weekId: getWeekId(Date.now()) }
    }
    var rec = econState.colonies[key]
    var w = getWeekId(Date.now())
    if (rec.weekId !== w) {
        rec.weekId = w
        rec.declaresWeek = 0
    }
    return rec
}

function shouldResetDay(server) {
    var now = Date.now()
    var cal = Java.loadClass('java.util.Calendar').getInstance()
    cal.setTimeInMillis(now)
    var todayReset = cal.clone()
    todayReset.set(Java.loadClass('java.util.Calendar').HOUR_OF_DAY, ECON_RESET_HOUR_LOCAL)
    todayReset.set(Java.loadClass('java.util.Calendar').MINUTE, 0)
    todayReset.set(Java.loadClass('java.util.Calendar').SECOND, 0)
    todayReset.set(Java.loadClass('java.util.Calendar').MILLISECOND, 0)
    if (cal.getTimeInMillis() < todayReset.getTimeInMillis()) {
        todayReset.add(Java.loadClass('java.util.Calendar').DAY_OF_MONTH, -1)
    }
    var boundary = todayReset.getTimeInMillis()
    if (!econState.lastDayResetMs) {
        econState.lastDayResetMs = boundary
        return false
    }
    return econState.lastDayResetMs < boundary
}

function resetDailySpendAll(server) {
    var keys = Object.keys(econState.players)
    for (var i = 0; i < keys.length; i++) {
        var rec = econState.players[keys[i]]
        if (rec) {
            rec.spentTodayCev = 0
            rec.spendDay = getServerDay()
        }
    }
    markEconDirty()
}

function advanceServerDay(server) {
    if (econState.serverDay < ECON_SEASON_DAYS_MAX) econState.serverDay++
    var cal = Java.loadClass('java.util.Calendar').getInstance()
    cal.setTimeInMillis(Date.now())
    cal.set(Java.loadClass('java.util.Calendar').HOUR_OF_DAY, ECON_RESET_HOUR_LOCAL)
    cal.set(Java.loadClass('java.util.Calendar').MINUTE, 0)
    cal.set(Java.loadClass('java.util.Calendar').SECOND, 0)
    cal.set(Java.loadClass('java.util.Calendar').MILLISECOND, 0)
    if (Java.loadClass('java.util.Calendar').getInstance().getTimeInMillis() < cal.getTimeInMillis()) {
        cal.add(Java.loadClass('java.util.Calendar').DAY_OF_MONTH, -1)
    }
    econState.lastDayResetMs = cal.getTimeInMillis()
    resetDailySpendAll(server)
    markEconDirty()
    saveEconState(server)
}

function tickDayReset(server) {
    if (!econState) return
    if (shouldResetDay(server)) advanceServerDay(server)
}

function getSpendStatus(player) {
    var uuid = uuidKey(player)
    if (!uuid) return null
    var rec = ensurePlayerRecord(uuid, player)
    var cap = dailySpendCapCev()
    return {
        uuid: uuid,
        spentToday: rec.spentTodayCev || 0,
        spentSeason: rec.spentSeasonCev || 0,
        cap: cap,                                            // cap del día (informativo: lo que suma hoy)
        seasonCap: expectedCumulativeCap(getServerDay()),    // cap ACUMULATIVO hasta hoy (lo que realmente limita)
        serverDay: getServerDay(),
        warsWonAttacker: rec.warsWonAttacker || 0,
        monumentSpendTarget: ECON_MONUMENT_SPEND_CEV
    }
}

function canSpendCev(player, amountCev) {
    if (!amountCev || amountCev <= 0) return { ok: true, left: expectedCumulativeCap(getServerDay()) }
    var uuid = uuidKey(player)
    if (!uuid) return { ok: false, msg: '§cNo se pudo leer tu UUID.' }
    var rec = ensurePlayerRecord(uuid, player)
    // Cap ACUMULATIVO: límite = suma de los caps de todos los días hasta hoy; gasto = gasto de temporada.
    // El cap NO usado se acumula (no se pierde por no jugar).
    var cap = expectedCumulativeCap(getServerDay())
    var left = cap - (rec.spentSeasonCev || 0)
    if (amountCev <= left) return { ok: true, left: left - amountCev }
    return {
        ok: false,
        left: Math.max(0, left),
        msg: '§6[Economía] §7Llegaste a tu límite de gasto acumulado: §c' + cevToGoldEquiv(rec.spentSeasonCev) + '/' +
            cevToGoldEquiv(cap) + ' oro§7. Sube cada día (se suma ~06:00).'
    }
}

// Otorga un logro de hito (idempotente: si ya lo tiene, no re-notifica).
function grantHito(player, id) {
    try { player.runCommandSilent('advancement grant @s only arkcraft:hitos/' + id) } catch (e) {}
}

function recordSpendCev(player, amountCev, reason) {
    if (!amountCev || amountCev <= 0) return true
    var check = canSpendCev(player, amountCev)
    if (!check.ok) return false
    var uuid = uuidKey(player)
    var rec = ensurePlayerRecord(uuid, player)
    rec.spentTodayCev = (rec.spentTodayCev || 0) + amountCev
    rec.spentSeasonCev = (rec.spentSeasonCev || 0) + amountCev
    syncPlayerPersistent(player, rec)
    markEconDirty()
    // Hitos de gasto (temporada)
    var ssCev = rec.spentSeasonCev || 0
    if (ssCev >= 25000) grantHito(player, 'inversor')
    if (ssCev >= 100000) grantHito(player, 'magnate')
    if (ssCev >= 191400) grantHito(player, 'economia')
    try {
        var mc = player.getEntity ? player.getEntity() : player
        if (mc && mc.sendSystemMessage) {
            mc.sendSystemMessage(
                Text.of('§6[Economía] §7Gasto §e-' + cevToGoldEquiv(amountCev) + ' oro §7(' + (reason || 'gasto') +
                    ') §8— §f' + cevToGoldEquiv(rec.spentSeasonCev) + '/' + cevToGoldEquiv(expectedCumulativeCap(getServerDay())) + ' temporada')
            )
        }
    } catch (eMsg) {}
    return true
}

function refundSpendCev(player, amountCev, reason) {
    if (!amountCev || amountCev <= 0) return
    var uuid = uuidKey(player)
    if (!uuid) return
    var rec = ensurePlayerRecord(uuid, player)
    rec.spentTodayCev = Math.max(0, (rec.spentTodayCev || 0) - amountCev)
    rec.spentSeasonCev = Math.max(0, (rec.spentSeasonCev || 0) - amountCev)
    syncPlayerPersistent(player, rec)
    markEconDirty()
    try {
        var mc = player.getEntity ? player.getEntity() : player
        if (mc && mc.sendSystemMessage) {
            mc.sendSystemMessage(
                Text.of('§6[Economía] §7Te devolvemos §a+' + cevToGoldEquiv(amountCev) + ' oro §7a tu gasto (' + (reason || 'cancelado') +
                    ') §8— §f' + cevToGoldEquiv(rec.spentSeasonCev) + '/' + cevToGoldEquiv(expectedCumulativeCap(getServerDay())) + ' temporada')
            )
        }
    } catch (eMsg) {}
}

function recordWarWinAttacker(player) {
    var uuid = uuidKey(player)
    if (!uuid) return
    var rec = ensurePlayerRecord(uuid, player)
    rec.warsWonAttacker = (rec.warsWonAttacker || 0) + 1
    syncPlayerPersistent(player, rec)
    markEconDirty()
    // Hitos de guerra (solo victorias como atacante)
    var w = rec.warsWonAttacker || 0
    if (w >= 1) grantHito(player, 'guerra1')
    if (w >= 3) grantHito(player, 'guerra3')
    if (w >= 5) grantHito(player, 'guerra5')
}

function canColonyDeclareWar(colonyId, maxPerWeek) {
    var rec = ensureColonyRecord(colonyId)
    return (rec.declaresWeek || 0) < maxPerWeek
}

function recordColonyDeclare(colonyId) {
    var rec = ensureColonyRecord(colonyId)
    rec.declaresWeek = (rec.declaresWeek || 0) + 1
    markEconDirty()
}

function isResearchCharged(colonyId, researchKey) {
    var id = String(colonyId) + ':' + researchKey
    if (!econState.researchCharged) econState.researchCharged = []
    for (var i = 0; i < econState.researchCharged.length; i++) {
        if (econState.researchCharged[i] === id) return true
    }
    return false
}

function markResearchCharged(colonyId, researchKey) {
    if (isResearchCharged(colonyId, researchKey)) return
    if (!econState.researchCharged) econState.researchCharged = []
    econState.researchCharged.push(String(colonyId) + ':' + researchKey)
    markEconDirty()
}

function unmarkResearchCharged(colonyId, researchKey) {
    if (!econState.researchCharged) return
    var id = String(colonyId) + ':' + researchKey
    var arr = econState.researchCharged
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === id) { arr.splice(i, 1); markEconDirty(); return }
    }
}

// Elimina TODAS las entradas researchCharged de una colonia (limpia obsoletas; usado al regularizar).
function clearColonyResearchCharged(colonyId) {
    if (!econState.researchCharged) return
    var pref = String(colonyId) + ':'
    var kept = []
    for (var i = 0; i < econState.researchCharged.length; i++) {
        var e = econState.researchCharged[i]
        if (String(e).indexOf(pref) !== 0) kept.push(e)
    }
    econState.researchCharged = kept
    markEconDirty()
}

function opResetSpendToday(server, targetPlayer) {
    function resetRec(p) {
        var u = uuidKey(p)
        if (!u) return false
        var r = ensurePlayerRecord(u, p)
        r.spentTodayCev = 0
        r.spentSeasonCev = 0
        syncPlayerPersistent(p, r)
        return true
    }
    if (targetPlayer) {
        if (resetRec(targetPlayer)) {
            markEconDirty()
            saveEconState(server)
            return '§aGasto (hoy + temporada) reiniciado para ese jugador.'
        }
        return '§cNo se pudo (sin UUID).'
    }
    var ps = econServerRef ? econServerRef.players : null
    var n = 0
    if (ps) { for (var i = 0; i < ps.size(); i++) { if (resetRec(ps.get(i))) n++ } }
    resetDailySpendAll(server)
    markEconDirty()
    saveEconState(server)
    return '§aGasto (hoy + temporada) reiniciado (' + n + ' jugadores online).'
}

function opSetServerDay(server, day) {
    var d = Math.max(1, Math.min(ECON_SEASON_DAYS_MAX, parseInt(day, 10) || 1))
    econState.serverDay = d
    resetDailySpendAll(server)
    markEconDirty()
    saveEconState(server)
    return '§aDía de temporada = §f' + d + '§a (cap gasto ≈ §f' + cevToGoldEquiv(dailySpendCapCev()) + ' oro§a).'
}

function statusText(player) {
    var st = getSpendStatus(player)
    if (!st) return '§cNo se pudo leer economía.'
    var lines = []
    lines.push('§6=== Tu economía ===')
    lines.push('§7Día de la temporada: §f' + st.serverDay + ' de ' + ECON_SEASON_DAYS_MAX)
    lines.push('§7Gasto acumulado: §f' + cevToGoldEquiv(st.spentSeason) + '§7 de §f' + cevToGoldEquiv(st.seasonCap) + ' oro')
    var leftCev = Math.max(0, st.seasonCap - st.spentSeason)
    lines.push('§7Te queda por gastar: §a' + cevToGoldEquiv(leftCev) + ' oro')
    lines.push('§8(El cap se SUMA cada día ~06:00: hoy entran +' + cevToGoldEquiv(st.cap) + ' oro. Lo no gastado no se pierde.)')
    lines.push('§7Guerras ganadas atacando: §f' + st.warsWonAttacker)
    var cuMult = getCatchupMultiplier(player)
    if (cuMult > 1.0) {
        lines.push('§aVas algo atrasado: ganas §f×' + cuMult + '§a monedas al matar en Zonas Calientes (para alcanzar al resto).')
    }
    return lines.join('\n')
}

ServerEvents.loaded(function (event) {
    econServerRef = event.server
    loadEconState(event.server)
    console.info('[ArkcraftEcon] Cap de GASTO cargado — día ' + getServerDay())
})

ServerEvents.tick(function (event) {
    if (!econServerRef) econServerRef = event.server
    if (!econState) loadEconState(event.server)
    econTickAcc++
    // Chequear el reset de día cada ~5 s (no cada tick): evita crear un Calendar 20 veces/seg.
    if (econTickAcc % 100 === 0) tickDayReset(event.server)
    if (econDirty && econTickAcc % 200 === 0) saveEconState(event.server)
})

PlayerEvents.loggedIn(function (event) {
    loadEconState(event.server)
    tickDayReset(event.server)
    var st = getSpendStatus(event.player)
    if (st && st.seasonCap > 0 && st.spentSeason >= st.seasonCap * 0.85) {
        event.player.tell('§6[Economía] §7Casi llegas a tu límite de gasto acumulado (' +
            cevToGoldEquiv(st.spentSeason) + '/' + cevToGoldEquiv(st.seasonCap) + ' oro).')
    }
})

function econFindPlayerByName(server, name) {
    if (!server || !name) return null
    var want = String(name).toLowerCase()
    var found = null
    try {
        server.players.forEach(function (p) {
            if (found) return
            var pn = ''
            try { pn = String(p.username) } catch (e1) {}
            if (!pn) try { pn = String(p.name) } catch (e2) {}
            if (pn && pn.toLowerCase() === want) found = p
        })
    } catch (e) {}
    return found
}

/** Nodo Brigadier `econ` — se engancha a /arkcraft y a /econ */
function buildArkcraftEconCommands(Commands, Arguments, event) {
    var JavaString = Java.loadClass('java.lang.String')
    var JavaInteger = Java.loadClass('java.lang.Integer')

    function getStr(ctx, name) {
        return String(ctx.getArgument(name, JavaString))
    }

    function getInt(ctx, name) {
        return ctx.getArgument(name, JavaInteger).intValue()
    }

    function runStatus(ctx) {
        var p = ctx.source.player
        if (!p) {
            ctx.source.sendFailure(Text.literal('§cSolo jugadores.'))
            return 0
        }
        loadEconState(ctx.source.getServer())
        ctx.source.sendSuccess(Text.literal(statusText(p)), false)
        return 1
    }

    return Commands.literal('econ')
        .executes(runStatus)
        .then(Commands.literal('status').executes(runStatus))
        .then(
            Commands.literal('recalc')
                .requires(function (s) { return s.hasPermission(2) })
                .executes(function (ctx) {
                    var p = ctx.source.player
                    if (!p) { ctx.source.sendFailure(Text.literal('§cSolo jugadores.')); return 0 }
                    loadEconState(ctx.source.getServer())
                    var uuid = uuidKey(p)
                    var total = 0
                    if (typeof ArkcraftTributes !== 'undefined' && ArkcraftTributes.sumOwnedTributes) {
                        total = ArkcraftTributes.sumOwnedTributes(uuid)
                    }
                    var rec = ensurePlayerRecord(uuid, p)
                    rec.spentSeasonCev = total
                    rec.spentTodayCev = total
                    syncPlayerPersistent(p, rec)
                    markEconDirty()
                    saveEconState(ctx.source.getServer())
                    ctx.source.sendSuccess(Text.literal('§aGasto recalculado: hoy y temporada = §f' + cevToGoldEquiv(total) +
                        ' oro§a (suma de tus mejoras actuales).'), true)
                    return 1
                })
        )
        .then(
            Commands.literal('resetcap')
                .requires(function (s) { return s.hasPermission(2) })
                .executes(function (ctx) {
                    loadEconState(ctx.source.getServer())
                    var msg = opResetSpendToday(ctx.source.getServer(), null)
                    ctx.source.sendSuccess(Text.literal(msg), true)
                    return 1
                })
                .then(
                    Commands.argument('jugador', Arguments.STRING.create(event))
                        .executes(function (ctx) {
                            loadEconState(ctx.source.getServer())
                            var target = econFindPlayerByName(ctx.source.getServer(), getStr(ctx, 'jugador'))
                            if (!target) {
                                ctx.source.sendFailure(Text.literal('§cJugador no conectado.'))
                                return 0
                            }
                            var msg = opResetSpendToday(ctx.source.getServer(), target)
                            ctx.source.sendSuccess(Text.literal(msg), true)
                            return 1
                        })
                )
        )
        .then(
            Commands.literal('resetday')
                .requires(function (s) { return s.hasPermission(2) })
                .executes(function (ctx) {
                    loadEconState(ctx.source.getServer())
                    advanceServerDay(ctx.source.getServer())
                    ctx.source.sendSuccess(Text.literal(
                        '§aNuevo día temporada §f' + getServerDay() + '§a — caps de gasto reiniciados.'
                    ), true)
                    return 1
                })
        )
        .then(
            Commands.literal('setday')
                .requires(function (s) { return s.hasPermission(2) })
                .then(
                    Commands.argument('day', Arguments.INTEGER.create(event))
                        .executes(function (ctx) {
                            loadEconState(ctx.source.getServer())
                            var msg = opSetServerDay(ctx.source.getServer(), getInt(ctx, 'day'))
                            ctx.source.sendSuccess(Text.literal(msg), true)
                            return 1
                        })
                )
        )
        .then(
            Commands.literal('addspend')
                .requires(function (s) { return s.hasPermission(2) })
                .then(
                    Commands.argument('cev', Arguments.INTEGER.create(event))
                        .executes(function (ctx) {
                            var p = ctx.source.player
                            if (!p) return 0
                            loadEconState(ctx.source.getServer())
                            recordSpendCev(p, getInt(ctx, 'cev'), 'test')
                            saveEconState(ctx.source.getServer())
                            ctx.source.sendSuccess(Text.literal('§a Gasto de prueba registrado.'), true)
                            return 1
                        })
                )
        )
}

ServerEvents.commandRegistry(function (event) {
    var Commands = event.commands
    var Arguments = event.arguments
    var econTree = buildArkcraftEconCommands(Commands, Arguments, event)

    // Raíz propia (siempre funciona)
    event.register(econTree)

    // Mismo árbol bajo /arkcraft (un solo register en expansion_debug.js)
    if (typeof buildArkcraftEconCommands !== 'undefined') {
        // expuesto global para expansion_debug
    }
})

// Global para expansion_debug.js (un solo Commands.literal('arkcraft'))
var registerArkcraftEconUnderArkcraft = buildArkcraftEconCommands

// API global (Rhino) — war.js y research_spend_cap.js
var ArkcraftEconomy = {
    coinIdToCev: coinIdToCev,
    cevToGoldEquiv: cevToGoldEquiv,
    dailySpendCapCev: dailySpendCapCev,
    expectedCumulativeCap: expectedCumulativeCap,
    getCatchupMultiplier: getCatchupMultiplier,
    getServerDay: getServerDay,
    getSpendStatus: getSpendStatus,
    canSpendCev: canSpendCev,
    recordSpendCev: recordSpendCev,
    refundSpendCev: refundSpendCev,
    recordWarWinAttacker: recordWarWinAttacker,
    canColonyDeclareWar: canColonyDeclareWar,
    recordColonyDeclare: recordColonyDeclare,
    isResearchCharged: isResearchCharged,
    markResearchCharged: markResearchCharged,
    unmarkResearchCharged: unmarkResearchCharged,
    clearColonyResearchCharged: clearColonyResearchCharged,
    loadState: loadEconState,
    saveState: saveEconState,
    MONUMENT_SPEND_CEV: ECON_MONUMENT_SPEND_CEV
}

console.info('[ArkcraftEcon] Comandos: /econ y /arkcraft econ — cap GASTO')

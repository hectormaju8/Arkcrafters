// ============================================================
// ARKCRAFT — Cap gasto: tributos Universidad (MineColonies)
// Detecta investigación iniciada/completada y registra CEV gastado
// ============================================================

var RscIMinecoloniesAPI = null
var RscIGlobalResearchTree = null
var RscResourceLocation = null
var RscResearchState = null
var RscItemStack = null

try { RscIMinecoloniesAPI = Java.loadClass('com.minecolonies.api.IMinecoloniesAPI') } catch (e0) {}
try { RscIGlobalResearchTree = Java.loadClass('com.minecolonies.api.research.IGlobalResearchTree') } catch (e1) {}
try { RscResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation') } catch (e2) {}
try { RscResearchState = Java.loadClass('com.minecolonies.api.research.util.ResearchState') } catch (e3) {}
try { RscItemStack = Java.loadClass('net.minecraft.world.item.ItemStack') } catch (e4) {}

var RSC_NS = 'arkcraft'
var RSC_BRANCHES = ['arkcraft:expansion', 'arkcraft:recursos', 'arkcraft:constructor']
var rscResearchIndex = []
var rscColonyState = {}
var rscTickAcc = 0
var RSC_DEBUG = false // diagnóstico (poner true para volcar estado cada ~10s y los 'revert via ...')
var rscDumpedApi = false // volcado único de métodos del árbol de investigación

function rscEcon() {
    return typeof ArkcraftEconomy !== 'undefined' ? ArkcraftEconomy : null
}

function rscParseResearchId(fullId) {
    var s = String(fullId)
    if (s.indexOf(':') < 0) return null
    var parts = s.split(':')
    if (parts[0] !== RSC_NS) return null
    var rest = parts[1]
    var slash = rest.indexOf('/')
    if (slash < 0) return null
    return { branch: RSC_NS + ':' + rest.substring(0, slash), name: rest.substring(slash + 1), key: rest }
}

// (obsoleto) Construcción por archivo deshabilitada: KubeJS bloquea java.io.File.
// El índice ahora es hardcoded (ver RSC_TRIBUTE_CEV / rscBuildIndex).

// CEV de cada tributo (rebalance v3). Hardcoded: la API GlobalResearchTree no expone getBranch
// y KubeJS bloquea java.io.File, así que ni la API ni el fallback JSON funcionan en runtime.
// Si cambias costes en kubejs/data/arkcraft/researches/**, actualiza esta tabla.
var RSC_TRIBUTE_CEV = [
    ['expansion', 'townhall2', 1500], ['expansion', 'townhall3', 3600], ['expansion', 'townhall4', 9000], ['expansion', 'townhall5', 21000],
    ['expansion', 'university2', 1200], ['expansion', 'university3', 2800], ['expansion', 'university4', 6800], ['expansion', 'university5', 16000],
    ['expansion', 'warehouse2', 1000], ['expansion', 'warehouse3', 2400], ['expansion', 'warehouse4', 6000], ['expansion', 'warehouse5', 14000],
    ['constructor', 'builder2', 1300], ['constructor', 'builder3', 3100], ['constructor', 'builder4', 7800], ['constructor', 'builder5', 18000],
    ['recursos', 'miner2', 1000], ['recursos', 'miner3', 2300], ['recursos', 'miner4', 5600], ['recursos', 'miner5', 13000],
    ['recursos', 'lumberjack2', 800], ['recursos', 'lumberjack3', 1900], ['recursos', 'lumberjack4', 4800], ['recursos', 'lumberjack5', 11000],
    ['recursos', 'farmer2', 800], ['recursos', 'farmer3', 1900], ['recursos', 'farmer4', 4800], ['recursos', 'farmer5', 11000],
    ['recursos', 'fisherman2', 800], ['recursos', 'fisherman3', 1800], ['recursos', 'fisherman4', 4400], ['recursos', 'fisherman5', 10000]
]

function rscBuildIndex(server) {
    rscResearchIndex = []
    for (var i = 0; i < RSC_TRIBUTE_CEV.length; i++) {
        var sub = RSC_TRIBUTE_CEV[i][0]
        var nm = RSC_TRIBUTE_CEV[i][1]
        var cev = RSC_TRIBUTE_CEV[i][2]
        rscResearchIndex.push({
            branch: RSC_NS + ':' + sub,
            name: nm,
            key: sub + '/' + nm,
            fullId: RSC_NS + ':' + sub + '/' + nm,
            cev: cev
        })
    }
    console.info('[ArkcraftEcon] Indice tributos MC (hardcoded): ' + rscResearchIndex.length + ' investigaciones con coste')
}

function rscStateName(state) {
    if (!state) return 'NONE'
    try { return String(state.name()) } catch (e1) {}
    try { return String(state) } catch (e2) {}
    return 'UNKNOWN'
}

function rscIsActiveState(state) {
    var n = rscStateName(state)
    return n === 'IN_PROGRESS' || n === 'FINISHED' || n === 'RESEARCHED'
}

// Datos del dueño de la colonia (uuid y/o nombre), probando varios métodos de MineColonies.
function rscColonyOwnerInfo(colony) {
    var info = { uuid: null, name: null }
    try {
        var perms = colony.getPermissions()
        if (perms) {
            try { if (perms.getOwnerUUID) info.uuid = perms.getOwnerUUID() } catch (e1) {}
            try { if (perms.getOwner) info.name = perms.getOwner() } catch (e2) {}
        }
    } catch (e) {}
    try { if (!info.name && colony.getOwner) info.name = colony.getOwner() } catch (e3) {}
    return info
}

// Devuelve el JUGADOR KUBEJS online dueño de la colonia (o null). Usa server.players (no getPlayerList).
function rscFindOnlineOwner(server, colony) {
    if (!colony || !server) return null
    var players = null
    try { players = server.players } catch (eP) { return null }
    if (!players) return null
    var info = rscColonyOwnerInfo(colony)
    // OJO: en esta versión getOwnerUUID()=null y getOwner() devuelve el UUID (no el nombre).
    // Por eso comparamos cada identificador contra el UUID **y** el nombre del jugador.
    var wantA = info.uuid ? String(info.uuid).toLowerCase() : null
    var wantB = info.name ? String(info.name).toLowerCase() : null
    var size = players.size()
    for (var i = 0; i < size; i++) {
        var p = players.get(i)
        if (!p) continue
        var pu = null, pn = null
        try { pu = String(p.uuid).toLowerCase() } catch (eu) {}
        try { pn = String(p.username).toLowerCase() } catch (en) {}
        if (wantA && (pu === wantA || pn === wantA)) return p
        if (wantB && (pu === wantB || pn === wantB)) return p
    }
    // Fallback: jugadores a los que la colonia envía mensajes (incluye al dueño online)
    try {
        var msgs = colony.getMessagePlayerEntities ? colony.getMessagePlayerEntities() : null
        if (msgs && msgs.size && msgs.size() > 0) {
            var mpu = String(msgs.get(0).getUUID())
            for (var j = 0; j < size; j++) {
                var q = players.get(j)
                try { if (q && String(q.uuid) === mpu) return q } catch (eq) {}
            }
        }
    } catch (em) {}
    return null
}

function rscRefundCosts(player, researchDef) {
    if (!player || !researchDef) return
    try {
        var tree = RscIGlobalResearchTree.getInstance()
        var res = tree.getResearch(RscResourceLocation.parse(researchDef.fullId))
        if (!res) return
        var costs = res.getCostList()
        if (!costs) return
        var iter = costs.iterator()
        while (iter.hasNext()) {
            var cost = iter.next()
            var st = cost.getItemStack()
            if (!st || st.isEmpty()) continue
            player.give(Item.of(String(st.getItem().builtInRegistryHolder().key().location()), st.getCount()))
        }
    } catch (eRef) {
        console.warn('[ArkcraftEcon] refund: ' + eRef)
    }
}

// Revierte/quita una investigación. La reflexión está bloqueada, así que SONDEAMOS muchos nombres:
// llamar a un método inexistente lanza (lo capturamos); el que exista, ejecuta. El log dice cuál.
// Quita una investigación del árbol. Métodos reales (del bytecode de MineColonies 1.1.1319):
//   ILocalResearchTree.removeResearch(ILocalResearch)  ← objeto, NO el ResourceLocation
//   ILocalResearchTree.attemptResetResearch(Player, IColony, ILocalResearch)  ← "deshacer" de la GUI
function rscRevertResearch(colony, researchDef, localTree, player) {
    var branch, rid
    try {
        branch = RscResourceLocation.parse(researchDef.branch)
        rid = RscResourceLocation.parse(researchDef.fullId)
    } catch (eP) { return }
    var rm = null
    try { rm = colony.getResearchManager() } catch (e) {}
    var tree = localTree
    var lr = null
    try { lr = tree.getResearch(branch, rid) } catch (eL) {}

    if (!lr) return
    var done = ''

    // attemptResetResearch solo actúa sobre investigaciones INICIADAS. Si está NOT_STARTED (fantasma),
    // la promovemos a IN_PROGRESS para que el reset la pueda quitar.
    try {
        if (rscStateName(lr.getState()) === 'NOT_STARTED' && RscResearchState) lr.setState(RscResearchState.IN_PROGRESS)
    } catch (eSt) {}

    // Quitar por objeto (si existiera) y luego el "deshacer" oficial (gratis tras vaciar researchresetcost).
    try { tree.removeResearch(lr); done = 'removeResearch(lr)' } catch (e1) {}
    if (!done && player) {
        try { tree.attemptResetResearch(player, colony, lr); done = 'attemptResetResearch(player)' } catch (e2) {}
        if (!done && player.getEntity) try { tree.attemptResetResearch(player.getEntity(), colony, lr); done = 'attemptResetResearch(entity)' } catch (e3) {}
    }

    // ¿Se quitó de verdad? Si no, dejarla NOT_STARTED (no IN_PROGRESS colgada).
    var stillThere = true
    try { stillThere = !!tree.getResearch(branch, rid) } catch (eV) {}
    if (stillThere) {
        try { if (RscResearchState) { lr.setState(RscResearchState.NOT_STARTED); lr.setProgress(0) } } catch (e4) {}
    }

    try { if (rm) rm.markDirty() } catch (eM) {}
    try { colony.markDirty() } catch (eC) {}
    if (RSC_DEBUG) console.info('[ArkcraftEcon][dbg] revert ' + researchDef.key + ' via ' + (done || 'NADA') + ' stillThere=' + stillThere)
}

// Devuelve monedas equivalentes a `cev` (MineColonies no reembolsa al cancelar).
var RSC_COIN_DENOMS = [
    [10000, 'lightmanscurrency:coin_diamond'],
    [1000, 'lightmanscurrency:coin_emerald'],
    [100, 'lightmanscurrency:coin_gold'],
    [10, 'lightmanscurrency:coin_iron'],
    [1, 'lightmanscurrency:coin_copper']
]
function rscGiveCoinsForCev(player, cev) {
    if (!player || !cev || cev <= 0) return
    var remaining = cev
    for (var i = 0; i < RSC_COIN_DENOMS.length; i++) {
        var val = RSC_COIN_DENOMS[i][0]
        var n = Math.floor(remaining / val)
        if (n > 0) {
            try { player.give(Item.of(RSC_COIN_DENOMS[i][1], n)) } catch (eGive) {}
            remaining -= n * val
        }
    }
}

function rscKubePlayer(mcPlayer, server) {
    if (!mcPlayer || !server) return null
    try {
        var list = server.players
        for (var i = 0; i < list.size(); i++) {
            var p = list.get(i)
            if (p && p.uuid && String(p.uuid) === String(mcPlayer.getUUID())) return p
        }
    } catch (e) {}
    return null
}

function rscProcessColony(server, colony) {
    var econ = rscEcon()
    if (!econ || !colony) return
    var colonyId = colony.getID()
    var localTree = null
    try { localTree = colony.getResearchManager().getResearchTree() } catch (eLT) {
        if (RSC_DEBUG && rscTickAcc % 200 === 0) console.warn('[ArkcraftEcon][dbg] col ' + colonyId + ' getResearchTree err: ' + eLT)
        return
    }
    if (!localTree) return
    var snapKey = String(colonyId)
    if (!rscColonyState[snapKey]) rscColonyState[snapKey] = {}


    // --- Regularización (grandfather) UNA vez por colonia: lo ya construido antes NO se cobra ---
    var seedKey = '__seeded_v1__'
    if (!econ.isResearchCharged(colonyId, seedKey)) {
        var seedOwner = rscFindOnlineOwner(server, colony)
        if (!seedOwner) return // esperar a que el dueño esté online para regularizar
        if (econ.clearColonyResearchCharged) econ.clearColonyResearchCharged(colonyId)
        var seeded = 0
        for (var s = 0; s < rscResearchIndex.length; s++) {
            var sdef = rscResearchIndex[s]
            var sl = null
            try { sl = localTree.getResearch(RscResourceLocation.parse(sdef.branch), RscResourceLocation.parse(sdef.fullId)) } catch (eSeed) {}
            if (sl && rscIsActiveState(sl.getState())) {
                econ.markResearchCharged(colonyId, sdef.key)
                rscColonyState[snapKey][sdef.key] = rscStateName(sl.getState())
                seeded++
            }
        }
        econ.markResearchCharged(colonyId, seedKey)
        econ.saveState(server)
        console.info('[ArkcraftEcon] Colonia ' + colonyId + ' regularizada: ' + seeded + ' investigaciones previas marcadas (no se cobran).')
        return
    }

    var doDbg = RSC_DEBUG && (rscTickAcc % 200 === 0)
    var dbgFound = 0
    var dbgActive = []
    if (doDbg) {
        try {
            var ip = localTree.getResearchInProgress()
            var ipList = []
            if (ip) { var it2 = ip.iterator(); while (it2.hasNext()) { var rr = it2.next(); ipList.push(String(rr.getId ? rr.getId() : rr)) } }
            console.info('[ArkcraftEcon][dbg] col ' + colonyId + ' inProgress=[' + ipList.join(', ') + ']')
        } catch (eIp) {
            console.warn('[ArkcraftEcon][dbg] getResearchInProgress no disponible: ' + eIp)
        }
    }

    for (var i = 0; i < rscResearchIndex.length; i++) {
        var def = rscResearchIndex[i]
        var branch = RscResourceLocation.parse(def.branch)
        var rid = RscResourceLocation.parse(def.fullId)
        var stateKey = def.key
        var prev = rscColonyState[snapKey][stateKey]
        var local = null
        try { local = localTree.getResearch(branch, rid) } catch (eGr) {}

        if (!local) {
            // Cancelada: MineColonies la QUITA del árbol. SOLO reembolsamos si estaba a medio investigar
            // (IN_PROGRESS, no terminada) y sin tier superior activo. Así no se explota cancelar lo ya
            // construido (te quedas el edificio) ni un tier bajo teniendo el alto.
            if (econ.isResearchCharged(colonyId, stateKey) && prev === 'IN_PROGRESS' && !rscHasHigherTierActive(localTree, def)) {
                var kPc = rscFindOnlineOwner(server, colony)
                if (!kPc) continue // dueño offline: reintentar el reembolso
                econ.refundSpendCev(kPc, def.cev, 'tributo cancelado')
                rscGiveCoinsForCev(kPc, def.cev) // MineColonies no devuelve las monedas al cancelar
                econ.unmarkResearchCharged(colonyId, stateKey)
                econ.saveState(server)
            }
            // En cualquier caso, ya no está en el árbol: actualizar snapshot (sigue 'charged' si no reembolsamos).
            if (prev) rscColonyState[snapKey][stateKey] = 'NONE'
            continue
        }
        dbgFound++

        var state = local.getState()
        var curName = rscStateName(state)
        var activeNow = rscIsActiveState(state)
        var activePrev = prev && rscIsActiveStateByName(prev)
        if (activeNow) dbgActive.push(stateKey + '=' + curName + (econ.isResearchCharged(colonyId, stateKey) ? '#charged' : ''))

        // --- Fantasma de un revert antiguo: NOT_STARTED dentro del árbol (lo normal es no estar).
        // Lo quitamos para desbloquear el botón de la GUI; salvo que esté grandfathered (regularizado).
        if (curName === 'NOT_STARTED' && !econ.isResearchCharged(colonyId, stateKey)) {
            if (prev !== 'GHOST_CLEANED') {
                rscRevertResearch(colony, def, localTree, rscFindOnlineOwner(server, colony))
                rscColonyState[snapKey][stateKey] = 'GHOST_CLEANED' // intentado una vez (evita spam si MC no lo quita)
            }
            continue
        }

        // --- Transición a ACTIVO: el jugador inició/completó el tributo -> cobrar ---
        if (activeNow && !activePrev) {
            if (econ.isResearchCharged(colonyId, stateKey)) {
                rscColonyState[snapKey][stateKey] = curName
                continue
            }
            var kubeP = rscFindOnlineOwner(server, colony)
            if (!kubeP) continue // dueño offline: reintentar (no fijamos snapshot)

            var chk = econ.canSpendCev(kubeP, def.cev)
            if (!chk.ok) {
                // Over cap: revertir + devolver monedas POR VALOR (rscRefundCosts falla: el coste es Ingredient).
                // NO marcar cobrado (puede reintentar al resetear).
                rscRevertResearch(colony, def, localTree, kubeP)
                rscGiveCoinsForCev(kubeP, def.cev)
                kubeP.tell('§6[Economía] §cLlegaste a tu límite de gasto de hoy — tributo cancelado y §amonedas devueltas§c. §7Inténtalo mañana (se reinicia ~06:00).')
                // Fijar snapshot al estado actual evita re-disparar el reembolso en bucle si el revert tarda.
                rscColonyState[snapKey][stateKey] = curName
                continue
            }
            if (econ.recordSpendCev(kubeP, def.cev, 'tributo')) {
                econ.markResearchCharged(colonyId, stateKey)
                econ.saveState(server)
            }
            rscColonyState[snapKey][stateKey] = curName
            continue
        }

        // --- Transición a NO ACTIVO: tributo cancelado/revertido -> reembolsar cap si estaba cobrado ---
        if (!activeNow && activePrev && econ.isResearchCharged(colonyId, stateKey)) {
            // Solo reembolsar si estaba IN_PROGRESS (no terminada) y sin tier superior activo.
            if (prev === 'IN_PROGRESS' && !rscHasHigherTierActive(localTree, def)) {
                var kP = rscFindOnlineOwner(server, colony)
                if (!kP) continue // dueño offline: reintentar reembolso cuando entre
                econ.refundSpendCev(kP, def.cev, 'tributo cancelado')
                rscGiveCoinsForCev(kP, def.cev) // MineColonies no devuelve las monedas al cancelar
                econ.unmarkResearchCharged(colonyId, stateKey)
                econ.saveState(server)
            }
            rscColonyState[snapKey][stateKey] = curName
            continue
        }

        rscColonyState[snapKey][stateKey] = curName
    }

    // Hito Metropolis: los 8 edificios clave a nivel 5 (todos los *5 terminados)
    if (rscTickAcc % 200 === 0) {
        try {
            var nv5 = ['expansion/townhall5', 'expansion/university5', 'expansion/warehouse5', 'constructor/builder5', 'recursos/miner5', 'recursos/lumberjack5', 'recursos/farmer5', 'recursos/fisherman5']
            var done5 = 0
            for (var m5 = 0; m5 < nv5.length; m5++) {
                var sub5 = nv5[m5].split('/')[0]
                var lr5 = null
                try { lr5 = localTree.getResearch(RscResourceLocation.parse('arkcraft:' + sub5), RscResourceLocation.parse('arkcraft:' + nv5[m5])) } catch (e5) {}
                if (lr5 && rscStateName(lr5.getState()) === 'FINISHED') done5++
            }
            if (done5 >= 8) {
                var mp = rscFindOnlineOwner(server, colony)
                if (mp) mp.runCommandSilent('advancement grant @s only arkcraft:hitos/metropolis')
            }
        } catch (eMp) {}
    }

    if (doDbg) {
        var dbgOwner = rscFindOnlineOwner(server, colony)
        var ownerName = 'NULL'
        try { ownerName = dbgOwner ? String(dbgOwner.username) : 'NULL' } catch (eU) { ownerName = '?' }
        var oi = rscColonyOwnerInfo(colony)
        console.info('[ArkcraftEcon][dbg] col ' + colonyId + ' found=' + dbgFound + '/' + rscResearchIndex.length +
            ' activos=[' + dbgActive.join(', ') + '] owner=' + ownerName + ' (ownerUuid=' + oi.uuid + ' ownerName=' + oi.name + ')')
    }
}

function rscIsActiveStateByName(name) {
    return name === 'IN_PROGRESS' || name === 'FINISHED' || name === 'RESEARCHED'
}

// ¿Hay un tier SUPERIOR del mismo edificio activo? (p. ej. cancelas townhall2 pero townhall3/4/5 siguen).
// Evita el exploit de reembolsar un tier bajo conservando el alto.
function rscHasHigherTierActive(localTree, def) {
    var m = String(def.name).match(/^(.*?)(\d+)$/)
    if (!m) return false
    var base = m[1]
    var tier = parseInt(m[2], 10)
    for (var t = tier + 1; t <= 5; t++) {
        var fid = def.branch + '/' + base + t
        var lr = null
        try { lr = localTree.getResearch(RscResourceLocation.parse(def.branch), RscResourceLocation.parse(fid)) } catch (e) {}
        if (lr && rscIsActiveState(lr.getState())) return true
    }
    return false
}

// Suma el CEV de todas las investigaciones FINISHED/IN_PROGRESS en las colonias del jugador (uuid).
// Usado por /econ recalc para sincronizar "gasto temporada" = lo realmente mejorado.
function rscSumOwnedTributes(playerUuid) {
    var total = 0
    if (!RscIMinecoloniesAPI || !playerUuid) return 0
    var want = String(playerUuid).toLowerCase()
    try {
        var iter = RscIMinecoloniesAPI.getInstance().getColonyManager().getAllColonies().iterator()
        while (iter.hasNext()) {
            var colony = iter.next()
            var info = rscColonyOwnerInfo(colony)
            var oid = (info.uuid ? String(info.uuid) : (info.name ? String(info.name) : '')).toLowerCase()
            if (oid !== want) continue
            var localTree = null
            try { localTree = colony.getResearchManager().getResearchTree() } catch (eT) { continue }
            if (!localTree) continue
            for (var i = 0; i < rscResearchIndex.length; i++) {
                var def = rscResearchIndex[i]
                var local = null
                try { local = localTree.getResearch(RscResourceLocation.parse(def.branch), RscResourceLocation.parse(def.fullId)) } catch (eG) {}
                if (local && rscIsActiveState(local.getState())) total += def.cev
            }
        }
    } catch (e) {
        console.warn('[ArkcraftEcon] recalc: ' + e)
    }
    return total
}

// Expuesto para /econ recalc (Rhino: variable global compartida entre server_scripts).
var ArkcraftTributes = { sumOwnedTributes: rscSumOwnedTributes }

ServerEvents.loaded(function (event) {
    if (!RscIMinecoloniesAPI) {
        console.warn('[ArkcraftEcon] MineColonies API no disponible — sin cap tributos')
        return
    }
    if (rscEcon()) rscEcon().loadState(event.server)
    rscBuildIndex(event.server)
})

ServerEvents.tick(function (event) {
    if (!RscIMinecoloniesAPI || rscResearchIndex.length === 0) return
    rscTickAcc++
    if (rscTickAcc % 10 !== 0) return // cada ~0,5 s: reversión por cap casi instantánea
    var srv = event.server
    try {
        var iter = RscIMinecoloniesAPI.getInstance().getColonyManager().getAllColonies().iterator()
        var nCol = 0
        while (iter.hasNext()) { nCol++; rscProcessColony(srv, iter.next()) }
        if (RSC_DEBUG && rscTickAcc % 200 === 0) console.info('[ArkcraftEcon][dbg] colonias iteradas=' + nCol)
    } catch (eTick) {
        if (rscTickAcc % 200 === 0) console.warn('[ArkcraftEcon] tick tributos: ' + eTick)
    }
})

// Construir el índice a nivel de script: ServerEvents.loaded NO se dispara con /reload,
// así el índice (hardcoded, no necesita servidor) queda listo en cada recarga de scripts.
rscBuildIndex(null)

console.info('[ArkcraftEcon] Monitor tributos Universidad activo')

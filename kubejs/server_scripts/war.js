// ============================================================
// ARKCRAFT — Guerra de colonias (captura de edificios)
// ============================================================

var WAR_RADIUS            = 100
var WAR_PREP_TICKS        = 20 * 60 * 30   // 30 min
var WAR_ASSAULT_TICKS     = 20 * 60 * 10   // 10 min
var WAR_DECLARE_COST      = 40   // Temporada 30d — 4k CEV gasto (cap economía)
var WAR_MAX_DECLARES_PER_WEEK = 3
var WAR_CAPTURE_COUNT     = 4
var WAR_MIN_BUILDINGS     = 4
var WAR_CAPTURE_RADIUS    = 15
var WAR_CAPTURE_MAX       = 1000          // granularidad barra captura
var WAR_CAPTURE_RATE      = 2             // +2 por tick (~20/s) ≈ 50 s en zona
var WAR_BOSSBAR_TIME      = 'arkcraft:war_time'
var WAR_BOSSBAR_SITES     = 'arkcraft:war_sites'
var WAR_BOSSBAR_CAPTURE   = 'arkcraft:war_capture'
var WAR_JM_LEGACY         = 'War-Cap'
var WAR_JM_WAYPOINT_ATK   = 'CAPTURA'
var WAR_JM_WAYPOINT_DEF   = 'DEFIENDE'
var WAR_JM_COLOR_ATK      = 'red'
var WAR_JM_COLOR_DEF      = 'green'
var WAR_GUARD_AGGRO_TICKS = 5
var WAR_GUARD_HELP_RANGE  = 160
var WAR_GUARD_HELP_COOLDOWN = 40
var WAR_ATTACKER_LIVES      = 5
var WAR_RESPAWN_BORDER_VAR  = 20   // ± bloques respecto al borde (radio colonia)

var COIN_GOLD             = 'lightmanscurrency:coin_gold'
var COIN_EMERALD          = 'lightmanscurrency:coin_emerald'
var WAR_GUARD_DAMAGE_MULT = 0.5

var WarHeightmapTypes = null
try {
    WarHeightmapTypes = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')
} catch (hmErr) {
    console.warn('[War] Heightmap types no disponible')
}

var WarMinecoloniesAPI = null
var WarResourceLocation = null
var WarAbstractJobGuard = null
try {
    WarMinecoloniesAPI = Java.loadClass('com.minecolonies.api.IMinecoloniesAPI')
} catch (warApiErr) {
    console.warn('[War] MineColonies API no disponible')
}
try {
    WarResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
} catch (rlErr) {
    console.warn('[War] ResourceLocation no disponible')
}
try {
    WarAbstractJobGuard = Java.loadClass('com.minecolonies.core.colony.jobs.AbstractJobGuard')
} catch (guardErr) {
    console.warn('[War] AbstractJobGuard no disponible — deteccion de guardias limitada')
}
var WarAction = null
try {
    WarAction = Java.loadClass('com.minecolonies.api.colony.permissions.Action')
} catch (warActErr) {
    console.warn('[War] Action API no disponible — comer en guerra limitado')
}

var activeWar = null
var warTicks  = 0
var warTestRadius = 0
var warTestFast   = false
var warTestCaptureFast = false

function effectiveWarRadius() {
    return warTestRadius > 0 ? warTestRadius : WAR_RADIUS
}

function effectiveCaptureRate() {
    return warTestCaptureFast ? 20 : WAR_CAPTURE_RATE
}

function effectivePrepTicks() {
    return warTestFast ? 20 * 10 : WAR_PREP_TICKS
}

function warEcon() {
    return typeof ArkcraftEconomy !== 'undefined' ? ArkcraftEconomy : null
}

function effectiveAssaultTicks() {
    return warTestFast ? 20 * 60 : WAR_ASSAULT_TICKS
}

// Minutos reales de cada fase (siempre correctos aunque cambien las constantes). 1200 ticks = 1 min.
function prepMins() { return Math.max(1, Math.round(effectivePrepTicks() / 1200)) }
function assaultMins() { return Math.max(1, Math.round(effectiveAssaultTicks() / 1200)) }

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
function getColonyManager() {
    if (!WarMinecoloniesAPI) return null
    return WarMinecoloniesAPI.getInstance().getColonyManager()
}

function toMcPlayer(player) {
    if (!player) return null
    try {
        if (player.getEntity) return player.getEntity()
    } catch (e0) {}
    return player
}

function getPlayerLevel(player) {
    var mcPlayer = toMcPlayer(player)
    if (!mcPlayer) return null
    try { return mcPlayer.level() } catch (e1) {}
    try { return mcPlayer.level } catch (e2) {}
    return null
}

function playerName(player) {
    try { return String(player.username) } catch (e1) {}
    try { return String(player.name) } catch (e2) {}
    try { return String(player.name.string) } catch (e3) {}
    try {
        var mc = toMcPlayer(player)
        if (mc && mc.getName) return String(mc.getName().getString())
    } catch (e4) {}
    try {
        var mc2 = toMcPlayer(player)
        if (mc2 && mc2.getGameProfile) return String(mc2.getGameProfile().getName())
    } catch (e5) {}
    return ''
}

function putPlayerPersistent(player, key, value, kind) {
    kind = kind || 'bool'
    var mc = toMcPlayer(player)
    try {
        if (player && player.persistentData) {
            if (kind === 'double') player.persistentData.putDouble(key, value)
            else player.persistentData.putBoolean(key, value)
        }
    } catch (e0) {}
    if (!mc || !mc.getPersistentData) return
    try {
        var pd = mc.getPersistentData()
        if (kind === 'double') pd.putDouble(key, value)
        else pd.putBoolean(key, value)
    } catch (e1) {}
}

function tellPlayer(player, msg) {
    try {
        if (player && player.tell) {
            player.tell(msg)
            return
        }
    } catch (e0) {}
    var mc = toMcPlayer(player)
    if (!mc) return
    try {
        var Comp = Java.loadClass('net.minecraft.network.chat.Component')
        mc.sendSystemMessage(Comp.literal(String(msg)))
    } catch (e1) {}
}

function namesMatch(a, b) {
    if (!a || !b) return false
    return String(a).toLowerCase() === String(b).toLowerCase()
}

function findPlayer(server, name) {
    if (!server || !name) return null
    var want = String(name).toLowerCase()
    var target = null
    try {
        server.players.forEach(function(p) {
            if (target) return
            if (playerName(p).toLowerCase() === want) target = p
        })
    } catch (e) {}
    return target
}

function distSqXZ(x1, z1, x2, z2) {
    var dx = x1 - x2
    var dz = z1 - z2
    return dx * dx + dz * dz
}

function countItem(player, itemId) {
    var total = 0
    player.inventory.allItems.forEach(function(stack) {
        if (stack.isEmpty()) return
        if (String(stack.id) === itemId) total += stack.count
    })
    return total
}

function removeItem(player, itemId, amount) {
    var left = amount
    player.inventory.allItems.forEach(function(stack) {
        if (left <= 0) return
        if (stack.isEmpty()) return
        if (String(stack.id) !== itemId) return
        var take = Math.min(left, stack.count)
        stack.shrink(take)
        left -= take
    })
    return left <= 0
}

function giveItem(player, itemId, amount) {
    if (amount <= 0) return
    player.give(Item.of(itemId, amount))
}

function getPlayerUuid(player) {
    var mcPlayer = toMcPlayer(player)
    if (!mcPlayer) return null
    try { return mcPlayer.getUUID() } catch (e1) {}
    try { return mcPlayer.uuid } catch (e2) {}
    return null
}

function getPlayerColony(player) {
    var manager = getColonyManager()
    var level = getPlayerLevel(player)
    var uuid = getPlayerUuid(player)
    if (!manager || !level || !uuid) return null
    try {
        // UUID evita ambiguedad Rhino: getIColonyByOwner(Level, Player) vs (Level, UUID)
        return manager.getIColonyByOwner(level, uuid)
    } catch (err) {
        console.warn('[War] getPlayerColony: ' + err)
        return null
    }
}

function getColonyWorld(colony) {
    if (!colony) return null
    try { return colony.getWorld() } catch (e1) {}
    try { return colony.getLevel() } catch (e2) {}
    return null
}

function getColonyByStoredId(srv, colonyId) {
    if (colonyId < 0) return null
    var manager = getColonyManager()
    if (!manager) return null
    try {
        var iter = manager.getAllColonies().iterator()
        while (iter.hasNext()) {
            var col = iter.next()
            if (col.getID() === colonyId) return col
        }
    } catch (err) {
        console.warn('[War] getColonyByStoredId: ' + err)
    }
    return null
}

function isSameUuid(a, b) {
    if (a == null || b == null) return false
    return String(a) === String(b)
}

function isColonyOwner(colony, player) {
    if (!colony || !player) return false
    try {
        return isSameUuid(colony.getPermissions().getOwner(), getPlayerUuid(player))
    } catch (e) {
        return false
    }
}

function applyColonyHostileToPlayer(colony, targetPlayer) {
    if (!colony || !targetPlayer) return false
    if (isColonyOwner(colony, targetPlayer)) return false
    try {
        var perms = colony.getPermissions()
        var hostile = perms.getRankHostile()
        var world = getColonyWorld(colony)
        var uuid = getPlayerUuid(targetPlayer)
        if (!hostile || !world || !uuid) return false
        if (isSameUuid(perms.getOwner(), uuid)) return false
        if (perms.setPlayerRank(uuid, hostile, world)) {
            colony.markDirty()
            return true
        }
    } catch (err) {
        console.warn('[War] applyColonyHostile: ' + err)
    }
    return false
}

function clearColonyWarIntruderRank(colony, targetPlayer) {
    if (!colony || !targetPlayer) return false
    if (isColonyOwner(colony, targetPlayer)) return false
    try {
        var perms = colony.getPermissions()
        var world = getColonyWorld(colony)
        var uuid = getPlayerUuid(targetPlayer)
        if (!world || !uuid) return false
        var rank = perms.getRank(uuid)
        if (!rank) return false
        var friend = perms.getRankFriend()
        var isFriend = friend && rank.getId() === friend.getId()
        if (!rank.isHostile() && !isFriend) return false
        if (perms.setPlayerRank(uuid, perms.getRankNeutral(), world)) {
            colony.markDirty()
            return true
        }
    } catch (err) {
        console.warn('[War] clearColonyWarIntruder: ' + err)
    }
    return false
}

function applyWarHostility(srv, war) {
    if (!war || war.sim) return

    var atkPlayer = findPlayer(srv, war.attackerName)
    var defPlayer = findPlayer(srv, war.defenderName)
    var defColony = getColonyByStoredId(srv, war.defenderColonyId)
    var atkColony = getColonyByStoredId(srv, war.attackerColonyId)
    if (!defColony && defPlayer) defColony = getPlayerColony(defPlayer)
    if (!atkColony && atkPlayer) atkColony = getPlayerColony(atkPlayer)

    // Hostil mutuo: guardias enemigos persiguen + guardias propios pueden cruzar pelea
    var atkOk = defColony && atkPlayer && applyColonyHostileToPlayer(defColony, atkPlayer)
    var defOk = atkColony && defPlayer && applyColonyHostileToPlayer(atkColony, defPlayer)
    war.hostilityApplied = atkOk || defOk

    // Solo avisamos si la hostilidad NO quedó bien (si todo OK, el tutorial ya explica las reglas).
    if (!atkOk && !defOk) {
        tellWarParticipants(srv, war, '§eAviso: si los guardias no atacan, activa §fHostil §een Permisos del Ayuntamiento.')
        console.warn('[War] Hostilidad no aplicada — revisar permisos')
    } else if (!(atkOk && defOk)) {
        console.warn('[War] Hostilidad parcial atk=' + atkOk + ' def=' + defOk)
    }
    enableWarIntruderPermissions(srv, war)
}

function applyWarIntruderPermissions(colony) {
    if (!colony || !WarAction) return false
    try {
        var perms = colony.getPermissions()
        var hostile = perms.getRankHostile()
        if (!hostile) return false
        // Hostil default no tiene RIGHTCLICK — bloquea comer; THROW_POTION bloquea pociones bebibles
        perms.setPermission(hostile, WarAction.RIGHTCLICK_BLOCK, true)
        perms.setPermission(hostile, WarAction.THROW_POTION, true)
        // Sin ATTACK_ENTITY MineColonies cancela golpes a jugadores (defensor); guardias/cuidadanos usan otra ruta
        perms.setPermission(hostile, WarAction.ATTACK_ENTITY, true)
        colony.markDirty()
        return true
    } catch (err) {
        console.warn('[War] applyWarIntruderPermissions: ' + err)
        return false
    }
}

function clearWarIntruderPermissions(colony) {
    if (!colony || !WarAction) return false
    try {
        var perms = colony.getPermissions()
        var hostile = perms.getRankHostile()
        if (!hostile) return false
        perms.setPermission(hostile, WarAction.RIGHTCLICK_BLOCK, false)
        perms.setPermission(hostile, WarAction.THROW_POTION, false)
        perms.setPermission(hostile, WarAction.ATTACK_ENTITY, false)
        colony.markDirty()
        return true
    } catch (err) {
        console.warn('[War] clearWarIntruderPermissions: ' + err)
        return false
    }
}

function enableWarIntruderPermissions(srv, war) {
    if (!war || war.sim) return
    war.intruderPermColonyIds = []
    var defColony = getColonyByStoredId(srv, war.defenderColonyId)
    var atkColony = getColonyByStoredId(srv, war.attackerColonyId)
    if (defColony && applyWarIntruderPermissions(defColony)) {
        war.intruderPermColonyIds.push(defColony.getID())
    }
    if (atkColony && applyWarIntruderPermissions(atkColony)) {
        war.intruderPermColonyIds.push(atkColony.getID())
    }
}

function clearWarIntruderPermissionsForWar(srv, war) {
    if (!war || !war.intruderPermColonyIds || !war.intruderPermColonyIds.length) return
    for (var i = 0; i < war.intruderPermColonyIds.length; i++) {
        var col = getColonyByStoredId(srv, war.intruderPermColonyIds[i])
        if (col) clearWarIntruderPermissions(col)
    }
    war.intruderPermColonyIds = []
}

function restoreAllColonyWarIntruderPermissions() {
    if (!getColonyManager() || !WarAction) return 0
    var n = 0
    try {
        var iter = getColonyManager().getAllColonies().iterator()
        while (iter.hasNext()) {
            if (clearWarIntruderPermissions(iter.next())) n++
        }
    } catch (err) {
        console.warn('[War] restoreAllColonyWarIntruderPermissions: ' + err)
    }
    return n
}

function clearWarHostility(srv, war) {
    if (!war || war.sim) return

    clearWarIntruderPermissionsForWar(srv, war)
    var atkPlayer = findPlayer(srv, war.attackerName)
    var defPlayer = findPlayer(srv, war.defenderName)
    var defColony = getColonyByStoredId(srv, war.defenderColonyId)
    var atkColony = getColonyByStoredId(srv, war.attackerColonyId)

    if (defColony && atkPlayer) clearColonyWarIntruderRank(defColony, atkPlayer)
    if (atkColony && defPlayer) clearColonyWarIntruderRank(atkColony, defPlayer)
    forceCleanupWarPair(srv, war.attackerName, war.defenderName)
}

function forceCleanupWarPair(srv, nameA, nameB) {
    if (!getColonyManager()) return 0
    var pA = findPlayer(srv, nameA)
    var pB = findPlayer(srv, nameB)
    var cleared = 0
    try {
        var iter = getColonyManager().getAllColonies().iterator()
        while (iter.hasNext()) {
            var col = iter.next()
            if (pA && clearColonyWarIntruderRank(col, pA)) cleared++
            if (pB && clearColonyWarIntruderRank(col, pB)) cleared++
        }
    } catch (err) {
        console.warn('[War] forceCleanupWarPair: ' + err)
    }
    return cleared
}

function colonyCenter(colony) {
    var center = colony.getCenter()
    return {
        x: center.getX(),
        y: center.getY(),
        z: center.getZ(),
        id: colony.getID()
    }
}

function isInsideWarZone(player, war) {
    if (!player || !war) return false
    var r = effectiveWarRadius()
    var radiusSq = r * r
    return distSqXZ(player.x, player.z, war.centerX, war.centerZ) <= radiusSq
}

function getSurfaceY(srv, x, z) {
    try {
        var level = srv.getLevel('minecraft:overworld')
        if (!level) return 80
        var ix = Math.floor(x)
        var iz = Math.floor(z)
        var y = level.getHeight(WarHeightmapTypes.MOTION_BLOCKING_NO_LEAVES, ix, iz)
        if (y > level.getMinBuildHeight()) return y + 2
    } catch (err) {}
    return 80
}

function warJmRun(srv, cmd, quiet) {
    try {
        var result = srv.runCommandSilent(cmd)
        if (!quiet) console.info('[War] JM: ' + cmd + ' -> ' + result)
        return result
    } catch (err) {
        console.warn('[War] JM fallo: ' + cmd + ' — ' + err)
        return 0
    }
}

function jmPlayerName(player) {
    try {
        var mc = toMcPlayer(player)
        if (mc && mc.getGameProfile) return String(mc.getGameProfile().getName())
    } catch (e0) {}
    return playerName(player)
}

function forEachWarParticipant(srv, war, fn) {
    if (!war || !fn) return
    var seen = {}
    var atk = findPlayer(srv, war.attackerName)
    var def = findPlayer(srv, war.defenderName)
    if (atk) {
        var na = jmPlayerName(atk).toLowerCase()
        if (!seen[na]) {
            seen[na] = true
            fn(atk, na)
        }
    }
    if (def) {
        var nd = jmPlayerName(def).toLowerCase()
        if (!seen[nd]) {
            seen[nd] = true
            fn(def, nd)
        }
    }
}

function clearWarJmWaypointsForPlayer(srv, pn) {
    if (!pn) return
    warJmRun(srv, 'jm waypoint delete "' + WAR_JM_LEGACY + '" ' + pn, true)
    warJmRun(srv, 'jm waypoint delete "' + WAR_JM_WAYPOINT_ATK + '" ' + pn, true)
    warJmRun(srv, 'jm waypoint delete "' + WAR_JM_WAYPOINT_DEF + '" ' + pn, true)
}

function removeWarJmWaypoint(srv, war) {
    if (war) {
        forEachWarParticipant(srv, war, function(p, pn) {
            clearWarJmWaypointsForPlayer(srv, pn)
        })
        return
    }
    try {
        srv.getPlayerList().getPlayers().forEach(function(p) {
            clearWarJmWaypointsForPlayer(srv, jmPlayerName(p))
        })
    } catch (e) {}
}

function setWarJmWaypointForPlayer(srv, pn, obj, color, wpName) {
    if (!pn || !obj || !wpName) return false
    var y = obj.waypointY != null ? obj.waypointY : getSurfaceY(srv, obj.x, obj.z)
    var ix = Math.floor(obj.x)
    var iz = Math.floor(obj.z)
    clearWarJmWaypointsForPlayer(srv, pn)
    warJmRun(srv, 'jm waypoint temp create "' + wpName + '" minecraft:overworld ' +
        ix + ' ' + y + ' ' + iz + ' ' + color + ' ' + pn, true)
    return true
}

function applyWarJmWaypoints(srv, war, obj, notifyChat) {
    if (!obj || !war) return
    obj.waypointY = getSurfaceY(srv, obj.x, obj.z)
    var ix = Math.floor(obj.x)
    var iz = Math.floor(obj.z)
    var created = 0

    var atk = findPlayer(srv, war.attackerName)
    if (atk) {
        var pnAtk = jmPlayerName(atk)
        if (setWarJmWaypointForPlayer(srv, pnAtk, obj, WAR_JM_COLOR_ATK, WAR_JM_WAYPOINT_ATK)) {
            created++
            if (notifyChat) {
                atk.tell('§4§l[GUERRA] §r§c§lCAPTURA: §f' + obj.label + ' §7@ ' + ix + ', ' + iz)
            }
        }
    }

    var def = findPlayer(srv, war.defenderName)
    if (def && !namesMatch(war.defenderName, war.attackerName)) {
        var pnDef = jmPlayerName(def)
        if (setWarJmWaypointForPlayer(srv, pnDef, obj, WAR_JM_COLOR_DEF, WAR_JM_WAYPOINT_DEF)) {
            created++
            if (notifyChat) {
                def.tell('§4§l[GUERRA] §r§a§lDEFIENDE: §f' + obj.label + ' §7@ ' + ix + ', ' + iz)
            }
        }
    }

    if (created === 0) {
        console.warn('[War] JM: ningun participante online para waypoint')
    }
}

function buildingTypeKey(building) {
    try {
        var entry = building.getBuildingType ? building.getBuildingType() : null
        if (entry) {
            if (entry.getRegistryName) {
                var rn = entry.getRegistryName()
                if (rn && rn.toString) return String(rn.toString())
                return String(rn)
            }
            if (entry.getKey) {
                var k = entry.getKey()
                if (k && k.toString) return String(k.toString())
                return String(k)
            }
        }
    } catch (e0) {}
    return String(building)
}

// MC 1.21: registry = minecolonies:townhall (no "blockhut" en el id)
function normalizeHutTypeKey(typeKey) {
    var key = String(typeKey).toLowerCase()
    var m = key.match(/minecolonies:([a-z0-9_]+)/)
    if (m) return 'minecolonies:' + m[1]
    m = key.match(/blockhut([a-z0-9_]+)/)
    if (m) return 'minecolonies:' + m[1]
    return key
}

var WAR_HUT_EXCLUDE = {
    graveyard: true,
    postbox: true,
    stash: true,
    residence: true,
    home: true
}

function isMinecoloniesHutKey(typeKey) {
    var norm = normalizeHutTypeKey(typeKey)
    if (norm.indexOf('minecolonies:') !== 0) return false
    var id = norm.substring('minecolonies:'.length)
    if (WAR_HUT_EXCLUDE[id]) return false
    return id.length > 0
}

function buildingDisplayName(typeKey) {
    var k = String(typeKey).toLowerCase()
    if (k.indexOf('townhall') >= 0) return 'Ayuntamiento'
    if (k.indexOf('builder') >= 0) return 'Constructor'
    if (k.indexOf('warehouse') >= 0) return 'Almacen'
    if (k.indexOf('library') >= 0) return 'Biblioteca'
    if (k.indexOf('university') >= 0) return 'Universidad'
    if (k.indexOf('barracks') >= 0) return 'Cuartel'
    if (k.indexOf('guardtower') >= 0) return 'Torre guardia'
    if (k.indexOf('tavern') >= 0) return 'Taberna'
    if (k.indexOf('cook') >= 0) return 'Cocina'
    if (k.indexOf('farmer') >= 0) return 'Granja'
    if (k.indexOf('miner') >= 0) return 'Minero'
    if (k.indexOf('lumberjack') >= 0) return 'Leñador'
    if (k.indexOf('sawmill') >= 0) return 'Aserradero'
    if (k.indexOf('hospital') >= 0) return 'Hospital'
    var m = k.match(/blockhut(\w+)/)
    if (m && m[1]) {
        return m[1].charAt(0).toUpperCase() + m[1].slice(1)
    }
    return 'Edificio'
}

function buildingHasMinLevel(building) {
    if (!building) return false
    try {
        var lvl = building.getBuildingLevel ? building.getBuildingLevel() : 0
        return lvl >= 1
    } catch (e0) {
        return true
    }
}

function isBuildingCapturable(building) {
    if (!building || !buildingHasMinLevel(building)) return false
    return isMinecoloniesHutKey(buildingTypeKey(building))
}

function isTownHallBuilding(building) {
    var norm = normalizeHutTypeKey(buildingTypeKey(building))
    return norm === 'minecolonies:townhall' || norm.indexOf('townhall') >= 0
}

function getColonyBuildingManager(colony) {
    if (!colony) return null
    try {
        var bm = colony.getServerBuildingManager()
        if (bm) return bm
    } catch (e0) {}
    try {
        return colony.getBuildingManager()
    } catch (e1) {}
    return null
}

function buildingToCaptureEntry(building) {
    var pos = blockPosFromBuilding(building)
    if (!pos) return null
    var typeKey = buildingTypeKey(building)
    return {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        typeKey: typeKey,
        label: buildingDisplayName(typeKey),
        isTownHall: isTownHallBuilding(building)
    }
}

function findTownHallFromColonyCenter(colony, bm) {
    if (!colony || !bm) return null
    try {
        var center = colony.getCenter()
        if (!center) return null
        var b = bm.getBuilding(center)
        if (b && isTownHallBuilding(b) && buildingHasMinLevel(b)) {
            return buildingToCaptureEntry(b)
        }
    } catch (e) {}
    return null
}

function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1))
        var t = arr[i]
        arr[i] = arr[j]
        arr[j] = t
    }
    return arr
}

function blockPosFromBuilding(building) {
    try {
        var pos = building.getID ? building.getID() : null
        if (!pos) return null
        return {
            x: pos.getX(),
            y: pos.getY(),
            z: pos.getZ()
        }
    } catch (e) {}
    return null
}

function listCapturableBuildings(colony) {
    var list = []
    var townHall = null
    if (!colony) return { all: list, townHall: null, scanned: 0 }
    try {
        var bm = getColonyBuildingManager(colony)
        if (!bm) {
            console.warn('[War] Sin BuildingManager en colonia id=' + colony.getID())
            return { all: list, townHall: null, scanned: 0 }
        }
        var map = bm.getBuildings()
        if (!map) return { all: list, townHall: null, scanned: 0 }
        var iter = map.values().iterator()
        var scanned = 0
        while (iter.hasNext()) {
            scanned++
            var b = iter.next()
            if (!isBuildingCapturable(b)) continue
            var entry = buildingToCaptureEntry(b)
            if (!entry) continue
            if (entry.isTownHall) {
                if (!townHall) townHall = entry
            } else {
                list.push(entry)
            }
        }
        if (!townHall) {
            townHall = findTownHallFromColonyCenter(colony, bm)
        }
        return { all: list, townHall: townHall, scanned: scanned }
    } catch (err) {
        console.warn('[War] listCapturableBuildings: ' + err)
    }
    return { all: list, townHall: townHall, scanned: 0 }
}

function buildWarObjectives(colony) {
    var data = listCapturableBuildings(colony)
    if (!data.townHall) {
        var extra = ''
        if (data.scanned === 0) {
            extra = ' (no se leyeron edificios — ¿colonia cargada?)'
        } else {
            extra = ' (escaneados: ' + data.scanned + ', validos: ' + data.all.length + ')'
        }
        return { ok: false, msg: '§cLa colonia no tiene Ayuntamiento detectado.' + extra }
    }
    var others = data.all
    var total = others.length + 1
    if (total < WAR_MIN_BUILDINGS) {
        return {
            ok: false,
            msg: '§cColonias con menos de §f' + WAR_MIN_BUILDINGS +
                ' §cedificios no pueden recibir guerra (tiene §f' + total + '§c).'
        }
    }
    shuffleArray(others)
    var picked = []
    for (var i = 0; i < WAR_CAPTURE_COUNT - 1 && i < others.length; i++) {
        picked.push(others[i])
    }
    picked.push(data.townHall)
    for (var j = 0; j < picked.length; j++) {
        picked[j].index = j
        picked[j].captured = false
    }
    return { ok: true, objectives: picked }
}

function getCurrentObjective(war) {
    if (!war || !war.objectives) return null
    var idx = war.captureIndex || 0
    if (idx >= war.objectives.length) return null
    return war.objectives[idx]
}

function isNearCapturePoint(player, obj) {
    if (!player || !obj) return false
    var rSq = WAR_CAPTURE_RADIUS * WAR_CAPTURE_RADIUS
    return distSqXZ(player.x, player.z, obj.x, obj.z) <= rSq
}

function initWarCaptureState(war) {
    war.captureIndex = 0
    war.captureProgress = 0
    war.capturedCount = 0
}

function syncWarWaypoint(srv, war, forceRefresh, notifyChat) {
    var obj = getCurrentObjective(war)
    if (!obj || (war.phase !== 'assault' && war.phase !== 'prep')) {
        removeWarJmWaypoint(srv, war)
        war.jmWaypointObjectiveIndex = -1
        return
    }

    var idx = war.captureIndex || 0
    var isNewObjective = war.jmWaypointObjectiveIndex !== idx
    if (!forceRefresh && !isNewObjective) return
    if (notifyChat === undefined) notifyChat = isNewObjective

    war.jmWaypointObjectiveIndex = idx
    war.jmWaypointTick = warTicks
    applyWarJmWaypoints(srv, war, obj, !!notifyChat)
}

function completeCurrentCapture(srv, war) {
    var obj = getCurrentObjective(war)
    if (!obj) return false
    obj.captured = true
    war.capturedCount = (war.capturedCount || 0) + 1
    war.captureProgress = 0
    war.captureIndex = (war.captureIndex || 0) + 1

    tellWarParticipants(srv, war, '§aCapturado: §f' + obj.label +
        ' §7(' + war.capturedCount + '/' + WAR_CAPTURE_COUNT + ')')

    if (war.capturedCount >= WAR_CAPTURE_COUNT) {
        endWar(srv, 'attacker_win')
        return true
    }

    var next = getCurrentObjective(war)
    if (next) {
        tellWarParticipants(srv, war, '§eSiguiente objetivo: §f' + next.label +
            ' §7(radio ' + WAR_CAPTURE_RADIUS + ' bloques)')
        syncWarWaypoint(srv, war, true, true)
    }
    return true
}

function isGuardJobCitizen(entity) {
    if (!isMinecoloniesCitizen(entity)) return false
    try {
        var raw = getMcEntity(entity)
        if (!raw) return false
        if (raw.getCitizenJobHandler) {
            if (jobLooksLikeGuard(raw.getCitizenJobHandler().getColonyJob())) return true
        }
        if (raw.getCitizenData) {
            var data = raw.getCitizenData()
            if (data && data.getJob && jobLooksLikeGuard(data.getJob())) return true
        }
    } catch (e) {}
    return false
}

function warAggroGuardEntity(raw, mcAtk, defColony, war) {
    if (!raw || !mcAtk || !defColony || !war) return false
    if (!isGuardJobCitizen(raw)) return false
    if (isEntityDeadOrDying(raw)) return false

    if (!war.guardAttackRegistered) war.guardAttackRegistered = {}
    var uuid = null
    try {
        if (raw.getUUID) uuid = String(raw.getUUID())
    } catch (eUuid) {}
    if (uuid && !war.guardAttackRegistered[uuid]) {
        try {
            defColony.addGuardToAttackers(raw, mcAtk)
            war.guardAttackRegistered[uuid] = true
        } catch (eReg) {}
    }

    try {
        if (raw.getThreatTable) {
            var table = raw.getThreatTable()
            if (table && table.addThreat) table.addThreat(mcAtk, 8)
        }
    } catch (eThreat) {}

    return true
}

function forEachDefenderGuardEntity(defColony, fn) {
    if (!defColony || !fn) return
    var n = 0
    try {
        var mgr = defColony.getCitizenManager()
        if (!mgr || !mgr.getCitizens) return
        mgr.getCitizens().forEach(function(data) {
            if (!data || !data.getJob || !jobLooksLikeGuard(data.getJob())) return
            var opt = data.getEntity ? data.getEntity() : null
            if (!opt) return
            var ent = null
            try {
                if (opt.isPresent && opt.isPresent()) ent = opt.get()
                else if (opt.get) ent = opt.get()
            } catch (eOpt) {}
            if (!ent) return
            if (fn(ent, data)) n++
        })
    } catch (eMgr) {
        console.warn('[War] forEachDefenderGuardEntity: ' + eMgr)
    }
    return n
}

function boostWarGuardDetection(srv, war, attacker) {
    if (!attacker || !war || war.sim) return
    if (war.phase !== 'assault' && war.phase !== 'prep') return
    if (!isInsideWarZone(attacker, war)) return

    var defColony = getColonyByStoredId(srv, war.defenderColonyId)
    if (!defColony) return
    var mcAtk = toMcPlayer(attacker)
    if (!mcAtk) return
    var level = getPlayerLevel(attacker)
    if (!level) {
        try { level = srv.getLevel('minecraft:overworld') } catch (eLvl) {}
    }
    if (!level) return

    try {
        defColony.addVisitingPlayer(mcAtk)
    } catch (e0) {}

    if (!war.guardHelpTick) war.guardHelpTick = -999
    if (warTicks - war.guardHelpTick >= WAR_GUARD_HELP_COOLDOWN) {
        war.guardHelpTick = warTicks
        var helpRange = Math.max(WAR_GUARD_HELP_RANGE, effectiveWarRadius() + 40)
        var calledHelp = false
        forEachDefenderGuardEntity(defColony, function(raw) {
            if (calledHelp) return false
            try {
                if (raw.callForHelp) {
                    raw.callForHelp(mcAtk, helpRange)
                    calledHelp = true
                }
            } catch (eHelp) {}
            return false
        })
        if (!calledHelp) {
            try {
                level.getEntities().forEach(function(ent) {
                    if (calledHelp) return
                    if (!isGuardJobCitizen(ent)) return
                    var colonyId = getCitizenColonyIdFromWorld(ent, level)
                    if (!sameColonyId(colonyId, war.defenderColonyId)) return
                    var raw = getMcEntity(ent)
                    if (!raw || !raw.callForHelp) return
                    raw.callForHelp(mcAtk, helpRange)
                    calledHelp = true
                })
            } catch (eScan) {}
        }
    }

    forEachDefenderGuardEntity(defColony, function(raw) {
        warAggroGuardEntity(raw, mcAtk, defColony, war)
        return false
    })

    try {
        level.getEntities().forEach(function(ent) {
            if (!isGuardJobCitizen(ent)) return
            var colonyId = getCitizenColonyIdFromWorld(ent, level)
            if (!sameColonyId(colonyId, war.defenderColonyId)) return
            var raw = getMcEntity(ent)
            if (raw) warAggroGuardEntity(raw, mcAtk, defColony, war)
        })
    } catch (err) {
        console.warn('[War] boostWarGuardDetection scan: ' + err)
    }
}

function entityTypeId(entity) {
    try { return String(entity.type) } catch (e1) {}
    try { return String(entity.entityType) } catch (e2) {}
    try {
        var raw = entity.getEntity ? entity.getEntity() : entity
        if (raw && raw.getType) return String(raw.getType())
    } catch (e3) {}
    return ''
}

function getMcEntity(entity) {
    if (!entity) return null
    try { if (entity.getEntity) return entity.getEntity() } catch (e0) {}
    return entity
}

function getEntityUuid(entity) {
    var raw = getMcEntity(entity)
    if (!raw) return null
    try { return String(raw.getUUID()) } catch (e1) {}
    try { return String(raw.uuid) } catch (e2) {}
    return null
}

function isMcPlayerEntity(ent) {
    if (!ent) return false
    try { return ent.isPlayer && ent.isPlayer() } catch (e) { return false }
}

function resolvePlayerFromDamageSource(source) {
    if (!source) return null
    try {
        if (source.player) return source.player
    } catch (e0) {}
    try {
        var ent = source.getEntity ? source.getEntity() : source.entity
        if (isMcPlayerEntity(ent)) return ent
        if (ent && ent.getOwner) {
            var owner = ent.getOwner()
            if (isMcPlayerEntity(owner)) return owner
        }
    } catch (e1) {}
    return null
}

function getDamageSourceEntity(source) {
    if (!source) return null
    try {
        var ent = source.getEntity ? source.getEntity() : source.entity
        if (ent && isMinecoloniesCitizen(ent)) return ent
        if (ent && ent.getOwner) {
            var owner = ent.getOwner()
            if (owner && isMinecoloniesCitizen(owner)) return owner
        }
        var direct = source.getDirectEntity ? source.getDirectEntity() : null
        if (direct && isMinecoloniesCitizen(direct)) return direct
        if (direct && direct.getOwner) {
            var dOwner = direct.getOwner()
            if (dOwner && isMinecoloniesCitizen(dOwner)) return dOwner
        }
    } catch (e) {}
    return null
}

function getEntityLevel(entity) {
    if (!entity) return null
    try { return entity.level } catch (e0) {}
    try { return getMcEntity(entity).level() } catch (e1) {}
    return null
}

function getLastHurtCitizenAttacker(victim) {
    try {
        var mc = toMcPlayer(victim)
        if (!mc && victim && victim.getLastHurtByMob) mc = victim
        if (!mc || !mc.getLastHurtByMob) return null
        var hurter = mc.getLastHurtByMob()
        if (hurter && isMinecoloniesCitizen(hurter)) return hurter
    } catch (e) {}
    return null
}

function attackerHitByDefenderColonyCitizen(victim, source, war) {
    if (!war || !victim) return false
    var citizen = getDamageSourceEntity(source)
    if (!citizen) citizen = getLastHurtCitizenAttacker(victim)
    if (!citizen || !isMinecoloniesCitizen(citizen)) return false

    var colonyId = getCitizenColonyIdFromWorld(citizen, getEntityLevel(citizen))
    if (colonyId < 0 || !sameColonyId(colonyId, war.defenderColonyId)) return false
    if (!isInsideWarZone(victim, war)) return false
    return true
}

function healPlayer(player, amount) {
    if (!player || amount <= 0) return
    try {
        var mc = toMcPlayer(player)
        if (mc && mc.heal) {
            mc.heal(amount)
            return
        }
    } catch (e0) {}
    try { player.heal(amount) } catch (e1) {}
}

function tryMitigateGuardDamage(victim, source, damage, war) {
    if (!war || war.sim || damage <= 0) return damage
    if (!attackerHitByDefenderColonyCitizen(victim, source, war)) return damage
    return damage * WAR_GUARD_DAMAGE_MULT
}

var warGuardMitigatedTick = {}
var warFakeDeathHandledTick = {}
var warPendingBorderTp = {}

var WarMobEffectInstance = null
var WarMobEffects = null
var WarSoundEvents = null
try {
    WarMobEffectInstance = Java.loadClass('net.minecraft.world.effect.MobEffectInstance')
    WarMobEffects = Java.loadClass('net.minecraft.world.effect.MobEffects')
    WarSoundEvents = Java.loadClass('net.minecraft.sounds.SoundEvents')
} catch (fxErr) {}

function markGuardMitigated(player) {
    var uuid = getPlayerUuid(player)
    if (uuid != null) warGuardMitigatedTick[String(uuid)] = warTicks
}

function wasGuardMitigatedThisTick(player) {
    var uuid = getPlayerUuid(player)
    if (uuid == null) return false
    return warGuardMitigatedTick[String(uuid)] === warTicks
}

function getKillerPlayerFromVictim(victimEntity) {
    var raw = getMcEntity(victimEntity)
    if (!raw) return null

    try {
        var credit = raw.getKillCredit ? raw.getKillCredit() : null
        if (isMcPlayerEntity(credit)) return credit
    } catch (e0) {}

    try {
        var hurter = raw.getLastHurtByMob ? raw.getLastHurtByMob() : null
        if (isMcPlayerEntity(hurter)) return hurter
    } catch (e1) {}

    try {
        var ds = raw.getLastDamageSource ? raw.getLastDamageSource() : null
        var fromDs = resolvePlayerFromDamageSource(ds)
        if (fromDs) return fromDs
    } catch (e2) {}

    return null
}

function isMinecoloniesCitizen(entity) {
    var id = entityTypeId(entity)
    if (id.indexOf('minecolonies') >= 0 && id.indexOf('citizen') >= 0) return true
    try {
        var raw = getMcEntity(entity)
        if (raw && raw.getClass) {
            var cn = String(raw.getClass().getName())
            if (cn.indexOf('EntityCitizen') >= 0 || cn.indexOf('AbstractEntityCitizen') >= 0) return true
        }
    } catch (e) {}
    return false
}

function sameColonyId(a, b) {
    return Number(a) === Number(b)
}

function getEntityHealth(entity) {
    try {
        var raw = getMcEntity(entity)
        if (raw && raw.getHealth) return raw.getHealth()
    } catch (e0) {}
    try { return entity.health } catch (e1) {}
    return 9999
}

function isEntityDeadOrDying(entity) {
    try {
        var raw = getMcEntity(entity)
        if (raw) {
            if (raw.isDeadOrDying && raw.isDeadOrDying()) return true
            if (raw.isAlive && !raw.isAlive()) return true
            if (raw.getHealth && raw.getHealth() <= 0) return true
        }
    } catch (e0) {}
    try {
        if (entity.alive === false) return true
        if (entity.health != null && entity.health <= 0) return true
    } catch (e1) {}
    return false
}

function jobLooksLikeGuard(job) {
    if (!job) return false
    try {
        if (job.isGuard && job.isGuard()) return true
    } catch (e0) {}
    try {
        if (WarAbstractJobGuard && WarAbstractJobGuard.isInstance(job)) return true
    } catch (e1) {}
    try {
        var entry = job.getJobRegistryEntry ? job.getJobRegistryEntry() : null
        if (entry) {
            var key = String(entry.getKey ? entry.getKey() : entry).toLowerCase()
            if (key.indexOf('guard') >= 0 || key.indexOf('knight') >= 0 || key.indexOf('archer') >= 0) {
                return true
            }
        }
    } catch (e2) {}
    return false
}

function isCitizenGuard(entity) {
    return isGuardJobCitizen(entity)
}

function getCitizenColonyId(entity) {
    try {
        var raw = getMcEntity(entity)
        if (!raw) return -1
        if (raw.getCitizenColonyHandler) {
            return raw.getCitizenColonyHandler().getColonyId()
        }
        if (raw.getColonyId) return raw.getColonyId()
        if (raw.getCitizenData) {
            var data = raw.getCitizenData()
            if (data && data.getColony) {
                var colony = data.getColony()
                if (colony) return colony.getID()
            }
        }
    } catch (err) {}
    return -1
}

function getCitizenColonyIdFromWorld(entity, level) {
    var id = getCitizenColonyId(entity)
    if (id >= 0) return id
    var manager = getColonyManager()
    if (!manager || !level) return -1
    try {
        var raw = getMcEntity(entity)
        if (!raw || !raw.blockPosition) return -1
        var colony = manager.getColonyByPosFromWorld(level, raw.blockPosition())
        if (colony) return colony.getID()
    } catch (err) {}
    return -1
}

function formatTime(ticksLeft) {
    var totalSec = Math.max(0, Math.floor(ticksLeft / 20))
    var mins = Math.floor(totalSec / 60)
    var secs = totalSec % 60
    return mins + ':' + (secs < 10 ? '0' + secs : secs)
}

function broadcastWar(srv, msg) {
    srv.tell('§4§l[GUERRA] §r' + msg)
}

function tellWarParticipants(srv, war, msg) {
    if (!war) return
    var line = '§4§l[GUERRA] §r' + msg
    var atk = findPlayer(srv, war.attackerName)
    var def = findPlayer(srv, war.defenderName)
    if (atk) atk.tell(line)
    if (def && playerName(def).toLowerCase() !== war.attackerName.toLowerCase()) {
        def.tell(line)
    }
}

function isNameInActiveWar(name) {
    if (!activeWar || !name) return false
    var n = String(name).toLowerCase()
    return n === activeWar.attackerName.toLowerCase() ||
        n === activeWar.defenderName.toLowerCase()
}

function activeWarBlockMsg() {
    if (!activeWar) return null
    return '§cSolo puede haber una guerra a la vez (§f' + activeWar.attackerName +
        ' §7vs §f' + activeWar.defenderName + '§c).'
}

function getMinecraftServer(srv) {
    if (!srv) return null
    try { if (srv.getServer) return srv.getServer() } catch (e0) {}
    try { if (srv.minecraftServer) return srv.minecraftServer } catch (e1) {}
    return srv
}

function getServerTickCount(srv) {
    var mc = getMinecraftServer(srv)
    if (!mc) return warTicks
    try { return mc.getTickCount() } catch (e) { return warTicks }
}

function markPhaseStart(srv, war) {
    war.phaseStartTick = warTicks
    war.phaseStartServerTick = getServerTickCount(srv)
}

function getPhaseElapsed(srv, war) {
    if (war.phaseStartServerTick != null && war.phaseStartServerTick >= 0) {
        return getServerTickCount(srv) - war.phaseStartServerTick
    }
    return warTicks - war.phaseStartTick
}

function getPhaseMax(war) {
    return war.phase === 'prep' ? effectivePrepTicks() : effectiveAssaultTicks()
}

function getPhaseRemaining(srv, war) {
    return getPhaseMax(war) - getPhaseElapsed(srv, war)
}

function warBossbarKey(shortId) {
    if (!WarResourceLocation) return null
    try {
        return WarResourceLocation.fromNamespaceAndPath('arkcraft', shortId)
    } catch (e) {
        try { return WarResourceLocation.parse('arkcraft:' + shortId) } catch (e2) {}
    }
    return null
}

function getWarBossbarEvent(srv, shortId) {
    try {
        var mc = getMinecraftServer(srv)
        var key = warBossbarKey(shortId)
        if (!mc || !key) return null
        return mc.getCustomBossEvents().get(key)
    } catch (err) {
        return null
    }
}

function bossbarPlayerSelector(war) {
    var samePlayer = war.attackerName.toLowerCase() === war.defenderName.toLowerCase()
    if (samePlayer) {
        return '@a[name=' + war.attackerName + ',limit=1]'
    }
    return '@a[name=' + war.attackerName + ',limit=1] @a[name=' + war.defenderName + ',limit=1]'
}

function syncWarBossbarPlayers(srv, war) {
    if (!war) return
    var timeBar = getWarBossbarEvent(srv, 'war_time')
    var sitesBar = getWarBossbarEvent(srv, 'war_sites')
    var capBar = getWarBossbarEvent(srv, 'war_capture')
    var atk = findPlayer(srv, war.attackerName)
    var def = findPlayer(srv, war.defenderName)
    var mcAtk = atk ? toMcPlayer(atk) : null
    var mcDef = def ? toMcPlayer(def) : null
    var samePlayer = war.attackerName.toLowerCase() === war.defenderName.toLowerCase()

    if (timeBar) {
        timeBar.removeAllPlayers()
        if (mcAtk) timeBar.addPlayer(mcAtk)
        if (mcDef && !samePlayer) timeBar.addPlayer(mcDef)
    }
    if (sitesBar) {
        sitesBar.removeAllPlayers()
        if (mcAtk) sitesBar.addPlayer(mcAtk)
        if (mcDef && !samePlayer) sitesBar.addPlayer(mcDef)
    }
    if (capBar) {
        capBar.removeAllPlayers()
        if (mcAtk) capBar.addPlayer(mcAtk)
        if (mcDef && !samePlayer) capBar.addPlayer(mcDef)
    }

    if (atk || def) {
        var sel = bossbarPlayerSelector(war)
        srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_TIME + ' players ' + sel)
        srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_SITES + ' players ' + sel)
        srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_CAPTURE + ' players ' + sel)
    }
}

function celebrateWarVictory(srv, war, winnerIsAttacker) {
    var winnerName = winnerIsAttacker ? war.attackerName : war.defenderName
    var winner = findPlayer(srv, winnerName)
    if (!winner) return
    var x = Math.floor(winner.x + 0.5)
    var y = Math.floor(winner.y + 1.0)
    var z = Math.floor(winner.z + 0.5)
    var fw = '{LifeTime:22,FireworksItem:{id:"minecraft:firework_rocket",count:1,components:{"minecraft:fireworks":{flight_duration:1,explosions:[{shape:'
    for (var i = 0; i < 8; i++) {
        var shape = (i % 4) + 1
        var ox = x + (i % 3) - 1
        var oz = z + ((i + 1) % 3) - 1
        srv.runCommandSilent(
            'summon firework_rocket ' + ox + ' ' + y + ' ' + oz + ' ' +
            fw + shape + ',colors:[16776960,16711680,5614335],fade_colors:[16777215]}]}}}}'
        )
    }
    tellWarParticipants(srv, war, '§6¡Fuegos artificiales para §f' + winnerName + '§6!')
}

function tellActionbar(player, msg) {
    if (!player) return
    try {
        var mc = toMcPlayer(player)
        if (mc && mc.displayClientMessage) {
            mc.displayClientMessage(Text.literal(msg), true)
        }
    } catch (err) {}
}

function createWarBossbars(srv, war) {
    removeWarBossbars(srv)
    var timeMax = war.phase === 'prep' ? effectivePrepTicks() : effectiveAssaultTicks()

    srv.runCommandSilent('bossbar add ' + WAR_BOSSBAR_TIME + ' "Guerra — tiempo"')
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_TIME + ' color red')
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_TIME + ' style progress')
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_TIME + ' max ' + timeMax)
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_TIME + ' value ' + timeMax)
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_TIME + ' visible true')

    srv.runCommandSilent('bossbar add ' + WAR_BOSSBAR_SITES + ' "Guerra — capturas"')
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_SITES + ' color green')
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_SITES + ' style progress')
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_SITES + ' max ' + WAR_CAPTURE_COUNT)
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_SITES + ' value 0')
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_SITES + ' visible true')

    srv.runCommandSilent('bossbar add ' + WAR_BOSSBAR_CAPTURE + ' "Guerra — captura actual"')
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_CAPTURE + ' color yellow')
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_CAPTURE + ' style progress')
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_CAPTURE + ' max ' + WAR_CAPTURE_MAX)
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_CAPTURE + ' value 0')
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_CAPTURE + ' visible true')

    syncWarBossbarPlayers(srv, war)
    updateWarSitesBossbar(srv, war)
    updateWarCaptureBossbar(srv, war, null)
    updateWarTimeBossbar(srv, war, getPhaseRemaining(srv, war))
    war.bossbarSyncTicks = 10
}

function updateWarTimeBossbar(srv, war, remaining) {
    var label = war.phase === 'prep' ? 'Preparacion' : 'Asalto'
    var phaseMax = war.phase === 'prep' ? effectivePrepTicks() : effectiveAssaultTicks()
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_TIME + ' max ' + phaseMax)
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_TIME + ' value ' + Math.max(0, remaining))
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_TIME + ' name "' +
        label + ' — ' + war.attackerName + ' vs ' + war.defenderName +
        ' | ' + formatTime(remaining) + '"')
}

function updateWarSitesBossbar(srv, war) {
    var n = war.capturedCount || 0
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_SITES + ' max ' + WAR_CAPTURE_COUNT)
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_SITES + ' value ' + n)
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_SITES + ' name "Capturas ' + n + '/' + WAR_CAPTURE_COUNT + '"')
}

function updateWarCaptureBossbar(srv, war, attacker) {
    var prog = war.captureProgress || 0
    var obj = getCurrentObjective(war)
    var pct = Math.floor((prog / WAR_CAPTURE_MAX) * 100)
    var title = 'Captura — espera asalto'
    var color = 'yellow'

    if (war.phase === 'assault' && obj) {
        title = 'Captura ' + obj.label + ' — ' + pct + '%'
        if (attacker && isNearCapturePoint(attacker, obj)) {
            color = 'green'
            title = 'Capturando ' + obj.label + ' — ' + pct + '%'
        } else if (attacker && isInsideWarZone(attacker, war)) {
            color = 'yellow'
            title = 'Ve a ' + obj.label + ' (' + WAR_CAPTURE_RADIUS + 'm) — ' + pct + '%'
        } else {
            color = 'red'
            title = 'Fuera de colonia — ' + obj.label + ' ' + pct + '%'
        }
    } else if (war.phase === 'prep') {
        title = 'Preparación — primer objetivo: ' + (obj ? obj.label : '?')
    }

    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_CAPTURE + ' color ' + color)
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_CAPTURE + ' max ' + WAR_CAPTURE_MAX)
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_CAPTURE + ' value ' + Math.min(WAR_CAPTURE_MAX, prog))
    srv.runCommandSilent('bossbar set ' + WAR_BOSSBAR_CAPTURE + ' name "' + title + '"')
}

function updateWarBossbars(srv, war, remaining, attacker) {
    syncWarBossbarPlayers(srv, war)
    updateWarTimeBossbar(srv, war, remaining)
    updateWarSitesBossbar(srv, war)
    updateWarCaptureBossbar(srv, war, attacker)
}

function removeWarBossbars(srv) {
    try {
        var timeBar = getWarBossbarEvent(srv, 'war_time')
        var sitesBar = getWarBossbarEvent(srv, 'war_sites')
        var capBar = getWarBossbarEvent(srv, 'war_capture')
        if (timeBar) timeBar.removeAllPlayers()
        if (sitesBar) sitesBar.removeAllPlayers()
        if (capBar) capBar.removeAllPlayers()
    } catch (e) {}
    srv.runCommandSilent('bossbar remove ' + WAR_BOSSBAR_TIME)
    srv.runCommandSilent('bossbar remove ' + WAR_BOSSBAR_SITES)
    srv.runCommandSilent('bossbar remove ' + WAR_BOSSBAR_CAPTURE)
    srv.runCommandSilent('bossbar remove arkcraft:war_points')
    srv.runCommandSilent('bossbar remove arkcraft:war')
}

function sendWarTutorial(srv, war) {
    tellWarParticipants(srv, war, '§e⚔ Guerra: hay §f' + prepMins() + ' min de preparación§e y luego el asalto. Puedes comer y curarte normal.')
    tellWarParticipants(srv, war, '§7Atacante: captura §f4 edificios§7 (el último es el §fAyuntamiento§7). Quédate junto al edificio marcado en tu mapa hasta capturarlo.')
    tellWarParticipants(srv, war, '§7Si te derriban no mueres: un §ftótem§7 te salva y te aleja. Atacante tiene §f' + WAR_ATTACKER_LIVES + ' vidas§7; el defensor, §finfinitas§7.')
    tellWarParticipants(srv, war, '§7El defensor gana si §faguanta el tiempo§7 o si §fderriba al atacante ' + WAR_ATTACKER_LIVES + ' veces§7.')
}

function applyAttackerGlow(player) {
    if (!player) return
    try {
        player.potionEffects.add('minecraft:glowing', 220, 0, false, false)
        player.addTag('arkcraft_war_attacker')
    } catch (err) {}
}

function clearAttackerGlow(player) {
    if (!player) return
    try {
        player.potionEffects.clear('minecraft:glowing')
        player.removeTag('arkcraft_war_attacker')
    } catch (err) {}
}

function tickWarCapture(srv, war, attacker) {
    if (war.phase !== 'assault' || !attacker) return
    var obj = getCurrentObjective(war)
    if (!obj) return

    if (isNearCapturePoint(attacker, obj)) {
        war.captureProgress = Math.min(WAR_CAPTURE_MAX, (war.captureProgress || 0) + effectiveCaptureRate())
        if (war.captureProgress >= WAR_CAPTURE_MAX) {
            completeCurrentCapture(srv, war)
            return
        }
    }
}

function isPlayerEntity(entity) {
    try {
        if (entity.isPlayer()) return true
    } catch (e0) {}
    return entityTypeId(entity) === 'minecraft:player'
}

function payPotRewards(srv, war, result) {
    if (war.sim) {
        if (result === 'attacker_win') {
            broadcastWar(srv, '§aSim: victoria atacante (§f' + (war.capturedCount || 0) +
                '/' + WAR_CAPTURE_COUNT + ' capturas§a). Sin recompensa.')
        } else if (result === 'townhall_break') {
            broadcastWar(srv, '§cSim: derrota por romper Ayuntamiento.')
        } else {
            broadcastWar(srv, '§7Sim: victoria defensor / tiempo agotado.')
        }
        return
    }

    var attacker = findPlayer(srv, war.attackerName)
    var defender = findPlayer(srv, war.defenderName)

    if (result === 'attacker_win') {
        if (attacker) {
            giveItem(attacker, COIN_GOLD, war.potGold)
            giveItem(attacker, COIN_EMERALD, 2)   // Temporada 30d (antes 5)
            var we = warEcon()
            if (we) we.recordWarWinAttacker(attacker)
        }
        broadcastWar(srv, '§aVictoria del atacante §f' + war.attackerName +
            '§a — bote §6' + war.potGold + ' oro §a+ §22 esmeraldas')
        return
    }

    if (result === 'townhall_break') {
        if (defender && war.potGold > 0) {
            giveItem(defender, COIN_GOLD, war.potGold)
        }
        broadcastWar(srv, '§c¡Ayuntamiento destruido! §f' + war.defenderName +
            ' §arecibe §6' + war.potGold + ' oro§7. §cAtacante pierde la apuesta.')
        return
    }

    // defender_win, timeout, disconnect, attacker_lives_out
    if (defender && war.potGold > 0) {
        giveItem(defender, COIN_GOLD, war.potGold)
    }
    broadcastWar(srv, '§aVictoria del defensor §f' + war.defenderName +
        '§a — recibe §6' + war.potGold + ' oro §7(apuesta del atacante).')
}

function refundPendingPot(srv, war) {
    if (!war || war.sim) return
    var attacker = findPlayer(srv, war.attackerName)
    var defender = findPlayer(srv, war.defenderName)
    if (war.phase === 'pending' && attacker) {
        giveItem(attacker, COIN_GOLD, WAR_DECLARE_COST)
        broadcastWar(srv, '§7Reembolso: §6' + WAR_DECLARE_COST + ' oro §7a §f' + war.attackerName)
        return
    }
    if (attacker) giveItem(attacker, COIN_GOLD, WAR_DECLARE_COST)
    broadcastWar(srv, '§7Reembolso de la apuesta al atacante.')
}

function endWar(srv, result) {
    if (!activeWar) return
    var war = activeWar

    var attacker = findPlayer(srv, war.attackerName)
    clearAttackerGlow(attacker)
    removeWarJmWaypoint(srv, war)
    removeWarBossbars(srv)
    clearWarHostility(srv, war)

    if (result === 'stop') {
        refundPendingPot(srv, war)
        broadcastWar(srv, '§7Guerra cancelada por operador.')
    } else if (result === 'attacker_win') {
        celebrateWarVictory(srv, war, true)
        payPotRewards(srv, war, 'attacker_win')
        teleportAttackerHomeAfterWin(srv, war)
    } else if (result === 'townhall_break') {
        celebrateWarVictory(srv, war, false)
        payPotRewards(srv, war, 'townhall_break')
    } else if (result === 'timeout') {
        broadcastWar(srv, '§7Tiempo agotado. §f' + war.defenderName + ' §7defiende la colonia.')
        celebrateWarVictory(srv, war, false)
        payPotRewards(srv, war, 'defender_win')
    } else if (result === 'disconnect') {
        broadcastWar(srv, '§7Atacante desconectado — victoria del defensor.')
        celebrateWarVictory(srv, war, false)
        payPotRewards(srv, war, 'defender_win')
    } else if (result === 'declare_cancel') {
        refundPendingPot(srv, war)
        broadcastWar(srv, '§7Declaración cancelada (atacante desconectado).')
    } else if (result === 'sim_stop') {
        broadcastWar(srv, '§7Simulación detenida.')
    } else if (result === 'attacker_lives_out') {
        broadcastWar(srv, '§c§lSin vidas. §r§f' + war.attackerName +
            ' §7no completo las capturas — victoria de §f' + war.defenderName + '§7.')
        celebrateWarVictory(srv, war, false)
        payPotRewards(srv, war, 'defender_win')
    }

    activeWar = null
    warTicks = 0
    // No vaciar warPendingBorderTp: el atacante en ultima vida debe terminar el TP fuera de la colonia
}

function getWarBorderRespawnPos(srv, war) {
    if (!war) return null
    var r = effectiveWarRadius()
    var angle = Math.random() * Math.PI * 2
    var dist = r + (Math.random() * WAR_RESPAWN_BORDER_VAR * 2 - WAR_RESPAWN_BORDER_VAR)
    var x = war.centerX + Math.cos(angle) * dist
    var z = war.centerZ + Math.sin(angle) * dist
    var y = getSurfaceY(srv, x, z)
    return { x: x + 0.5, y: y, z: z + 0.5 }
}

function getColonyTownHallPos(srv, colony) {
    if (!colony) return null
    var center = colonyCenter(colony)
    if (!center) return null
    var x = center.x
    var z = center.z
    var y = center.y
    if (y == null || y < 1) y = getSurfaceY(srv, x, z)
    else y = Math.max(1, Math.floor(y))
    return { x: x + 0.5, y: y, z: z + 0.5 }
}

function getWarDefenderTownHallPos(srv, war) {
    if (!war) return null
    var x = war.centerX
    var z = war.centerZ
    var y = war.centerY
    if (y == null || y < 1) y = getSurfaceY(srv, x, z)
    else y = Math.max(1, Math.floor(y))
    return { x: x + 0.5, y: y, z: z + 0.5 }
}

function teleportAttackerHomeAfterWin(srv, war) {
    if (!srv || !war || war.sim) return
    var attacker = findPlayer(srv, war.attackerName)
    if (!attacker) return
    var atkColony = getColonyByStoredId(srv, war.attackerColonyId)
    if (!atkColony) atkColony = getPlayerColony(attacker)
    var pos = getColonyTownHallPos(srv, atkColony)
    if (!pos) {
        console.warn('[War] TP victoria atacante: sin colonia/centro para ' + war.attackerName)
        return
    }
    var mc = toMcPlayer(attacker)
    if (!teleportPlayerToCoords(srv, attacker, mc, pos.x, pos.y, pos.z)) {
        queueWarBorderTeleport(srv, attacker, mc, pos)
    }
    tellPlayer(attacker, '§a§l[GUERRA] §r§a¡Victoria! §7Te enviamos a tu §fAyuntamiento§7.')
}

function getServerFromMc(mc) {
    if (!mc) return null
    try { if (mc.server) return mc.server } catch (e0) {}
    try {
        var lvl = mc.level()
        if (lvl && lvl.getServer) return lvl.getServer()
    } catch (e1) {}
    return null
}

function isIncomingDamageLethal(mc, amount) {
    if (!mc || amount <= 0) return false
    try {
        var health = mc.getHealth()
        var abs = mc.getAbsorptionAmount()
        var dmg = amount
        if (abs > 0) {
            if (abs >= dmg) return false
            dmg -= abs
        }
        return health <= dmg + 0.001
    } catch (e) {
        try { return mc.getHealth() <= amount } catch (e2) {}
    }
    return false
}

function applyWarTotemSurvive(mc) {
    if (!mc) return
    try {
        mc.setHealth(1.0)
        mc.setAbsorptionAmount(0)
        mc.setRemainingFireTicks(0)
    } catch (e0) {}
    try {
        if (WarMobEffectInstance && WarMobEffects) {
            mc.addEffect(new WarMobEffectInstance(WarMobEffects.REGENERATION, 900, 1, false, false, true))
            mc.addEffect(new WarMobEffectInstance(WarMobEffects.ABSORPTION, 100, 1, false, false, true))
            mc.addEffect(new WarMobEffectInstance(WarMobEffects.FIRE_RESISTANCE, 800, 0, false, false, true))
        }
    } catch (e1) {}
    try {
        if (WarSoundEvents) {
            var lvl = mc.level()
            if (lvl) {
                lvl.playSound(null, mc.blockPosition(), WarSoundEvents.TOTEM_USE, mc.getSoundSource(), 1.0, 1.0)
            }
        }
    } catch (e2) {}
}

function teleportPlayerToCoords(srv, player, mc, x, y, z) {
    if (!srv) return false
    x = x * 1.0
    y = y * 1.0
    z = z * 1.0

    if (player) {
        try {
            player.teleportTo('minecraft:overworld', x, y, z)
            return true
        } catch (eK1) {}
        try {
            player.teleport(x, y, z)
            return true
        } catch (eK2) {}
    }

    mc = mc || (player ? toMcPlayer(player) : null)
    if (mc) {
        try {
            var level = srv.getLevel('minecraft:overworld')
            if (!level) return false
            var D = Java.loadClass('java.lang.Double')
            var F = Java.loadClass('java.lang.Float')
            var yRot = 0.0
            var xRot = 0.0
            try { yRot = mc.getYRot() * 1.0 } catch (ry) {}
            try { xRot = mc.getXRot() * 1.0 } catch (rx) {}
            mc.teleportTo(
                level,
                D.valueOf(x).doubleValue(),
                D.valueOf(y).doubleValue(),
                D.valueOf(z).doubleValue(),
                F.valueOf(yRot).floatValue(),
                F.valueOf(xRot).floatValue()
            )
            return true
        } catch (eMc) {
            console.warn('[War] teleportPlayerToCoords mc: ' + eMc)
        }
    }

    try {
        var n = playerName(player || mc)
        if (n) {
            srv.runCommandSilent('execute in minecraft:overworld run tp ' + n + ' ' + x + ' ' + y + ' ' + z)
            return true
        }
    } catch (eCmd) {
        console.warn('[War] teleportPlayerToCoords cmd: ' + eCmd)
    }
    return false
}

function queueWarBorderTeleport(srv, player, mc, pos) {
    if (!srv || !pos) return false
    var name = playerName(player || mc)
    if (!name) return false
    var key = name.toLowerCase()
    warPendingBorderTp[key] = {
        player: player,
        mc: mc,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        ticksLeft: 3
    }
    if (teleportPlayerToCoords(srv, player, mc, pos.x, pos.y, pos.z)) {
        delete warPendingBorderTp[key]
    }
    return true
}

function processWarPendingTeleports(srv) {
    if (!srv) return
    var keys = Object.keys(warPendingBorderTp)
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i]
        var job = warPendingBorderTp[key]
        if (!job) continue
        job.ticksLeft--
        if (job.ticksLeft > 0) continue
        var player = job.player || findPlayer(srv, key)
        var mc = job.mc
        if (player) mc = toMcPlayer(player) || mc
        if (!teleportPlayerToCoords(srv, player, mc, job.x, job.y, job.z)) {
            console.warn('[War] TP pendiente fallo para ' + key)
        }
        delete warPendingBorderTp[key]
    }
}

/** Evita muerte real en asalto: cancela golpe letal, efecto totem, vida, TP al borde. */
function tryWarFakeDeath(event, mc, srv, name, damageAmount) {
    if (!activeWar || activeWar.phase !== 'assault' || !mc || !srv || !name) return false
    if (!isWarParticipantName(name)) return false
    if (!isIncomingDamageLethal(mc, damageAmount)) return false

    if (warFakeDeathHandledTick[name] === warTicks) {
        try { event.setCanceled(true) } catch (e0) {}
        try { event.setAmount(0) } catch (e1) {}
        return true
    }
    warFakeDeathHandledTick[name] = warTicks

    try { event.setCanceled(true) } catch (e2) {}
    try { event.setAmount(0) } catch (e3) {}

    applyWarTotemSurvive(mc)

    var player = findPlayer(srv, name) || mc
    var warSnap = activeWar
    var isAttacker = warSnap && namesMatch(name, warSnap.attackerName)
    var isDefender = warSnap && namesMatch(name, warSnap.defenderName)
    var respawnPos = null
    if (isAttacker) respawnPos = warSnap ? getWarBorderRespawnPos(srv, warSnap) : null
    else if (isDefender) respawnPos = warSnap ? getWarDefenderTownHallPos(srv, warSnap) : null
    else respawnPos = warSnap ? getWarBorderRespawnPos(srv, warSnap) : null

    var wasLastLife = false
    if (isAttacker && warSnap) {
        var curLives = warSnap.attackerLives != null ? warSnap.attackerLives : WAR_ATTACKER_LIVES
        wasLastLife = curLives <= 1
    }

    handleWarParticipantDeath(srv, player)

    if (respawnPos && queueWarBorderTeleport(srv, player, mc, respawnPos)) {
        if (isDefender) {
            tellPlayer(player, '§4§l[GUERRA] §r§7Caida en combate — §fte enviamos al §fAyuntamiento §7§8(sin perder equipo, sin limite de vidas)§7.')
        } else if (wasLastLife) {
            tellPlayer(player, '§4§l[GUERRA] §r§cSin vidas — §7guerra terminada. §fTe sacaron fuera §7de la colonia §8(sin perder equipo)§7.')
        } else {
            tellPlayer(player, '§4§l[GUERRA] §r§7Caida en combate — §fte sacaron al borde §7de la colonia §8(sin perder equipo)§7.')
        }
    } else if (isDefender) {
        tellPlayer(player, '§4§l[GUERRA] §r§7Caida en combate. Regresa al §fAyuntamiento§7.')
    } else if (wasLastLife) {
        tellPlayer(player, '§4§l[GUERRA] §r§cSin vidas. §7Sal de la colonia enemiga — el asalto ha terminado.')
    } else {
        tellPlayer(player, '§4§l[GUERRA] §r§7Caida en combate. Regresa al borde de la colonia.')
    }
    return true
}

function isWarCombatPhase(war) {
    return war && (war.phase === 'prep' || war.phase === 'assault')
}

function isWarParticipantName(name) {
    if (!activeWar || !name) return false
    var n = String(name).toLowerCase()
    return n === activeWar.attackerName.toLowerCase() ||
        n === activeWar.defenderName.toLowerCase()
}

function handleWarParticipantDeath(srv, player) {
    if (!activeWar || !player || activeWar.sim) return false
    if (!isWarCombatPhase(activeWar)) return false
    var name = playerName(player)
    if (!isWarParticipantName(name)) return false

    var livesLine = null
    if (namesMatch(name, activeWar.attackerName)) {
        activeWar.attackerLives = (activeWar.attackerLives != null ? activeWar.attackerLives : WAR_ATTACKER_LIVES) - 1
        var left = activeWar.attackerLives
        livesLine = '§cVidas restantes: §f' + left + '/' + WAR_ATTACKER_LIVES
        tellPlayer(player, '§4§l[GUERRA] §r§cHas caido. §7' + livesLine)
        tellWarParticipants(srv, activeWar, '§7Atacante §f' + activeWar.attackerName + ' §7ha caido. §cVidas: §f' + left)

        if (left <= 0) {
            endWar(srv, 'attacker_lives_out')
        }
    } else {
        tellPlayer(player, '§4§l[GUERRA] §r§7Has caido. §aSin penalizacion de vidas (defensor).')
    }
    return true
}

function startPrepPhase(srv, war) {
    war.phase = 'prep'
    markPhaseStart(srv, war)
    initWarCaptureState(war)
    war.attackerLives = WAR_ATTACKER_LIVES
    war.guardAttackRegistered = {}
    war.jmWaypointObjectiveIndex = -1
    war.jmWaypointTick = -1
    createWarBossbars(srv, war)
    applyWarHostility(srv, war)
    sendWarTutorial(srv, war)
    syncWarWaypoint(srv, war, true, true)
    broadcastWar(srv, '§e⚔ §f' + war.attackerName + ' §7vs §f' + war.defenderName + '§7 — preparación de §f' + prepMins() + ' min§7, luego el asalto.')
}

function startAssaultPhase(srv, war) {
    war.phase = 'assault'
    markPhaseStart(srv, war)
    initWarCaptureState(war)
    war.guardAttackRegistered = {}
    war.jmWaypointObjectiveIndex = -1
    createWarBossbars(srv, war)
    syncWarWaypoint(srv, war, true, true)
    var first = getCurrentObjective(war)
    broadcastWar(srv, '§c§l¡ASALTO! §r§7' + assaultMins() + ' min — captura §f4 edificios §7(el último es el Ayuntamiento).')
    if (first) {
        broadcastWar(srv, '§7Primer objetivo: §f' + first.label + '§7. Sigue el marcador de tu mapa.')
    }
    var attacker = findPlayer(srv, war.attackerName)
    applyAttackerGlow(attacker)
    syncWarBossbarPlayers(srv, war)
}

function beginPendingWar(srv, attacker, defender, sim) {
    var blockMsg = activeWarBlockMsg()
    if (blockMsg) return { ok: false, msg: blockMsg }

    if (!getColonyManager()) {
        return { ok: false, msg: '§cMineColonies no disponible.' }
    }

    var atkName = playerName(attacker)
    var defName = playerName(defender)

    if (!sim && atkName === defName) {
        return { ok: false, msg: '§cNo puedes declararte guerra a ti mismo. Usa /war sim start.' }
    }

    var defColony = getPlayerColony(defender)
    if (!defColony) {
        return { ok: false, msg: '§c' + defName + ' no tiene colonia MineColonies.' }
    }

    var atkColony = getPlayerColony(attacker)
    if (!sim && !atkColony) {
        return { ok: false, msg: '§cNecesitas una colonia para declarar guerra.' }
    }

    var center = colonyCenter(defColony)
    var objPlan = buildWarObjectives(defColony)
    if (!objPlan.ok) {
        return { ok: false, msg: objPlan.msg }
    }

    if (sim) {
        activeWar = {
            sim: true,
            phase: 'assault',
            attackerName: atkName,
            defenderName: defName,
            attackerColonyId: center.id,
            defenderColonyId: center.id,
            centerX: center.x,
            centerY: center.y,
            centerZ: center.z,
            objectives: objPlan.objectives,
            potGold: 0,
            hostilityApplied: false,
            phaseStartTick: 0,
            phaseStartServerTick: -1,
            captureIndex: 0,
            captureProgress: 0,
            capturedCount: 0
        }
        warTicks = 0
        startAssaultPhase(srv, activeWar)
        broadcastWar(srv, '§8Sim: captura 4 edificios en tu colonia (radio §f' + WAR_RADIUS + '§8).')
        return { ok: true, msg: '§aSimulación de asalto iniciada.' }
    }

    if (countItem(attacker, COIN_GOLD) < WAR_DECLARE_COST) {
        return { ok: false, msg: '§cNecesitas §6' + WAR_DECLARE_COST + ' oro §c(lightmanscurrency:coin_gold).' }
    }

    var weDec = warEcon()
    if (weDec && atkColony) {
        if (!weDec.canColonyDeclareWar(atkColony.getID(), WAR_MAX_DECLARES_PER_WEEK)) {
            return {
                ok: false,
                msg: '§cLímite de §f' + WAR_MAX_DECLARES_PER_WEEK +
                    ' §cdeclaraciones por semana (tu colonia).'
            }
        }
        // Guerra NO cuenta al cap de gasto (decisión 2026-05-31): solo límite semanal.
    }

    if (!removeItem(attacker, COIN_GOLD, WAR_DECLARE_COST)) {
        return { ok: false, msg: '§cError al cobrar el bote inicial.' }
    }

    if (weDec && atkColony) {
        // Guerra fuera del cap de gasto: solo registramos la declaración (límite semanal).
        weDec.recordColonyDeclare(atkColony.getID())
        weDec.saveState(srv)
    }

    activeWar = {
        sim: false,
        phase: 'pending',
        attackerName: atkName,
        defenderName: defName,
        attackerColonyId: atkColony ? atkColony.getID() : -1,
        defenderColonyId: center.id,
        centerX: center.x,
        centerY: center.y,
        centerZ: center.z,
        objectives: objPlan.objectives,
        potGold: WAR_DECLARE_COST,
        hostilityApplied: false,
        phaseStartTick: 0,
        phaseStartServerTick: -1,
        captureIndex: 0,
        captureProgress: 0,
        capturedCount: 0
    }
    warTicks = 0

    broadcastWar(srv, '§f' + atkName + ' §7le declaró la guerra a §f' + defName +
        '§7. Apuesta: §6' + WAR_DECLARE_COST + ' oro§7. §f' + defName + '§7 acepta con §e/war accept §7(gratis).')
    return { ok: true, msg: '§aDeclaración enviada.' }
}

function acceptWar(srv, defender) {
    if (!activeWar || activeWar.phase !== 'pending') {
        return { ok: false, msg: '§cNo hay declaración pendiente.' }
    }
    if (playerName(defender) !== activeWar.defenderName) {
        return { ok: false, msg: '§cSolo §f' + activeWar.defenderName + ' §cpuede aceptar.' }
    }
    startPrepPhase(srv, activeWar)
    return { ok: true, msg: '§aAceptaste la guerra — preparación de ' + prepMins() + ' min.' }
}

function warStatusText(war, srv) {
    if (!war) return '§7No hay guerra activa.'
    var lines = []
    var faseTxt = war.phase === 'pending' ? 'esperando que acepten'
        : (war.phase === 'prep' ? 'preparación'
        : (war.phase === 'assault' ? 'asalto' : war.phase))
    lines.push('§6Estado: §f' + faseTxt + (war.sim ? ' §8(práctica)' : ''))
    lines.push('§6Atacante: §f' + war.attackerName + ' §7| Defensor: §f' + war.defenderName)
    lines.push('§6Capturas: §e' + (war.capturedCount || 0) + '/' + WAR_CAPTURE_COUNT)
    if (war.attackerLives != null) {
        lines.push('§6Vidas atacante: §c' + war.attackerLives + '/' + WAR_ATTACKER_LIVES)
    }
    var obj = getCurrentObjective(war)
    if (obj) {
        var pct = Math.floor(((war.captureProgress || 0) / WAR_CAPTURE_MAX) * 100)
        lines.push('§6Objetivo: §f' + obj.label + ' §7(' + pct + '%)')
    }
    lines.push('§6Centro: §bX ' + war.centerX + ' Z ' + war.centerZ +
        ' §7(radio colonia ' + effectiveWarRadius() + ', captura ' + WAR_CAPTURE_RADIUS + 'm)')
    if (warTestFast) lines.push('§6Modo rapido: §aON §7(prep 10s, asalto 60s)')
    if (warTestCaptureFast) lines.push('§6Captura rapida: §aON')
    if (war.potGold > 0) lines.push('§6Apuesta: §6' + war.potGold + ' oro')
    if (war.phase === 'prep' || war.phase === 'assault') {
        var rem = Math.max(0, getPhaseRemaining(srv, war))
        lines.push('§6Tiempo fase: §f' + formatTime(rem))
    }
    return lines.join('\n')
}

function warTestNeedPhase(minPhase) {
    if (!activeWar) return '§cNo hay guerra activa.'
    if (activeWar.phase === 'pending') return '§cLa guerra aun no fue aceptada.'
    if (minPhase === 'assault' && activeWar.phase !== 'assault') {
        return '§cSolo en fase de asalto. Usa /war test assault o /war test skip.'
    }
    return null
}

function warTestRefreshBars(srv) {
    if (!activeWar || activeWar.phase === 'pending') return
    var remaining = Math.max(0, getPhaseRemaining(srv, activeWar))
    var attacker = findPlayer(srv, activeWar.attackerName)
    updateWarBossbars(srv, activeWar, remaining, attacker)
}

function warTestSetTime(srv, seconds) {
    var err = warTestNeedPhase('prep')
    if (err) return { ok: false, msg: err }
    var sec = Math.max(0, Math.floor(seconds))
    var phaseMax = activeWar.phase === 'prep' ? effectivePrepTicks() : effectiveAssaultTicks()
    var ticks = Math.min(phaseMax, sec * 20)
    activeWar.phaseStartTick = warTicks - (phaseMax - ticks)
    activeWar.phaseStartServerTick = getServerTickCount(srv) - (phaseMax - ticks)
    warTestRefreshBars(srv)
    return { ok: true, msg: 'Tiempo restante: ' + formatTime(ticks) }
}

function warTestSetCapturePct(srv, pct) {
    var err = warTestNeedPhase('assault')
    if (err) return { ok: false, msg: err }
    activeWar.captureProgress = Math.floor(Math.max(0, Math.min(100, pct)) / 100 * WAR_CAPTURE_MAX)
    warTestRefreshBars(srv)
    if (activeWar.captureProgress >= WAR_CAPTURE_MAX) {
        completeCurrentCapture(srv, activeWar)
        if (!activeWar) return { ok: true, msg: 'Captura completada — guerra terminada.' }
    }
    return { ok: true, msg: 'Captura actual al ' + pct + '%' }
}

// ------------------------------------------------------------
// TICK
// ------------------------------------------------------------
ServerEvents.tick(function(event) {
    try {
        processWarPendingTeleports(event.server)
    } catch (tpTickErr) {
        console.warn('[War] pending TP tick: ' + tpTickErr)
    }
    if (!activeWar) return
    try {
        warTicks++
        var srv = event.server
        var war = activeWar

        if (war.phase === 'pending') return

        if (!war.intruderPermsV2 && !war.sim) {
            war.intruderPermsV2 = true
            enableWarIntruderPermissions(srv, war)
        }

        var phaseElapsed = getPhaseElapsed(srv, war)
        var phaseMax = getPhaseMax(war)
        var remaining = phaseMax - phaseElapsed

        if (war.bossbarSyncTicks > 0) {
            war.bossbarSyncTicks--
            syncWarBossbarPlayers(srv, war)
        }

        if (war.phase === 'prep' && phaseElapsed >= effectivePrepTicks()) {
            startAssaultPhase(srv, war)
            return
        }

        if (war.phase === 'assault' && phaseElapsed >= effectiveAssaultTicks()) {
            endWar(srv, 'timeout')
            return
        }

        var attacker = findPlayer(srv, war.attackerName)

        if (warTicks % 20 === 0) {
            updateWarBossbars(srv, war, Math.max(0, remaining), attacker)
        }

        if (attacker && (war.phase === 'prep' || war.phase === 'assault') &&
            warTicks % WAR_GUARD_AGGRO_TICKS === 0) {
            boostWarGuardDetection(srv, war, attacker)
        }

        if (war.phase !== 'assault') return
        if (!attacker) return

        applyAttackerGlow(attacker)
        tickWarCapture(srv, war, attacker)
    } catch (tickErr) {
        console.error('[War] tick error: ' + tickErr)
    }
})

// ------------------------------------------------------------
// EVENTOS (daño guardias — sin penalizacion por muertes)
// ------------------------------------------------------------
EntityEvents.afterHurt(function(event) {
    if (!activeWar || activeWar.phase === 'pending') return
    try {
        if (!activeWar.sim && isPlayerEntity(event.entity) &&
            namesMatch(playerName(event.entity), activeWar.attackerName) &&
            !wasGuardMitigatedThisTick(event.entity)) {
            var hitDmg = event.damage
            try { if (event.getDamage) hitDmg = event.getDamage() } catch (eDmg) {}
            if (hitDmg > 0 && attackerHitByDefenderColonyCitizen(event.entity, event.source, activeWar)) {
                healPlayer(event.entity, hitDmg * (1 - WAR_GUARD_DAMAGE_MULT))
            }
        }
    } catch (hurtErr) {
        console.error('[War] afterHurt: ' + hurtErr)
    }
})

NativeEvents.onEvent('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent', function(event) {
    if (!activeWar || activeWar.phase === 'pending' || activeWar.sim) return
    try {
        var entity = event.getEntity()
        if (!entity || !entity.isPlayer()) return
        var name = String(entity.getName().getString())
        var srv = getServerFromMc(entity)
        var source = event.getSource()
        var amt = event.getAmount()
        if (amt <= 0) return

        if (namesMatch(name, activeWar.attackerName)) {
            var mitigated = tryMitigateGuardDamage(entity, source, amt, activeWar)
            if (mitigated < amt) {
                event.setAmount(mitigated)
                markGuardMitigated(entity)
                amt = mitigated
            }
        }

        if (srv && activeWar.phase === 'assault' && isWarParticipantName(name)) {
            if (tryWarFakeDeath(event, entity, srv, name, amt)) return
        }
    } catch (neoErr) {
        console.error('[War] LivingIncomingDamageEvent: ' + neoErr)
    }
})

BlockEvents.broken(function(event) {
    if (!activeWar || activeWar.phase !== 'assault') return
    if (event.level.isClientSide()) return
    try {
        var blockId = String(event.block.id)
        if (blockId !== 'minecolonies:blockhuttownhall') return

        var player = event.player
        if (!player || playerName(player) !== activeWar.attackerName) return

        var manager = getColonyManager()
        if (!manager) return
        var colony = manager.getColonyByPosFromWorld(event.level, event.block.pos)
        if (!colony || colony.getID() !== activeWar.defenderColonyId) return

        endWar(event.server, 'townhall_break')
    } catch (breakErr) {
        console.error('[War] break error: ' + breakErr)
    }
})

PlayerEvents.loggedOut(function(event) {
    if (!activeWar || activeWar.sim) return
    if (playerName(event.player) !== activeWar.attackerName) return
    if (activeWar.phase === 'pending') {
        endWar(event.server, 'declare_cancel')
        return
    }
    endWar(event.server, 'disconnect')
})

PlayerEvents.loggedIn(function(event) {
    if (!activeWar || activeWar.phase === 'pending') return
    if (!isNameInActiveWar(playerName(event.player))) return
    var srv = event.server
    var war = activeWar
    var remaining = Math.max(0, getPhaseRemaining(srv, war))
    var attacker = findPlayer(srv, war.attackerName)
    updateWarBossbars(srv, war, remaining, attacker)
    if (war.phase === 'prep' || war.phase === 'assault') {
        syncWarWaypoint(srv, war, true, false)
    }
})

// ------------------------------------------------------------
// COMANDOS /war
// ------------------------------------------------------------
ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    var Arguments = event.arguments
    var JavaString = Java.loadClass('java.lang.String')
    var JavaInteger = Java.loadClass('java.lang.Integer')
    var opOnly = function(src) { return src.hasPermission(2) }

    function getCmdArgString(ctx, name) {
        return String(ctx.getArgument(name, JavaString))
    }

    function getCmdArgInt(ctx, name) {
        return ctx.getArgument(name, JavaInteger).intValue()
    }

    function testFail(ctx, msg) {
        ctx.source.sendFailure(Text.literal(msg))
        return 0
    }

    function testOk(ctx, msg) {
        ctx.source.sendSuccess(Text.literal('§a[War test] §f' + msg), true)
        return 1
    }

    function testHelp(ctx) {
        var lines = [
            '§6/war test help §7— esta lista',
            '§6/war test fast [on|off] §7— prep 10s, asalto 60s',
            '§6/war test capfast [on|off] §7— captura muy rapida',
            '§6/war test skip §7— saltar prep → asalto, o timeout',
            '§6/war test assault §7— forzar asalto (desde prep)',
            '§6/war test time <seg> §7— tiempo restante de fase',
            '§6/war test cap <0-100> §7— % captura del objetivo actual',
            '§6/war test capdone §7— completar objetivo actual',
            '§6/war test win §7— victoria atacante | §6lose §7— defensor',
            '§6/war test radius <bloques|0> §7— radio colonia (0=100)',
            '§6/war test reset §7— quitar modos test'
        ]
        for (var hi = 0; hi < lines.length; hi++) {
            ctx.source.sendSuccess(Text.literal(lines[hi]), false)
        }
        return 1
    }

    function statusCmd(ctx) {
        ctx.source.sendSuccess(Text.literal(warStatusText(activeWar, ctx.source.server)), false)
        return 1
    }

    event.register(
        Commands.literal('war')

            .then(Commands.literal('status')
                .executes(statusCmd)
            )

            .then(Commands.literal('declare')
                .then(Commands.argument('target', Arguments.STRING.create(event))
                    .executes(function(ctx) {
                        try {
                            var attacker = ctx.source.player
                            if (!attacker) {
                                ctx.source.sendFailure(Text.literal('Solo jugadores.'))
                                return 0
                            }
                            var targetName = getCmdArgString(ctx, 'target')
                            var target = findPlayer(ctx.source.server, targetName)
                            if (!target) {
                                ctx.source.sendFailure(Text.literal('§cJugador no conectado: §f' + targetName))
                                return 0
                            }
                            var result = beginPendingWar(ctx.source.server, attacker, target, false)
                            if (result.ok) {
                                ctx.source.sendSuccess(Text.literal(result.msg), true)
                                return 1
                            }
                            ctx.source.sendFailure(Text.literal(result.msg))
                            return 0
                        } catch (declareErr) {
                            console.error('[War] /war declare: ' + declareErr)
                            ctx.source.sendFailure(Text.literal('§cError interno en /war declare. Revisa logs/kubejs/server.log'))
                            return 0
                        }
                    })
                )
            )

            .then(Commands.literal('accept')
                .executes(function(ctx) {
                    var defender = ctx.source.player
                    if (!defender) {
                        ctx.source.sendFailure(Text.literal('Solo jugadores.'))
                        return 0
                    }
                    var result = acceptWar(ctx.source.server, defender)
                    if (result.ok) {
                        ctx.source.sendSuccess(Text.literal(result.msg), true)
                        return 1
                    }
                    ctx.source.sendFailure(Text.literal(result.msg))
                    return 0
                })
            )

            .then(Commands.literal('stop')
                .requires(function(src) { return src.hasPermission(2) })
                .executes(function(ctx) {
                    if (!activeWar) {
                        ctx.source.sendFailure(Text.literal('§cNo hay guerra activa.'))
                        return 0
                    }
                    endWar(ctx.source.server, 'stop')
                    ctx.source.sendSuccess(Text.literal('§aGuerra detenida.'), true)
                    return 1
                })
            )

            .then(Commands.literal('cleanup')
                .requires(function(src) { return src.hasPermission(2) })
                .then(Commands.argument('playerA', Arguments.STRING.create(event))
                    .then(Commands.argument('playerB', Arguments.STRING.create(event))
                        .executes(function(ctx) {
                            var a = getCmdArgString(ctx, 'playerA')
                            var b = getCmdArgString(ctx, 'playerB')
                            var srv = ctx.source.server
                            if (activeWar) clearWarIntruderPermissionsForWar(srv, activeWar)
                            else restoreAllColonyWarIntruderPermissions()
                            var cleared = forceCleanupWarPair(srv, a, b)
                            removeWarJmWaypoint(srv, activeWar)
                            removeWarBossbars(ctx.source.server)
                            if (activeWar &&
                                (a.toLowerCase() === activeWar.attackerName.toLowerCase() ||
                                 b.toLowerCase() === activeWar.attackerName.toLowerCase() ||
                                 a.toLowerCase() === activeWar.defenderName.toLowerCase() ||
                                 b.toLowerCase() === activeWar.defenderName.toLowerCase())) {
                                activeWar = null
                                warTicks = 0
                            }
                            ctx.source.sendSuccess(Text.literal(
                                '§aRangos de guerra limpiados (' + cleared + '). Barras quitadas.'
                            ), true)
                            return 1
                        })
                    )
                )
                .executes(function(ctx) {
                    if (!activeWar) {
                        ctx.source.sendFailure(Text.literal(
                            '§cNo hay guerra activa. Usa: /war cleanup <jugador1> <jugador2>'
                        ))
                        return 0
                    }
                    var srv = ctx.source.server
                    clearWarIntruderPermissionsForWar(srv, activeWar)
                    var cleared = forceCleanupWarPair(srv, activeWar.attackerName, activeWar.defenderName)
                    removeWarJmWaypoint(srv, activeWar)
                    removeWarBossbars(srv)
                    activeWar = null
                    warTicks = 0
                    ctx.source.sendSuccess(Text.literal(
                        '§aGuerra colgada limpiada (' + cleared + ' rangos Hostil/Amigo → Neutral).'
                    ), true)
                    return 1
                })
            )

            .then(Commands.literal('sim')
                .requires(opOnly)
                .then(Commands.literal('start')
                    .executes(function(ctx) {
                        var player = ctx.source.player
                        if (!player) {
                            ctx.source.sendFailure(Text.literal('Solo jugadores.'))
                            return 0
                        }
                        var colony = getPlayerColony(player)
                        if (!colony) {
                            ctx.source.sendFailure(Text.literal('§cNecesitas una colonia MineColonies.'))
                            return 0
                        }
                        var result = beginPendingWar(ctx.source.server, player, player, true)
                        if (result.ok) {
                            ctx.source.sendSuccess(Text.literal(result.msg), true)
                            return 1
                        }
                        ctx.source.sendFailure(Text.literal(result.msg))
                        return 0
                    })
                )
                .then(Commands.literal('stop')
                    .executes(function(ctx) {
                        if (!activeWar || !activeWar.sim) {
                            ctx.source.sendFailure(Text.literal('§cNo hay simulación activa.'))
                            return 0
                        }
                        endWar(ctx.source.server, 'sim_stop')
                        ctx.source.sendSuccess(Text.literal('§aSimulación detenida.'), true)
                        return 1
                    })
                )
            )

            .then(Commands.literal('test')
                .requires(opOnly)

                .executes(testHelp)

                .then(Commands.literal('help')
                    .executes(testHelp)
                )

                .then(Commands.literal('fast')
                    .executes(function(ctx) {
                        warTestFast = !warTestFast
                        return testOk(ctx, 'Modo rapido: ' + (warTestFast ? 'ON' : 'OFF'))
                    })
                    .then(Commands.literal('on')
                        .executes(function(ctx) {
                            warTestFast = true
                            return testOk(ctx, 'Modo rapido ON (proxima guerra usa tiempos cortos).')
                        })
                    )
                    .then(Commands.literal('off')
                        .executes(function(ctx) {
                            warTestFast = false
                            return testOk(ctx, 'Modo rapido OFF.')
                        })
                    )
                )

                .then(Commands.literal('skip')
                    .executes(function(ctx) {
                        var srv = ctx.source.server
                        if (!activeWar || activeWar.phase === 'pending') {
                            return testFail(ctx, '§cNo hay guerra en prep/asalto.')
                        }
                        if (activeWar.phase === 'prep') {
                            startAssaultPhase(srv, activeWar)
                            return testOk(ctx, 'Prep saltada — asalto iniciado.')
                        }
                        endWar(srv, 'timeout')
                        return testOk(ctx, 'Asalto terminado (timeout).')
                    })
                )

                .then(Commands.literal('assault')
                    .executes(function(ctx) {
                        var srv = ctx.source.server
                        var err = warTestNeedPhase('prep')
                        if (err) return testFail(ctx, err)
                        if (activeWar.phase === 'assault') {
                            return testFail(ctx, '§cYa estas en asalto.')
                        }
                        startAssaultPhase(srv, activeWar)
                        return testOk(ctx, 'Asalto forzado.')
                    })
                )

                .then(Commands.literal('time')
                    .then(Commands.argument('seconds', Arguments.INTEGER.create(event))
                        .executes(function(ctx) {
                            var result = warTestSetTime(ctx.source.server, getCmdArgInt(ctx, 'seconds'))
                            if (result.ok) return testOk(ctx, result.msg)
                            return testFail(ctx, result.msg)
                        })
                    )
                )

                .then(Commands.literal('capfast')
                    .executes(function(ctx) {
                        warTestCaptureFast = !warTestCaptureFast
                        return testOk(ctx, 'Captura rapida: ' + (warTestCaptureFast ? 'ON' : 'OFF'))
                    })
                    .then(Commands.literal('on')
                        .executes(function(ctx) {
                            warTestCaptureFast = true
                            return testOk(ctx, 'Captura rapida ON.')
                        })
                    )
                    .then(Commands.literal('off')
                        .executes(function(ctx) {
                            warTestCaptureFast = false
                            return testOk(ctx, 'Captura rapida OFF.')
                        })
                    )
                )

                .then(Commands.literal('cap')
                    .then(Commands.argument('percent', Arguments.INTEGER.create(event))
                        .executes(function(ctx) {
                            var result = warTestSetCapturePct(ctx.source.server, getCmdArgInt(ctx, 'percent'))
                            if (result.ok) return testOk(ctx, result.msg)
                            return testFail(ctx, result.msg)
                        })
                    )
                )

                .then(Commands.literal('capdone')
                    .executes(function(ctx) {
                        var err = warTestNeedPhase('assault')
                        if (err) return testFail(ctx, err)
                        activeWar.captureProgress = WAR_CAPTURE_MAX
                        completeCurrentCapture(ctx.source.server, activeWar)
                        if (!activeWar) return testOk(ctx, 'Objetivo capturado — guerra terminada.')
                        return testOk(ctx, 'Objetivo capturado. Siguiente en mapa.')
                    })
                )

                .then(Commands.literal('win')
                    .executes(function(ctx) {
                        var err = warTestNeedPhase('assault')
                        if (err) return testFail(ctx, err)
                        activeWar.capturedCount = WAR_CAPTURE_COUNT
                        activeWar.captureIndex = WAR_CAPTURE_COUNT
                        endWar(ctx.source.server, 'attacker_win')
                        return testOk(ctx, 'Victoria atacante forzada.')
                    })
                )

                .then(Commands.literal('lose')
                    .executes(function(ctx) {
                        var err = warTestNeedPhase('assault')
                        if (err) return testFail(ctx, err)
                        endWar(ctx.source.server, 'timeout')
                        return testOk(ctx, 'Victoria defensor forzada (timeout).')
                    })
                )

                .then(Commands.literal('radius')
                    .then(Commands.argument('blocks', Arguments.INTEGER.create(event))
                        .executes(function(ctx) {
                            var n = getCmdArgInt(ctx, 'blocks')
                            if (n <= 0) {
                                warTestRadius = 0
                                return testOk(ctx, 'Radio normal: ' + WAR_RADIUS + ' bloques.')
                            }
                            if (n > 500) n = 500
                            warTestRadius = n
                            return testOk(ctx, 'Radio test: ' + n + ' bloques.')
                        })
                    )
                )

                .then(Commands.literal('reset')
                    .executes(function(ctx) {
                        warTestFast = false
                        warTestCaptureFast = false
                        warTestRadius = 0
                        return testOk(ctx, 'Test OFF — radio ' + WAR_RADIUS + ', captura normal.')
                    })
                )
            )
    )
})

// API compartida con war_death.js (Rhino no tiene globalThis)
var ArkcraftWar = {
    getActiveWar: function() { return activeWar },
    isWarCombatPhase: isWarCombatPhase,
    isWarParticipantName: isWarParticipantName,
    handleWarParticipantDeath: handleWarParticipantDeath,
    playerName: playerName,
    namesMatch: namesMatch,
    toMcPlayer: toMcPlayer,
    getSurfaceY: getSurfaceY
}

console.info('[War] Captura x4 cargada — /war declare|accept|status|stop|cleanup|sim|test')

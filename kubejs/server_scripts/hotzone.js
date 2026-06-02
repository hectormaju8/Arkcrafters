// ============================================================
// ARKCRAFT - Sistema de Hot Zones v7 (+ T4 BOMD)
// ============================================================

// ------------------------------------------------------------
// CONFIGURACIÓN
// ------------------------------------------------------------
var HZ_INTERVAL      = 20 * 60 * 20   // Ticks entre zonas (20 min)
var HZ_DURATION      = 20 * 60 * 5    // Duración T1–T3 (5 min)
var HZ_DURATION_L4   = 20 * 60 * 10   // Duración T4 (10 min — bosses BOMD)
var HZ_WAVE_INTERVAL = 20 * 20        // Revisar cap cada 20 seg
var HZ_SPAWN_RADIUS  = 30             // Radio de spawn alrededor del centro
var HZ_NOTIFY_RADIUS = 80             // Radio para alertar al jugador

// Zonas y jugadores nuevos aparecen en un cuadrado centrado en el spawn (0,0).
// HZ_AREA_HALF = medio lado: X/Z entre -500 y +500 → cuadrado de 1000x1000 bloques (hasta ~500 del centro).
// Sube/baja este número para agrandar o achicar el área.
var HZ_CENTER_X  = 0
var HZ_CENTER_Z  = 0
var HZ_AREA_HALF = 500
var HZ_COLONY_BUFFER = 160       // Min distancia (bloques) al centro de cualquier colonia MC
var HZ_COLONY_MAX_TRIES = 15     // Reintentos al elegir coords antes de fallback

var HzMinecoloniesAPI = null
try {
    HzMinecoloniesAPI = Java.loadClass('com.minecolonies.api.IMinecoloniesAPI')
} catch (loadErr) {
    console.warn('[HotZone] MineColonies API no disponible — sin filtro de colonias')
}

// Anti-lag: máximo 10 mobs vivos por zona en TODOS los tiers. Se rellenan hasta 10 cada oleada.
var HZ_CAP_L1  = 10   // Máximo mobs vivos nivel 1
var HZ_CAP_L2  = 10   // Máximo mobs vivos nivel 2
var HZ_CAP_L3  = 10   // Máximo mobs vivos nivel 3 (Mowzie's + vanilla)
var HZ_CAP_L4  = 10   // Máximo nivel 4 (incluye 1 boss BOMD)
var HZ_REFILL  = 10   // Rellenar hasta el cap mientras haya menos de 10 vivos

// Mowzie's — adds (oleadas). Jefes HZ T3 en HZ_T3_BOSSES.
var HZ_T3_ADDS = [
    'mowziesmobs:umvuthana',
    'mowziesmobs:naga',
    'mowziesmobs:foliaath',
    'mowziesmobs:bluff',
    'mowziesmobs:elokosa',
    // También monstruos vanilla en T3 (mezcla con los de Mowzie's)
    'minecraft:zombie',
    'minecraft:skeleton',
    'minecraft:spider'
]

var HZ_T3_BOSSES = [
    { id: 'mowziesmobs:sculptor',          label: 'Tongbi, the Sculptor' },
    { id: 'mowziesmobs:umvuthi',           label: 'Umvuthi, the Sunbird' },
    { id: 'mowziesmobs:frostmaw',          label: 'Frostmaw' },
    { id: 'mowziesmobs:ferrous_wroughtnaut', label: 'Ferrous Wroughtnaut' }
]

var HZ_T4_ADDS = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:spider']

var HZ_T4_BOSSES = [
    { id: 'bosses_of_mass_destruction:lich',         label: 'Night Lich' },
    { id: 'bosses_of_mass_destruction:gauntlet',     label: 'Nether Gauntlet' },
    { id: 'bosses_of_mass_destruction:obsidilith',   label: 'Obsidilith' },
    { id: 'bosses_of_mass_destruction:void_blossom', label: 'Void Blossom' }
]

// Monedas
var COIN_L1        = 'lightmanscurrency:coin_copper'
var COIN_L2        = 'lightmanscurrency:coin_iron'
var COIN_ELITE     = 'lightmanscurrency:coin_gold'
var COIN_L4_BOSS   = 'lightmanscurrency:coin_emerald'

// Únicos Jewelry — 1 aleatorio al matar jefe HZ T4 (BOMD)
var HZ_JEWELRY_UNIQUES = [
    'jewelry:unique_attack_ring', 'jewelry:unique_attack_necklace',
    'jewelry:unique_tank_ring', 'jewelry:unique_tank_necklace',
    'jewelry:unique_dex_ring', 'jewelry:unique_dex_necklace',
    'jewelry:unique_crit_ring', 'jewelry:unique_crit_necklace',
    'jewelry:unique_archer_ring', 'jewelry:unique_archer_necklace',
    'jewelry:unique_arcane_ring', 'jewelry:unique_arcane_necklace',
    'jewelry:unique_fire_ring', 'jewelry:unique_fire_necklace',
    'jewelry:unique_frost_ring', 'jewelry:unique_frost_necklace',
    'jewelry:unique_healing_ring', 'jewelry:unique_healing_necklace',
    'jewelry:unique_spell_ring', 'jewelry:unique_spell_necklace'
]

// ------------------------------------------------------------
// ESTADO
// ------------------------------------------------------------
var activeHotzone   = null
var lastEndTick     = 0
var ticks           = 0
var forcedLevel     = 0
var notifiedPlayers = {}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function zoneColor(level) {
    if (level === 1) return '§e'
    if (level === 2) return '§6'
    if (level === 3) return '§c'
    if (level === 4) return '§4§l'
    return '§4§l'
}

function hzDurationForLevel(level) {
    if (level === 4) return HZ_DURATION_L4
    return HZ_DURATION
}

function zoneName(level) {
    if (level === 1) return 'ZONA CALIENTE I'
    if (level === 2) return 'ZONA CALIENTE II'
    if (level === 3) return 'ZONA CALIENTE III'
    return 'ZONA CALIENTE IV'
}

var HeightmapTypes = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')

function getSurfaceY(srv, x, z) {
    try {
        var level = srv.getLevel('minecraft:overworld')
        if (!level) return 80
        var ix = Math.floor(x)
        var iz = Math.floor(z)
        var y = level.getHeight(HeightmapTypes.MOTION_BLOCKING_NO_LEAVES, ix, iz)
        if (y > level.getMinBuildHeight()) return y + 2
    } catch (err) {}
    return 80
}

// Sin espacios: evita bugs del parser de JM y del comando /waypoint
function jmWaypointName(level) {
    if (level === 1) return 'HZ-I'
    if (level === 2) return 'HZ-II'
    if (level === 3) return 'HZ-III'
    return 'HZ-IV'
}

function jmWaypointColor(level) {
    if (level === 1) return 'yellow'
    if (level === 2) return 'orange'
    if (level === 3) return 'red'
    return 'dark_red'
}

// JourneyMap 6.x: comandos bajo /jm waypoint (no "waypoint" a secas — el delete fallaba en silencio)
var JM_LEGACY_WAYPOINT_NAMES = ['Hot Zone I', 'Hot Zone II', 'Hot Zone III', 'Hot Zone IV']

function jmRun(srv, cmd, quiet) {
    try {
        var result = srv.runCommandSilent(cmd)
        if (!quiet) console.info('[HotZone] JM cmd: ' + cmd + ' -> ' + result)
        return result
    } catch (err) {
        console.warn('[HotZone] JM cmd failed: ' + cmd + ' — ' + err)
        return 0
    }
}

function removeJmWaypoint(srv, level) {
    var name = jmWaypointName(level)
    var toDelete = [name]
    for (var i = 0; i < JM_LEGACY_WAYPOINT_NAMES.length; i++) {
        toDelete.push(JM_LEGACY_WAYPOINT_NAMES[i])
    }
    for (var d = 0; d < toDelete.length; d++) {
        var wpName = toDelete[d]
        jmRun(srv, 'jm waypoint delete "' + wpName + '" @a')
        try {
            srv.getPlayerList().getPlayers().forEach(function(p) {
                var pn = String(p.username || '')
                if (pn) jmRun(srv, 'jm waypoint delete "' + wpName + '" ' + pn)
            })
        } catch (err) {}
    }
}

// Crea el marcador del mapa para UN jugador (por nombre — más fiable que @a en JourneyMap)
function createJmWaypointForPlayer(srv, zone, pname) {
    if (!pname || !zone.jmWaypoint) return
    // temp create = no persiste en disco; ideal para eventos cortos
    jmRun(srv, 'jm waypoint temp create "' + zone.jmWaypoint + '" minecraft:overworld ' +
        Math.floor(zone.x) + ' ' + zone.waypointY + ' ' + Math.floor(zone.z) + ' ' +
        jmWaypointColor(zone.level) + ' ' + pname, true)
}

function createJmWaypoint(srv, zone) {
    removeJmWaypoint(srv, zone.level)
    zone.waypointY = getSurfaceY(srv, zone.x, zone.z)
    zone.jmWaypoint = jmWaypointName(zone.level)
    // Crear para CADA jugador online: así el marcador le aparece a TODOS
    var created = 0
    try {
        srv.getPlayerList().getPlayers().forEach(function (p) {
            var pn = String(p.username || '')
            if (pn) { createJmWaypointForPlayer(srv, zone, pn); created++ }
        })
    } catch (e) {}
    // Respaldo @a por si no se pudo iterar la lista de jugadores
    if (created === 0) {
        jmRun(srv, 'jm waypoint temp create "' + zone.jmWaypoint + '" minecraft:overworld ' +
            Math.floor(zone.x) + ' ' + zone.waypointY + ' ' + Math.floor(zone.z) + ' ' +
            jmWaypointColor(zone.level) + ' @a')
    }
}

// Radio para considerar un mob "de la zona". Mas alla = huerfano (de zonas viejas / chunks descargados).
var HZ_STRAY_RADIUS = 120

// Cuenta SOLO los mobs de hot zone cerca de la zona activa (no global) → los huerfanos NO bloquean el spawn.
function countHotzoneMobs(srv, zone) {
    var count = 0
    try {
        var rSq = HZ_NOTIFY_RADIUS * HZ_NOTIFY_RADIUS
        srv.getLevel('minecraft:overworld').getEntities().forEach(function(e) {
            if (!e.tags.contains('hotzone_mob')) return
            if (!zone || distSqXZ(e.x, e.z, zone.x, zone.z) <= rSq) count++
        })
    } catch (e) {}
    return count
}

// ¿Hay algun jugador dentro del area de la zona? (spawnear solo cuando alguien llega = chunk cargado = mobs visibles)
function playerNearZone(srv, zone) {
    if (!zone) return false
    var near = false
    try {
        var rSq = HZ_NOTIFY_RADIUS * HZ_NOTIFY_RADIUS
        srv.getPlayerList().getPlayers().forEach(function(p) {
            if (near) return
            try { if (distSqXZ(p.getX(), p.getZ(), zone.x, zone.z) <= rSq) near = true } catch (eP) {}
        })
    } catch (e) {}
    return near
}

// Elimina (sin loot) los mobs de hot zone "huerfanos": sin zona activa o lejos de la zona actual.
// Arregla el bug de mobs con glow regados por el mapa (de zonas anteriores / chunks que se descargaron).
function cleanupStrayHotzoneMobs(srv) {
    try {
        var rSq = HZ_STRAY_RADIUS * HZ_STRAY_RADIUS
        var stray = []
        srv.getLevel('minecraft:overworld').getEntities().forEach(function(e) {
            if (!e.tags.contains('hotzone_mob')) return
            if (!activeHotzone || distSqXZ(e.x, e.z, activeHotzone.x, activeHotzone.z) > rSq) stray.push(e)
        })
        for (var i = 0; i < stray.length; i++) { try { stray[i].discard() } catch (eD) {} }
        if (stray.length > 0) console.info('[HotZone] Limpiados ' + stray.length + ' mobs huerfanos (glow fuera de zona)')
    } catch (e) {}
}

function distSqXZ(x1, z1, x2, z2) {
    var dx = x1 - x2
    var dz = z1 - z2
    return dx * dx + dz * dz
}

function isTooCloseToAnyColony(x, z) {
    if (!HzMinecoloniesAPI) return false
    var bufferSq = HZ_COLONY_BUFFER * HZ_COLONY_BUFFER
    try {
        var manager = HzMinecoloniesAPI.getInstance().getColonyManager()
        var colonies = manager.getAllColonies()
        var iter = colonies.iterator()
        while (iter.hasNext()) {
            var colony = iter.next()
            var center = colony.getCenter()
            if (!center) continue
            if (distSqXZ(x, z, center.getX(), center.getZ()) < bufferSq) return true
        }
    } catch (err) {
        console.warn('[HotZone] colony check: ' + err)
    }
    return false
}

// Punto al azar dentro del cuadrado centrado en el spawn (0,0)
function pickRandomInArea(level) {
    return {
        level: level,
        x: HZ_CENTER_X + randInt(-HZ_AREA_HALF, HZ_AREA_HALF),
        z: HZ_CENTER_Z + randInt(-HZ_AREA_HALF, HZ_AREA_HALF)
    }
}

// Elige coords de zona dentro del área, evitando caer encima de una colonia
function randomZoneInArea(srv, level) {
    var last = null
    for (var attempt = 0; attempt < HZ_COLONY_MAX_TRIES; attempt++) {
        last = pickRandomInArea(level)
        if (!isTooCloseToAnyColony(last.x, last.z)) return last
    }
    if (last) {
        console.warn('[HotZone] Sin coords lejos de colonias tras ' + HZ_COLONY_MAX_TRIES +
            ' intentos — usando ultima candidata X:' + last.x + ' Z:' + last.z)
        return last
    }
    return { level: level, x: HZ_CENTER_X, z: HZ_CENTER_Z }
}

// ------------------------------------------------------------
// ANUNCIOS
// ------------------------------------------------------------
function broadcastStart(srv, zone) {
    var c = zoneColor(zone.level)
    var n = zoneName(zone.level)
    var mins = Math.floor((zone.duration || HZ_DURATION) / (20 * 60))
    srv.tell(c + '§l⚔ ' + n + ' §r§7en §bX: ' + zone.x + ' Z: ' + zone.z + ' §7(dura ' + mins + ' min) — sigue el §fmarcador de tu mapa§7.')
    srv.tell('§cCuidado: ahí puedes pelear con otros jugadores y, si mueres, sueltas parte de tus cosas.')
}

function broadcastEnd(srv, zone) {
    srv.tell(zoneColor(zone.level) + '§l⚔ §r§7La ' + zoneName(zone.level) + ' se acabó. El marcador desaparece del mapa.')
}

function endHotzone(srv, zone) {
    if (!zone) return
    broadcastEnd(srv, zone)
    removeJmWaypoint(srv, zone.level)
    removeBossbar(srv)
    despawnHotzoneEntities(srv)
    lastEndTick = ticks
    activeHotzone = null
    notifiedPlayers = {}
}

// Quita mobs de la HZ sin matarlos — evita loot de bosses BOMD/Mowzie al terminar o /stop
function despawnHotzoneEntities(srv) {
    var removed = 0
    try {
        var level = srv.getLevel('minecraft:overworld')
        if (!level) return
        var pending = []
        level.getEntities().forEach(function(e) {
            if (e.tags.contains('hotzone_mob')) pending.push(e)
        })
        for (var i = 0; i < pending.length; i++) {
            try {
                pending[i].discard()
                removed++
            } catch (inner) {
                console.warn('[HotZone] discard failed: ' + inner)
            }
        }
        console.info('[HotZone] Despawned ' + removed + ' entities (sin loot)')
    } catch (err) {
        console.warn('[HotZone] despawn failed, fallback kill sin drops: ' + err)
        srv.runCommandSilent('tag @e[tag=hotzone_mob] add hotzone_nodrop')
        srv.runCommandSilent('kill @e[tag=hotzone_mob]')
    }
}

// ------------------------------------------------------------
// SPAWNER
// Sin efectos en el NBT del summon — se aplican via EntityEvents.spawned
// ------------------------------------------------------------
// Spawn en Y=320 para adds terrestres (caen sin dano). Jefes van al suelo (BOMD vuela).
function spawnMob(srv, mob, zoneX, zoneZ, tags, extraNbt, opts) {
    opts = opts || {}
    var mx = opts.skipRadius ? zoneX : zoneX + randInt(-HZ_SPAWN_RADIUS, HZ_SPAWN_RADIUS)
    var mz = opts.skipRadius ? zoneZ : zoneZ + randInt(-HZ_SPAWN_RADIUS, HZ_SPAWN_RADIUS)
    var my = opts.onGround ? getSurfaceY(srv, mx, mz) : 320

    var tagList = ''
    for (var i = 0; i < tags.length; i++) {
        if (i > 0) tagList += ','
        tagList += '"' + tags[i] + '"'
    }

    var suffix = extraNbt || ''
    if (!suffix && mob === 'minecraft:skeleton') {
        suffix = ',HandItems:[{id:"minecraft:bow",count:1,tag:{Enchantments:[{id:"minecraft:flame",lvl:1s}]}},{}]'
    }

    var fallNbt = opts.onGround ? ',OnGround:1b,NoGravity:0b' : ',FallDistance:-9999.0f'

    srv.runCommandSilent(
        'summon ' + mob + ' ' + mx + ' ' + my + ' ' + mz +
        ' {Tags:[' + tagList + '],PersistenceRequired:1b' + fallNbt + suffix + '}'
    )
}

function snapBossToSurface(entity, srv) {
    try {
        if (!entity || !entity.tags.contains('hotzone_boss')) return
        var x = entity.getX()
        var z = entity.getZ()
        var surface = getSurfaceY(srv, x, z)
        if (entity.getY() <= surface + 4) return
        var mc = entity.getEntity()
        mc.moveTo(x + 0.5, surface, z + 0.5, mc.getYRot(), mc.getXRot())
        mc.setOnGround(true)
        mc.fallDistance = 0
        mc.setNoGravity(false)
    } catch (err) {
        console.warn('[HotZone] snapBossToSurface: ' + err)
    }
}

function spawnT3Boss(srv, zone) {
    var pick = HZ_T3_BOSSES[randInt(0, HZ_T3_BOSSES.length - 1)]
    zone.bossId = pick.id
    zone.bossLabel = pick.label
    var ex = zone.x + randInt(-12, 12)
    var ez = zone.z + randInt(-12, 12)
    var nameJson = '{"text":"[JEFE] ' + pick.label + '","color":"gold","bold":true}'
    spawnMob(srv, pick.id, ex, ez, ['hotzone_mob', 'hotzone_level_3', 'hotzone_elite', 'hotzone_boss'],
        ',CustomName:\'' + nameJson + '\',CustomNameVisible:1b',
        { onGround: true, skipRadius: true })
    srv.runCommandSilent('team add hz_elite_red')
    srv.runCommandSilent('team modify hz_elite_red color red')
    srv.runCommandSilent('team join hz_elite_red @e[tag=hotzone_boss]')
    srv.tell('§4§l⚔ ¡Apareció un JEFE! §r§6' + pick.label + ' §7en §bX: ' + zone.x + ' Z: ' + zone.z)
}

function spawnT4Boss(srv, zone) {
    var pick = HZ_T4_BOSSES[randInt(0, HZ_T4_BOSSES.length - 1)]
    zone.bossId = pick.id
    zone.bossLabel = pick.label
    var ex = zone.x + randInt(-12, 12)
    var ez = zone.z + randInt(-12, 12)
    var nameJson = '{"text":"[JEFE] ' + pick.label + '","color":"dark_red","bold":true}'
    spawnMob(srv, pick.id, ex, ez, ['hotzone_mob', 'hotzone_level_4', 'hotzone_elite', 'hotzone_boss'],
        ',CustomName:\'' + nameJson + '\',CustomNameVisible:1b',
        { onGround: true, skipRadius: true })
    srv.runCommandSilent('team add hz_elite_red')
    srv.runCommandSilent('team modify hz_elite_red color red')
    srv.runCommandSilent('team join hz_elite_red @e[tag=hotzone_boss]')
    srv.tell('§4§l⚔ ¡JEFE FINAL! §r§4§l' + pick.label + ' §r§7en §bX: ' + zone.x + ' Z: ' + zone.z)
}

function spawnElite(srv, zoneX, zoneZ) {
    var ex = zoneX + randInt(-12, 12)
    var ez = zoneZ + randInt(-12, 12)

    srv.runCommandSilent(
        'summon minecraft:zombie ' + ex + ' 320 ' + ez + ' {' +
        'CustomName:\'{"text":"[ELITE] Corrompido","color":"red","bold":true}\',' +
        'CustomNameVisible:1b,' +
        'PersistenceRequired:1b,' +
        'FallDistance:-9999.0f,' +
        'Tags:["hotzone_mob","hotzone_level_2","hotzone_elite"],' +
        'Attributes:[' +
            '{id:"minecraft:max_health",base:200.0},' +
            '{id:"minecraft:attack_damage",base:10.0},' +
            '{id:"minecraft:armor",base:20.0},' +
            '{id:"minecraft:movement_speed",base:0.3}' +
        '],' +
        'Health:200.0f,' +
        'ArmorItems:[' +
            '{id:"minecraft:diamond_boots",count:1},' +
            '{id:"minecraft:diamond_leggings",count:1},' +
            '{id:"minecraft:diamond_chestplate",count:1},' +
            '{id:"minecraft:diamond_helmet",count:1}' +
        '],' +
        'HandItems:[{id:"minecraft:diamond_sword",count:1,tag:{Enchantments:[{id:"minecraft:sharpness",lvl:3s},{id:"minecraft:fire_aspect",lvl:1s}]}},{}]}'
    )
}

function hzCapForLevel(level) {
    if (level === 1) return HZ_CAP_L1
    if (level === 2) return HZ_CAP_L2
    if (level === 3) return HZ_CAP_L3
    if (level === 4) return HZ_CAP_L4
    return HZ_CAP_L2
}

function spawnWave(srv, zone) {
    // Solo spawnear si hay un jugador en la zona (chunk cargado): asi los mobs caen y se ven al llegar,
    // y no se quedan congelados en Y=320 dentro de chunks sin tick cuando nadie esta cerca.
    if (!playerNearZone(srv, zone)) return

    var mobCount = countHotzoneMobs(srv, zone)
    var cap = hzCapForLevel(zone.level)

    if (mobCount >= HZ_REFILL) return

    var toSpawn = cap - mobCount

    if (zone.level === 1) {
        var mobs1 = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:spider']
        for (var i = 0; i < toSpawn; i++) {
            spawnMob(srv, mobs1[randInt(0, mobs1.length - 1)],
                zone.x, zone.z, ['hotzone_mob', 'hotzone_level_1'])
        }

    } else if (zone.level === 2) {
        var mobs2 = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:spider']
        for (var j = 0; j < toSpawn; j++) {
            spawnMob(srv, mobs2[randInt(0, mobs2.length - 1)],
                zone.x, zone.z, ['hotzone_mob', 'hotzone_level_2'])
        }
        if (!zone.eliteSpawned) {
            spawnElite(srv, zone.x, zone.z)
            zone.eliteSpawned = true
            srv.runCommandSilent('team add hz_elite_red')
            srv.runCommandSilent('team modify hz_elite_red color red')
            srv.runCommandSilent('team join hz_elite_red @e[tag=hotzone_elite]')
            srv.tell('§4§l⚠ §r§cApareció un monstruo más fuerte en §bX: ' + zone.x + ' Z: ' + zone.z)
        }

    } else if (zone.level === 3) {
        for (var k = 0; k < toSpawn; k++) {
            spawnMob(srv, HZ_T3_ADDS[randInt(0, HZ_T3_ADDS.length - 1)],
                zone.x, zone.z, ['hotzone_mob', 'hotzone_level_3'])
        }
        if (!zone.eliteSpawned) {
            spawnT3Boss(srv, zone)
            zone.eliteSpawned = true
        }

    } else if (zone.level === 4) {
        for (var m = 0; m < toSpawn; m++) {
            spawnMob(srv, HZ_T4_ADDS[randInt(0, HZ_T4_ADDS.length - 1)],
                zone.x, zone.z, ['hotzone_mob', 'hotzone_level_4'])
        }
        if (!zone.eliteSpawned) {
            spawnT4Boss(srv, zone)
            zone.eliteSpawned = true
        }
    }
}

// Bossbar ID único
var HZ_BOSSBAR = 'arkcraft:hotzone'

function bossbarColor(level) {
    if (level === 1) return 'yellow'
    if (level === 2) return 'red'
    if (level === 3) return 'purple'
    if (level === 4) return 'dark_red'
    return 'purple'
}

function createBossbar(srv, zone) {
    srv.runCommandSilent('bossbar add ' + HZ_BOSSBAR + ' "' + zoneName(zone.level) + '"')
    srv.runCommandSilent('bossbar set ' + HZ_BOSSBAR + ' color ' + bossbarColor(zone.level))
    srv.runCommandSilent('bossbar set ' + HZ_BOSSBAR + ' style progress')
    srv.runCommandSilent('bossbar set ' + HZ_BOSSBAR + ' max ' + zone.duration)
    srv.runCommandSilent('bossbar set ' + HZ_BOSSBAR + ' value ' + zone.duration)
    // Solo jugadores dentro del radio ven la barra
    srv.runCommandSilent('bossbar set ' + HZ_BOSSBAR + ' players @a[x=' + zone.x + ',y=64,z=' + zone.z + ',distance=..' + HZ_NOTIFY_RADIUS + ']')
    srv.runCommandSilent('bossbar set ' + HZ_BOSSBAR + ' visible true')
}

// Actualiza qué jugadores ven la bossbar según su distancia a la zona
function updateBossbarPlayers(srv, zone) {
    srv.runCommandSilent('bossbar set ' + HZ_BOSSBAR + ' players @a[x=' + zone.x + ',y=64,z=' + zone.z + ',distance=..' + HZ_NOTIFY_RADIUS + ']')
}

function updateBossbar(srv, remaining) {
    var mins = Math.floor(remaining / (20 * 60))
    var secs = Math.floor((remaining % (20 * 60)) / 20)
    var timeStr = mins + ':' + (secs < 10 ? '0' + secs : secs)
    srv.runCommandSilent('bossbar set ' + HZ_BOSSBAR + ' value ' + remaining)
    srv.runCommandSilent('bossbar set ' + HZ_BOSSBAR + ' name "' + zoneName(activeHotzone.level) + ' — ' + timeStr + '"')
}

function removeBossbar(srv) {
    srv.runCommandSilent('bossbar remove ' + HZ_BOSSBAR)
}

// ------------------------------------------------------------
// NOTIFICACIÓN AL ENTRAR — avisa al jugador Y broadcast a todos
// ------------------------------------------------------------
function checkPlayersInZone(srv, zone) {
    try {
        srv.getPlayerList().getPlayers().forEach(function(p) {
            var name = p.username
            if (!name) return
            if (notifiedPlayers[name]) return
            var dx = p.getX() - zone.x
            var dz = p.getZ() - zone.z
            if (Math.sqrt(dx * dx + dz * dz) <= HZ_NOTIFY_RADIUS) {
                notifiedPlayers[name] = true
                // Solo aviso privado a quien entra (sin spam global en el chat)
                p.tell(zoneColor(zone.level) + '§l⚠ §r§7Entraste a la ' + zoneName(zone.level) +
                    '§7. Los monstruos que §ebrillan §7son de aquí. Puedes pelear con otros jugadores.')
            }
        })
    } catch (e) {}
}

// ------------------------------------------------------------
// TICK PRINCIPAL
// ------------------------------------------------------------
ServerEvents.tick(event => {
    try {
        ticks++
        var srv = event.server

        if (!activeHotzone) {
            var targetLevel = 0
            if (forcedLevel > 0) {
                targetLevel = forcedLevel
                forcedLevel = 0
            } else if (ticks - lastEndTick >= HZ_INTERVAL) {
                var roll = Math.random()
                if (roll < 0.45) targetLevel = 1
                else if (roll < 0.75) targetLevel = 2
                else if (roll < 0.90) targetLevel = 3
                else targetLevel = 4
            }

            if (targetLevel > 0) {
                var zd = randomZoneInArea(srv, targetLevel)
                activeHotzone = {
                    level:        zd.level,
                    x:            zd.x,
                    z:            zd.z,
                    startTick:    ticks,
                    duration:     hzDurationForLevel(zd.level),
                    eliteSpawned: false
                }
                notifiedPlayers = {}
                createJmWaypoint(srv, activeHotzone)
                broadcastStart(srv, activeHotzone)
                createBossbar(srv, activeHotzone)
            }
        }

        if (activeHotzone && ticks % HZ_WAVE_INTERVAL === 0) {
            spawnWave(srv, activeHotzone)
        }

        // Actualizar bossbar cada segundo
        if (activeHotzone && ticks % 20 === 0) {
            var remaining = activeHotzone.duration - (ticks - activeHotzone.startTick)
            updateBossbar(srv, remaining)
            updateBossbarPlayers(srv, activeHotzone)
        }

        if (activeHotzone && ticks % 60 === 0) {
            checkPlayersInZone(srv, activeHotzone)
        }

        // Limpieza de mobs huerfanos (glow fuera de zona) cada ~10 s — corre haya o no zona activa
        if (ticks % 200 === 0) {
            cleanupStrayHotzoneMobs(srv)
        }

        if (activeHotzone && (ticks - activeHotzone.startTick) >= activeHotzone.duration) {
            endHotzone(srv, activeHotzone)
        }
    } catch (e) {
        console.error('[HotZone] tick error: ' + e)
    }
})

PlayerEvents.loggedIn(function (event) {
    var p = event.player
    var srv = event.server

    // 1) Jugador NUEVO (primera vez): aparece en un punto al azar del área, en suelo seguro.
    //    spreadplayers lo coloca sobre el suelo (no en cuevas/lava) dentro de HZ_AREA_HALF del spawn.
    try {
        var pd = p.persistentData
        if (!pd.getBoolean('arkcraft_initial_spawn_done')) {
            pd.putBoolean('arkcraft_initial_spawn_done', true)
            var nm = String(p.username || '')
            if (nm) {
                srv.runCommandSilent('spreadplayers ' + HZ_CENTER_X + ' ' + HZ_CENTER_Z + ' 0 ' + HZ_AREA_HALF + ' false ' + nm)
                p.tell('§6[Arkcraft] §7Apareciste en un punto al azar cerca del centro del mundo.')
            }
        }
    } catch (eSpawn) { console.warn('[HotZone] spawn inicial: ' + eSpawn) }

    // 2) Si hay una zona activa, dale también el marcador del mapa.
    if (!activeHotzone) return
    try {
        var pn = String(p.username || '')
        if (pn) createJmWaypointForPlayer(srv, activeHotzone, pn)
    } catch (e) {}
})

// ------------------------------------------------------------
// GLOW + EQUIPAMIENTO al spawnear
// ------------------------------------------------------------
EntityEvents.spawned(event => {
    try {
        var entity = event.entity
        if (!entity.tags.contains('hotzone_mob')) return

        // Huerfano: sin zona activa o lejos de la zona actual → eliminar (sin loot).
        // Pasa al cargarse un chunk con mobs de zonas viejas; antes quedaban con glow regados por el mapa.
        var strayRSq = HZ_STRAY_RADIUS * HZ_STRAY_RADIUS
        if (!activeHotzone || distSqXZ(entity.x, entity.z, activeHotzone.x, activeHotzone.z) > strayRSq) {
            try { entity.discard() } catch (eD) {}
            return
        }

        if (entity.tags.contains('hotzone_boss')) {
            snapBossToSurface(entity, event.server)
        }
        entity.potionEffects.add('minecraft:glowing', 999999, 0, false, false)
    } catch (e) {
        console.error('[HotZone] spawned error: ' + e)
    }
})

// ------------------------------------------------------------
// ANTI-FARM + DROPS DE MONEDAS
// Limpieza al terminar: discard() (no kill) — ver despawnHotzoneEntities()
// hotzone_nodrop = red de seguridad si algun kill queda activo
// ------------------------------------------------------------
EntityEvents.drops(event => {
    try {
        var entity = event.entity
        if (!entity.tags.contains('hotzone_mob')) return

        if (entity.tags.contains('hotzone_nodrop')) {
            try {
                if (event.drops && event.drops.clear) event.drops.clear()
                else if (event.getDrops) event.getDrops().clear()
            } catch (clearErr) {}
            return
        }

        var coin = null
        var amount = 0

        // Rebalance 30d (2026-05-31): subir volumen para que el casual toque el cap de gasto (~2k CEV/h activos).
        if (entity.tags.contains('hotzone_level_1')) {
            coin = COIN_L1
            amount = randInt(1, 3)
        } else if (entity.tags.contains('hotzone_level_2')) {
            if (entity.tags.contains('hotzone_elite')) {
                coin = COIN_ELITE
                amount = randInt(2, 3)
            } else {
                coin = COIN_L2
                amount = randInt(1, 2)
            }
        } else if (entity.tags.contains('hotzone_level_3')) {
            if (entity.tags.contains('hotzone_elite') || entity.tags.contains('hotzone_boss')) {
                coin = COIN_ELITE
                amount = randInt(4, 6)
            } else {
                coin = COIN_L2
                amount = randInt(2, 3)
            }
        } else if (entity.tags.contains('hotzone_level_4')) {
            if (entity.tags.contains('hotzone_elite') || entity.tags.contains('hotzone_boss')) {
                // Temporada 30d: sin esmeralda en drop mob (cap/PvP); oro + joya única
                coin = COIN_ELITE
                amount = randInt(5, 7)
            } else {
                coin = COIN_L2
                amount = randInt(3, 4)
            }
        }

        if (coin && amount > 0) {
            // Catch-up por jugador: si el que mata va detrás de la curva de gasto, +monedas (solo a él).
            var hzMult = 1.0
            try {
                var killer = (event.source && event.source.player) ? event.source.player : null
                if (killer && typeof ArkcraftEconomy !== 'undefined' && ArkcraftEconomy.getCatchupMultiplier) {
                    hzMult = ArkcraftEconomy.getCatchupMultiplier(killer)
                }
            } catch (eMult) {}
            if (hzMult > 1.0) amount = Math.round(amount * hzMult)
            event.addDrop(Item.of(coin, amount))
        }

        // Jefe T4: accesorio único aleatorio (además de monedas)
        if (entity.tags.contains('hotzone_level_4') && entity.tags.contains('hotzone_boss')) {
            var uniquePick = HZ_JEWELRY_UNIQUES[randInt(0, HZ_JEWELRY_UNIQUES.length - 1)]
            event.addDrop(Item.of(uniquePick, 1))
        }

        // Hitos: derrotar jefes de Hot Zone (otorga al jugador que lo mata)
        try {
            var hkiller = (event.source && event.source.player) ? event.source.player : null
            if (hkiller) {
                if (entity.tags.contains('hotzone_level_3') && (entity.tags.contains('hotzone_boss') || entity.tags.contains('hotzone_elite'))) {
                    hkiller.runCommandSilent('advancement grant @s only arkcraft:hitos/jefe_t3')
                }
                if (entity.tags.contains('hotzone_level_4') && entity.tags.contains('hotzone_boss')) {
                    hkiller.runCommandSilent('advancement grant @s only arkcraft:hitos/jefe_t4')
                    hkiller.runCommandSilent('advancement grant @s only arkcraft:hitos/joyero')
                }
            }
        } catch (eHito) {}
    } catch (e) {
        console.error('[HotZone] drop error: ' + e)
    }
})

// ------------------------------------------------------------
// COMANDOS /hotzone
// ------------------------------------------------------------
ServerEvents.commandRegistry(event => {
    var Commands = event.commands

    event.register(
        Commands.literal('hotzone')

            .then(Commands.literal('info')
                .requires(function(src) { return src.hasPermission(2) })
                .executes(function(ctx) {
                    if (activeHotzone) {
                        var rem = Math.floor((activeHotzone.duration - (ticks - activeHotzone.startTick)) / 20)
                        ctx.source.sendSuccess(
                            Text.literal('§eZona activa: §fNivel ' + activeHotzone.level +
                                ' — §bX: ' + activeHotzone.x + '  Z: ' + activeHotzone.z +
                                ' §7— ' + rem + 's restantes'), false)
                    } else {
                        ctx.source.sendSuccess(Text.literal('§7No hay hot zone activa.'), false)
                    }
                    return 1
                })
            )

            .then(Commands.literal('stop')
                .requires(function(src) { return src.hasPermission(2) })
                .executes(function(ctx) {
                    if (!activeHotzone) {
                        ctx.source.sendFailure(Text.literal('§cNo hay zona activa.'))
                        return 0
                    }
                    endHotzone(ctx.source.server, activeHotzone)
                    ctx.source.sendSuccess(Text.literal('§aHot Zone detenida.'), true)
                    return 1
                })
            )

            .then(Commands.literal('spawn1')
                .requires(function(src) { return src.hasPermission(2) })
                .executes(function(ctx) {
                    if (activeHotzone) {
                        ctx.source.sendFailure(Text.literal('§cYa hay zona activa. Usa /hotzone stop primero.'))
                        return 0
                    }
                    forcedLevel = 1
                    ctx.source.sendSuccess(Text.literal('§aActivando Hot Zone nivel 1...'), true)
                    return 1
                })
            )

            .then(Commands.literal('spawn2')
                .requires(function(src) { return src.hasPermission(2) })
                .executes(function(ctx) {
                    if (activeHotzone) {
                        ctx.source.sendFailure(Text.literal('§cYa hay zona activa. Usa /hotzone stop primero.'))
                        return 0
                    }
                    forcedLevel = 2
                    ctx.source.sendSuccess(Text.literal('§aActivando Hot Zone nivel 2...'), true)
                    return 1
                })
            )

            .then(Commands.literal('spawn3')
                .requires(function(src) { return src.hasPermission(2) })
                .executes(function(ctx) {
                    if (activeHotzone) {
                        ctx.source.sendFailure(Text.literal('§cYa hay zona activa. Usa /hotzone stop primero.'))
                        return 0
                    }
                    forcedLevel = 3
                    ctx.source.sendSuccess(Text.literal('§aActivando Hot Zone nivel 3 (Mowzie\'s)...'), true)
                    return 1
                })
            )

            .then(Commands.literal('spawn4')
                .requires(function(src) { return src.hasPermission(2) })
                .executes(function(ctx) {
                    if (activeHotzone) {
                        ctx.source.sendFailure(Text.literal('§cYa hay zona activa. Usa /hotzone stop primero.'))
                        return 0
                    }
                    forcedLevel = 4
                    ctx.source.sendSuccess(Text.literal('§aActivando Hot Zone nivel 4 (BOMD — 10 min)...'), true)
                    return 1
                })
            )
    )
})

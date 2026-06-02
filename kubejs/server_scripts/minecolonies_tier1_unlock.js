// MineColonies no ejecuta autostart al fundar colonia (solo al recargar mundo).
// Rhino/KubeJS: un solo scope por archivo — usar var + nombres unicos (no const/let locales repetidos).

var IMinecoloniesAPI = Java.loadClass('com.minecolonies.api.IMinecoloniesAPI')
var IGlobalResearchTree = Java.loadClass('com.minecolonies.api.research.IGlobalResearchTree')
var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
var ResearchState = Java.loadClass('com.minecolonies.api.research.util.ResearchState')
var LocalResearch = Java.loadClass('com.minecolonies.core.research.LocalResearch')

var ARKCRAFT_NS = 'arkcraft'

var ARKCRAFT_BLOCKHUT_EFFECTS = [
  'minecolonies:effects/blockhuttownhall',
  'minecolonies:effects/blockhutuniversity',
  'minecolonies:effects/blockhutwarehouse',
  'minecolonies:effects/blockhutbuilder',
  'minecolonies:effects/blockhutfarmer',
  'minecolonies:effects/blockhutminer',
  'minecolonies:effects/blockhutlumberjack',
  'minecolonies:effects/blockhutfisherman'
]

var pendingUnlock = {}
var loginUnlockTicks = 0

function getColonyManager() {
  return IMinecoloniesAPI.getInstance().getColonyManager()
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
  try {
    return mcPlayer.level()
  } catch (e1) {}
  try {
    return mcPlayer.level
  } catch (e2) {}
  return null
}

function getPlayerUuid(player) {
  var mcPlayer = toMcPlayer(player)
  if (!mcPlayer) return null
  try { return mcPlayer.getUUID() } catch (e1) {}
  try { return mcPlayer.uuid } catch (e2) {}
  return null
}

function getColonyByOwner(level, player) {
  var uuid = getPlayerUuid(player)
  if (!level || !uuid) return null
  return getColonyManager().getIColonyByOwner(level, uuid)
}

function getArkcraftAutostartResearches() {
  var garTree = IGlobalResearchTree.getInstance()
  var garSet = garTree.getAutostartResearches()
  var garOut = []
  var garIter = garSet.iterator()
  while (garIter.hasNext()) {
    var garResearch = garIter.next()
    if (garResearch.getId().getNamespace() !== ARKCRAFT_NS) continue
    if (!garResearch.isInstant()) continue
    garOut.push(garResearch)
  }
  return garOut
}

function colonyNeedsTier1Unlock(colony) {
  var cntEffects = colony.getResearchManager().getResearchEffects()
  var cntTree = IGlobalResearchTree.getInstance()
  for (var cntIdx = 0; cntIdx < ARKCRAFT_BLOCKHUT_EFFECTS.length; cntIdx++) {
    var cntEffectId = ResourceLocation.parse(ARKCRAFT_BLOCKHUT_EFFECTS[cntIdx])
    if (!cntTree.hasResearchEffect(cntEffectId)) continue
    if (cntEffects.getEffectStrength(cntEffectId) < 1) return true
  }
  return false
}

function unlockColonyTier1(colony) {
  if (!colony) return

  var uctRm = colony.getResearchManager()
  uctRm.checkAutoStartResearch()

  var uctGlobalTree = IGlobalResearchTree.getInstance()
  var uctLocalTree = uctRm.getResearchTree()
  var uctEffects = uctRm.getResearchEffects()
  var uctResearches = getArkcraftAutostartResearches()

  for (var uctIdx = 0; uctIdx < uctResearches.length; uctIdx++) {
    var uctResearch = uctResearches[uctIdx]
    var uctFullId = uctResearch.getId()

    if (uctLocalTree.hasCompletedResearch(uctFullId)) continue
    if (!uctGlobalTree.isResearchRequirementsFulfilled(uctResearch.getResearchRequirements(), colony)) continue

    var uctBranch = uctResearch.getBranch()
    var uctDepth = uctResearch.getDepth()
    uctLocalTree.addResearch(uctBranch, new LocalResearch(uctResearch.getId(), uctBranch, uctDepth))

    if (!uctResearch.isInstant()) continue

    var uctLocal = uctLocalTree.getResearch(uctBranch, uctResearch.getId())
    if (!uctLocal) continue

    uctLocal.setProgress(uctGlobalTree.getBranchData(uctBranch).getBaseTime(uctDepth))
    uctLocal.setState(ResearchState.FINISHED)
    uctLocalTree.finishResearch(uctResearch.getId())

    var uctEffectList = uctResearch.getEffects()
    for (var uctJ = 0; uctJ < uctEffectList.size(); uctJ++) {
      uctEffects.applyEffect(uctEffectList.get(uctJ))
    }
  }

  uctRm.markDirty()
  colony.markDirty()
}

function forEachColony(fn) {
  try {
    var fecIter = getColonyManager().getAllColonies().iterator()
    while (fecIter.hasNext()) fn(fecIter.next())
  } catch (fecErr) {
    console.warn('[Arkcraft] forEachColony: ' + fecErr)
  }
}

function unlockOnlinePlayerColonies(server) {
  var uopPlayers = server.players
  for (var uopIdx = 0; uopIdx < uopPlayers.size(); uopIdx++) {
    var uopPlayer = uopPlayers.get(uopIdx)
    var uopLevel = getPlayerLevel(uopPlayer)
    if (!uopLevel) continue
    var uopColony = getColonyByOwner(uopLevel, uopPlayer)
    if (uopColony) unlockColonyTier1(uopColony)
  }
}

function scheduleColonyUnlock(level, pos, ticksLeft) {
  var scuDim = String(level.dimension)
  pendingUnlock[scuDim + ':' + pos.x + ',' + pos.y + ',' + pos.z] = {
    level: level,
    pos: pos,
    ticksLeft: ticksLeft
  }
}

ServerEvents.loaded(function (event) {
  forEachColony(unlockColonyTier1)
  unlockOnlinePlayerColonies(event.server)
})

PlayerEvents.loggedIn(function (event) {
  loginUnlockTicks = 40
  var pelLevel = getPlayerLevel(event.player)
  if (!pelLevel) return
  var pelColony = getColonyByOwner(pelLevel, event.player)
  if (pelColony) unlockColonyTier1(pelColony)
})

BlockEvents.placed(function (event) {
  if (event.level.isClientSide()) return
  var bplBlockId = String(event.block.id)
  if (!bplBlockId.startsWith('minecolonies:blockhut')) return

  var bplLevel = event.level
  var bplPos = event.block.pos

  var bplColony = getColonyManager().getIColony(bplLevel, bplPos)
  if (bplColony) {
    unlockColonyTier1(bplColony)
    return
  }

  if (bplBlockId === 'minecolonies:blockhuttownhall') {
    scheduleColonyUnlock(bplLevel, bplPos, 100)
  }
})

ServerEvents.tick(function (event) {
  var stkTick = event.server.tickCount
  if (stkTick % 5 !== 0) return

  if (loginUnlockTicks > 0) {
    loginUnlockTicks -= 5
    if (loginUnlockTicks <= 0) {
      forEachColony(function (stkColonyA) {
        if (colonyNeedsTier1Unlock(stkColonyA)) unlockColonyTier1(stkColonyA)
      })
      unlockOnlinePlayerColonies(event.server)
    }
  }

  var stkKeys = Object.keys(pendingUnlock)
  for (var stkKi = 0; stkKi < stkKeys.length; stkKi++) {
    var stkKey = stkKeys[stkKi]
    var stkPending = pendingUnlock[stkKey]
    stkPending.ticksLeft -= 5

    var stkColonyB = getColonyManager().getIColony(stkPending.level, stkPending.pos)
    if (stkColonyB) unlockColonyTier1(stkColonyB)

    if (stkPending.ticksLeft <= 0 || stkColonyB) delete pendingUnlock[stkKey]
  }

  if (stkTick % 600 === 0) {
    forEachColony(function (stkColonyC) {
      if (colonyNeedsTier1Unlock(stkColonyC)) unlockColonyTier1(stkColonyC)
    })
  }
})

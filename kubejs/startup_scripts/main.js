// ============================================================
// ARKCRAFT - Startup Scripts
// Se ejecuta una vez al iniciar el juego (antes de cargar mundo)
// ============================================================

// Estructuras BOMD y Mowzie's: generacion vanilla del mod (sin bloqueo en KubeJS).

// ------------------------------------------------------------
// 1. REGISTRAR ITEMS DE PERMISO DE CONSTRUCCION
//    Se obtienen en FTB Quests canjeando monedas de Hot Zones
// ------------------------------------------------------------
StartupEvents.registry('item', event => {
    event.create('arkcraft:building_permit_1')
        .displayName('\u00a7aPermiso de Construccion I')
        .maxStackSize(16)

    event.create('arkcraft:building_permit_2')
        .displayName('\u00a76Permiso de Construccion II')
        .maxStackSize(16)

    event.create('arkcraft:building_permit_3')
        .displayName('\u00a7cPermiso de Construccion III')
        .maxStackSize(16)

    event.create('arkcraft:building_permit_4')
        .displayName('\u00a75Permiso de Construccion IV')
        .maxStackSize(16)
})

// ============================================================
// ARKCRAFT - Misiones individuales: bloquea PARTIES de FTB Teams
// ------------------------------------------------------------
// FTB Quests comparte el progreso por EQUIPO. Para que las quests/
// recompensas sean por JUGADOR, impedimos formar o crecer parties de
// FTB Teams (cada quien queda en su equipo individual automático).
//
// FTB Chunks NO se rompe: sigue funcionando con el equipo solo de cada
// jugador. Para aliarse / compartir territorio, los jugadores usan
// Open Parties and Claims (OPAC), que es un sistema aparte y NO toca
// el progreso de FTB Quests.
// ============================================================

NativeEvents.onEvent('net.neoforged.neoforge.event.CommandEvent', function (event) {
    try {
        var results = event.getParseResults()
        if (!results) return
        var cmd = String(results.getReader().getString()).trim().toLowerCase()
        if (cmd.indexOf('/') === 0) cmd = cmd.substring(1)

        // Bloquear: crear party, invitar a party, o unirse a party de FTB Teams.
        // Se permite el resto (leave, info, settings...) y los equipos individuales.
        var blocked =
            /^ftbteams\s+party\s+(create|invite|join)\b/.test(cmd) ||
            /^ftbteams\s+(create|invite|join)\b/.test(cmd)

        if (blocked) {
            event.setCanceled(true)
            try {
                var src = results.getContext().getSource()
                src.sendFailure(Text.literal(
                    '§cLos equipos de FTB están deshabilitados aquí — las misiones son individuales. ' +
                    'Para aliarte y compartir territorio usa §fOpen Parties and Claims (OPAC)§c.'
                ))
            } catch (eMsg) {}
        }
    } catch (e) {}
})

console.info('[Arkcraft] Bloqueo de parties FTB Teams activo (misiones individuales).')

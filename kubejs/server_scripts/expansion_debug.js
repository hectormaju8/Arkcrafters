// Diagnostico: monedas en inventario para tributos de Expansión
// + /arkcraft econ (mismo árbol que /econ — un solo register de 'arkcraft')
ServerEvents.commandRegistry(function (event) {
    var Commands = event.commands
    var Arguments = event.arguments

    function countItem(player, itemId) {
        var total = 0
        player.inventory.allItems.forEach(function (stack) {
            if (stack.isEmpty()) return
            if (String(stack.id) === itemId) total += stack.count
        })
        return total
    }

    var arkTree = Commands.literal('arkcraft')
        .then(
            Commands.literal('tributo-check')
                .requires(function (src) { return src.hasPermission(2) })
                .executes(function (ctx) {
                        var player = ctx.source.player
                        if (!player) {
                            ctx.source.sendFailure(Text.literal('Solo jugadores.'))
                            return 0
                        }

                        var copper = countItem(player, 'lightmanscurrency:coin_copper')
                        var iron = countItem(player, 'lightmanscurrency:coin_iron')
                        var gold = countItem(player, 'lightmanscurrency:coin_gold')
                        var emerald = countItem(player, 'lightmanscurrency:coin_emerald')
                        var diamond = countItem(player, 'lightmanscurrency:coin_diamond')

                        ctx.source.sendSuccess(
                            Text.literal('§6[Arkcraft] Monedas en TU inventario (MineColonies cobra aqui, no wallet):'),
                            false
                        )
                        ctx.source.sendSuccess(
                            Text.literal(
                                '§7Cobre: §f' + copper +
                                ' §7| Hierro: §f' + iron +
                                ' §7| Oro: §f' + gold +
                                ' §7| Esmeralda: §f' + emerald +
                                ' §7| Diamante: §f' + diamond
                            ),
                            false
                        )

                        var needIron = 40 - iron
                        if (needIron > 0) {
                            ctx.source.sendSuccess(
                                Text.literal('§cFaltan ' + needIron + ' monedas de HIERRO para Ayuntamiento II (cobre del mercado no cuenta).'),
                                false
                            )
                        } else {
                            ctx.source.sendSuccess(
                                Text.literal('§aHierro OK para Ayuntamiento II. Click en Universidad → Expansión de la Colonia → Ayuntamiento II.'),
                                false
                            )
                        }

                        return 1
                    })
        )

    if (typeof registerArkcraftEconUnderArkcraft === 'function') {
        arkTree = arkTree.then(registerArkcraftEconUnderArkcraft(Commands, Arguments, event))
    }

    event.register(arkTree)
})

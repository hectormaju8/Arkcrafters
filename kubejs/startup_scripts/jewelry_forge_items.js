// Anillos/collares sin encantar: misma apariencia que Jewelry, stats al canjear en FTB Forja
StartupEvents.registry('item', event => {
    var items = [
        { id: 'unenchanted_ruby_ring', tex: 'ruby_ring', name: 'Anillo de rub\u00ed sin encantar' },
        { id: 'unenchanted_sapphire_ring', tex: 'sapphire_ring', name: 'Anillo de zafiro sin encantar' },
        { id: 'unenchanted_jade_ring', tex: 'jade_ring', name: 'Anillo de jade sin encantar' },
        { id: 'unenchanted_topaz_ring', tex: 'topaz_ring', name: 'Anillo de topacio sin encantar' },
        { id: 'unenchanted_citrine_ring', tex: 'citrine_ring', name: 'Anillo de citrino sin encantar' },
        { id: 'unenchanted_tanzanite_ring', tex: 'tanzanite_ring', name: 'Anillo de tanzanita sin encantar' },
        { id: 'unenchanted_ruby_necklace', tex: 'ruby_necklace', name: 'Collar de rub\u00ed sin encantar' },
        { id: 'unenchanted_sapphire_necklace', tex: 'sapphire_necklace', name: 'Collar de zafiro sin encantar' },
        { id: 'unenchanted_jade_necklace', tex: 'jade_necklace', name: 'Collar de jade sin encantar' },
        { id: 'unenchanted_topaz_necklace', tex: 'topaz_necklace', name: 'Collar de topacio sin encantar' },
        { id: 'unenchanted_citrine_necklace', tex: 'citrine_necklace', name: 'Collar de citrino sin encantar' },
        { id: 'unenchanted_tanzanite_necklace', tex: 'tanzanite_necklace', name: 'Collar de tanzanita sin encantar' },
        { id: 'unenchanted_netherite_ruby_ring', tex: 'netherite_ruby_ring', name: 'Anillo de rub\u00ed sin encantar (netherite)' },
        { id: 'unenchanted_netherite_sapphire_ring', tex: 'netherite_sapphire_ring', name: 'Anillo de zafiro sin encantar (netherite)' },
        { id: 'unenchanted_netherite_jade_ring', tex: 'netherite_jade_ring', name: 'Anillo de jade sin encantar (netherite)' },
        { id: 'unenchanted_netherite_topaz_ring', tex: 'netherite_topaz_ring', name: 'Anillo de topacio sin encantar (netherite)' },
        { id: 'unenchanted_netherite_citrine_ring', tex: 'netherite_citrine_ring', name: 'Anillo de citrino sin encantar (netherite)' },
        { id: 'unenchanted_netherite_tanzanite_ring', tex: 'netherite_tanzanite_ring', name: 'Anillo de tanzanita sin encantar (netherite)' },
        { id: 'unenchanted_netherite_ruby_necklace', tex: 'netherite_ruby_necklace', name: 'Collar de rub\u00ed sin encantar (netherite)' },
        { id: 'unenchanted_netherite_sapphire_necklace', tex: 'netherite_sapphire_necklace', name: 'Collar de zafiro sin encantar (netherite)' },
        { id: 'unenchanted_netherite_jade_necklace', tex: 'netherite_jade_necklace', name: 'Collar de jade sin encantar (netherite)' },
        { id: 'unenchanted_netherite_topaz_necklace', tex: 'netherite_topaz_necklace', name: 'Collar de topacio sin encantar (netherite)' },
        { id: 'unenchanted_netherite_citrine_necklace', tex: 'netherite_citrine_necklace', name: 'Collar de citrino sin encantar (netherite)' },
        { id: 'unenchanted_netherite_tanzanite_necklace', tex: 'netherite_tanzanite_necklace', name: 'Collar de tanzanita sin encantar (netherite)' }
    ]

    for (var i = 0; i < items.length; i++) {
        var def = items[i]
        event.create('arkcraft:' + def.id)
            .displayName('\u00a77' + def.name)
            .maxStackSize(64)
    }
})

// JEI/EMI: ocultar LMC excepto monedas, wallets (no OP) y ATM
var ARKCRAFT_LMC_JEI_ALLOWED = [
    'lightmanscurrency:atm',
    'lightmanscurrency:coin_copper',
    'lightmanscurrency:coin_iron',
    'lightmanscurrency:coin_gold',
    'lightmanscurrency:coin_emerald',
    'lightmanscurrency:coin_diamond',
    'lightmanscurrency:coin_netherite',
    'lightmanscurrency:wallet_leather',
    'lightmanscurrency:wallet_copper',
    'lightmanscurrency:wallet_iron',
    'lightmanscurrency:wallet_gold',
    'lightmanscurrency:wallet_emerald',
    'lightmanscurrency:wallet_diamond'
]

RecipeViewerEvents.removeEntriesCompletely('item', function(event) {
    event.remove(Ingredient.of('@lightmanscurrency').except(ARKCRAFT_LMC_JEI_ALLOWED))
})

console.info('[ArkcraftLMC] JEI: monedas + wallets (max diamante) + ATM')

# Arkcraft — Documentación del Modpack

> **Documento único del proyecto.** Reúne todo: identidad, sistemas, economía, guerra, hot zones, hitos, FTB Quests, comandos y reglas para no romper nada.
> *Última actualización: 2 junio 2026.*

> ## 🔧 Versión 1.1 — parche (2 junio 2026)
> Correcciones y ajustes tras los primeros días de servidor en producción:
> 1. **Hot Zones:** arreglado el bug de que los mobs no spawneaban en la zona y aparecían mobs con *glow* regados por el mapa (conteo por zona + limpieza de huérfanos + spawnea al llegar un jugador). — `kubejs/server_scripts/hotzone.js`
> 2. **Dormir:** arreglado el crash `EncoderException: system_chat` que sacaba a los jugadores al dormir (`hordePreventsOtherPlayersSleeping = false`). — `config/hordes-common.toml`
> 3. **Economía – loot:** los cofres/mobs ya no sueltan esmeralda/diamante/netherita; tope en **oro**. El cofre del mapa pasó de ~100.000 a ~1.000 CEV. — `config/lightmanscurrency-common.txt`
> 4. **Economía – cap de gasto AHORA ACUMULATIVO:** el cap no usado ya no se pierde; se suma cada día. El techo de temporada sigue siendo 270.000 CEV (no rompe el plan de 30 días). — `kubejs/server_scripts/arkcraft_economy_spend_cap.js`
> 5. **Muerte PvE = drop parcial como PvP:** morir por mob/caída/lava/etc. ahora suelta 20% objetos + 1 armadura + 1 herramienta + % monedas (antes perdías todo). — `kubejs/server_scripts/war_death.js`
> 6. **Misiones de matar mobs subidas (duran toda la temporada):** Caza 50→**500**, Exterminador 300→**3.000**, No-muertos 64+64→**250+250** zombies/esqueletos (Wither sigue en 1). Subido en la misión FTB **y** en el umbral del logro/Leyenda para que coincidan. — `config/ftbquests/quests/chapters/hitos.snbt` + `kubejs/server_scripts/arkcraft_hitos.js`
>
> **Archivos a subir al servidor de producción:** ver lista al final de este documento (sección *Actualizar servidor a 1.1*).

> ## 🚀 Versión 1.0 — lanzamiento (1 junio 2026)
> Primera versión estable y completa de Arkcraft. Todos los sistemas implementados y probados (Hot Zones, economía/cap de gasto, tributos MineColonies, guerra de colonias, PvP mundial, joyería, stamina, Hitos), scripts revisados, textos casual y comandos asegurados.
> **Servidor dedicado listo** en la carpeta [`server/`](server/) (NeoForge 21.1.232 + 110 mods, arranque de 1 clic). Pasos y guía de actualización en [`server/LEEME-SERVIDOR.md`](server/LEEME-SERVIDOR.md).

---

## Identidad

| Campo | Valor |
|---|---|
| Nombre | Arkcraft |
| Tipo | Instancia personal CurseForge (1.21.1 NeoForge 21.1.232) |
| Idioma | **`es_es` únicamente** (Español — España). Cliente: Opciones → Idioma → Español (España). **No usar `es_mx`** (varios mods no cargan bien). |
| Concepto | Post-apocalipsis + colonia MineColonies + automatización Create. Monedas **solo** de Hot Zones → tributos en la Universidad para subir edificios → **guerra entre colonias** → endgame **Hitos**. |
| Temporada | **30 días**. El avance lo limita el **gasto acumulado** (cap que se suma cada día, no se pierde; techo 270.000 CEV), no el farmeo. |

**Pilares de mods:** The Hordes (oleadas) · MineColonies + Structurize (colonia) · Create + Aeronautics (automatización) · FTB Quests + When Dungeons Arise (progresión) · Terralith + Regions Unexplored (mundo) · Better Combat + Simply Swords + ParCool (combate) · Lightman's Currency (economía) · Jewelry + Accessories (joyas) · Bosses of Mass Destruction + Mowzie's Mobs (jefes de Hot Zone).

---

## Estado del proyecto

### ✅ Funciona (validado in-game, LAN 2 cuentas)

| Sistema | Estado |
|---|---|
| **Hot Zones T1–T4** | Rotación auto (45/30/15/10 %); aparecen **alrededor del spawn (0,0)**; cap **10** + refill; T3 mezcla Mowzie's + vanilla; T4 jefe BOMD; waypoint a todos; jugadores nuevos repartidos en el área. |
| **MineColonies — tributos** | 8 edificios nv.2–5 pagan monedas vía Investigación (Universidad); nv.1 gratis; builders ×5; tier1 al fundar. |
| **Economía — cap de gasto** | `/econ` cerrado y funcionando: límite de gasto diario en tributos; farmeo libre; catch-up por jugador atrasado; reembolso al cancelar. |
| **Guerra de colonias** | Captura ×4, apuesta 40 oro, prep 30 min + asalto 10 min, vidas/tótem/TP, PvP participantes. Capítulo FTB creado. |
| **PvP mundial** (fuera de guerra) | Al matar a otro jugador: ~20 % objetos + 1 armadura + 1 herramienta + % monedas (wallet/inventario). |
| **Lightman's Currency** | Acotado: monedas + wallets (máx. diamante) + ATM en colonia. Sin tiendas/tax/subastas/banco portátil. |
| **Joyería** | Anillos/collares con stats físicos; gemas solo vía FTB Forja; únicos al matar jefe T4. |
| **Combate stamina** | ParCool gasta stamina al pegar (local por PC); agotado = sin daño. |
| **Hitos (endgame)** | Capítulo FTB "Hitos" + 18 logros vanilla (+ Leyenda morado) otorgados por KubeJS. Sustituye al antiguo «Monumento del Legado». |
| **FTB Quests** | MineColonies, Mercado de Trueques, Forja de Joyas, Zonas Calientes, Guerra entre Colonias, Hitos, Create, WDA, Simulated, Aeronautics. |

### ⏳ Lo que falta (real)

| Prioridad | Tarea |
|---|---|
| **Media** | Subir a **servidor dedicado con IP** + prueba final con varios jugadores reales. El código ya está listo (estado por UUID, hora del host, jugadores nuevos repartidos). |
| **Baja (opcional)** | Limpieza de código: funciones muertas en `war_death.js` (`saveDeathInventory`/`restoreDeathInventory`/`hasPvpKeptSnapshot`/`restoreKeptInventoryIfPvp`) y el `console.info("Hello World")` de ejemplo en `client_scripts/main.js`. |
| **Baja** | Exportar modpack (solo si se quiere compartir como `.zip` CurseForge). |

**Descartado:** traducir capítulos Simulated/Aeronautics · Monumento del Legado (→ Hitos) · techo de pérdida PvP · cap de *ingreso* (→ cap de *gasto*) · sonidos de guerra (no audibles en LAN) · infiltración por puntos (→ captura ×4) · ParCoolSkill/parry · rebalance Mercado.

---

## Comandos y permisos

**Abiertos a todos (jugador):**
```
/econ            o  /econ status   — ver tu límite de gasto y estado de temporada
/war status                        — fase, capturas, objetivo, % de la guerra activa
/war declare <jugador>             — declarar guerra (cobra 40 oro al atacante)
/war accept                        — aceptar la guerra (gratis, defensor)
```

**Solo OP (nivel 2):**
```
/econ recalc | resetcap [jugador] | resetday | setday <n> | addspend <cev>
/war stop | cleanup | sim | test ...
/hotzone info | spawn1 | spawn2 | spawn3 | spawn4 | stop
/arkcraft tributo-check            — diagnóstico (cuenta monedas del inventario)
/arkcraft econ ...                 — mismo árbol que /econ
```

---

## Hot Zones — `kubejs/server_scripts/hotzone.js`

Zonas de combate temporales = **única fuente de monedas**. Aparecen periódicamente **alrededor del spawn (0,0)**.

### Parámetros
- **Ubicación:** punto al azar dentro de un cuadrado centrado en (0,0), hasta **±500 bloques** en X/Z (`HZ_AREA_HALF = 500`). Evita colonias (≥160 bloques del centro; 15 reintentos).
- **Intervalo:** una zona cada **20 min**. Duración **5 min** (T1–T3) / **10 min** (T4).
- **Probabilidad:** 45 % T1 · 30 % T2 · 15 % T3 · 10 % T4.
- **Cap anti-lag:** máximo **10 mobs vivos** en todos los tiers; se rellenan hasta 10 cada **20 s** (`HZ_CAP_* = 10`, `HZ_REFILL = 10`). En tiers con jefe, el jefe cuenta dentro de esos 10.
- **Mobs spawnean en Y=320** con `FallDistance:-9999` (caen sin daño). Brillan (glow) para distinguirlos.

### Mobs y drops por nivel (el catch-up del jugador atrasado multiplica monedas ×1.5/×2/×3)
| Nivel | Mobs | Monedas |
|---|---|---|
| 1 | Zombi, Esqueleto (arco Flame I), Araña | Cobre 1–3 |
| 2 | + 1 Élite (zombi 200 HP, diamante) | Hierro 1–2 / élite Oro 2–3 |
| 3 | **Mowzie's + vanilla** (zombi/esqueleto/araña) + 1 jefe Mowzie | Hierro 2–3 / jefe Oro 4–6 |
| 4 | Vanilla + 1 jefe **BOMD** | Hierro 3–4 / jefe Oro 5–7 **+ joya única** |

### Waypoints (JourneyMap)
- Al aparecer una zona, el marcador se crea **para cada jugador online** (más fiable que `@a`).
- Quien **entra al servidor con una zona activa** también lo recibe (late-joiners).
- Se borra al terminar la zona.

### Jugadores nuevos
- En su **primera entrada** al servidor aparecen repartidos al azar dentro del mismo cuadrado (±500 de 0,0), en suelo seguro (comando `spreadplayers`). Marca por jugador `arkcraft_initial_spawn_done` → solo la primera vez.
- ⚠️ En un mundo con jugadores que ya existían antes de este cambio, serían reubicados **una vez** la próxima vez que entren. En mundo/temporada nueva no hay problema.

### Limpieza al terminar
`discard()` en todos los mobs con tag `hotzone_mob` (desaparecen sin morir → sin loot de jefe). Fallback: tag `hotzone_nodrop` + `/kill`.

### Notas técnicas
- `EntityEvents.death` **no** funciona en KubeJS 2101.7.2 → se usa `EntityEvents.drops` (monedas) y `EntityEvents.spawned` (glow).
- Mensajes de chat: cortos y casuales (aparición, jefe, fin). Sin spam global por cada jugador que entra.

---

## Economía — cap de gasto · `arkcraft_economy_spend_cap.js` + `arkcraft_research_spend_cap.js`

**Idea:** el farmeo es libre; lo que se limita es **cuánto puedes gastar al día** en tributos de la Universidad. Así casual y tryhard avanzan igual (el tryhard solo acumula más banco).

- Estado por jugador en `player.persistentData`; estado global (día de temporada) en `server.persistentData` (claves `arkEcon_`). **No** usa archivos (KubeJS bloquea `java.io.File`).
- **Reset diario** a las **~06:00 hora del host** (Calendar del servidor — correcto para dedicado).
- **CEV** (valor en cobre) interno: cobre 1, hierro 10, oro 100, esmeralda 1.000, diamante 10.000, netherita 100.000. *(En textos al jugador se muestra en oro, sin la palabra "CEV".)*
- **Catch-up por jugador (§4b):** a quien va por debajo de la curva de gasto se le suben los drops de Hot Zone (×1.5 / ×2 / ×3) solo a él, hasta ponerse al día. No ayuda al tryhard.
- **Guerra fuera del cap:** declarar guerra (40 oro) no cuenta al gasto; solo límite de 3 declaraciones/semana por colonia.
- Cancelar un tributo a medio investigar **reembolsa** el cap y devuelve las monedas (MineColonies no las devuelve solo). No se reembolsa si ya está terminado o si hay un tier superior activo (anti-exploit).

### Cap de gasto diario (CEV)
| Días | Cap/día |
|---|---|
| 1–10 | 6.000 (~60 oro) |
| 11–20 | 9.000 (~90 oro) |
| 21–30 | 12.000 (~120 oro) |
| **Total temporada** | **270.000 CEV** |

### Costes de tributos (rebalance v3, 2026-05-31 — pagos en oro mínimo, ~2,4×/nivel)
| Tier | Ayuntamiento | Universidad | Almacén |
|---|---|---|---|
| 2 | 15 oro | 12 oro | 10 oro |
| 3 | 3 esm + 6 oro | 2 esm + 8 oro | 2 esm + 4 oro |
| 4 | 9 esm | 6 esm + 8 oro | 6 esm |
| 5 | 2 diamante + 1 esm | 1 diamante + 6 esm | 1 diamante + 4 esm |

**Totales (CEV):** Ayuntamiento 35.100 · Constructor 30.200 · Universidad 26.800 · Almacén 23.400 · Mina 21.900 · Leñador 18.500 · Granja 18.500 · Pescador 17.000 → **los 8 maxeados = 191.400 CEV** (~1.914 oro). Gastando el cap cada día se maxea **~día 24**.

> La tabla CEV exacta por tributo vive en `RSC_TRIBUTE_CEV` dentro de `arkcraft_research_spend_cap.js`. **Si cambias costes en `kubejs/data/arkcraft/researches/**`, actualiza esa tabla.**

---

## MineColonies — gating real de mejoras

Subir Ayuntamiento/Universidad/Almacén (y los otros 5) requiere pagar un **tributo en monedas** vía el sistema nativo de **Investigación** (bloquea de verdad el botón Mejorar, no es solo gating FTB).

### Reglas de oro (NO romper)
1. Tier pagado = **`researchLevel: 1`** + `requirements` con `minecolonies:research` — **sin** `parentResearch` (combinar `parentResearch` + `researchLevel` 2+ rompe el inicio server-side: el click no hace nada).
2. Nivel 1 gratis = efecto `blockhut*` (en `kubejs/data/minecolonies/researches/effects/`, namespace `minecolonies`) + investigación `*1` autostart/instant + el script `minecolonies_tier1_unlock.js` (completa al fundar colonia).
3. Tributos se cobran del **inventario del jugador** (MineColonies no usa el slot wallet).
4. **No** instalar MineColonies Tweaks (conflicto mixin con `mctier_engine` → crash).
5. **No** script KubeJS para tooltips de investigación (vanilla basta si hay colonia fundada).
6. Padre e hijo de investigación deben tener `researchLevel` distinto (N y N-1) o crash.
- **Builders ×5:** `blockplace/blockbreakspeedmultiplier.json` nivel 5 = 4.0; `builderspeed.json` autostart lo aplica al fundar.
- **Interruptor de emergencia:** borrar `kubejs/data/minecolonies/researches/effects/blockhut<edificio>.json` + `/reload` quita el tope de ese edificio.

---

## Guerra de colonias — `war.js` + `war_death.js`

Captura de **4 edificios** en la colonia enemiga: los 3 primeros aleatorios, el **4.º siempre el Ayuntamiento**. Solo **una guerra a la vez**. `pvp_mode = true` en `minecolonies-server.toml`.

### Flujo y economía
```
/war declare <jugador>  → atacante paga 40 oro (defensor necesita ≥4 edificios)
/war accept             → gratis; preparación 30 min, luego asalto 10 min
4/4 capturas            → gana el atacante
tiempo agotado o atacante sin vidas → gana el defensor
```
| Resultado | Premio |
|---|---|
| Atacante gana (4/4) | Recupera 40 oro + 2 esmeraldas + TP a su Ayuntamiento |
| Defensor gana (tiempo / 5 caídas del atacante) | Recibe los 40 oro del atacante |
| Cancelada / `/war stop` en `pending` | Reembolso de 40 oro al atacante |

### Mecánica
- **Vidas:** atacante **5** (a 0 sin 4/4 → derrota + TP fuera); defensor **infinitas**.
- **Caída en asalto:** no muere de verdad (`LivingIncomingDamageEvent` cancela el golpe + efecto tótem, inventario intacto). Atacante → TP al **borde** de la colonia enemiga; defensor → TP a su **Ayuntamiento**.
- **El defensor gana** aguantando el tiempo **o** derribando al atacante 5 veces.
- **Captura:** quédate a ≤15 bloques del edificio marcado; barra sube ~50 s; si te alejas, se pausa.
- **3 bossbars:** tiempo (roja) · capturas N/4 (verde) · % del edificio (amarilla, con texto guía tipo "Ve a Constructor", "Capturando…", "Fuera de colonia").
- **Glow** permanente en el atacante; **waypoints** CAPTURA (rojo) / DEFIENDE (verde) por jugador.
- **Guardias** (solo trabajos de guardia) atacan al invasor en zona; daño del guardia al atacante = 50 %.
- **Comer/beber permitido** en guerra (permisos temporales `RIGHTCLICK_BLOCK`/`THROW_POTION`/`ATTACK_ENTITY` en rango Hostil; se revierten al terminar).
- **Hostilidad MineColonies:** se aplica automática al aceptar; si falla, el mensaje avisa de activar "Hostil" en Permisos del Ayuntamiento.

### Constantes (`war.js`)
`WAR_DECLARE_COST=40 · WAR_RADIUS=100 · WAR_CAPTURE_COUNT=4 · WAR_MIN_BUILDINGS=4 · WAR_CAPTURE_RADIUS=15 · WAR_CAPTURE_RATE=2 · WAR_ATTACKER_LIVES=5 · WAR_PREP_TICKS=30 min · WAR_ASSAULT_TICKS=10 min · WAR_GUARD_DAMAGE_MULT=0.5`. Los minutos en los mensajes se calculan solos (`prepMins()`/`assaultMins()`).

### API compartida
`var ArkcraftWar` en `war.js` (Rhino no tiene `globalThis`) la usa `war_death.js`.

---

## PvP mundial + Lightman's Currency

### PvP fuera de guerra — `war_death.js`
Al matar a otro jugador (sin guerra activa para ellos): cae ~**20 % de objetos** (por stack) + **1 armadura** + **1 herramienta/arma** + **% de monedas** (inventario y wallet equipada, según gamerule `coinDropPercent`). **No** se pierden enteros: Accessories, Sophisticated Backpacks, ni el banco (ATM). Respawn normal.

### LMC acotado — `arkcraft_lmc_lockdown.js` + `arkcraft_wallet_limits.js` + `arkcraft_lmc_jei_hide.js`
- **Permitido:** monedas (cobre→netherita), wallets cuero→**diamante**, **ATM** (bloque, en colonia) para cambio + banco personal.
- **Bloqueado:** wallets netherita+ (banco portátil, downgrade al login), ATM portátil, traders/vending/tickets/terminals, tax, subastas, money bag, coin chest, mint. Ocultos en JEI.
- **Config:** `bankAbility=[]` (banco solo en ATM) · `loot.entities.enabled=false` (monedas solo en HZ) · `canMint=false` · `auction_house.enabled=false`.

---

## Joyería — `jewelry_forge.js` + `jewelry_forge_items.js` + `jewelry_forge_rewards.js`
- **Stats 100 % físicos** (sin spell power). Anillos base (cobre/hierro/oro/diamante/collar esmeralda): craft en mesa, stats gratis (`config/jewelry/items_v8.json`).
- **Gemas** (6 tipos × anillo/collar × oro/netherita): **solo FTB Forja** (recetas de mesa desactivadas). Coste: anillo oro = 1 gema + 3 oro + **5 monedas de oro**; collar oro = 1 gema + 1 oro + 1 string + 5 oro; netherita = base + 1 netherita + **4 monedas de esmeralda**.
- **Únicos** (20 piezas): 1 al azar al matar el jefe de Hot Zone **T4**.
- Flujo Forja = igual que Mercado: receta shapeless → `arkcraft:unenchanted_*` → misión FTB de **1 tarea** `consume_items` → recompensa **custom** (KubeJS entrega la joya).

---

## Combate stamina (ParCool) — `parcool_combat_stamina.js` (cliente + servidor)
ParCool no gasta stamina al pegar de forma nativa. Solución Arkcraft: cada PC consume stamina en su `LocalPlayer` al atacar y la sincroniza; el servidor bloquea el daño solo si está **agotado** (rayos rojos).
- Coste por golpe (escala ~2000): puño 25 · ligera 35 · media 50 · asta 65 · pesada 85.
- Detección: `LeftClickEmpty` + `AttackEntityEvent` con anti-duplicado (máx. 1/tick + cooldown del arma). Better Combat dispara varios eventos por swing → el dedup evita vaciar la barra de un golpe.
- **Errores a NO repetir:** `consumeStamina()`/`processOnServer()` no existen/no-op en ParCool 3.4.3; bloquear si `stamina < coste` deja un rayito sin agotamiento real.

---

## Hitos (endgame) — capítulo FTB "Hitos" + `arkcraft_hitos.js`

Cada hito = una misión FTB cuyo **objetivo es un logro** y cuya **recompensa es solo XP + poco dinero** (nunca el logro como recompensa). Sin dependencias entre misiones (look limpio, sin abanico de líneas).

- **18 hitos** = 18 logros vanilla `arkcraft:hitos/*` (`kubejs/data/arkcraft/advancement/hitos/*.json`, trigger `minecraft:impossible`, otorgados por comando). `leyenda.json` usa marco **`challenge`** (morado).
- **Quién otorga cada logro:**
  - Economía (inversor/magnate/economia) → `arkcraft_economy_spend_cap.js`
  - Guerra (guerra1/3/5) → `war.js`
  - Jefes (jefe_t3/jefe_t4/joyero) → `hotzone.js`
  - Metrópolis → `arkcraft_research_spend_cap.js`
  - Colonia (primer_pueblo/pueblo_establecido/capital), matanzas (caza/exterminador/no_muertos/wither) y **Leyenda** → `arkcraft_hitos.js`
- **`arkcraft_hitos.js`** vigila cada ~5 s: crea marcadores de estadística (`ark_mobkills`, etc.), otorga los 7 trofeos de colonia/matanzas según logros y scores, y otorga **Leyenda** (`arkcraft:hitos/leyenda`) a quien tenga los 17 → la quest se completa sola, no se puede hacer clic.
- Los marcadores de estadística se sincronizan con el **siguiente kill**, así que en temporada nueva todos empiezan en 0 (sin problema).
- IDs del capítulo: `73239E8DB41DFA66`. Textos en `lang/es_es.snbt` con los IDs de FTB.

---

## FTB Quests — reglas de idioma (CRÍTICO)

> Los textos (título/subtítulo/descripción) viven en **`config/ftbquests/quests/lang/es_es.snbt`**, identificados por el **ID** de cada quest/capítulo. NO inline en el `.snbt` del capítulo (FTB los borra al re-serializar). Si creas un capítulo a mano con tus propios IDs, **FTB los regenera** al importarlo → relee el `.snbt` para sacar los IDs nuevos y escribe el lang contra esos.

| Clave | Uso |
|---|---|
| `chapter.<ID>.title` | Nombre del capítulo |
| `quest.<ID>.title` | Título de la misión |
| `quest.<ID>.quest_subtitle` | Subtítulo |
| `quest.<ID>.quest_desc` | Descripción (lista de strings, **una por línea, SIN comas**) |

**Reglas que más rompen:**
1. **UTF-8 sin BOM.** Si el log dice `es_es (with 0 entries)`, el archivo está roto. Empieza con `{` (byte 123), termina con `}`. Validar: `powershell -File config/ftbquests/scripts/validar_lang.ps1`.
2. Mojibake (`CabaÃ±a`) = UTF-8 guardado como Latin-1 → reconvertir.
3. **Nunca** hacer `.Replace('"', ...)` global sobre el lang (rompe preguntas en español como `comienzo?"]`).
4. **Trueque/entrega** = **1 sola tarea** `type:"item"` + `consume_items:true`, **sin `dependencies`** (bug FTB #1890). Repetible: `can_repeat:true` + `repeat_cooldown` (no `repeatable`).
5. Recompensa de objeto de mod (joya): `type:"custom"` + `icon` + `reward.<ID>.title` en lang + entrega en KubeJS.
- Si una misión queda atascada: `/ftbquests change_progress @s reset <chapter_id>`.

**Capítulos (ID → título):** MineColonies `0E21FB2EFB41A583` · WDA `231570DE6A7FCD52` · Mercado de Trueques `4C21FB2EFB41A584` · Forja de Joyas `5C21FB2EFB41A585` · Zonas Calientes `6C21FB2EFB41A586` · Guerra entre Colonias `7C21FB2EFB41A587` · Hitos `73239E8DB41DFA66`.

---

## Mapa de archivos

| Qué | Dónde |
|---|---|
| Hot Zones | `kubejs/server_scripts/hotzone.js` |
| Economía / cap de gasto | `kubejs/server_scripts/arkcraft_economy_spend_cap.js` |
| Monitor de tributos MineColonies | `kubejs/server_scripts/arkcraft_research_spend_cap.js` |
| Guerra | `kubejs/server_scripts/war.js` |
| Muerte PvP / respaldo guerra | `kubejs/server_scripts/war_death.js` |
| Hitos (logros + Leyenda) | `kubejs/server_scripts/arkcraft_hitos.js` + `kubejs/data/arkcraft/advancement/hitos/*.json` |
| LMC (lockdown / wallets / JEI) | `arkcraft_lmc_lockdown.js`, `arkcraft_wallet_limits.js`, `client_scripts/arkcraft_lmc_jei_hide.js` |
| Stamina combate | `kubejs/{client,server}_scripts/parcool_combat_stamina.js` |
| Tier 1 colonia nueva | `kubejs/server_scripts/minecolonies_tier1_unlock.js` |
| Joyería | `kubejs/server_scripts/jewelry_forge.js` + `startup_scripts/jewelry_forge_items.js` + `server_scripts/jewelry_forge_rewards.js` |
| Tributos / efectos MineColonies | `kubejs/data/arkcraft/researches/**` + `kubejs/data/minecolonies/researches/effects/blockhut*.json` |
| Logros colonia (FTB) | `kubejs/data/arkcraft/advancement/minecolonies/*.json` |
| Misiones / idioma FTB | `config/ftbquests/quests/chapters/*.snbt` + `lang/es_es.snbt` |
| Items permiso / joyas sin encantar | `kubejs/startup_scripts/*.js` |
| Diagnóstico | `kubejs/server_scripts/expansion_debug.js` (`/arkcraft tributo-check`) |

---

## Recargas in-game
```
/reload                    — datapacks + KubeJS (logros, recetas, scripts)
/ftbquests reload          — capítulos + idioma (y reentrar al mundo: el cliente cachea el lang)
/kubejs reload server_scripts | client_scripts
```
- Items KubeJS **nuevos** → reiniciar Minecraft (no basta `/reload`).
- Cambios en `lightmanscurrency-*.txt` o config ParCool → reinicio.
- Tras cambiar efectos de investigación → `/reload` + reentrar y reabrir la GUI de la Universidad.

---

## Configs clave
- `config/minecolonies-server.toml`: `pvp_mode=true`, `workersalwaysworkinrain=true`, `researchresetcost=[]` (permite cancelar tributo), máx. 250 ciudadanos.
- `config/lightmanscurrency-common.txt`: `loot.entities.enabled=false`.
- `config/hordes-common.toml`: hordas cada 10 días a medianoche; zombies no se queman al sol.
- `config/ftbquests/quests/data.snbt`: `fallback_locale:es_es`, progresión lineal, sin autoclaim.

---

## Compartir el modpack (CurseForge Export)

Arkcraft es una instancia CurseForge → se reparte **exportando** desde la app (genera `.zip` con `manifest.json` + `overrides/`).
**Pasos:** App CurseForge → instancia Arkcraft → `...` → **Export** → nombre/versión (Arkcraft 1.0) → elegir qué va en *overrides*.

**Incluir (✅):** `config/` (incluye menús FancyMenu + quests/scripts), `kubejs/`, `defaultconfigs/`, `resourcepacks/`, `shaderpacks/` (shaders apagados), `options.txt` (reparte tus **controles** + texturas activadas).
**NO incluir (❌, personal/runtime):** `saves/`, `logs/`, `crash-reports/`, `screenshots/`, `essential/`, `fancymenu_data/`, `local/`, `data/`, `blueprints/`, `schematics/`, `emotes/`, **`server/`** (se comparte aparte).

**Notas:**
- **FancyMenu** `modpack_mode=false` + `show_customization_overlay=false` (editor oculto). Los layouts (inicio + ESC) viven en `config/fancymenu/customization/` y se reparten con el pack. ⚠️ `modpack_mode=true` rompía la aplicación del layout de inicio en este pack pesado → se dejó en false.
- En `options.txt`, una entrada de resourcePack de The Hordes usa una ruta absoluta de tu PC; en otra máquina esa entrada no aplica (no rompe nada).

## Mods: cliente (114) vs servidor (110)

**La referencia es el CLIENTE** (`mods/`). **`server/mods/` = copia del cliente menos SOLO los 4 mods que crashean el servidor dedicado.**

> ⚠️ **Lección importante (no repetir error):** NO se pueden quitar los mods de "cliente" del servidor a la ligera. Muchos (inventory management, trashslot, chat heads…) registran un **canal de red obligatorio** que NeoForge exige en **ambos lados** → si faltan en el server, el cliente **no conecta** (`Channel of mod X failed to connect`). Lo único que se quita del server son los mods que **crashean** el arranque dedicado (cargan clases de cliente). Sodium/Iris/JEI/etc. **sí se dejan** en el server: NeoForge los ignora solos por ser dist-cliente.

**Únicos quitados del servidor (crashean el dedicado, son cosméticos sin canal):**
- **Presence Footsteps** + **pfsable** (sonidos de pasos)
- **Entity Texture Features (ETF)** + **Entity Model Features (EMF)** (texturas/modelos)

Al actualizar el server: copia `mods/` del cliente y borra solo esos 4 (`.jar`). Si un nuevo mod de cliente crashea el arranque, quítalo también (y verifica que no tenga canal de red).

**Cambios de mods del cliente (detectados al sincronizar):** quitaste del cliente 6 addons de Create — **CreateDragonsPlus, Create Enchantment Industry, Create Colony Logistics, Create Addition, Create Deco, Create Diesel Generators** — y actualizaste CreativeCore, Regions Unexplored, Waystones y Create Aeronautics FTB Chunks. El servidor se resincronizó a esas versiones del cliente.

## Aviso: archivo de licencia
Existe `config/ftbquests/scripts/_aero_bundled/LICENSE.md` — es la **licencia de un script de terceros** (bundle de Aeronautics), no documentación nuestra. Se **conserva** a propósito (borrarla puede incumplir su licencia). Este `CONTEXT.md` es el único documento del proyecto.

---

## Actualizar servidor a 1.1
La 1.1 **no cambia mods ni mundo** — solo 5 archivos de `config/` y `kubejs/`. No hace falta resetear el mundo ni los datos de los jugadores.

**Archivos a subir al servidor de producción (Bisect), respetando la ruta:**

| # | Archivo | Tipo |
|---|---|---|
| 1 | `kubejs/server_scripts/hotzone.js` | Script |
| 2 | `kubejs/server_scripts/arkcraft_economy_spend_cap.js` | Script |
| 3 | `kubejs/server_scripts/war_death.js` | Script |
| 4 | `config/hordes-common.toml` | Config |
| 5 | `config/lightmanscurrency-common.txt` | Config |
| 6 | `config/ftbquests/quests/chapters/hitos.snbt` | Misiones FTB (matar mobs) |
| 7 | `kubejs/server_scripts/arkcraft_hitos.js` | Umbrales de logros/Leyenda |

**Pasos:**
1. (Recomendado) Haz un backup del mundo: en consola `save-all flush` y luego `stop`, o el backup del panel de Bisect.
2. Sube los 5 archivos reemplazando los existentes (misma ruta `config/` y `kubejs/server_scripts/`).
3. **Reinicia el servidor** (los `.toml`/`.txt` necesitan reinicio; con los scripts bastaría `/reload`, pero reiniciar deja todo limpio y consistente).
4. Verifica en consola que arranca sin errores `[WarDeath]`, `[ArkcraftEcon]`, `[HotZone]`.

**No se pierde progreso:** el gasto de temporada ya guardado se respeta; el cambio a cap acumulativo solo cambia cuándo puedes gastar, no lo ya gastado.

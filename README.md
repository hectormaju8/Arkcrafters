# Arkcrafters

Modpack personal de **Minecraft 1.21.1 — NeoForge 21.1.232**. Idioma: Español (`es_es`).
Post-apocalipsis + colonia (MineColonies) + automatización (Create). Economía por Hot Zones → tributos → guerra de colonias → endgame de Hitos. Temporada de 30 días.

## Qué hay en este repositorio
Este repo contiene la **fuente** del modpack. **No incluye los `.jar` de los mods ni el mundo** (por licencia y tamaño — CurseForge descarga los mods con el `manifest.json`).

| Ruta | Qué es |
|---|---|
| `manifest.json` | Lista de los **114 mods** con sus IDs de CurseForge + modloader |
| `config/` | Configuración del pack |
| `kubejs/` | Scripts y datos propios (Hot Zones, economía/cap, guerra, hitos, muerte PvP/PvE…) |
| `defaultconfigs/` | Configs por defecto para mundos nuevos |
| `CONTEXT.md` | Documentación completa del proyecto + changelog (1.0 / 1.1) |

## Construir el zip para CurseForge
1. Crea una carpeta `overrides/` y mete dentro `config/`, `kubejs/` y `defaultconfigs/`.
2. Comprime juntos `manifest.json` + la carpeta `overrides/`.
3. Sube ese `.zip` a CurseForge.

> El `manifest.json` ya lista los 114 mods, así que CurseForge los baja todos al instalar.

## Servidor
Los archivos a actualizar en el servidor de producción están listados en `CONTEXT.md` (sección *Actualizar servidor a 1.1*). El servidor usa los mismos `.jar` del cliente menos los que crashean el dedicado (ver CONTEXT.md).

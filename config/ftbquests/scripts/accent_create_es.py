# -*- coding: utf-8 -*-
"""Aplica acentos al bloque Create en es_es.snbt."""
from pathlib import Path

LANG = Path(r"c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft\config\ftbquests\quests\lang\es_es.snbt")
MARKER = "chapter.27900E4479E6E12D"

REPLACEMENTS = [
    ("automaticamente", "automáticamente"),
    ("combustion", "combustión"),
    ("cinetica", "cinética"),
    ("direccion", "dirección"),
    ("distribucion", "distribución"),
    ("domestico", "doméstico"),
    ("energia", "energía"),
    ("estacion", "estación"),
    ("estres", "estrés"),
    ("Giralo", "Gíralo"),
    ("liquidos", "líquidos"),
    ("Maquina", "Máquina"),
    ("maquina", "máquina"),
    ("mas rapido", "más rápido"),
    ("mas fancy", "más elegante"),
    (" mas ", " más "),
    (" mas.", " más."),
    (" mas,", " más,"),
    (" mas?", " más?"),
    (" mas:", " más:"),
    ("Necesitaras", "Necesitarás"),
    ("polvora", "pólvora"),
    ("portatil", "portátil"),
    ("precision", "precisión"),
    ("prolongacion", "prolongación"),
    ("proteccion", "protección"),
    ("rapido", "rápido"),
    ("rotacion", "rotación"),
    ("senal", "señal"),
    ("sorberan", "sorberán"),
    ("Tambien", "También"),
    ("tambien", "también"),
    ("Terminologia", "Terminología"),
    ("tuberia", "tubería"),
    ("tuberias", "tuberías"),
    ("util en", "útil en"),
    ("util ", "útil "),
    ("validos", "válidos"),
    ("Version", "Versión"),
    ("versatil", "versátil"),
    ("Vias", "Vías"),
    ("vias", "vías"),
    ("aleacion", "aleación"),
    ("arboles", "árboles"),
    ("asi,", "así,"),
    ("asi ", "así "),
    ("aqui", "aquí"),
    ("almacen", "almacén"),
    ("basico", "básico"),
    ("cuanto", "cuánto"),
    ("envia", "envía"),
    ("laton", "latón"),
    ("!A darle", "¡A darle"),
    ("!Contraption", "¡Contraption"),
    ("!Palanca", "¡Palanca"),
    ("!A todo", "¡A todo"),
    ("!Estoy", "¡Estoy"),
    ("!Giralo", "¡Giralo"),
    ("?Tanta", "¿Tanta"),
    ("?Sabes", "¿Sabes"),
    ("?Quieres", "¿Quieres"),
    ("?Wi-Fi", "¿Wi-Fi"),
    ("?Son ", "¿Son "),
    ("?Siento", "¿Siento"),
]


def main() -> None:
    text = LANG.read_text(encoding="utf-8").lstrip("\ufeff")
    lines = text.splitlines()
    out = []
    in_create = False
    for line in lines:
        if line.startswith(f"\t{MARKER}"):
            in_create = True
        if in_create:
            for old, new in sorted(REPLACEMENTS, key=lambda x: -len(x[0])):
                line = line.replace(old, new)
        out.append(line)
    LANG.write_text("\n".join(out) + "\n", encoding="utf-8", newline="\n")
    print("Acentos Create aplicados")


if __name__ == "__main__":
    main()

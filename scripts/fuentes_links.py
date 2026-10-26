"""Fuentes livianas para /links (public/links.html): las de la web (Playfair Display e Inter), recortadas a lo que
usa esa página.

/links se abre desde Instagram, muchas veces con mala señal, así que no carga las fuentes completas de la web: toma las
mismas de @fontsource-variable (node_modules), fija Playfair Display en peso 400 (el de sus títulos), deja a Inter solo
entre 400 y 500 (texto y rótulos) y se queda con los caracteres del español: letras con tildes, ñ, ü, ¿¡, «», números y
puntuación. Una palabra nueva en la página no necesita correr esto otra vez; un alfabeto nuevo, sí.

Uso (desde la raíz del repo, con `pip install fonttools brotli`):  python scripts/fuentes_links.py
Escribe public/fonts/links/{playfair,playfair-italica,inter}.woff2.
"""
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / 'node_modules' / '@fontsource-variable'
DESTINO = RAIZ / 'public' / 'fonts' / 'links'

# Español completo: ASCII visible, Latin-1 (tildes, ñ, ü, ¿, ¡, «, », ·, ©), comillas, rayas, viñeta, puntos suspensivos.
CARACTERES = (
    list(range(0x20, 0x7F)) + list(range(0xA0, 0x100))
    + [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x20AC]
)
FUENTES = [
    ('playfair-display/files/playfair-display-latin-wght-normal.woff2', 'playfair.woff2', {'wght': 400}),
    ('playfair-display/files/playfair-display-latin-wght-italic.woff2', 'playfair-italica.woff2', {'wght': 400}),
    ('inter/files/inter-latin-wght-normal.woff2', 'inter.woff2', {'wght': (400, 500)}),
]


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    for origen, nombre, ejes in FUENTES:
        # Primero el recorte de caracteres y después los ejes: al revés, el recorte falla en algunas variables (gvar).
        fuente = TTFont(ORIGEN / origen)
        opciones = subset.Options()
        opciones.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'lnum', 'tnum']
        opciones.name_IDs = ['*']
        recorte = subset.Subsetter(opciones)
        recorte.populate(unicodes=CARACTERES)
        recorte.subset(fuente)
        fuente = instancer.instantiateVariableFont(fuente, ejes)
        salida = DESTINO / nombre
        fuente.flavor = 'woff2'
        fuente.save(salida)
        antes = (ORIGEN / origen).stat().st_size
        print(f'{nombre}: de {antes // 1024} KB a {salida.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()

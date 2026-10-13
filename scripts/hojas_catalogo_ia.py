"""Hojas de referencia del catálogo (y de los proyectos de arquitectura de la web) para que la IA reconozca lo que hay
en la foto que manda un cliente.

Cada foto del catálogo lleva debajo su número (el id del producto en src/data/productos.js) y su nombre: la IA compara
la foto del cliente con estas hojas y responde con ese id. Se generan a partir de las copias JPEG de public/wa/.
Correrlo de nuevo cuando cambien productos o fotos:   python scripts/hojas_catalogo_ia.py
"""
import json
import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'public', 'ia')
# Gemini mira cada hoja con un número fijo de tokens, sea del tamaño que sea: con 40 camas en una sola hoja, cada
# cama quedaba en pocos píxeles y confundía modelos parecidos (Bruselas/Beirut, Abu Dabi/Dubai; 13-oct). Por eso el
# catálogo va en hojas de POR_HOJA productos, en celdas grandes.
POR_HOJA = 10
GRANDE = dict(columnas=5, ancho=400, alto_foto=600, alto_texto=44, letra=24)  # casi todas las fotos son verticales
CHICA = dict(columnas=8, ancho=250, alto_foto=210, alto_texto=36, letra=17)

productos = json.loads(subprocess.check_output(
    ['node', '-e', "import('./src/data/productos.js').then(m => console.log(JSON.stringify(m.productos.map(p => "
                   "({ id: p.id, nombre: p.nombre, categoria: p.categoria, imagen: p.imagen })))))"],
    cwd=RAIZ, text=True, encoding='utf-8'))

def fuente(tamano):
    try:
        return ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', tamano)
    except OSError:
        return ImageFont.load_default()


def hoja(nombre, lista, columnas, ancho, alto_foto, alto_texto, letra):
    COLUMNAS, ANCHO, ALTO_FOTO, ALTO_TEXTO, letra = columnas, ancho, alto_foto, alto_texto, fuente(letra)
    filas = -(-len(lista) // COLUMNAS)
    im = Image.new('RGB', (COLUMNAS * ANCHO, filas * (ALTO_FOTO + ALTO_TEXTO)), 'white')
    dibujo = ImageDraw.Draw(im)
    for i, p in enumerate(lista):
        x, y = (i % COLUMNAS) * ANCHO, (i // COLUMNAS) * (ALTO_FOTO + ALTO_TEXTO)
        ruta = p.get('ruta') or os.path.join(RAIZ, 'public', 'wa', os.path.splitext(p['imagen'].lstrip('/'))[0] + '.jpg')
        foto = Image.open(ruta).convert('RGB')
        foto.thumbnail((ANCHO - 10, ALTO_FOTO - 6))
        im.paste(foto, (x + (ANCHO - foto.width) // 2, y + (ALTO_FOTO - foto.height) // 2))
        texto = f"{p['id']} · {p['nombre']}"[:24]
        ancho_texto = dibujo.textlength(texto, font=letra)
        dibujo.rectangle([x + 2, y + ALTO_FOTO, x + ANCHO - 2, y + ALTO_FOTO + ALTO_TEXTO - 4], fill='black')
        dibujo.text((x + (ANCHO - ancho_texto) / 2, y + ALTO_FOTO + (ALTO_TEXTO - letra.size) // 2 - 3), texto, fill='white', font=letra)
        # El número también encima de la foto: con solo el rótulo de abajo, la IA a veces le ponía a una foto el de la
        # celda vecina (13-oct: una Paris salía como Houston).
        if p['id'] != 'Proyecto':
            marca = str(p['id'])
            ancho_marca = dibujo.textlength(marca, font=letra)
            dibujo.rectangle([x + 8, y + 6, x + 8 + ancho_marca + 16, y + 6 + ALTO_TEXTO - 6], fill='black')
            dibujo.text((x + 16, y + 6 + (ALTO_TEXTO - 6 - letra.size) // 2 - 3), marca, fill='white', font=letra)
    os.makedirs(SALIDA, exist_ok=True)
    destino = os.path.join(SALIDA, nombre)
    im.save(destino, 'JPEG', quality=80, optimize=True, progressive=True)
    print(f'{nombre}: {len(lista)} productos, {im.width}x{im.height}, {os.path.getsize(destino) // 1024} KB')


def en_hojas(prefijo, lista):
    """La lista repartida en hojas parejas de hasta POR_HOJA: prefijo-1.jpg, prefijo-2.jpg…"""
    n = -(-len(lista) // POR_HOJA)
    for k in range(n):
        hoja(f'{prefijo}-{k + 1}.jpg', lista[k * len(lista) // n:(k + 1) * len(lista) // n], **GRANDE)


# Los nombres de las hojas también están en asistente/src/lib/imagen.js (HOJAS): si cambia cuántas salen, ahí también.
en_hojas('catalogo-camas', [p for p in productos if p['categoria'] == 'Camas'])
en_hojas('catalogo-muebles', [p for p in productos if p['categoria'] != 'Camas'])

# Los proyectos de arquitectura de la web (src/data/proyectosData.js): 4 fotos de cada uno, rotuladas con su nombre.
proyectos = json.loads(subprocess.check_output(
    ['node', '-e', "import('./src/data/proyectosData.js').then(m => console.log(JSON.stringify(m.proyectosData.map(p => "
                   "({ titulo: p.titulo, fotos: p.imageFolders ? p.imageFolders.flatMap(f => f.images.map(i => f.folder + '/' + i)) "
                   ": p.images.map(i => p.imageFolder + '/' + i) })))))"],
    cwd=RAIZ, text=True, encoding='utf-8'))
celdas = []
for p in proyectos:
    fotos = p['fotos']
    elegidas = [fotos[round(i * (len(fotos) - 1) / 3)] for i in range(4)] if len(fotos) >= 4 else fotos
    for f in dict.fromkeys(elegidas):
        celdas.append({'id': 'Proyecto', 'nombre': p['titulo'].title(), 'ruta': os.path.join(RAIZ, 'public', 'assets', 'PROYECTOS', f)})
hoja('catalogo-proyectos.jpg', celdas, **CHICA)

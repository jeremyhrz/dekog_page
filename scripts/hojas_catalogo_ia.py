"""Hojas de referencia del catálogo para que la IA reconozca el modelo en la foto que manda un cliente.

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
COLUMNAS, ANCHO, ALTO_FOTO, ALTO_TEXTO = 8, 250, 210, 36

productos = json.loads(subprocess.check_output(
    ['node', '-e', "import('./src/data/productos.js').then(m => console.log(JSON.stringify(m.productos.map(p => "
                   "({ id: p.id, nombre: p.nombre, categoria: p.categoria, imagen: p.imagen })))))"],
    cwd=RAIZ, text=True, encoding='utf-8'))

try:
    letra = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 17)
except OSError:
    letra = ImageFont.load_default()


def hoja(nombre, lista):
    filas = -(-len(lista) // COLUMNAS)
    im = Image.new('RGB', (COLUMNAS * ANCHO, filas * (ALTO_FOTO + ALTO_TEXTO)), 'white')
    dibujo = ImageDraw.Draw(im)
    for i, p in enumerate(lista):
        x, y = (i % COLUMNAS) * ANCHO, (i // COLUMNAS) * (ALTO_FOTO + ALTO_TEXTO)
        ruta = os.path.join(RAIZ, 'public', 'wa', os.path.splitext(p['imagen'].lstrip('/'))[0] + '.jpg')
        foto = Image.open(ruta).convert('RGB')
        foto.thumbnail((ANCHO - 10, ALTO_FOTO - 6))
        im.paste(foto, (x + (ANCHO - foto.width) // 2, y + (ALTO_FOTO - foto.height) // 2))
        texto = f"{p['id']} · {p['nombre']}"[:24]
        ancho_texto = dibujo.textlength(texto, font=letra)
        dibujo.rectangle([x + 2, y + ALTO_FOTO, x + ANCHO - 2, y + ALTO_FOTO + ALTO_TEXTO - 4], fill='black')
        dibujo.text((x + (ANCHO - ancho_texto) / 2, y + ALTO_FOTO + 7), texto, fill='white', font=letra)
    os.makedirs(SALIDA, exist_ok=True)
    destino = os.path.join(SALIDA, nombre)
    im.save(destino, 'JPEG', quality=80, optimize=True, progressive=True)
    print(f'{nombre}: {len(lista)} productos, {im.width}x{im.height}, {os.path.getsize(destino) // 1024} KB')


hoja('catalogo-camas.jpg', [p for p in productos if p['categoria'] == 'Camas'])
hoja('catalogo-muebles.jpg', [p for p in productos if p['categoria'] != 'Camas'])

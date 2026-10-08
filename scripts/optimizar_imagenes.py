"""Variantes livianas de las fotos de public/ para que el sitio cargue rápido.

Uso (desde la raíz del repo, con Python 3 y Pillow):  python scripts/optimizar_imagenes.py

Genera, sin tocar las fotos originales:
  public/opt/<ruta original>-<ancho>.webp   un WebP por cada ancho de src/data/variantes.json
                                             (el sitio las pide con srcset: src/utils/imagenes.js)
  public/mini/<ruta original>.webp          miniatura 320×400 (4:5) de cada producto, para el chat
  public/opt/<ruta original>-movil.webp     recorte vertical del centro (fotos del hero): en un teléfono la
                                             foto apaisada se ve recortada, y así llega nítida y liviana
  public/wa/<carpeta>/<nombre>.jpg          copia de cada producto para WhatsApp e Instagram (la URL la arma
                                             fotoParaCanales en asistente/src/lib/catalogo.js)

Las copias de public/wa son JPEG de verdad, en sRGB, sin metadatos y de 1080 px de lado como mucho. Casi todas
las originales son JPEG con extensión .png (y en Display P3, el color del iPhone): Vercel las sirve como
image/png y WhatsApp rechaza la foto cuyo tipo no coincide con su contenido (error 131053).
Las originales se quedan como están: las usa la web y son el respaldo si a una foto le falta su variante.
Es incremental: solo procesa lo nuevo o lo que cambió. Vuelve a correrlo al agregar o cambiar fotos.
"""
import io
import json
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image, ImageCms, ImageOps

RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / 'public'
CONFIG = json.loads((RAIZ / 'src' / 'data' / 'variantes.json').read_text(encoding='utf-8'))
EXTENSIONES = {'.jpg', '.jpeg', '.png', '.webp'}
SALIDAS = {'opt', 'mini', 'wa'}
CALIDAD = 76
MINI = (320, 400)
# Copias para WhatsApp e Instagram: las fotos de los productos, que son las carpetas que llevan miniatura.
CANALES = CONFIG['miniaturas']
LADO_CANALES = 1080
CALIDAD_CANALES = 80  # unos 90 KB por foto
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB'))
ESPACIO_ICC = {'RGB': 'RGB', 'CMYK': 'CMYK', 'L': 'GRAY'}  # modo de Pillow → espacio de color de su perfil ICC


def anchos_de(relativa):
    carpeta = relativa.split('/')[0]
    return CONFIG['anchos'].get(carpeta, CONFIG['anchos']['otros'])


def pendiente(origen, destino):
    return not destino.exists() or destino.stat().st_mtime < origen.stat().st_mtime


def abrir(origen):
    imagen = Image.open(origen)
    imagen = ImageOps.exif_transpose(imagen)  # el navegador respeta la orientación EXIF: la variante también
    con_alfa = imagen.mode in ('RGBA', 'LA', 'PA') or (imagen.mode == 'P' and 'transparency' in imagen.info)
    if con_alfa:
        imagen = imagen.convert('RGBA')
        if imagen.getchannel('A').getextrema()[0] == 255:  # canal alfa sin transparencias: no hace falta
            imagen = imagen.convert('RGB')
    else:
        imagen = imagen.convert('RGB')
    return imagen


def copia_canales(relativa):
    """muebles/toronto.png → public/wa/muebles/toronto.jpg (la misma ruta que arma fotoParaCanales)."""
    return PUBLICO / 'wa' / Path(relativa).with_suffix('.jpg')


def guardar_para_canales(origen, destino):
    """Copia para WhatsApp e Instagram: JPEG de verdad, sRGB, sin metadatos y ≤ 1080 px. Devuelve los bytes."""
    imagen = ImageOps.exif_transpose(Image.open(origen))  # la orientación queda en los píxeles
    perfil = imagen.info.get('icc_profile')
    if imagen.mode in ('RGBA', 'LA', 'PA') or (imagen.mode == 'P' and 'transparency' in imagen.info):
        # JPEG no tiene transparencia: lo transparente queda blanco (con convert('RGB') saldría negro).
        con_alfa = imagen.convert('RGBA')
        imagen = Image.new('RGB', con_alfa.size, 'white')
        imagen.paste(con_alfa, mask=con_alfa.getchannel('A'))
    elif imagen.mode not in ESPACIO_ICC:
        imagen = imagen.convert('RGB')
    if perfil:
        # Display P3 (u otro perfil) → sRGB: la copia va sin perfil, y leídos como sRGB esos colores se verían apagados.
        perfil = ImageCms.ImageCmsProfile(io.BytesIO(perfil))
        if perfil.profile.xcolor_space.strip() == ESPACIO_ICC[imagen.mode]:
            imagen = ImageCms.profileToProfile(imagen, perfil, SRGB, outputMode='RGB')
    imagen = imagen.convert('RGB')
    if max(imagen.size) > LADO_CANALES:
        escala = LADO_CANALES / max(imagen.size)
        imagen = imagen.resize((round(imagen.width * escala), round(imagen.height * escala)), Image.LANCZOS)
    imagen.info.clear()  # sin EXIF, XMP, perfil ICC ni comentarios
    destino.parent.mkdir(parents=True, exist_ok=True)
    imagen.save(destino, 'JPEG', quality=CALIDAD_CANALES, optimize=True)
    return destino.stat().st_size


def procesar(relativa):
    """Devuelve (relativa, bytes escritos, error)."""
    origen = PUBLICO / relativa
    trabajos = [(ancho, PUBLICO / 'opt' / f'{relativa}-{ancho}.webp') for ancho in anchos_de(relativa)]
    carpeta = relativa.split('/')[0]
    mini = PUBLICO / 'mini' / f'{relativa}.webp' if carpeta in CONFIG['miniaturas'] else None
    recorte = CONFIG['recorte_movil']
    movil = PUBLICO / 'opt' / f'{relativa}-movil.webp' if carpeta in recorte['carpetas'] else None
    wa = copia_canales(relativa) if carpeta in CANALES else None
    trabajos = [(a, d) for a, d in trabajos if pendiente(origen, d)]
    if not trabajos and all(x is None or not pendiente(origen, x) for x in (mini, movil, wa)):
        return relativa, 0, None
    try:
        imagen = abrir(origen)
        escritos = 0
        for ancho, destino in trabajos:
            # Sin agrandar: si la foto es más chica que el ancho pedido, va a su tamaño real.
            alto = round(imagen.height * min(ancho, imagen.width) / imagen.width)
            variante = imagen if ancho >= imagen.width else imagen.resize((ancho, alto), Image.LANCZOS)
            destino.parent.mkdir(parents=True, exist_ok=True)
            variante.save(destino, 'WEBP', quality=CALIDAD, method=5)
            escritos += destino.stat().st_size
        if mini is not None and pendiente(origen, mini):
            mini.parent.mkdir(parents=True, exist_ok=True)
            ImageOps.fit(imagen, MINI, Image.LANCZOS, centering=(0.5, 0.55)).save(mini, 'WEBP', quality=72, method=6)
            escritos += mini.stat().st_size
        if movil is not None and pendiente(origen, movil):
            alto = min(imagen.height, recorte['alto_max'])
            ancho = round(alto * recorte['proporcion'])
            # Recorta el centro, como object-cover en pantalla, a todo el alto de la foto (sin agrandar).
            ImageOps.fit(imagen, (ancho, alto), Image.LANCZOS).save(movil, 'WEBP', quality=CALIDAD, method=5)
            escritos += movil.stat().st_size
        if wa is not None and pendiente(origen, wa):
            escritos += guardar_para_canales(origen, wa)
        return relativa, escritos, None
    except Exception as error:  # una foto dañada no detiene las demás
        return relativa, 0, f'{type(error).__name__}: {error}'


def main():
    fotos = sorted(
        f.relative_to(PUBLICO).as_posix() for f in PUBLICO.rglob('*')
        if f.is_file() and f.suffix.lower() in EXTENSIONES
        and '/' in f.relative_to(PUBLICO).as_posix()                # las de la raíz (favicon, logo) no
        and f.relative_to(PUBLICO).parts[0] not in SALIDAS
    )
    # Dos fotos que solo cambian en la extensión (oslo.png y oslo.jpeg) tendrían la misma copia en public/wa.
    copias = {}
    for relativa in fotos:
        if relativa.split('/')[0] in CANALES:
            copias.setdefault(copia_canales(relativa).as_posix().lower(), []).append(relativa)
    choques = [' y '.join(iguales) for iguales in copias.values() if len(iguales) > 1]
    for choque in choques:
        print(f'ERROR {choque} tendrían la misma copia en public/wa: cámbiale el nombre a una.', file=sys.stderr)
    if choques:
        sys.exit(1)
    errores = []
    nuevos = 0
    with ProcessPoolExecutor() as grupo:
        for relativa, escritos, error in grupo.map(procesar, fotos, chunksize=2):
            if error:
                errores.append(f'{relativa}: {error}')
            elif escritos:
                nuevos += 1
                print(f'  {relativa}  →  {escritos / 1024:.0f} KB')
    total = sum(f.stat().st_size for carpeta in SALIDAS for f in (PUBLICO / carpeta).rglob('*.webp'))
    canales = [f.stat().st_size for f in (PUBLICO / 'wa').rglob('*.jpg')]
    print(f'{len(fotos)} fotos, {nuevos} procesadas ahora. public/opt + public/mini: {total / 1e6:.1f} MB. '
          f'public/wa: {len(canales)} fotos, {sum(canales) / 1e6:.1f} MB')
    for e in errores:
        print('ERROR', e, file=sys.stderr)
    sys.exit(1 if errores else 0)


if __name__ == '__main__':
    main()

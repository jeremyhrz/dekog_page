import React from 'react';
import { Eye, Plus } from 'lucide-react';
import Imagen from './Imagen';

/**
 * Tarjeta de producto del catálogo (renovación de 2026): la foto 4:5 con zoom suave y «Vista rápida» al pasar el
 * cursor (en el teléfono, el botón siempre a la vista) y el precio «desde», con la letra de la web de antes (24-oct).
 * Con medidas abre la vista rápida para elegirla; sin medidas (mesas), «Añadir» va directo al carrito.
 */
export default function ProductCard({ product, onAdd, onQuickView }) {
  const conMedidas = product.tallas && product.tallas.length > 0;
  const linea = product.subcategoria || product.categoria;
  return (
    <article className="group flex h-full flex-col">
      <div
        className="relative cursor-pointer overflow-hidden rounded-[16px] bg-arena"
        style={{ paddingBottom: '125%' }}
        onClick={() => onQuickView(product)}
      >
        <Imagen
          src={product.imagen}
          sizes="(min-width: 1280px) 300px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          alt={product.nombre}
          className="absolute left-0 top-0 h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-700 ease-expo group-hover:scale-[1.05]"
          loading="lazy"
          onLoad={(e) => e.currentTarget.classList.replace('opacity-0', 'opacity-100')}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
          className="absolute bottom-3 left-3 right-3 flex min-h-[44px] items-center justify-center rounded-full bg-papel/90 text-[10px] font-bold uppercase tracking-widest text-tinta backdrop-blur-sm transition duration-500 ease-expo hover:bg-papel lg:translate-y-[140%] lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:focus:translate-y-0 lg:focus:opacity-100"
          aria-label={`Vista rápida de ${product.nombre}`}
        >
          <Eye className="mr-2 h-3.5 w-3.5" strokeWidth={1.6} aria-hidden="true" />
          Vista rápida
        </button>
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-[8px] font-semibold uppercase tracking-widest text-gray-400">{linea}</p>
        <div className="mt-1.5 flex items-start justify-between">
          <div className="min-w-0 pr-3">
            <h3 className="text-sm font-bold uppercase tracking-tight">{product.nombre}</h3>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-gray-400">{product.desc}</p>
          </div>
          <p className="shrink-0 text-right">
            {conMedidas && <span className="block text-[8px] font-bold uppercase tracking-widest text-gray-400">Desde</span>}
            <span className="text-lg font-black text-black"><span className="mr-1 text-[0.8em] font-light">REF</span>{product.precio}</span>
          </p>
        </div>
        <div className="mt-auto pt-4">
          {conMedidas ? (
            <button type="button" onClick={() => onQuickView(product)} className="boton boton-linea min-h-[42px] w-full !py-2.5 !font-bold !text-[10px] !tracking-widest">
              Elegir medida
            </button>
          ) : (
            <button type="button" onClick={() => onAdd(product)} className="boton boton-linea min-h-[42px] w-full !py-2.5 !font-bold !text-[10px] !tracking-widest">
              <Plus className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
              <span>Añadir</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

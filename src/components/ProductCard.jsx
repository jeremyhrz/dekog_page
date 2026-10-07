import React from 'react';
import { ShoppingCart, Eye } from 'lucide-react';
import Imagen from './Imagen';

export default function ProductCard({ product, onAdd, onQuickView }) {
  return (
    <div className="product-card group flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
        <Imagen
          src={product.imagen}
          sizes="(min-width: 1280px) 300px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          alt={product.nombre}
          className="product-image w-full h-full object-cover opacity-0 transition-opacity duration-500"
          loading="lazy"
          onLoad={(e) => e.target.classList.replace('opacity-0', 'opacity-100')}
        />
        {/* Overlay with buttons */}
        <div className="product-overlay absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4 gap-2">
          {product.tallas && product.tallas.length > 0 ? (
            <button
              onClick={() => onQuickView(product)}
              className="w-full bg-white text-black py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
            >
              <ShoppingCart size={14} /> Elegir Talla
            </button>
          ) : (
            <button
              onClick={() => onAdd(product)}
              className="w-full bg-white text-black py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
            >
              <ShoppingCart size={14} /> Añadir
            </button>
          )}
          <button
            onClick={() => onQuickView(product)}
            className="w-full bg-white/20 backdrop-blur-sm text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest hover:bg-white/30 transition-colors"
          >
            <Eye size={14} /> Vista Rápida
          </button>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-tight">{product.nombre}</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{product.desc}</p>
          </div>
          <div className="text-right flex flex-col">
            {product.tallas && product.tallas.length > 0 && (
              <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold -mb-1">Desde</span>
            )}
            <span className="text-lg font-black text-black"><span className="font-light mr-1 text-[0.8em]">REF</span>{product.precio}</span>
          </div>
        </div>
        <div className="mt-3">
          <span className="inline-block text-[8px] uppercase tracking-widest font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {product.categoria}
          </span>
        </div>
      </div>
    </div>
  );
}

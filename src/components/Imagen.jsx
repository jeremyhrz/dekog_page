import React from 'react';
import { anchosDe, variante } from '../utils/imagenes';

/**
 * <img> que pide la variante WebP del tamaño justo (srcset + sizes) en vez de la foto original, que
 * puede pesar varios MB. Si la variante no existe (foto nueva sin procesar), carga la original.
 * Acepta las mismas props que un <img>, más:
 *   sizes      cuánto mide en pantalla, p. ej. "(min-width: 1024px) 50vw, 100vw" (por defecto, todo el ancho)
 *   prioridad  para la imagen principal de la página (LCP): sin lazy y con fetchpriority alta
 */
export default function Imagen({ src, sizes = '100vw', prioridad = false, loading, onError, ...props }) {
  const anchos = anchosDe(src);
  return (
    <img
      {...props}
      srcSet={anchos.map((a) => `${variante(src, a)} ${a}w`).join(', ')}
      sizes={sizes}
      loading={prioridad ? 'eager' : loading}
      fetchPriority={prioridad ? 'high' : undefined}
      decoding="async"
      src={variante(src, anchos[Math.floor((anchos.length - 1) / 2)])}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.dataset.original) {
          img.dataset.original = '1';
          img.removeAttribute('srcset');
          img.src = src;
          return;
        }
        onError?.(e); // falló también la original
      }}
    />
  );
}

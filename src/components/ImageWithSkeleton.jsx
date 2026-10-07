import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Imagen from './Imagen';

// sizes: cuánto mide en pantalla (elige la variante WebP justa). prioridad: la imagen principal de la
// página (LCP), que no espera a estar a la vista para cargarse.
const ImageWithSkeleton = ({ src, alt, className, containerClassName = "", sizes, prioridad = false }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-200 animate-pulse z-10"
          />
        )}
      </AnimatePresence>
      
      <Imagen
        src={src}
        sizes={sizes}
        prioridad={prioridad}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
        loading={prioridad ? undefined : 'lazy'}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};

export default ImageWithSkeleton;

import React, { useState, useEffect } from 'react';
import { X, ShoppingCart } from 'lucide-react';

export default function QuickView({ product, onClose, onAdd }) {
  const [selectedTalla, setSelectedTalla] = useState(null);

  useEffect(() => {
    if (product?.tallas && product.tallas.length > 0) {
      setSelectedTalla(product.tallas[0]);
    } else {
      setSelectedTalla(null);
    }
  }, [product]);

  if (!product) return null;

  const displayPrice = selectedTalla ? selectedTalla.precio : product.precio;

  const handleAdd = () => {
    if (selectedTalla) {
      onAdd({
        ...product,
        id: `${product.id}-${selectedTalla.nombre}`,
        nombre: `${product.nombre} (${selectedTalla.nombre})`,
        precio: selectedTalla.precio
      });
    } else {
      onAdd(product);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-2xl modal-content flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}>
        {/* Image */}
        <div className="md:w-1/2 aspect-square md:aspect-auto bg-gray-50">
          <img src={product.imagen} alt={product.nombre} className="w-full h-full object-cover" />
        </div>
        {/* Info */}
        <div className="md:w-1/2 p-8 flex flex-col justify-between">
          <div>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} />
            </button>
            <span className="text-[9px] uppercase tracking-[0.3em] text-gray-400 font-semibold">{product.categoria}</span>
            <h2 className="text-3xl font-black uppercase tracking-tight mt-2 mb-2 font-display">{product.nombre}</h2>
            <p className="text-gray-500 text-sm mb-4">{product.desc}</p>
            
            {product.tallas && product.tallas.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Selecciona la Talla</p>
                <div className="flex flex-wrap gap-2">
                  {product.tallas.map((talla, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedTalla(talla)}
                      className={`px-4 py-2 border rounded-xl text-xs font-bold transition-colors ${selectedTalla?.nombre === talla.nombre ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-600 hover:border-black'}`}
                    >
                      {talla.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-4xl font-black mb-6"><span className="font-light mr-1 text-[0.7em]">REF</span>{displayPrice}</p>
            <div className="space-y-3 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Disponible para envío inmediato</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                <span>Garantía de calidad Dekog Home</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                <span>Consultar colores y telas disponibles</span>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <button onClick={handleAdd}
              className="btn-primary w-full bg-black text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2">
              <ShoppingCart size={16} /> Añadir al Carrito
            </button>
            <a href={`https://wa.me/584145847791?text=Hola, me interesa el producto: ${product.nombre}${selectedTalla ? ` (${selectedTalla.nombre})` : ''} (REF ${displayPrice})`}
              target="_blank" rel="noopener noreferrer"
              className="block text-center w-full border-2 border-black text-black py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-black hover:text-white transition-colors">
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

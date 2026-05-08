import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';

export default function Cart({ carrito, setCarrito, abierto, setAbierto }) {
  const total = carrito.reduce((s, p) => s + (p.precio * p.cant), 0);

  const updateQty = (id, delta) => {
    setCarrito(carrito.map(x => {
      if (x.id === id) {
        const newCant = x.cant + delta;
        return newCant > 0 ? { ...x, cant: newCant } : x;
      }
      return x;
    }).filter(x => x.cant > 0));
  };

  const sendWA = () => {
    const items = carrito.map(p => `• ${p.cant}x ${p.nombre} (REF ${p.precio} c/u)`).join('%0A');
    const mensaje = `¡Hola Dekog Home! 👋%0A%0AQuiero solicitar información sobre estos productos:%0A%0A${items}%0A%0A*Total estimado: REF ${total}*%0A%0A¿Podrían confirmarme disponibilidad? Gracias.`;
    window.open(`https://wa.me/584145847791?text=${mensaje}`, '_blank');
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[55] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm cart-overlay" onClick={() => setAbierto(false)} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col cart-panel">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <ShoppingCart size={20} />
            <h2 className="text-lg font-black uppercase tracking-tight">Tu Carrito</h2>
            <span className="text-xs text-gray-400">({carrito.length} {carrito.length === 1 ? 'item' : 'items'})</span>
          </div>
          <button onClick={() => setAbierto(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <ShoppingCart size={48} className="mb-4" />
              <p className="text-sm font-semibold uppercase tracking-widest">Tu carrito está vacío</p>
              <p className="text-xs text-gray-400 mt-2">Explora nuestro catálogo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {carrito.map(p => (
                <div key={p.id} className="flex gap-4 bg-gray-50 p-4 rounded-2xl group hover:bg-gray-100 transition-colors">
                  <img src={p.imagen} className="w-20 h-20 object-cover rounded-xl" alt={p.nombre} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm uppercase truncate">{p.nombre}</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{p.categoria}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border rounded-full">
                        <button onClick={() => updateQty(p.id, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors">
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold w-6 text-center">{p.cant}</span>
                        <button onClick={() => updateQty(p.id, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm font-black"><span className="font-light mr-1 text-[0.8em]">REF</span>{p.precio * p.cant}</span>
                    </div>
                  </div>
                  <button onClick={() => setCarrito(carrito.filter(x => x.id !== p.id))}
                    className="self-start p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {carrito.length > 0 && (
          <div className="p-6 border-t bg-white">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Total estimado</span>
              <span className="text-2xl font-black"><span className="font-light mr-1 text-[0.8em]">REF</span>{total}</span>
            </div>
            <button onClick={sendWA}
              className="btn-primary w-full bg-black text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.591-.838-6.312-2.234l-.44-.37-3.065 1.027 1.027-3.065-.37-.44A9.953 9.953 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
              Pedir por WhatsApp
            </button>
            <button onClick={() => setCarrito([])}
              className="w-full mt-2 text-xs text-gray-400 hover:text-red-500 uppercase tracking-widest py-2 transition-colors">
              Vaciar Carrito
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

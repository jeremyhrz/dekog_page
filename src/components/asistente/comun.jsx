import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { AvatarDekog } from './LogoDekog';
import { propsWhatsapp } from '../../utils/whatsapp';

/**
 * Lo que usan a la vez el botón flotante (AsistenteChat.jsx, va con la página) y la conversación
 * (AsistentePanel.jsx, se descarga aparte): claves de sessionStorage y la cabecera.
 */
export const CLAVE = 'dekog-asistente-chat';

/** Id de la conversación (una fila por conversación en la hoja de clientes). crypto.randomUUID solo
 * existe en https y localhost: sin él (p. ej., probando por la IP local) se usa el respaldo. */
export const nuevoId = () => crypto.randomUUID?.()
  ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export function IconoWhatsapp({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

const BOTON_CABECERA = 'grid h-11 w-11 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white active:scale-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-10 sm:w-10';

/** Cabecera del chat. Sin `onReiniciar` no se muestra «Nueva conversación» (no hay nada que reiniciar). */
export function Cabecera({ onCerrar, onReiniciar, cargando = false }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 bg-[#0a0a0a] px-3 text-white sm:h-[68px] sm:px-4">
      <AvatarDekog tam={40} className="ring-1 ring-white/20">
        <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#25D366] ring-2 ring-[#0a0a0a]" />
      </AvatarDekog>
      <div className="min-w-0 flex-1">
        <h2 id="dk-chat-titulo" className="truncate text-[13px] font-semibold uppercase tracking-[0.22em]">Dekog Home</h2>
        <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-white/65">
          <span aria-hidden="true" className="dk-latido relative h-1.5 w-1.5 shrink-0 rounded-full bg-[#25D366]" />
          <span className="truncate">En línea<span className="hidden sm:inline"> · responde al instante</span></span>
        </p>
      </div>
      <div className="flex items-center">
        {onReiniciar && (
          <button type="button" onClick={onReiniciar} disabled={cargando} className={BOTON_CABECERA}
            aria-label="Nueva conversación" title="Nueva conversación">
            <RotateCcw size={18} />
          </button>
        )}
        <a {...propsWhatsapp()} className={BOTON_CABECERA}
          aria-label="Hablar con una asesora por WhatsApp" title="Hablar con una asesora">
          <IconoWhatsapp />
        </a>
        <button type="button" onClick={onCerrar} className={BOTON_CABECERA} aria-label="Cerrar el asistente" title="Cerrar">
          <X size={20} />
        </button>
      </div>
    </header>
  );
}

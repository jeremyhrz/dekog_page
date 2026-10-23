import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Foto from '../../components/efectos/Foto';
import { MarcaD } from '../../components/marca/Logo';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { OFERTAS, promoActiva } from '../../../asistente/src/lib/promo';
import { productos } from '../../data/productos';
import { miniatura } from '../../utils/imagenes';
import { VISTA, escalonar, variantes } from '../../lib/movimiento';
import { elegirWhatsapp } from '../../utils/whatsapp';

// Cuatro piezas de modelos distintos para la muestra (los datos son los del PDF de la promo, lib/promo.js).
const MODELOS = ['Toronto', 'Noa', 'Hamburgo', 'Oslo'];
const MUESTRA = MODELOS.map((m) => OFERTAS.find((o) => o.modelo === m)).filter(Boolean);
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * La promo «Mobiliario en stock» (solo mientras esté activa, como en el asistente): una foto en arco con un sello que
 * gira, el titular y cuatro piezas con su precio de antes tachado. El catálogo completo es la página /ofertas.
 */
export default function PromoStock() {
  const promo = promoActiva();
  if (!promo) return null;
  return (
    <section id="ofertas" aria-labelledby="ofertas-titulo" className="seccion relative overflow-hidden bg-papel">
      <div className="contenedor grid items-center gap-y-16 lg:grid-cols-12 lg:gap-x-8">
        <figure className="relative mx-auto w-[78%] max-w-[440px] lg:col-span-5 lg:w-full">
          <div className="relative overflow-hidden rounded-b-[28px] rounded-t-full bg-arena" style={{ paddingBottom: '125%' }}>
            <Foto src="/hero/IMG_3918.PNG" alt="Cama tapizada en stock" retrato rellenar revelar />
          </div>
          <Sello />
        </figure>

        <div className="lg:col-span-6 lg:col-start-7">
          <Revelar como="p" className="etiqueta flex items-center text-madera-oscuro" y={12}>
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            Promo · Mobiliario en stock
          </Revelar>
          <TextoDividido
            como="h2"
            id="ofertas-titulo"
            texto={'Piezas listas, *hasta 20\u00a0%* menos'}
            className="titulo-display mt-5 text-tinta"
          />
          <Revelar como="p" retraso={0.15} className="mt-6 max-w-md text-grafito">
            Camas ya fabricadas, listas para entregar, a precio especial. Cada pieza es única: cuando se va, se va.
          </Revelar>

          <motion.ul className="mt-10 border-t border-tinta/10" initial="oculto" whileInView="visible" viewport={VISTA} variants={escalonar(0.09)}>
            {MUESTRA.map((o) => {
              const producto = productos.find((p) => p.id === o.id);
              return (
                <motion.li key={`${o.modelo}-${o.medida}-${o.color}`} variants={variantes.aparecer} className="flex items-center border-b border-tinta/10 py-4">
                  {producto && (
                    <span className="mr-4 block h-[60px] w-12 shrink-0 overflow-hidden rounded-md bg-arena">
                      <img src={miniatura(producto.imagen)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[1.45rem] leading-tight">{o.modelo} <span className="italic text-madera-titulo">{o.medida}</span></span>
                    <span className="block text-sm text-grafito/70">{o.color}{o.tela ? ` · ${o.tela}` : ''}</span>
                  </span>
                  <span className="ml-3 text-right">
                    <span className="block text-sm text-grafito/60 line-through">REF {miles(o.antes)}</span>
                    <span className="block font-display text-[1.45rem] leading-tight text-madera-oscuro">REF {miles(o.ahora)}</span>
                  </span>
                </motion.li>
              );
            })}
          </motion.ul>

          <Revelar retraso={0.2} className="mt-9 flex flex-col sm:flex-row">
            {/* ofertas.html y no /ofertas: el rewrite de vercel.json no existe en npm run dev. */}
            <a href="/ofertas.html" className="boton boton-oscuro group w-full sm:mr-3 sm:w-auto">
              <span>Ver todas las ofertas</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.6} aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => elegirWhatsapp('Hola, me interesa una pieza de la promo de mobiliario en stock.')}
              className="boton boton-linea mt-3 w-full sm:mt-0 sm:w-auto"
            >
              <IconoWhatsapp size={16} />
              <span>Apartar por WhatsApp</span>
            </button>
          </Revelar>
        </div>
      </div>
    </section>
  );
}

/** Sello redondo con texto que gira alrededor de la D de Dekog. */
function Sello() {
  return (
    <div aria-hidden="true" className="absolute -bottom-7 -left-8 grid h-[7.5rem] w-[7.5rem] place-items-center rounded-full bg-tinta text-papel shadow-[0_20px_40px_-18px_rgb(21_19_17/0.6)] lg:-left-14 lg:h-36 lg:w-36">
      <svg viewBox="0 0 120 120" className="girar-lento absolute left-0 top-0 h-full w-full">
        <defs>
          <path id="sello-promo" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" />
        </defs>
        <text fill="currentColor" fontSize="9.4" fontWeight="500" letterSpacing="1.6">
          <textPath href="#sello-promo" xlinkHref="#sello-promo" textLength="274" lengthAdjust="spacing">HASTA 20 % ✦ PIEZAS EN STOCK ✦</textPath>
        </text>
      </svg>
      <MarcaD className="h-9 w-9 text-madera lg:h-11 lg:w-11" />
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import { DEKOG } from '../../data/sitio';
import { VISTA, escalonar, useMenosMovimiento, variantes } from '../../lib/movimiento';
import { horasEnteras } from './texto';

const MAPA = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3925.9642436440263!2d-67.9994466!3d10.2337844!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e8067bc8767db79%3A0x17e49c019b1dfaea!2sDekog%20Home!5e0!3m2!1ses!2sve!4v1716733200000!5m2!1ses!2sve';

const DATOS = [
  ['Dirección', 'CC Vía Veneto, Nivel Roma, Local R17, Mañongo, Naguanagua'],
  ['Horario', 'Lunes a sábado, 9:00 a. m. a 6:00 p. m.'],
];

/**
 * Encuéntranos: la dirección, el horario y el teléfono del showroom, y el mapa de Google (perezoso) en un marco
 * redondeado con su filete, que se destapa de abajo arriba al entrar en pantalla (con «reducir movimiento», quieto).
 * El mapa va un poco desaturado y cálido, para que no grite junto a la paleta; al pasar el cursor recupera su color.
 */
export default function Mapa() {
  const menos = useMenosMovimiento();
  return (
    <section aria-labelledby="mapa-titulo" className="seccion relative overflow-hidden bg-hueso">
      <div className="contenedor grid gap-y-16 lg:grid-cols-12 lg:items-center lg:gap-x-8">
        <div className="lg:col-span-5 lg:pr-10">
          <Revelar como="p" y={12} className="etiqueta flex items-center text-madera-oscuro">
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            Showroom
          </Revelar>
          <TextoDividido
            como="h2"
            id="mapa-titulo"
            texto="Encuéntranos en *Mañongo*"
            className="titulo-display mt-5 text-[clamp(2.75rem,5.6vw,5.25rem)]"
          />
          <Revelar como="p" retraso={0.15} className="mt-6 max-w-sm text-[1.0625rem] leading-relaxed text-grafito">
            Visita nuestro showroom en Naguanagua para una consulta presencial.
          </Revelar>

          <motion.dl className="mt-9 border-t border-tinta/10" initial="oculto" whileInView="visible" viewport={VISTA} variants={escalonar(0.1, 0.15)}>
            {DATOS.map(([dato, valor]) => (
              <motion.div key={dato} variants={variantes.aparecer} className="border-b border-tinta/10 py-4">
                <dt className="etiqueta text-grafito/60">{dato}</dt>
                <dd className="mt-1.5 text-tinta">{horasEnteras(valor)}</dd>
              </motion.div>
            ))}
            <motion.div variants={variantes.aparecer} className="border-b border-tinta/10 py-4">
              <dt className="etiqueta text-grafito/60">Teléfono</dt>
              <dd className="mt-1.5">
                <a href={`tel:${DEKOG.telefono.replace(/\s/g, '')}`} className="enlace-linea whitespace-nowrap pb-0.5 text-tinta hover:text-madera-oscuro">
                  {DEKOG.telefono}
                </a>
              </dd>
            </motion.div>
          </motion.dl>

          <Revelar retraso={0.2} className="mt-9">
            <a href={DEKOG.mapa} target="_blank" rel="noopener noreferrer" className="boton boton-oscuro group w-full sm:w-auto">
              <span>Cómo llegar</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.6} aria-hidden="true" />
            </a>
          </Revelar>
        </div>

        <div className="relative lg:col-span-7 lg:col-start-6">
          <motion.div
            className="relative overflow-hidden rounded-[22px] bg-arena pb-[115%] sm:pb-[72%] lg:pb-[80%]"
            initial="oculto"
            whileInView="visible"
            viewport={VISTA}
            variants={menos ? variantes.fundido : variantes.foto}
          >
            <iframe
              src={MAPA}
              title="Mapa del showroom de Dekog en el CC Vía Veneto"
              className="absolute left-0 top-0 h-full w-full border-0 transition-[filter] duration-700 ease-suave [filter:grayscale(0.6)_sepia(0.14)] hover:[filter:none]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </motion.div>
          {/* El filete del marco, como el del arco de las cabeceras: llega después del mapa */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3 -left-3 -right-3 -top-3 rounded-[30px] border border-tinta/10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={VISTA}
            transition={{ duration: 1, delay: menos ? 0 : 0.6 }}
          />
        </div>
      </div>
    </section>
  );
}

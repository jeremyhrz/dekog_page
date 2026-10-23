import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import Revelar from '../../components/efectos/Revelar';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { DEKOG } from '../../data/sitio';
import { VISTA, cx, escalonar, variantes } from '../../lib/movimiento';
import { propsWhatsapp } from '../../utils/whatsapp';
import { horasEnteras } from './texto';

const externo = { target: '_blank', rel: 'noopener noreferrer' };
const FACEBOOK = 'https://www.facebook.com/share/1Hfbm8dQrs/?mibextid=wwXIfr';

// Cada número va entero en una línea (whitespace-nowrap), también en teléfonos.
const LINEAS = [
  ['Línea 1', '+58 414 584 7791'],
  ['Línea 2', '+58 424 400 6086'],
];

// Acción de una fila: rótulo con su ícono, 44 px de alto para el dedo.
const ACCION = 'etiqueta group mr-6 inline-flex min-h-[44px] items-center text-tinta transition-colors duration-300 hover:text-madera-oscuro';
const ICONO = 'h-[15px] w-[15px] shrink-0';

/**
 * Los datos de contacto como una lista con filetes: teléfono y WhatsApp, correo, ubicación, horario y redes, cada uno
 * con lo que se puede hacer (escribir, llamar, enviar un correo, cómo llegar). Las filas suben una tras otra.
 */
export default function Datos({ className }) {
  return (
    <div className={className}>
      <Revelar como="p" y={12} className="etiqueta flex items-center text-madera-oscuro">
        <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
        Datos de contacto
      </Revelar>
      <motion.dl
        className="mt-6 border-t border-tinta/10 text-[1.0625rem] leading-relaxed text-tinta"
        initial="oculto"
        whileInView="visible"
        viewport={VISTA}
        variants={escalonar(0.1)}
      >
        <Fila titulo="Teléfono · WhatsApp">
          {LINEAS.map(([linea, numero]) => (
            <span key={linea} className="flex items-baseline">
              <span className="w-20 shrink-0 text-grafito/60">{linea}</span>
              <span className="whitespace-nowrap tabular-nums">{numero}</span>
            </span>
          ))}
          <span className="mt-1 flex flex-wrap">
            <a {...propsWhatsapp('Hola, tengo una consulta sobre sus servicios.')} className={ACCION}>
              <IconoWhatsapp size={15} />
              <span className="ml-2">Escribir por WhatsApp</span>
            </a>
            <a href={`tel:${DEKOG.telefono.replace(/\s/g, '')}`} className={ACCION}>
              <Phone className={ICONO} strokeWidth={1.6} aria-hidden="true" />
              <span className="ml-2">Llamar</span>
            </a>
          </span>
        </Fila>

        <Fila titulo="Email">
          <span className="block break-words">{DEKOG.correo}</span>
          <a href={`mailto:${DEKOG.correo}`} className={ACCION}>
            <Mail className={ICONO} strokeWidth={1.6} aria-hidden="true" />
            <span className="ml-2">Enviar correo</span>
          </a>
        </Fila>

        <Fila titulo="Ubicación">
          <span className="block">{DEKOG.showroom}</span>
          <span className="block text-grafito/75">{DEKOG.zona}</span>
          <a href={DEKOG.mapa} {...externo} className={ACCION}>
            <MapPin className={ICONO} strokeWidth={1.6} aria-hidden="true" />
            <span className="ml-2">Cómo llegar</span>
            <ArrowUpRight
              className="ml-1 h-3.5 w-3.5 transition-transform duration-500 ease-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={1.6}
              aria-hidden="true"
            />
          </a>
        </Fila>

        <Fila titulo="Horario de atención">
          <span className="block">{horasEnteras(DEKOG.horario)}</span>
        </Fila>

        <Fila titulo="Síguenos" ultima>
          <span className="-mb-2 flex flex-wrap pt-1">
            <Red href={DEKOG.instagram.home} icono={<Instagram className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}>@dekog.home</Red>
            <Red href={DEKOG.instagram.arquitectura} icono={<Instagram className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}>
              @dekog.arquitectura
            </Red>
            <Red href={FACEBOOK} icono={<Facebook className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}>Facebook</Red>
            <Red {...propsWhatsapp()} icono={<IconoWhatsapp size={15} />}>WhatsApp</Red>
          </span>
        </Fila>
      </motion.dl>
    </div>
  );
}

function Fila({ titulo, ultima = false, children }) {
  return (
    <motion.div variants={variantes.aparecer} className={cx('border-b border-tinta/10', ultima ? 'pb-7 pt-5' : 'py-5')}>
      <dt className="etiqueta text-madera-oscuro">{titulo}</dt>
      <dd className="mt-2.5">{children}</dd>
    </motion.div>
  );
}

/** Píldora de una red social (con su borde fino; se rellena de tinta al pasar el cursor). */
function Red({ icono, children, ...enlace }) {
  return (
    <a
      {...externo}
      {...enlace}
      className="mb-2 mr-2 inline-flex min-h-[44px] items-center rounded-full px-4 text-[0.9375rem] text-tinta ring-1 ring-inset ring-tinta/15 transition-colors duration-300 hover:bg-tinta hover:text-papel hover:ring-tinta"
    >
      {icono}
      <span className="ml-2">{children}</span>
    </a>
  );
}

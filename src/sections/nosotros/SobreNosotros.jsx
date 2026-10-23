import React from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido, { Enfasis } from '../../components/efectos/TextoDividido';
import Foto from '../../components/efectos/Foto';
import Contador from '../../components/efectos/Contador';
import Cinta from '../../components/efectos/Cinta';
import { MarcaD } from '../../components/marca/Logo';
import { CIFRAS, CORREO_CV, EQUIPO } from './datos';
import { VISTA, cx } from '../../lib/movimiento';

/**
 * Sobre nosotros (#nosotros, el id de la sección de siempre): una cinta con quiénes forman el equipo, la frase de lo
 * que hace Dekog en Bodoni grande, la foto con el sello que gira, «Únete a nuestro equipo» (el correo con el asunto de
 * las postulaciones) y las tres cifras, que suben al verse.
 */
export default function SobreNosotros() {
  return (
    <section id="nosotros" aria-labelledby="sobre-titulo" className="relative overflow-hidden bg-hueso pb-[var(--aire)]">
      {/* Decorativa: la bajada de la cabecera ya dice quiénes forman el equipo. */}
      <div aria-hidden="true">
        <Cinta
          elementos={EQUIPO}
          velocidad={2}
          className="border-y border-tinta/10 py-4 font-display text-[2.6rem] leading-[1.15] tracking-[-0.01em] md:py-6 md:text-[4.5rem] [&_span:nth-child(4n+3)]:italic [&_span:nth-child(4n+3)]:text-madera-titulo"
          claseSeparador="text-[0.38em] text-madera"
        />
      </div>

      <div className="contenedor pt-[var(--aire)]">
        <div className="grid items-center gap-y-16 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-7 lg:col-start-6 lg:row-start-1">
            <Revelar como="p" className="etiqueta flex items-center text-madera-oscuro" y={12}>
              <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
              Sobre nosotros
            </Revelar>
            <TextoDividido
              como="h2"
              id="sobre-titulo"
              texto="Integramos diseño, construcción y mobiliario en *un solo proceso*"
              escalon={0.045}
              className="mt-6 font-display text-[clamp(2.25rem,5vw,4.6rem)] leading-[1.02] tracking-[-0.02em] [text-wrap:balance]"
            />
            <Revelar retraso={0.15} className="mt-8 max-w-xl lg:mt-10">
              <Enfasis
                como="p"
                texto="Te acompañamos desde *la idea inicial hasta el último detalle*. Nos involucramos en cada etapa para hacer realidad espacios funcionales, estéticos y hechos para ti."
                className="text-[1.0625rem] leading-relaxed text-grafito lg:text-[1.125rem]"
              />
            </Revelar>
            <Revelar retraso={0.25} className="mt-9">
              <a href={CORREO_CV} className="boton boton-linea w-full sm:w-auto">
                <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span>Únete a nuestro equipo</span>
              </a>
            </Revelar>
          </div>

          <figure className="relative mx-auto w-[74%] max-w-[380px] lg:col-span-4 lg:col-start-1 lg:row-start-1 lg:w-full">
            <div className="relative overflow-hidden rounded-[20px] bg-arena [-webkit-mask-image:-webkit-radial-gradient(white,black)]" style={{ paddingBottom: '125%' }}>
              <Foto
                src="/nosotros/SECUNDARIA.PNG"
                alt="Sofá curvo y puff tapizados en bouclé, en un espacio de líneas limpias"
                rellenar
                revelar
                parallax={0.06}
                sizes="(min-width: 1024px) 30vw, 74vw"
              />
            </div>
            <Sello />
          </figure>
        </div>

        <div className="mt-20 grid grid-cols-1 border-t border-tinta/10 sm:grid-cols-3 lg:mt-28">
          {CIFRAS.map((cifra, i) => (
            <Revelar
              key={cifra.titulo}
              retraso={i * 0.1}
              className={cx('border-b border-tinta/10 py-9 sm:border-b-0 sm:pb-0 sm:pt-12', i > 0 && 'sm:border-l sm:pl-6 lg:pl-10')}
            >
              <Contador
                valor={cifra.valor}
                antes={cifra.antes}
                despues={cifra.despues}
                className="block whitespace-nowrap font-display text-[4rem] leading-none tracking-[-0.03em] sm:text-[clamp(3.25rem,8.5vw,7.5rem)]"
              />
              <p className="etiqueta mt-5 text-madera-oscuro">{cifra.titulo}</p>
              <p className="mt-1.5 text-[15px] text-grafito/75">{cifra.detalle}</p>
            </Revelar>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Sello redondo con texto que gira alrededor de la D de Dekog (el de la portada). Entra con un resorte cuando la foto
 * ya se está destapando, para no quedar flotando solo sobre el hueco.
 */
function Sello() {
  return (
    <motion.div
      aria-hidden="true"
      className="absolute -bottom-8 -right-7 grid h-[7.5rem] w-[7.5rem] place-items-center rounded-full bg-tinta text-papel shadow-[0_20px_40px_-18px_rgb(21_19_17/0.6)] lg:-right-14 lg:h-36 lg:w-36"
      initial={{ opacity: 0, scale: 0.6, rotate: -40 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      viewport={VISTA}
      transition={{ type: 'spring', stiffness: 170, damping: 17, delay: 0.55 }}
    >
      <svg viewBox="0 0 120 120" className="girar-lento absolute left-0 top-0 h-full w-full">
        <defs>
          <path id="sello-nosotros" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" />
        </defs>
        <text fill="currentColor" fontSize="9.2" fontWeight="500" letterSpacing="1.5">
          <textPath href="#sello-nosotros" xlinkHref="#sello-nosotros" textLength="274" lengthAdjust="spacing">SOMOS DEKOG ✦ UN SOLO EQUIPO ✦</textPath>
        </text>
      </svg>
      <MarcaD className="h-9 w-9 text-madera lg:h-11 lg:w-11" />
    </motion.div>
  );
}

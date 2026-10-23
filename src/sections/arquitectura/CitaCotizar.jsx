import React from 'react';
import { motion as Motion } from 'framer-motion';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Magnetico from '../../components/efectos/Magnetico';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { MENSAJE, VALORES } from './datos';
import { VISTA, cx, escalonar, useMenosMovimiento, variantes } from '../../lib/movimiento';
import { elegirWhatsapp } from '../../utils/whatsapp';

/**
 * La banda oscura de cotizar: la pregunta en grande, la respuesta en cursiva, el botón de WhatsApp y, al lado, una
 * fachada en alzado que se dibuja sola, como un plano, al entrar en pantalla. Debajo, los tres valores.
 */
export default function CitaCotizar() {
  return (
    <section id="cotiza" aria-labelledby="cotiza-titulo" className="sobre-oscuro seccion relative overflow-hidden bg-noche text-hueso">
      <div className="contenedor grid items-center gap-y-14 lg:grid-cols-12 lg:gap-x-8">
        <div className="relative z-10 lg:col-span-6">
          <Revelar como="p" className="etiqueta flex items-center text-madera-claro" y={12}>
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            Cotiza tu proyecto
          </Revelar>
          <TextoDividido como="h2" id="cotiza-titulo" texto="¿Listo para construir *tu proyecto?*" className="titulo-display mt-5" />
          <Revelar como="p" retraso={0.15} className="mt-7 font-display text-[1.65rem] italic leading-[1.15] text-hueso/85 lg:text-[2.1rem]">
            Hagamos realidad tu espacio ideal.
          </Revelar>
          <Revelar retraso={0.25} className="mt-9">
            <Magnetico className="w-full sm:w-auto">
              <button type="button" onClick={() => elegirWhatsapp(MENSAJE)} className="boton boton-claro w-full sm:w-auto">
                <IconoWhatsapp size={17} />
                <span>Cotiza tu proyecto</span>
              </button>
            </Magnetico>
            <p className="mt-4 text-[15px] text-hueso/60">La asesoría inicial es gratuita, presencial o virtual.</p>
          </Revelar>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <Fachada className="mx-auto block h-auto w-full max-w-[620px] lg:mr-0" />
        </div>
      </div>

      <div className="contenedor mt-16 lg:mt-24">
        <Motion.ul
          className="grid grid-cols-1 border-t border-hueso/15 sm:grid-cols-3"
          initial="oculto"
          whileInView="visible"
          viewport={VISTA}
          variants={escalonar(0.1)}
        >
          {VALORES.map((valor, i) => (
            <Motion.li
              key={valor}
              variants={variantes.aparecer}
              className={cx(
                'flex items-baseline border-b border-hueso/15 py-6 sm:border-b-0 sm:pb-0 sm:pt-8',
                i > 0 && 'sm:border-l sm:pl-8 lg:pl-10',
                i < VALORES.length - 1 && 'sm:pr-8',
              )}
            >
              <span aria-hidden="true" className="mr-4 text-[0.8rem] text-madera">✦</span>
              <span className="font-display text-[1.45rem] leading-tight lg:text-[1.7rem]">{valor}</span>
            </Motion.li>
          ))}
        </Motion.ul>
      </div>
    </section>
  );
}

// ── La fachada en alzado (viewBox 560 × 400): una casa de dos niveles con su marco, la escalera tras el vidrio, los
//    listones arriba, un volumen de celosías al lado, un árbol, las cotas y los ejes A y B. ──────────────

const rayas = (n, fn) => Array.from({ length: n }, (_, k) => fn(k)).join('');

// [d, capa (orden en que se dibuja), tono]
const TRAZOS = [
  ['M0 340H560', 0, 'suelo'],
  [rayas(31, (k) => `M${12 + k * 18} 341l-9 12`), 1, 'tenue'],
  ['M96 340V88H424V340', 1, 'obra'],
  ['M118 340V110H402V340', 2, 'obra'],
  ['M118 212H402M118 228H402', 3, 'obra'],
  ['M96 152H66V292H96', 3, 'obra'],
  ['M424 150H504V340', 3, 'obra'],
  [rayas(11, (k) => `M432 ${166 + k * 16}H496`), 4, 'detalle'],
  ['M189 228V340M260 228V340M331 228V340', 4, 'detalle'],
  [`M196 340${rayas(8, () => 'h14v-14')}`, 5, 'detalle'],
  ['M196 318L286 228', 6, 'detalle'],
  ['M132 126H246V198H132ZM189 126V198', 4, 'detalle'],
  [rayas(13, (k) => `M${268 + k * 10} 120V204`), 5, 'detalle'],
  ['M12 262a24 24 0 1 0 48 0a24 24 0 1 0-48 0M36 286V340', 6, 'tenue'],
  ['M96 56H424M96 48V80M424 48V80M90 62L102 50M418 62L430 50', 7, 'cota'],
  ['M540 88V340M432 88H548M534 94L546 82M534 346L546 334', 8, 'cota'],
  ['M85 384a11 11 0 1 0 22 0a11 11 0 1 0-22 0M413 384a11 11 0 1 0 22 0a11 11 0 1 0-22 0', 8, 'cota'],
];

const TONO = {
  suelo: 'text-hueso/60',
  obra: 'text-hueso/55',
  detalle: 'text-hueso/30',
  tenue: 'text-hueso/20',
  cota: 'text-madera-claro/80',
};
const GROSOR = { suelo: 1.3, obra: 1.25, detalle: 1, tenue: 1, cota: 1 };
const PLUMA = [0.65, 0, 0.35, 1];

const TRAZO = {
  oculto: { pathLength: 0, opacity: 0 },
  visible: (capa) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1.5, ease: PLUMA, delay: 0.15 + capa * 0.22 },
      opacity: { duration: 0.01, delay: 0.15 + capa * 0.22 },
    },
  }),
};
const APARECE = {
  oculto: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, delay: 2 } },
};

function Fachada({ className }) {
  const menos = useMenosMovimiento();
  return (
    <Motion.svg
      viewBox="0 0 560 400"
      fill="none"
      // Puntas rectas: un guion de largo 0 (el arranque del trazado) no se pinta; con puntas redondas sería un punto.
      strokeLinecap="butt"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      initial={menos ? false : 'oculto'}
      whileInView="visible"
      viewport={VISTA}
    >
      {/* Los ejes, punteados (sin trazado: el punteado y el dibujo usan el mismo stroke-dasharray) */}
      <Motion.path
        d="M96 28V372M424 28V372"
        className="text-madera-claro/30"
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="2 7"
        variants={APARECE}
      />
      {TRAZOS.map(([d, capa, tono]) => (
        <Motion.path
          key={d}
          d={d}
          className={TONO[tono]}
          stroke="currentColor"
          strokeWidth={GROSOR[tono]}
          custom={capa}
          variants={TRAZO}
        />
      ))}
      <Motion.g variants={APARECE} className="text-madera-claro" fill="currentColor" fontSize="11" fontWeight="500" textAnchor="middle">
        <text x="96" y="388">A</text>
        <text x="424" y="388">B</text>
      </Motion.g>
    </Motion.svg>
  );
}

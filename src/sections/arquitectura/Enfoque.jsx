import React from 'react';
import { motion as Motion } from 'framer-motion';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Foto from '../../components/efectos/Foto';
import Contador from '../../components/efectos/Contador';
import IconoTrazado from './IconoTrazado';
import { ENFOQUE } from './datos';
import { PROCESO } from '../../data/sitio';
import { VISTA, escalonar, variantes } from '../../lib/movimiento';

// «+120 proyectos entregados»: la misma cifra de la portada (data/sitio.js).
const ENTREGADOS = PROCESO.cifras[0];

/**
 * Nuestro enfoque: el render residencial entero (en la galería solo se ve una franja), con la cifra de proyectos
 * entregados que sube al verse, y los tres pilares en una lista de filetes con su ícono dibujado.
 */
export default function Enfoque() {
  return (
    <section id="enfoque" aria-labelledby="enfoque-titulo" className="seccion relative bg-hueso">
      <div className="contenedor grid items-center gap-y-20 lg:grid-cols-12 lg:gap-x-8">
        <figure className="relative lg:col-span-6">
          {/* Alto por el truco del padding (sin aspect-ratio, que iOS 13 no tiene): más alta en el teléfono. */}
          <div className="relative overflow-hidden rounded-[22px] bg-arena pb-[92%] sm:pb-[70%] lg:pb-[76%]">
            <Foto
              src="/arquitectura/residencial.jpeg"
              alt="Render de la fachada de una casa con columnas de listones de madera y jardinera iluminada"
              rellenar
              revelar
              parallax={0.06}
              posicion="30% 50%"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
          <Revelar
            retraso={0.3}
            className="absolute -bottom-10 left-5 rounded-[18px] bg-noche px-6 py-5 text-hueso shadow-[0_24px_50px_-22px_rgb(21_19_17/0.65)] sm:left-auto sm:right-6 lg:-right-6 lg:px-7 lg:py-6"
          >
            <Contador
              valor={ENTREGADOS.valor}
              antes={ENTREGADOS.antes}
              despues={ENTREGADOS.despues}
              className="block font-display text-[3.25rem] leading-none tracking-[-0.02em] lg:text-[4rem]"
            />
            <span className="etiqueta mt-2.5 block text-hueso/70">{ENTREGADOS.texto}</span>
          </Revelar>
        </figure>

        <div className="lg:col-span-5 lg:col-start-8">
          <Revelar como="p" className="etiqueta flex items-center text-madera-oscuro" y={12}>
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            Nuestro enfoque
          </Revelar>
          <TextoDividido
            como="h2"
            id="enfoque-titulo"
            texto="Construimos *confianza,* entregamos resultados"
            className="titulo-display mt-5 lg:text-[clamp(3.25rem,4.9vw,4.6rem)]"
          />

          <Motion.ul className="mt-10 border-t border-tinta/10 lg:mt-12" initial="oculto" whileInView="visible" viewport={VISTA} variants={escalonar(0.12)}>
            {ENFOQUE.map((pilar, i) => (
              <Motion.li key={pilar.titulo} variants={variantes.aparecer} className="flex items-start border-b border-tinta/10 py-6">
                <IconoTrazado icono={pilar.icono} retraso={0.2 + i * 0.15} size={30} grosor={1.2} className="mr-5 mt-1 shrink-0 text-madera-oscuro" />
                <div className="min-w-0">
                  <h3 className="font-display text-[1.5rem] leading-tight">{pilar.titulo}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-grafito/80">{pilar.texto}</p>
                </div>
              </Motion.li>
            ))}
          </Motion.ul>
        </div>
      </div>
    </section>
  );
}

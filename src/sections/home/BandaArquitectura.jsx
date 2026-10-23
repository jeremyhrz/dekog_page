import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Foto from '../../components/efectos/Foto';
import Magnetico from '../../components/efectos/Magnetico';

/**
 * «Descubre Dekog Arquitectura»: banda oscura al final de /home que lleva a la otra línea de Dekog. La fachada en vertical
 * (se destapa y tiene parallax) y, encima, un interior más pequeño.
 */
export default function BandaArquitectura() {
  return (
    <section id="descubre-arquitectura" aria-labelledby="arquitectura-titulo" className="sobre-oscuro relative overflow-hidden bg-noche pt-[var(--aire)] text-hueso">
      <div className="contenedor grid items-center gap-y-16 lg:grid-cols-12 lg:gap-x-10">
        <div className="lg:col-span-6">
          <Revelar como="p" y={12} className="etiqueta flex items-center text-madera-claro">
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            ¿Necesitas también el espacio?
          </Revelar>
          <TextoDividido
            como="h2"
            id="arquitectura-titulo"
            texto="Descubre Dekog *Arquitectura*"
            className="titulo-display mt-5 text-[clamp(2.75rem,7vw,5.75rem)]"
          />
          <Revelar como="p" retraso={0.15} className="mt-7 max-w-md text-[1.0625rem] leading-relaxed text-hueso/75">
            Diseñamos, construimos y amoblamos. Un solo equipo para todo tu proyecto.
          </Revelar>
          <Revelar retraso={0.25} className="mt-9">
            <Magnetico>
              <Link to="/arquitectura" className="boton boton-claro group">
                <span>Ver arquitectura</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1" strokeWidth={1.6} aria-hidden="true" />
              </Link>
            </Magnetico>
          </Revelar>
        </div>

        <div className="relative mx-auto w-[86%] max-w-[460px] pb-10 lg:col-span-5 lg:col-start-8 lg:w-full lg:pb-0">
          <div className="relative overflow-hidden rounded-[22px] bg-grafito" style={{ paddingBottom: '118%' }}>
            <Foto
              src="/hero/02_6 - Foto.jpg.jpeg"
              alt="Fachada con listones de madera diseñada por Dekog Arquitectura"
              retrato
              rellenar
              revelar
              parallax={0.06}
              posicion="50% 45%"
            />
          </div>
          <div className="absolute bottom-0 left-[-8%] w-[52%] rounded-[18px] bg-noche p-2 lg:-bottom-10 lg:left-[-22%]">
            <div className="relative overflow-hidden rounded-[12px] bg-grafito" style={{ paddingBottom: '72%' }}>
              <Foto
                src="/arquitectura/interiorismo.jpeg"
                alt="Interior diseñado por Dekog Arquitectura"
                rellenar
                revelar
                sizes="(min-width: 1024px) 18vw, 45vw"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filete de cierre: el pie también es noche y, sin él, la banda se fundía con el pie. */}
      <div className="contenedor">
        <div aria-hidden="true" className="mt-[var(--aire)] border-t border-hueso/15" />
      </div>
    </section>
  );
}

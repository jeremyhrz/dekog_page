import React from 'react';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Foto from '../../components/efectos/Foto';
import { TituloSeccion } from '../../components/CabeceraPagina';
import { MarcaD } from '../../components/marca/Logo';

/**
 * Nuestra historia: cómo nace Dekog, la recepción de las oficinas Consorcio a todo el ancho (con parallax) y la frase
 * que resume el modelo de trabajo, enorme y en cursiva.
 */
export default function Historia() {
  return (
    <section id="historia" aria-labelledby="historia-titulo" className="seccion relative overflow-hidden bg-papel">
      <div className="contenedor">
        <TituloSeccion
          id="historia-titulo"
          rotulo="Nuestra historia"
          titulo="Cómo nace *Dekog*"
          texto="De la pasión por el diseño y la arquitectura, con un propósito: ofrecer un servicio integral que combine creatividad, funcionalidad y calidad."
        />

        <figure className="mt-14 lg:mt-20">
          <div className="relative overflow-hidden rounded-[18px] bg-arena pb-[75%] [-webkit-mask-image:-webkit-radial-gradient(white,black)] sm:pb-[56%] lg:rounded-[22px] lg:pb-[46%]">
            <Foto
              src="/nosotros/SECUNDARIA NOSOTROS.PNG"
              alt="Recepción de las oficinas Consorcio: mostrador de mármol, sillas grises y el nombre en la pared"
              rellenar
              revelar
              parallax={0.06}
              sizes="(min-width: 1416px) 1320px, (min-width: 1024px) calc(100vw - 96px), calc(100vw - 40px)"
            />
          </div>
          <Revelar como="figcaption" y={12} className="mt-4 flex flex-col text-grafito/70 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="etiqueta text-madera-oscuro">Proyecto Consorcio</span>
            <span className="mt-1 text-[14px] sm:mt-0">Construcción y diseño interior de oficinas</span>
          </Revelar>
        </figure>

        <figure className="mx-auto mt-24 max-w-5xl text-center lg:mt-36">
          <Revelar y={12}>
            <MarcaD className="mx-auto block h-8 w-8 text-madera" />
          </Revelar>
          <blockquote>
            <TextoDividido
              como="p"
              texto="«Nosotros nos encargamos de *todo*»"
              escalon={0.07}
              duracion={1.1}
              className="mt-8 font-display text-[clamp(2.75rem,8.5vw,7rem)] italic leading-[0.98] tracking-[-0.025em] [text-wrap:balance]"
            />
          </blockquote>
          <Revelar como="figcaption" retraso={0.2} className="mx-auto mt-9 max-w-lg text-[1.0625rem] leading-relaxed text-grafito">
            Creamos un modelo de trabajo en el que no tienes que preocuparte por coordinar distintos proveedores.
          </Revelar>
        </figure>
      </div>
    </section>
  );
}

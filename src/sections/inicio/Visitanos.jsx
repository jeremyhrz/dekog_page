import React from 'react';
import { Clock, Instagram, MapPin } from 'lucide-react';
import Revelar from '../../components/efectos/Revelar';
import TextoDividido from '../../components/efectos/TextoDividido';
import Foto from '../../components/efectos/Foto';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { DEKOG } from '../../data/sitio';
import { LINEAS_WHATSAPP, lineaWhatsapp } from '../../utils/whatsapp';

/**
 * Visítanos: la foto del letrero del showroom con parallax, la invitación en grande, la dirección, el horario y las
 * dos líneas de WhatsApp (las dos atienden todo; el selector deja elegir).
 */
export default function Visitanos() {
  return (
    <section id="visitanos" aria-labelledby="visitanos-titulo" className="sobre-oscuro seccion relative overflow-hidden bg-noche text-hueso">
      <div className="contenedor grid items-center gap-y-14 lg:grid-cols-12 lg:gap-x-10">
        <div className="relative overflow-hidden rounded-[22px] lg:col-span-6" style={{ paddingBottom: '70%' }}>
          <Foto src="/links/manongo-ubicacion.webp" alt="Letrero de Dekog en el showroom de Mañongo" rellenar parallax={0.08} sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          <p className="etiqueta flex items-center text-madera-claro">
            <span aria-hidden="true" className="mr-3 h-px w-8 bg-current" />
            Showroom
          </p>
          <TextoDividido como="h2" id="visitanos-titulo" texto="Ven a *conocernos*" className="titulo-display mt-5" />
          <Revelar retraso={0.15} className="mt-8 space-y-4 text-hueso/80">
            <a href={DEKOG.mapa} target="_blank" rel="noopener noreferrer" className="flex items-start hover:text-madera-claro">
              <MapPin className="mr-3 mt-1 h-5 w-5 shrink-0 text-madera" strokeWidth={1.4} aria-hidden="true" />
              <span>{DEKOG.showroom}<br />{DEKOG.zona}</span>
            </a>
            <p className="flex items-start">
              <Clock className="mr-3 mt-1 h-5 w-5 shrink-0 text-madera" strokeWidth={1.4} aria-hidden="true" />
              <span>{DEKOG.horario}</span>
            </p>
            <a href={DEKOG.instagram.home} target="_blank" rel="noopener noreferrer" className="flex items-start hover:text-madera-claro">
              <Instagram className="mr-3 mt-1 h-5 w-5 shrink-0 text-madera" strokeWidth={1.4} aria-hidden="true" />
              <span>@dekog.home · @dekog.arquitectura</span>
            </a>
          </Revelar>

          <Revelar retraso={0.25} className="mt-10">
            <p className="etiqueta text-hueso/50">Escríbenos por WhatsApp</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {LINEAS_WHATSAPP.map((l) => (
                <a
                  key={l.linea}
                  href={lineaWhatsapp(l.linea, 'Hola, quiero visitar el showroom de Dekog.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="boton boton-claro w-full !justify-start !px-5 !tracking-[0.08em]"
                >
                  <IconoWhatsapp size={17} />
                  <span className="text-left">Línea {l.linea} · {l.visible}</span>
                </a>
              ))}
            </div>
            <a href={DEKOG.mapa} target="_blank" rel="noopener noreferrer" className="boton boton-linea mt-3 w-full sm:w-auto">
              <MapPin className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Cómo llegar</span>
            </a>
          </Revelar>
        </div>
      </div>
    </section>
  );
}

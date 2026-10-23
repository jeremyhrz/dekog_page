import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import Magnetico from '../../components/efectos/Magnetico';
import { Enfasis } from '../../components/efectos/TextoDividido';
import { IconoWhatsapp } from '../../components/asistente/comun';
import { EXPO, VISTA, cx, escalonar, variantes } from '../../lib/movimiento';
import { elegirWhatsapp } from '../../utils/whatsapp';

const VACIO = { nombre: '', email: '', telefono: '', tipoProyecto: '', mensaje: '' };

const TIPOS_DE_PROYECTO = [
  'Diseño de interiores',
  'Arquitectura residencial',
  'Arquitectura comercial',
  'Remodelación',
  'Mobiliario a medida',
  'Otro',
];

// Campo con solo la línea de abajo (appearance-none y rounded-none: sin la sombra ni las esquinas que les pone iOS).
// 17 px de letra: con menos, Safari del iPhone agranda la página al enfocar el campo.
const CAMPO = cx(
  'peer block w-full rounded-none border-0 border-b border-tinta/20 bg-transparent px-0 py-3.5 text-[1.0625rem] leading-normal',
  'text-tinta outline-none transition-colors duration-300 appearance-none placeholder:text-grafito/50',
  'hover:border-tinta/40 focus:border-madera focus:outline-none',
  // El autocompletado de Chrome pinta un fondo celeste: lo tapa el papel de la sección.
  '[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#FAF7F2] [&:-webkit-autofill]:[-webkit-text-fill-color:#151311]',
  // Después de un intento de envío, la línea de los campos que faltan se marca en madera.
  '[.intentado_&:invalid]:border-madera-oscuro',
);

/**
 * El formulario de contacto (sin servidor): al enviarlo arma el mensaje con los datos y abre el selector de WhatsApp
 * («¿Con quién quieres hablar?», Línea 1 o 2) con ese texto ya escrito; el cliente solo toca «enviar» en su WhatsApp.
 * La validación es la del navegador (required y type="email"); tras un intento, cada campo que falta se marca y dice
 * qué le falta (solo con CSS: :invalid bajo .intentado).
 */
export default function Formulario() {
  const [formData, setFormData] = useState(VACIO);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [intentado, setIntentado] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // El formulario se envía por WhatsApp a la línea que elija el cliente, con los datos ya escritos.
  const handleSubmit = (e) => {
    e.preventDefault();
    const texto = [
      'Hola Dekog, les escribo desde el formulario de contacto de la web.',
      `Nombre: ${formData.nombre}`,
      `Email: ${formData.email}`,
      `Teléfono: ${formData.telefono}`,
      `Tipo de proyecto: ${formData.tipoProyecto}`,
      `Mensaje: ${formData.mensaje}`,
    ].join('\n');
    elegirWhatsapp(texto);
    setIsSubmitted(true);
    setIntentado(false);
    setFormData(VACIO);
  };

  // El aviso de «listo» dura 8 s y vuelve el formulario (vacío).
  useEffect(() => {
    if (!isSubmitted) return undefined;
    const espera = setTimeout(() => setIsSubmitted(false), 8000);
    return () => clearTimeout(espera);
  }, [isSubmitted]);

  // El navegador avisa `invalid` en cada campo que falta al intentar enviar (no burbujea: va en cada campo).
  const marcar = () => setIntentado(true);
  const comun = { onChange: handleChange, onInvalid: marcar, required: true, className: CAMPO };

  return (
    <div className="relative">
      <p className="sr-only" aria-live="polite">
        {isSubmitted ? 'Tu mensaje está listo en WhatsApp. Toca «enviar» en WhatsApp para que nos llegue.' : ''}
      </p>
      <AnimatePresence mode="wait" initial={false}>
        {isSubmitted ? (
          <motion.div
            key="listo"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.8, ease: EXPO } }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.3, ease: 'easeIn' } }}
            className="relative overflow-hidden rounded-[22px] border border-tinta/10 bg-hueso px-7 py-12 sm:px-12 sm:py-16"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-tinta text-papel">
              <Check className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
            </span>
            <Enfasis
              como="h3"
              texto="Tu mensaje está listo en *WhatsApp*"
              className="mt-8 max-w-md font-display text-[clamp(2rem,5vw,2.9rem)] leading-[1.02] tracking-[-0.015em] [text-wrap:balance]"
            />
            <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-grafito">
              Toca «enviar» en WhatsApp para que nos llegue. Te respondemos por ahí mismo.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="formulario"
            onSubmit={handleSubmit}
            className={cx('grid grid-cols-1 gap-x-10 gap-y-11 md:grid-cols-2', intentado && 'intentado')}
            initial="oculto"
            whileInView="visible"
            viewport={VISTA}
            variants={escalonar(0.08)}
            exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }}
          >
            <Campo id="contacto-nombre" numero="01" etiqueta="Nombre completo" falta="Escribe tu nombre" className="md:col-span-2">
              <input
                {...comun}
                id="contacto-nombre"
                type="text"
                name="nombre"
                autoComplete="name"
                value={formData.nombre}
                placeholder="Tu nombre"
              />
            </Campo>

            <Campo id="contacto-email" numero="02" etiqueta="Email" falta="Escribe un correo válido">
              <input
                {...comun}
                id="contacto-email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={formData.email}
                placeholder="tu@email.com"
              />
            </Campo>

            <Campo id="contacto-telefono" numero="03" etiqueta="Teléfono" falta="Escribe tu teléfono">
              <input
                {...comun}
                id="contacto-telefono"
                type="tel"
                name="telefono"
                autoComplete="tel"
                value={formData.telefono}
                placeholder="+58 414 000 0000"
              />
            </Campo>

            <Campo
              id="contacto-tipo"
              numero="04"
              etiqueta="Tipo de proyecto"
              falta="Elige una opción"
              className="md:col-span-2"
              adorno={<ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-grafito/60" strokeWidth={1.6} aria-hidden="true" />}
            >
              <select
                {...comun}
                id="contacto-tipo"
                name="tipoProyecto"
                value={formData.tipoProyecto}
                className={cx(CAMPO, 'cursor-pointer pr-8 [&>option]:text-tinta', !formData.tipoProyecto && 'text-grafito/45')}
              >
                <option value="">Selecciona una opción</option>
                {TIPOS_DE_PROYECTO.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </Campo>

            <Campo id="contacto-mensaje" numero="05" etiqueta="Mensaje" falta="Cuéntanos sobre tu proyecto" className="md:col-span-2">
              <textarea
                {...comun}
                id="contacto-mensaje"
                name="mensaje"
                rows={5}
                value={formData.mensaje}
                className={cx(CAMPO, 'resize-none leading-relaxed')}
                placeholder="Cuéntanos sobre tu proyecto, necesidades, presupuesto y cualquier detalle importante..."
              />
            </Campo>

            <motion.div variants={variantes.aparecer} className="flex flex-col pt-3 sm:flex-row sm:items-center md:col-span-2">
              <Magnetico className="w-full shrink-0 sm:w-auto">
                <button type="submit" className="boton boton-oscuro w-full sm:w-auto">
                  <IconoWhatsapp size={17} />
                  <span>Enviar por WhatsApp</span>
                </button>
              </Magnetico>
              <p className="mt-4 max-w-[19rem] text-[0.9375rem] leading-snug text-grafito/75 sm:ml-6 sm:mt-0">
                Se abre WhatsApp con tus datos ya escritos: solo tocas «enviar».
              </p>
            </motion.div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Un campo: el rótulo numerado, el control (el que lleva `peer`), una línea madera que crece desde la izquierda al
 * enfocarlo y, tras un intento de envío, qué le falta. Todo lo demás va en absoluto: la caja mide lo que el control, y
 * el aviso cae en el espacio entre filas sin mover nada. Es solo visual: el navegador ya lo dice con su globo.
 */
function Campo({ id, numero, etiqueta, falta, adorno, className, children }) {
  return (
    <motion.div variants={variantes.aparecer} className={cx('min-w-0', className)}>
      <label htmlFor={id} className="etiqueta flex items-baseline text-grafito/70">
        <span className="mr-3 tabular-nums text-madera-oscuro">{numero}</span>
        {etiqueta}
        <span aria-hidden="true" className="ml-1 text-madera-oscuro">*</span>
      </label>
      <div className="relative mt-1">
        {children}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 block h-[2px] w-full origin-left scale-x-0 bg-madera transition-transform duration-700 ease-expo peer-focus:scale-x-100 motion-reduce:transition-none"
        />
        {adorno}
        <span
          aria-hidden="true"
          className="absolute left-0 top-full mt-1.5 hidden text-[0.8125rem] leading-tight text-madera-oscuro [.intentado_.peer:invalid~&]:block"
        >
          {falta}
        </span>
      </div>
    </motion.div>
  );
}

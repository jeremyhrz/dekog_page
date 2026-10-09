import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, MessageCircle, Send, CheckCircle, Instagram, Facebook, ArrowRight } from 'lucide-react';
import Imagen from '../components/Imagen';
import { asistenteWhatsapp } from '../utils/whatsapp';

export default function Contacto() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    tipoProyecto: '',
    mensaje: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // El formulario se envía por WhatsApp a la Línea 01, con los datos ya escritos:
  // el cliente solo toca "enviar" en su WhatsApp y el mensaje llega a Dekog.
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
    window.open(asistenteWhatsapp(texto), '_blank', 'noopener,noreferrer');
    setIsSubmitted(true);
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      tipoProyecto: '',
      mensaje: ''
    });
    setTimeout(() => setIsSubmitted(false), 8000);
  };

  const contactInfo = [
    {
      icon: Phone,
      title: 'Teléfono / WhatsApp',
      // \u00a0 (espacio que no corta): cada número queda entero en una línea, también en teléfonos.
      details: ['Asistente 24/7: +58\u00a0412\u00a0442\u00a03350', 'Línea 1: +58\u00a0414\u00a0584\u00a07791', 'Línea 2: +58\u00a0424\u00a0400\u00a06086'],
      action: asistenteWhatsapp(),
      actionText: 'Escribir al asistente'
    },
    {
      icon: Mail,
      title: 'Email',
      details: ['dekog.inf@gmail.com'],
      action: 'mailto:dekog.inf@gmail.com',
      actionText: 'Enviar correo'
    },
    {
      icon: MapPin,
      title: 'Ubicación',
      details: [
        'CC Vía Veneto - Nivel Roma, Local R17',
        'Mañongo, Naguanagua, Carabobo'
      ]
    },
    {
      icon: Clock,
      title: 'Horario de atención',
      details: [
        'Lunes a Sábado: 9:00 AM - 6:00 PM'
      ]
    }
  ];

  const projectTypes = [
    'Diseño de interiores',
    'Arquitectura residencial',
    'Arquitectura comercial',
    'Remodelación',
    'Mobiliario a medida',
    'Otro'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="pt-24"
    >
      {/* Hero Section */}
      <section className="relative py-32 px-6 bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {/* Fondo al 20 % de opacidad: basta una variante mediana (sizes 50vw). */}
          <Imagen src="/nosotros/PRINCIPAL.jpeg" sizes="50vw" prioridad alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-6xl mx-auto text-center z-10">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-semibold mb-4">CONTÁCTANOS</p>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight font-display mb-6">
            Hablemos de tu proyecto
          </h1>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Estamos aquí para escuchar tus ideas y ayudarte a hacer realidad tu visión. 
            Contáctanos para una consulta gratuita.
          </p>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="py-20 px-6 bg-[#f4f0ec]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="min-w-0 bg-white rounded-2xl p-8 shadow-lg"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Envíanos un mensaje</h2>
                <p className="text-gray-600">Completa el formulario y te lo enviamos por WhatsApp con tus datos ya escritos.</p>
              </div>

              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-200 rounded-xl p-6 text-center"
                >
                  <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-800 mb-2">¡Tu mensaje está listo en WhatsApp!</h3>
                  <p className="text-green-600">Toca «enviar» en WhatsApp para que nos llegue. Te respondemos por ahí mismo.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold uppercase tracking-widest text-gray-700 mb-2">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold uppercase tracking-widest text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all"
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold uppercase tracking-widest text-gray-700 mb-2">
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all"
                        placeholder="+58 414 000 0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold uppercase tracking-widest text-gray-700 mb-2">
                      Tipo de proyecto *
                    </label>
                    <select
                      name="tipoProyecto"
                      value={formData.tipoProyecto}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all"
                    >
                      <option value="">Selecciona una opción</option>
                      {projectTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold uppercase tracking-widest text-gray-700 mb-2">
                      Mensaje *
                    </label>
                    <textarea
                      name="mensaje"
                      value={formData.mensaje}
                      onChange={handleChange}
                      required
                      rows="5"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all resize-none"
                      placeholder="Cuéntanos sobre tu proyecto, necesidades, presupuesto y cualquier detalle importante..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-primary bg-black text-white py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    Enviar por WhatsApp
                  </button>
                </form>
              )}
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="min-w-0 space-y-8"
            >
              {/* Contact Cards */}
              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <motion.div
                    key={info.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                        <info.icon size={24} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold uppercase mb-2">{info.title}</h3>
                        <div className="space-y-1">
                          {info.details.map((detail, i) => (
                            <p key={i} className="text-gray-600">{detail}</p>
                          ))}
                        </div>
                        {info.action && (
                          <a
                            href={info.action}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-4 text-[10px] font-bold uppercase tracking-widest text-black hover:text-gray-600 flex items-center gap-1"
                          >
                            {info.actionText} <ArrowRight size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Social Media */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="bg-black text-white rounded-2xl p-6 sm:p-8"
              >
                <h3 className="text-xl font-black uppercase tracking-tight mb-6">Síguenos en redes</h3>
                {/* En teléfono, letra y espaciado algo menores: los tres botones caben sin salirse. */}
                <div className="flex gap-2 sm:gap-4">
                  <a
                    href="https://www.instagram.com/dekog.home/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 bg-white/10 hover:bg-white/20 rounded-xl px-2 py-4 sm:p-4 text-center transition-colors"
                  >
                    <Instagram size={24} className="mx-auto mb-2" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest">Instagram</span>
                  </a>
                  <a
                    href="https://www.facebook.com/share/1Hfbm8dQrs/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 bg-white/10 hover:bg-white/20 rounded-xl px-2 py-4 sm:p-4 text-center transition-colors"
                  >
                    <Facebook size={24} className="mx-auto mb-2" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest">Facebook</span>
                  </a>
                  <a
                    href={asistenteWhatsapp()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 bg-white/10 hover:bg-white/20 rounded-xl px-2 py-4 sm:p-4 text-center transition-colors"
                  >
                    <MessageCircle size={24} className="mx-auto mb-2" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest">WhatsApp</span>
                  </a>
                </div>
              </motion.div>

              {/* Quick Contact */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl p-8 text-center"
              >
                <h3 className="text-xl font-black uppercase tracking-tight mb-4">¿Necesitas respuesta inmediata?</h3>
                <p className="mb-6">Nuestro asistente por WhatsApp te responde al instante, a cualquier hora, y si lo necesitas te pasa con una asesora.</p>
                <a
                  href={asistenteWhatsapp()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary bg-white text-black px-8 py-3 text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} />
                  Asistente por WhatsApp
                </a>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight font-display mb-4">Encuéntranos</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Visita nuestro showroom en Naguanagua para una consulta presencial.</p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-xl font-bold uppercase mb-4">CC Vía Veneto</h3>
              <div className="aspect-video bg-gray-200 rounded-xl mb-4 overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3925.9642436440263!2d-67.9994466!3d10.2337844!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e8067bc8767db79%3A0x17e49c019b1dfaea!2sDekog%20Home!5e0!3m2!1ses!2sve!4v1716733200000!5m2!1ses!2sve"
                  title="Mapa del showroom de Dekog en el CC Vía Veneto"
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <div className="space-y-2">
                <p className="text-gray-700"><strong>Dirección:</strong> CC Vía Veneto, Nivel Roma, Local R17, Mañongo, Naguanagua</p>
                <p className="text-gray-700"><strong>Horario:</strong> Lunes a Sábado, 9:00 AM - 6:00 PM</p>
                <p className="text-gray-700"><strong>Teléfono:</strong> +58 414 584 7791</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-[#f4f0ec]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight font-display mb-4">Preguntas frecuentes</h2>
            <p className="text-gray-600">Resolvemos tus dudas más comunes sobre nuestros servicios.</p>
          </div>
          
          <div className="space-y-4">
            {[
              {
                question: '¿Cuál es el tiempo de respuesta para consultas?',
                answer: 'Por WhatsApp, nuestro asistente te responde al instante y a cualquier hora, y si lo necesitas te pasa con una asesora. Las asesoras atienden de lunes a sábado, de 9:00 a. m. a 6:00 p. m.'
              },
              {
                question: '¿Ofrecen consultas gratuitas?',
                answer: 'Sí, ofrecemos una consulta inicial gratuita para entender tu proyecto y necesidades. Puede ser presencial o virtual según tu preferencia.'
              },
              {
                question: '¿Trabajan en todo el país?',
                answer: 'Sí, trabajamos a nivel nacional. Para proyectos fuera de Valencia, coordinamos visitas periódicas y supervisión remota.'
              },
              {
                question: '¿Cuál es el proceso para comenzar un proyecto?',
                answer: '1) Consulta inicial, 2) Propuesta de diseño, 3) Aprobación y contratación, 4) Desarrollo del proyecto, 5) Entrega y seguimiento.'
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold uppercase mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}
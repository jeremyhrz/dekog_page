import React from 'react';
import { MapPin, Instagram, Phone, Mail, Globe, HardHat, CheckCircle, Map, Armchair, Facebook, MessageCircle } from 'lucide-react';
import { asistenteWhatsapp } from '../utils/whatsapp';

export default function Footer() {
  return (
    // pb-24 en teléfono: deja libre la última fila (enlaces legales) bajo el botón flotante del asistente.
    <footer id="contacto" className="bg-[#0a0a0a] text-white pt-20 pb-24 sm:pb-6 border-t border-gray-800">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Main Footer Grid */}
        <div className="flex flex-wrap lg:flex-nowrap justify-between gap-10 lg:gap-8 mb-16">

          {/* Brand & Description */}
          <div className="w-full lg:w-[280px] shrink-0">
            <div className="flex flex-col mb-8">
              <span className="whitespace-nowrap font-light text-3xl md:text-4xl tracking-[0.4em] uppercase" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                D E K O G
              </span>
              <span className="whitespace-nowrap text-[8px] md:text-[9px] font-bold uppercase tracking-[0.3em] mt-2 text-gray-500">
                DISEÑAMOS CONSTRUIMOS AMOBLAMOS
              </span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-6">
              Diseñamos, construimos y amoblamos espacios completos.<br /><br />
              Un solo equipo para todo tu proyecto.
            </p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/dekog.home/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Instagram size={18} />
              </a>
              <a href={asistenteWhatsapp()} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="WhatsApp">
                <MessageCircle size={18} />
              </a>
              <a href="https://www.facebook.com/share/1Hfbm8dQrs/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Facebook size={18} />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="w-[120px]">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-6">CATÁLOGO</h4>
            <ul className="space-y-4">
              {['Sofás', 'Camas', 'Puffs', 'Colección 2026'].map((item) => (
                <li key={item}><a href="#catalogo" className="text-gray-400 text-xs hover:text-white transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          <div className="w-[120px]">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-6">HOME</h4>
            <ul className="space-y-4">
              {['Salas', 'Comedores', 'Dormitorios', 'Decoración'].map((item) => (
                <li key={item}><a href="#home" className="text-gray-400 text-xs hover:text-white transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          <div className="w-[150px]">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-6">ARQUITECTURA</h4>
            <ul className="space-y-4">
              {['Diseño arquitectónico', 'Modelado 3D', 'Ejecución de obra', 'Supervisión'].map((item) => (
                <li key={item}><a href="#arquitectura" className="text-gray-400 text-xs hover:text-white transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          <div className="w-[120px]">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-6">PROYECTOS</h4>
            <ul className="space-y-4">
              {['Residencial', 'Comercial', 'Remodelaciones', 'Interiores'].map((item) => (
                <li key={item}><a href="#proyectos" className="text-gray-400 text-xs hover:text-white transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          <div className="w-[130px]">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-6">SERVICIOS</h4>
            <ul className="space-y-4">
              {['Diseño integral', 'Construcción', 'Mobiliario', 'Llave en mano'].map((item) => (
                <li key={item}><a href="#servicios" className="text-gray-400 text-xs hover:text-white transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          {/* Contacto Column */}
          <div className="w-full sm:w-[260px]">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-6">CONTACTO</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={14} className="text-[#a89076] mt-0.5 flex-shrink-0" />
                <a href="https://www.google.com/maps/place/Dekog+Home/@10.2337844,-68.0020215,17z/data=!3m1!4b1!4m6!3m5!1s0x8e8067bc8767db79:0x47e49c019b1dfaea!8m2!3d10.2337844!4d-67.9994466!16s%2Fg%2F11t4t66cy3?hl=es&entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer" className="block">
                  <p className="text-xs text-gray-400 hover:text-white transition-colors">Dekog Home</p>
                  <p className="text-xs text-gray-400 hover:text-white transition-colors">CC Vía Veneto, Nivel Roma - Local R17</p>
                </a>
              </div>
              {/* Google Maps - Dekog Home */}
              <a 
                href="https://www.google.com/maps/place/Dekog+Home/@10.2337844,-68.0020215,17z/data=!3m1!4b1!4m6!3m5!1s0x8e8067bc8767db79:0x47e49c019b1dfaea!8m2!3d10.2337844!4d-67.9994466!16s%2Fg%2F11t4t66cy3?hl=es&entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  borderRadius: '8px',
                  display: 'block',
                  filter: 'grayscale(1) invert(0.92) hue-rotate(180deg)',
                }}
              >
                {/* Overlay to intercept clicks on the iframe */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}></div>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3925.9642436440263!2d-67.9994466!3d10.2337844!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e8067bc8767db79%3A0x17e49c019b1dfaea!2sDekog%20Home!5e0!3m2!1ses!2sve!4v1716733200000!5m2!1ses!2sve"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    pointerEvents: 'none'
                  }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación Dekog Home"
                />
              </a>
              <div className="flex items-start gap-3">
                <MessageCircle size={14} className="text-[#a89076] mt-0.5 flex-shrink-0" />
                <a href={asistenteWhatsapp()} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-white transition-colors">
                  Asistente 24/7 por WhatsApp
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={14} className="text-[#a89076] mt-0.5 flex-shrink-0" />
                <a href="tel:+584145847791" className="text-xs text-gray-400 hover:text-white transition-colors">
                  +58 414 584 7791
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={14} className="text-[#a89076] mt-0.5 flex-shrink-0" />
                <a href="mailto:dekog.inf@gmail.com" className="text-xs text-gray-400 hover:text-white transition-colors">
                  dekog.inf@gmail.com
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Benefits Banner */}
        <div className="border-t border-b border-gray-800 py-8 mb-8">
          <div className="flex flex-wrap justify-center lg:justify-between items-center gap-6 md:gap-10">
            <div className="flex items-center gap-3">
              <Globe size={24} className="text-[#a89076]" strokeWidth={1} />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest leading-tight">TRABAJAMOS</span>
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest leading-tight">A NIVEL NACIONAL</span>
              </div>
            </div>

            <div className="hidden lg:block w-px h-8 bg-gray-800"></div>

            <div className="flex items-center gap-3">
              <Map size={24} className="text-[#a89076]" strokeWidth={1} />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest leading-tight">DISEÑO</span>
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest leading-tight">INTEGRAL</span>
              </div>
            </div>

            <div className="hidden lg:block w-px h-8 bg-gray-800"></div>

            <div className="flex items-center gap-3">
              <HardHat size={24} className="text-[#a89076]" strokeWidth={1} />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest leading-tight">EJECUCIÓN Y</span>
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest leading-tight">SUPERVISIÓN</span>
              </div>
            </div>

            <div className="hidden lg:block w-px h-8 bg-gray-800"></div>

            <div className="flex items-center gap-3">
              <Armchair size={24} className="text-[#a89076]" strokeWidth={1} />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest leading-tight">MOBILIARIO</span>
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest leading-tight">PERSONALIZADO</span>
              </div>
            </div>

            <div className="hidden lg:block w-px h-8 bg-gray-800"></div>

            <div className="flex items-center gap-3">
              <CheckCircle size={24} className="text-[#a89076]" strokeWidth={1} />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest leading-tight">ACOMPAÑAMIENTO</span>
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest leading-tight">DE INICIO A FIN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-gray-500 tracking-widest">
            © 2026 DEKOG. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <a href="/privacidad.html" className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">Privacidad</a>
            <span className="text-gray-700">|</span>
            <a href="/eliminacion-datos.html" className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">Eliminar mis datos</a>
            <span className="text-gray-700">|</span>
            <a href="#" className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">Términos y condiciones</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

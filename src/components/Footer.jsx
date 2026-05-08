import React from 'react';
import { MapPin, Instagram, Phone, Mail, Globe, HardHat, CheckCircle, Map, Armchair, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer id="contacto" className="bg-[#0a0a0a] text-white pt-20 pb-6 border-t border-gray-800">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Main Footer Grid */}
        <div className="flex flex-wrap lg:flex-nowrap justify-between gap-10 lg:gap-8 mb-16">
          
          {/* Brand & Description */}
          <div className="w-full lg:w-[280px] shrink-0">
            <div className="flex flex-col mb-8">
              <span className="whitespace-nowrap font-light text-3xl md:text-4xl tracking-[0.4em] uppercase" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
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
              <a href="https://wa.me/584145847791" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Phone size={18} />
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
          <div className="w-[200px]">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-6">CONTACTO</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={14} className="text-[#a89076] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">CC Vía Veneto</p>
                  <p className="text-xs text-gray-400">Nivel Roma - Local R17</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={14} className="text-[#a89076] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Av. Carlos Sanda</p>
                  <p className="text-xs text-gray-400">El Viñedo</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={14} className="text-[#a89076] mt-0.5 flex-shrink-0" />
                <a href="https://wa.me/584145847791" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-white transition-colors">
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
            <a href="#" className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">Privacidad</a>
            <span className="text-gray-700">|</span>
            <a href="#" className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">Términos y condiciones</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

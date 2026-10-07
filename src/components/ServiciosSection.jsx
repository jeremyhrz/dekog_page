import React from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ImageWithSkeleton from './ImageWithSkeleton';

export default function ServiciosSection({ setCategoria }) {
  const steps = [
    { num: '01', title: 'Diseño arquitectónico', img: '/servicios/Diseño arquitectónico1.PNG', desc: 'Conceptualización y planificación detallada de tus espacios, integrando funcionalidad y estética desde el primer trazo.' },
    { num: '02', title: 'Modelado 3D', img: '/servicios/Modelado 3D2.jpeg', desc: 'Visualización hiperrealista para que experimentes y apruebes el diseño final antes de iniciar la construcción.' },
    { num: '03', title: 'Ejecución de obra', img: '/servicios/03.png', desc: 'Llevamos el diseño a la realidad con los más altos estándares de construcción, respetando plazos y calidad.' },
    { num: '04', title: 'Supervisión de obra', img: '/servicios/Supervisión de obra4.PNG', desc: 'Control riguroso de cada etapa del proyecto para garantizar fidelidad absoluta al diseño original.' },
    { num: '05', title: 'Mobiliario y decoración', img: '/servicios/mobiliario y decoracion5.PNG', desc: 'Selección e instalación de piezas exclusivas y mobiliario a medida que completan la experiencia del espacio.' },
  ];

  return (
    <section id="servicios" className="bg-[#f4f0ec] text-[#1a1a1a] font-sans border-t border-gray-200">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <nav className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-8 flex items-center justify-center gap-2">
          Inicio <ChevronRight size={10} /> <span className="text-black">NUESTROS SERVICIOS</span>
        </nav>
        <h2 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight mb-12" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          SERVICIOS
        </h2>
        <a
          href="https://wa.me/584145847791?text=Hola,%20quisiera%20solicitar%20asesoría%20para%20un%20proyecto"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-4 bg-[#1a1a1a] text-white px-10 py-5 text-xs font-bold uppercase tracking-[0.2em] hover:bg-black transition-all duration-300 hover:gap-6 shadow-xl"
        >
          COTIZA TU PROYECTO <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </a>
      </div>

      {/* Central Image */}
      <div className="max-w-[1400px] mx-auto px-6 mb-32">
        <div className="aspect-[16/9] md:aspect-[21/9] w-full overflow-hidden rounded-sm shadow-2xl relative group">
          <ImageWithSkeleton
            src="/servicios/imagen central.jpeg"
            sizes="(min-width: 1400px) 1352px, 100vw"
            prioridad
            alt="Servicios Dekog Central"
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            containerClassName="w-full h-full"
          />
        </div>
      </div>

      {/* Steps Section */}
      <div className="max-w-7xl mx-auto px-6 pb-32">
        <div className="space-y-32">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-24 ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
            >
              <div className="w-full lg:w-1/2">
                <div className="aspect-[4/5] overflow-hidden rounded-sm shadow-xl group">
                  <ImageWithSkeleton
                    src={step.img}
                    sizes="(min-width: 1024px) 620px, 100vw"
                    alt={step.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    containerClassName="w-full h-full"
                  />
                </div>
              </div>
              <div className="w-full lg:w-1/2 space-y-6">
                <span className="text-6xl md:text-7xl font-light text-gray-300 block mb-4">{step.num}</span>
                <h3 className="text-3xl md:text-4xl font-light tracking-tight">{step.title}</h3>
                <div className="h-px w-20 bg-gray-400" />
                <p className="text-base text-gray-500 leading-relaxed max-w-md">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

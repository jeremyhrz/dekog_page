import React, { useState, useMemo } from 'react';
import { ArrowRight, Globe, Edit3, Shield, Sofa, CheckCircle } from 'lucide-react';
import { proyectosData, categories } from '../data/proyectosData';
import ProjectModal from './ProjectModal';
import { motion } from 'framer-motion';
import ImageWithSkeleton from './ImageWithSkeleton';

import './ProjectsSection.css';

const ProjectsSection = () => {
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [selectedProject, setSelectedProject] = useState(null);

  const filteredProjects = useMemo(() => {
    return activeCategory === 'TODOS'
      ? proyectosData
      : proyectosData.filter(p => p.categoria === activeCategory);
  }, [activeCategory]);

  // Handle WhatsApp quote
  const handleProjectQuote = (projectName) => {
    const message = `Hola DEKOG, me interesa un proyecto como ${projectName}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/584145847791?text=${encodedMessage}`, '_blank');
  };

  return (
    <div id="proyectos" className="projects-container">
      {/* Hero Section */}
      <header className="projects-hero">
        <div className="hero-content">
          <div className="breadcrumbs">Inicio &gt; Proyectos</div>
          <h1 className="hero-title">Proyectos</h1>
          <p className="hero-subtitle">
            Espacios diseñados, construidos y amoblados para mejorar la vida de las personas.
          </p>
          <a href="#arquitectura" className="process-link">
            CONOCE NUESTRO PROCESO <ArrowRight size={16} />
          </a>
        </div>
        <div className="hero-image-container">
          <ImageWithSkeleton
            src="/hero/IMG_3919.PNG"
            alt="Hero Proyecto"
            className="hero-image"
          />
        </div>
      </header>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group-container">
          <span className="filter-label">FILTRAR POR</span>
          <div className="filter-group">
            {['TODOS', 'RESIDENCIAL', 'COMERCIAL'].map(cat => (
              <button
                key={cat}
                className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="sort-group">
          <span className="filter-label">ORDENAR POR</span>
          <select className="sort-select">
            <option>MÁS RECIENTES</option>
            <option>A-Z</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <section className="projects-grid">
        {filteredProjects.map((project, index) => (
          <motion.div 
            key={project.id} 
            className="project-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: index % 3 * 0.1 }}
          >
            <div
              className="card-image-container"
              onClick={() => setSelectedProject(project)}
            >
              <span className="card-category">{project.categoria}</span>
              <ImageWithSkeleton
                src={project.imageFolder
                  ? `/assets/PROYECTOS/${project.imageFolder}/${project.portada}`
                  : `/assets/PROYECTOS/${project.imageFolders[0].folder}/${project.portada}`
                }
                alt={project.titulo}
                className="card-image"
              />
            </div>
            <div className="card-info">
              <h3 className="card-title">{project.titulo}</h3>
              <p className="card-desc">{project.descripcion}</p>
              <div className="card-actions">
                <span
                  className="card-link"
                  onClick={() => setSelectedProject(project)}
                >
                  VER PROYECTO <ArrowRight size={14} />
                </span>
                <button
                  onClick={() => handleProjectQuote(project.titulo)}
                  className="budget-button"
                >
                  CONSULTAR PRESUPUESTO SIMILAR
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Project Modal */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      {/* CTA Section */}
      <section className="projects-cta">
        <div className="cta-container">
          <div className="cta-text">
            <h2>¿Tienes un proyecto en mente?</h2>
            <p>Cuéntanos tu idea y hagamos realidad tu espacio ideal.</p>
          </div>
          <button
            className="cta-btn"
            onClick={() => window.open('https://wa.me/584145847791?text=Hola DEKOG, tengo un proyecto en mente y me gustaría una asesoría.', '_blank')}
          >
            COTIZA TU PROYECTO
          </button>
        </div>
      </section>

      {/* Features Footer */}
      <footer className="features-footer">
        <div className="feature-item">
          <Globe className="feature-icon" /> Cobertura nacional
        </div>
        <div className="feature-item">
          <Edit3 className="feature-icon" /> Diseño integral
        </div>
        <div className="feature-item">
          <Shield className="feature-icon" /> Ejecución y supervisión
        </div>
        <div className="feature-item">
          <Sofa className="feature-icon" /> Mobiliario personalizado
        </div>
        <div className="feature-item">
          <CheckCircle className="feature-icon" /> De inicio a fin
        </div>
      </footer>
    </div>
  );
};

export default ProjectsSection;

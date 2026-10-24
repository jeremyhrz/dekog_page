import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import Imagen from './Imagen';
import { elegirWhatsapp } from '../utils/whatsapp';

export default function ProjectModal({ project, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Build gallery images array
  const getGalleryImages = (proj) => {
    if (!proj) return [];
    if (proj.imageFolders) {
      return proj.imageFolders.flatMap(f =>
        f.images.map(img => `/assets/PROYECTOS/${f.folder}/${img}`)
      );
    }
    return proj.images.map(img => `/assets/PROYECTOS/${proj.imageFolder}/${img}`);
  };

  const images = project ? getGalleryImages(project) : [];
  const totalImages = images.length;

  // Reset index and loading state when project changes
  useEffect(() => {
    setCurrentIndex(0);
    setImageLoaded(false);
  }, [project]);

  // Body scroll lock
  useEffect(() => {
    if (project) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [project]);

  // Animated close
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!project) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft') setCurrentIndex(prev => (prev - 1 + totalImages) % totalImages);
      if (e.key === 'ArrowRight') setCurrentIndex(prev => (prev + 1) % totalImages);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, totalImages, handleClose]);

  if (!project) return null;

  const goToPrev = (e) => {
    e.stopPropagation();
    setImageLoaded(false);
    setCurrentIndex(prev => (prev - 1 + totalImages) % totalImages);
  };

  const goToNext = (e) => {
    e.stopPropagation();
    setImageLoaded(false);
    setCurrentIndex(prev => (prev + 1) % totalImages);
  };

  const handleWhatsApp = () => {
    const message = `Hola DEKOG, quiero consultar sobre un proyecto similar a ${project.titulo}`;
    elegirWhatsapp(message);
  };

  return ReactDOM.createPortal(
    <div
      className={`project-modal-overlay ${isClosing ? 'closing' : ''}`}
      onClick={handleClose}
    >
      {/* Modal Card */}
      <div
        className={`project-modal-card ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button className="project-modal-close" onClick={handleClose} aria-label="Cerrar">
          <X size={20} />
        </button>

        {/* Left Side — Image Carousel */}
        <div className="project-modal-gallery">
          <div className="project-modal-image-wrapper">
            <Imagen
              key={currentIndex}
              src={images[currentIndex]}
              sizes="(min-width: 768px) 550px, 100vw"
              alt={`${project.titulo} — ${currentIndex + 1}`}
              className={`project-modal-image ${imageLoaded ? 'loaded' : ''}`}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800';
                setImageLoaded(true);
              }}
            />
          </div>

          {/* Navigation Arrows */}
          {totalImages > 1 && (
            <>
              <button className="project-modal-arrow left" onClick={goToPrev} aria-label="Imagen anterior">
                <ChevronLeft size={22} />
              </button>
              <button className="project-modal-arrow right" onClick={goToNext} aria-label="Imagen siguiente">
                <ChevronRight size={22} />
              </button>
            </>
          )}

          {/* Dot Indicators */}
          {totalImages > 1 && (
            <div className="project-modal-dots">
              {images.map((_, i) => (
                <button
                  key={i}
                  className={`project-modal-dot ${i === currentIndex ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setImageLoaded(false); setCurrentIndex(i); }}
                  aria-label={`Imagen ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Image Counter */}
          <div className="project-modal-counter">
            {currentIndex + 1} / {totalImages}
          </div>
        </div>

        {/* Right Side — Project Info */}
        <div className="project-modal-info">
          <div className="project-modal-info-top">
            <span className="project-modal-category">{project.categoria}</span>
            <h2 className="project-modal-title">{project.titulo}</h2>
            <p className="project-modal-desc">{project.descripcion}</p>

            <div className="project-modal-details">
              <div className="project-modal-detail-row">
                <div className="detail-dot" />
                <span>Diseño y construcción integral</span>
              </div>
              <div className="project-modal-detail-row">
                <div className="detail-dot" />
                <span>Mobiliario personalizado</span>
              </div>
              <div className="project-modal-detail-row">
                <div className="detail-dot" />
                <span>{totalImages} fotografías del proyecto</span>
              </div>
            </div>
          </div>

          <div className="project-modal-actions">
            <button onClick={handleWhatsApp} className="project-modal-whatsapp">
              <MessageCircle size={16} />
              Consultar Proyecto Similar
            </button>
            <button onClick={handleClose} className="project-modal-secondary-btn">
              Volver a Proyectos
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

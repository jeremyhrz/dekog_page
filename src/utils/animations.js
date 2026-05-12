// Configuración de animaciones para Framer Motion
// Efecto "Antigravity" - Fade and Slide transitions

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.5, ease: "easeInOut" }
};

export const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const cardHover = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

export const slideInFromLeft = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

export const slideInFromRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.4, ease: "easeOut" }
};

// Animaciones específicas para componentes
export const navbarAnimation = {
  initial: { y: -100 },
  animate: { y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

export const footerAnimation = {
  initial: { y: 100 },
  animate: { y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

// Efecto de aparición gradual para elementos
export const revealAnimation = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6, ease: "easeOut" }
};

// Animación para botones
export const buttonHover = {
  initial: { scale: 1 },
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
  transition: { duration: 0.2, ease: "easeInOut" }
};

// Animación para imágenes
export const imageZoom = {
  initial: { scale: 1 },
  whileHover: { scale: 1.1 },
  transition: { duration: 0.4, ease: "easeOut" }
};

// Configuración para AnimatePresence
export const animatePresenceConfig = {
  mode: "wait",
  initial: false,
  onExitComplete: () => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }
};
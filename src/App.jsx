import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { pageTransition, animatePresenceConfig } from './utils/animations';

// ─── Layout ──────────────────────────────────────────────────────────────────
import Layout from './components/Layout';

// ─── Páginas reales ───────────────────────────────────────────────────────────
import Home        from './pages/Home';
import Arquitectura from './pages/Arquitectura';
import Proyectos   from './pages/Proyectos';
import Servicios   from './pages/Servicios';
import Contacto    from './pages/Contacto';

// ─── Páginas nuevas (Nosotros y Home/Muebles como sección propia) ─────────────
// Usamos los componentes ya existentes en /components/ como páginas completas
import NosotrosPage from './pages/NosotrosPage';
import HomeMueblesPage from './pages/HomeMueblesPage';

// ─── Modales y drawers globales ───────────────────────────────────────────────
import Cart      from './components/Cart';
import QuickView from './components/QuickView';

// ─── Animación de transición ──────────────────────────────────────────────────
const PageWrapper = ({ children }) => (
  <motion.div {...pageTransition}>
    {children}
  </motion.div>
);

// ─── Contenido principal (dentro del Router para poder usar useLocation) ──────
function AppContent() {
  // Estado global del catálogo y carrito
  const [categoria, setCategoria]             = useState('Todos');
  const [carrito, setCarrito]                 = useState([]);
  const [abierto, setAbierto]                 = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [searchQuery, setSearchQuery]         = useState('');
  const [visibleCount, setVisibleCount]       = useState(12);
  const catalogRef = useRef(null);
  const location   = useLocation();

  // Scroll al tope en cada cambio de ruta
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Reveal animation observer
  useEffect(() => {
    const observe = () => {
      const observer = new IntersectionObserver(
        (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('visible')),
        { threshold: 0.1 }
      );
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
      return observer;
    };
    const obs     = observe();
    const timeout = setTimeout(observe, 500);
    return () => { obs.disconnect(); clearTimeout(timeout); };
  }, [location.pathname]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const add = (p) => {
    setCarrito(prev => {
      const existe = prev.find(x => x.id === p.id);
      return existe
        ? prev.map(x => x.id === p.id ? { ...x, cant: x.cant + 1 } : x)
        : [...prev, { ...p, cant: 1 }];
    });
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCategoria('Todos');
    setVisibleCount(12);
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCategoryClick = (cat) => {
    setCategoria(cat);
    setSearchQuery('');
    setVisibleCount(12);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCategoria('Todos');
  };

  // ── Props que necesita el Layout (pasan al Navbar) ────────────────────────
  const layoutProps = {
    cartCount:       carrito.length,
    onCartOpen:      () => setAbierto(true),
    onSearch:        handleSearch,
    onCategoryClick: handleCategoryClick,
  };

  // ── Props que necesita Home (catálogo completo) ───────────────────────────
  const homeProps = {
    categoria, setCategoria,
    carrito,   setCarrito,
    abierto,   setAbierto,
    quickViewProduct, setQuickViewProduct,
    searchQuery, setSearchQuery,
    visibleCount, setVisibleCount,
    catalogRef,
    add,
    handleSearch,
    handleCategoryClick,
    handleClearSearch,
  };

  return (
    <>
      {/*
        ┌─────────────────────────────────────────────────────────────────┐
        │  PATRÓN CORRECTO React Router v6 — rutas anidadas              │
        │                                                                 │
        │  <Route element={<Layout/>}>   ← sin path, actúa de armazón   │
        │    <Route index .../>          ← /                             │
        │    <Route path="/x" .../>      ← /nosotros, /home, etc.       │
        │  </Route>                                                       │
        │                                                                 │
        │  React Router inyecta cada página en el <Outlet/> de Layout.  │
        └─────────────────────────────────────────────────────────────────┘
      */}
      <Routes>
        <Route element={<Layout {...layoutProps} />}>

          {/* ── / ─────────────────────────────────────────────────── */}
          <Route index element={
            <AnimatePresence {...animatePresenceConfig}>
              <PageWrapper key="inicio">
                <Home {...homeProps} />
              </PageWrapper>
            </AnimatePresence>
          } />

          {/* ── /nosotros ─────────────────────────────────────────── */}
          <Route path="/nosotros" element={
            <AnimatePresence {...animatePresenceConfig}>
              <PageWrapper key="nosotros">
                <NosotrosPage />
              </PageWrapper>
            </AnimatePresence>
          } />

          {/* ── /home (sección muebles/hogar como página propia) ──── */}
          <Route path="/home" element={
            <AnimatePresence {...animatePresenceConfig}>
              <PageWrapper key="home">
                <HomeMueblesPage
                  categoria={categoria}
                  setCategoria={setCategoria}
                  handleCategoryClick={handleCategoryClick}
                  add={add}
                  setQuickViewProduct={setQuickViewProduct}
                />
              </PageWrapper>
            </AnimatePresence>
          } />

          {/* ── /arquitectura ─────────────────────────────────────── */}
          <Route path="/arquitectura" element={
            <AnimatePresence {...animatePresenceConfig}>
              <PageWrapper key="arquitectura">
                <Arquitectura />
              </PageWrapper>
            </AnimatePresence>
          } />

          {/* ── /proyectos ────────────────────────────────────────── */}
          <Route path="/proyectos" element={
            <AnimatePresence {...animatePresenceConfig}>
              <PageWrapper key="proyectos">
                <Proyectos />
              </PageWrapper>
            </AnimatePresence>
          } />

          {/* ── /servicios ────────────────────────────────────────── */}
          <Route path="/servicios" element={
            <AnimatePresence {...animatePresenceConfig}>
              <PageWrapper key="servicios">
                <Servicios />
              </PageWrapper>
            </AnimatePresence>
          } />

          {/* ── /contacto ─────────────────────────────────────────── */}
          <Route path="/contacto" element={
            <AnimatePresence {...animatePresenceConfig}>
              <PageWrapper key="contacto">
                <Contacto />
              </PageWrapper>
            </AnimatePresence>
          } />

        </Route>
      </Routes>

      {/* ── Drawer del carrito (persiste entre rutas) ─────────────────── */}
      <Cart
        carrito={carrito}
        setCarrito={setCarrito}
        abierto={abierto}
        setAbierto={setAbierto}
      />

      {/* ── Modal de Quick View ───────────────────────────────────────── */}
      <QuickView
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAdd={add}
      />
    </>
  );
}

// ─── Raíz de la aplicación ────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
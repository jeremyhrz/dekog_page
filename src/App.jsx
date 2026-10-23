import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { MotionConfig, motion } from 'framer-motion';

// ─── Layout ──────────────────────────────────────────────────────────────────
import Layout from './components/Layout';
import SelectorWhatsapp from './components/SelectorWhatsapp';
import { MarcaD } from './components/marca/Logo';
// Sin carga perezosa: el aviso de error tiene que estar aunque no cargue el archivo de una página.
import NoEncontrada, { ErrorDePagina } from './pages/NoEncontrada';
import { ProveedorScroll, irA } from './lib/scroll';
import { EXPO } from './lib/movimiento';

// ─── Páginas reales cargadas perezosamente (Code Splitting) ───────────────────
const Home            = lazy(() => import('./pages/Home'));
const Arquitectura    = lazy(() => import('./pages/Arquitectura'));
const Proyectos       = lazy(() => import('./pages/Proyectos'));
const Servicios       = lazy(() => import('./pages/Servicios'));
const Contacto        = lazy(() => import('./pages/Contacto'));
const NosotrosPage    = lazy(() => import('./pages/NosotrosPage'));
const HomeMueblesPage = lazy(() => import('./pages/HomeMueblesPage'));
const LinksPage       = lazy(() => import('./pages/LinksPage'));

// ─── Mientras llega el archivo de una página: la D de Dekog que respira ──────
const PageLoader = () => (
  <div className="fixed left-0 top-0 z-50 flex h-full w-full items-center justify-center bg-hueso text-tinta">
    <MarcaD className="h-10 w-10 animate-pulse" />
  </div>
);

// ─── Modales y drawers globales ───────────────────────────────────────────────
import Cart      from './components/Cart';
import QuickView from './components/QuickView';

// ─── Entrada de cada página: un fundido corto. Sin AnimatePresence: con initial={false} dejaba quietas todas las
//     animaciones de dentro de las páginas (framer lo hereda a cada componente). ─────────────────────────────────
const PageWrapper = ({ children }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: EXPO }}>
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

  // Al tope en cada cambio de página (si la URL trae un ancla, como /#catalogo, baja la página misma).
  useEffect(() => {
    if (!location.hash) irA(0, { inmediato: true });
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (catalogRef.current) irA(catalogRef.current, { offset: -24 });
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
        Rutas anidadas: <Route element={<Layout/>}> (sin path) es el armazón y cada página va en su <Outlet/>.
        Las rutas no cambian de nombre: el chat saluda distinto en cada una (AsistenteChat.jsx).
      */}
      <Suspense fallback={<PageLoader />}>
        {/* Si una página falla al pintarse, un aviso con los WhatsApp en vez de la página en blanco. */}
        <ErrorDePagina ruta={location.key}>
        <Routes>
          <Route element={<Layout {...layoutProps} />}>

            <Route index element={<PageWrapper key="inicio"><Home {...homeProps} /></PageWrapper>} />

            <Route path="/nosotros" element={<PageWrapper key="nosotros"><NosotrosPage /></PageWrapper>} />

            {/* /home: la línea de muebles (Dekog Home) como página propia */}
            <Route path="/home" element={
              <PageWrapper key="home">
                <HomeMueblesPage
                  categoria={categoria}
                  setCategoria={setCategoria}
                  handleCategoryClick={handleCategoryClick}
                  add={add}
                  setQuickViewProduct={setQuickViewProduct}
                />
              </PageWrapper>
            } />

            <Route path="/arquitectura" element={<PageWrapper key="arquitectura"><Arquitectura /></PageWrapper>} />

            <Route path="/proyectos" element={<PageWrapper key="proyectos"><Proyectos /></PageWrapper>} />

            <Route path="/servicios" element={<PageWrapper key="servicios"><Servicios /></PageWrapper>} />

            <Route path="/contacto" element={<PageWrapper key="contacto"><Contacto /></PageWrapper>} />

            {/* Cualquier otra ruta (antes, en blanco): utils/rutas.js */}
            <Route path="*" element={<PageWrapper key="no-encontrada"><NoEncontrada /></PageWrapper>} />

          </Route>

            {/* /links (Link in Bio — sin Layout/Navbar/Footer) */}
            <Route path="/links" element={<PageWrapper key="links"><LinksPage /></PageWrapper>} />

          </Routes>
        </ErrorDePagina>
      </Suspense>

      {/* ── Drawer del carrito (persiste entre rutas) ─────────────────── */}
      <Cart
        carrito={carrito}
        setCarrito={setCarrito}
        abierto={abierto}
        setAbierto={setAbierto}
      />

      {/* ── «¿Con quién quieres hablar?» (Línea 1 o 2): lo abren los botones de WhatsApp ── */}
      <SelectorWhatsapp />

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
// MotionConfig reducedMotion="user": con «reducir movimiento» en el sistema, framer cambia los desplazamientos por
// fundidos. ProveedorScroll: el scroll suave (Lenis) en escritorio.
export default function App() {
  return (
    <Router>
      <MotionConfig reducedMotion="user">
        <ProveedorScroll>
          <AppContent />
        </ProveedorScroll>
      </MotionConfig>
    </Router>
  );
}

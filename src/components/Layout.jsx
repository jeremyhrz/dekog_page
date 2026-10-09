import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AsistenteChat from './AsistenteChat';
import { propsWhatsapp } from '../utils/whatsapp';

// El asistente con IA está activo (aprobado por Dekog el 2026-10-05).
// Interruptor de emergencia: la variable VITE_ASISTENTE=0 en Vercel (y volver
// a desplegar) lo apaga y deja el botón de WhatsApp de siempre, sin tocar código.
const mostrarAsistente = import.meta.env.VITE_ASISTENTE !== '0';

/**
 * Layout — Armazón global de la app.
 *
 * Estructura:
 *   ┌─────────────────────┐
 *   │  <Navbar/>  (fija)  │
 *   ├─────────────────────┤
 *   │  <Outlet/>          │  ← Aquí React Router inyecta la página activa
 *   ├─────────────────────┤
 *   │  <Footer/>          │
 *   └─────────────────────┘
 *
 * Props que recibe del padre (App.jsx):
 *   cartCount      — número de ítems en el carrito (para el badge)
 *   onCartOpen     — abre el drawer del carrito
 *   onSearch       — callback de búsqueda
 *   onCategoryClick — callback de filtro por categoría
 *
 * NOTA: El <Outlet/> es OBLIGATORIO. Sin él, el contenido de las
 * rutas hijas no se renderiza y la pantalla queda en blanco.
 */
export default function Layout({ cartCount = 0, onCartOpen, onSearch, onCategoryClick }) {
  return (
    <div className="bg-[#f4f0ec] min-h-screen text-gray-900 overflow-x-hidden flex flex-col">

      {/* ── Asistente con IA (si está activo) o botón flotante WhatsApp ── */}
      {mostrarAsistente ? <AsistenteChat /> : (
      <a
        {...propsWhatsapp()}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 hover:shadow-green-500/30 transition-all duration-300 group"
        aria-label="WhatsApp"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-black text-xs font-bold py-2 px-4 rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          ¿Necesitas ayuda?
        </span>
      </a>
      )}

      {/* ── Navbar ────────────────────────────────────────────────── */}
      <Navbar
        cartCount={cartCount}
        onCartOpen={onCartOpen}
        onSearch={onSearch}
        onCategoryClick={onCategoryClick}
      />

      {/* ── Contenido de la ruta activa ───────────────────────────── */}
      {/*
          <Outlet/> es el "hueco" donde React Router monta la página.
          Ejemplo: si la URL es /proyectos → aquí aparece <PageProyectos/>.
          Sin este componente el centro de la pantalla queda VACÍO.
      */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
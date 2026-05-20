import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Menu, X, Instagram, MapPin } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ cartCount = 0, onCartOpen = () => {}, onSearch = () => {}, onCategoryClick = () => {} }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Inicio',        path: '/' },
    { label: 'Nosotros',      path: '/nosotros' },
    { label: 'Home',          path: '/home' },
    { label: 'Arquitectura',  path: '/arquitectura' },
    { label: 'Proyectos',     path: '/proyectos' },
    { label: 'Servicios',     path: '/servicios' },
  ];

  const isTransparentPage = ['/'].includes(location.pathname);
  const isDarkNavbar = scrolled || !isTransparentPage;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleLinkClick = (path) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setMobileOpen(false);
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isDarkNavbar ? 'glass-nav-scrolled py-3' : 'bg-transparent py-5'}`}
        style={{ backdropFilter: isDarkNavbar ? 'blur(20px)' : 'none', background: isDarkNavbar ? 'rgba(244, 240, 236, 0.95)' : 'transparent' }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link 
            to="/" 
            onClick={() => handleLinkClick('/')}
            className="flex flex-col gap-0 group mt-1"
          >
            <span className={`whitespace-nowrap font-light text-3xl md:text-4xl tracking-[0.4em] uppercase transition-colors ${isDarkNavbar ? 'text-black' : 'text-white'}`} style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
              D E K O G
            </span>
            <span className={`whitespace-nowrap text-[8px] md:text-[9px] font-bold uppercase tracking-[0.3em] mt-1 transition-colors ${isDarkNavbar ? 'text-gray-500' : 'text-white/70'}`}>
              DISEÑAMOS CONSTRUIMOS AMOBLAMOS
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center lg:gap-4 xl:gap-7">
            {navLinks.map((link) => {
              // Para la ruta raíz '/', solo marcar activo si ES exactamente '/'
              const isActive = link.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`nav-link text-[11px] uppercase tracking-widest transition-all duration-200 ${
                    isDarkNavbar ? 'text-gray-700 hover:text-black' : 'text-white/80 hover:text-white'
                  } ${isActive ? 'font-black border-b border-current pb-0.5' : 'font-semibold'}`}
                  onClick={() => handleLinkClick(link.path)}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(true)} className={`p-2 rounded-full transition-colors ${isDarkNavbar ? 'hover:bg-gray-100 text-black' : 'hover:bg-white/10 text-white'}`} aria-label="Buscar">
              <Search size={20} />
            </button>
            <a href="https://www.instagram.com/dekog.home/" target="_blank" rel="noopener noreferrer"
              className={`p-2 rounded-full transition-colors hidden md:flex ${isDarkNavbar ? 'hover:bg-gray-100 text-black' : 'hover:bg-white/10 text-white'}`} aria-label="Instagram">
              <Instagram size={20} />
            </a>
            <button onClick={onCartOpen} className={`relative p-2 rounded-full transition-colors ${isDarkNavbar ? 'hover:bg-gray-100 text-black' : 'hover:bg-white/10 text-white'}`} aria-label="Carrito">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={() => setMobileOpen(true)} className={`lg:hidden p-2 rounded-full transition-colors ${isDarkNavbar ? 'hover:bg-gray-100 text-black' : 'hover:bg-white/10 text-white'}`} aria-label="Menú">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-start justify-center pt-32 search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-2xl px-6" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus
                placeholder="Buscar productos..."
                className="w-full bg-transparent border-b-2 border-white/30 focus:border-white text-white text-3xl md:text-4xl font-light py-4 outline-none placeholder:text-white/30"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="absolute right-0 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                <X size={28} />
              </button>
            </form>
            <p className="text-white/30 text-xs mt-4 uppercase tracking-widest">Presiona Enter para buscar</p>
          </div>
        </div>
      )}

      {/* Mobile Menu — Immersive & Premium */}
      {mobileOpen && (
        <div className="mobile-menu fixed inset-0 z-[60] bg-[#f4f0ec] flex flex-col animate-in fade-in slide-in-from-right duration-500">
          <div className="flex items-center justify-between p-6">
            <div className="flex flex-col">
              <span className="font-light text-2xl tracking-[0.3em] uppercase">DEKOG</span>
              <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-gray-400">Diseñamos Construimos Amoblamos</span>
            </div>
            <button 
              onClick={() => setMobileOpen(false)}
              className="p-3 bg-black text-white rounded-full hover:scale-110 transition-transform"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col justify-center px-10 gap-8">
            {navLinks.map((link, i) => (
              <Link 
                key={link.label} 
                to={link.path} 
                onClick={() => handleLinkClick(link.path)}
                className="text-4xl font-black uppercase tracking-tighter text-black hover:text-gray-400 transition-all duration-300 transform hover:translate-x-4"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="p-10 border-t border-gray-200 bg-white/50">
            <div className="flex items-center gap-3 text-gray-500 text-[10px] mb-3 uppercase tracking-widest font-bold">
              <MapPin size={14} className="text-black" />
              <span>CC Via Veneto / El Viñedo</span>
            </div>
            <a href="https://www.instagram.com/dekog.home/" target="_blank" rel="noopener noreferrer" 
              className="flex items-center gap-3 text-black font-black text-sm uppercase tracking-widest">
              <Instagram size={18} /> @dekog.home
            </a>
          </div>
        </div>
      )}
    </>
  );
}

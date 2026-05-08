import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Menu, X, Instagram, MapPin } from 'lucide-react';

export default function Navbar({ cartCount, onCartOpen, onSearch, onCategoryClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Inicio', href: '#hero' },
    { label: 'Catálogo', href: '#catalogo' },
    { label: 'Nosotros', href: '#nosotros' },
    { label: 'Home', href: '#home' },
    { label: 'Arquitectura', href: '#arquitectura' },
    { label: 'Proyectos', href: '#proyectos' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Contacto', href: '#contacto' },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass-nav-scrolled py-3' : 'bg-transparent py-5'}`}
        style={{ backdropFilter: scrolled ? 'blur(20px)' : 'none', background: scrolled ? 'rgba(244, 240, 236, 0.95)' : 'transparent' }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          {/* Logo */}
          <a href="#hero" className="flex flex-col gap-0 group mt-1">
            <span className={`whitespace-nowrap font-light text-3xl md:text-4xl tracking-[0.4em] uppercase transition-colors ${scrolled ? 'text-black' : 'text-white'}`} style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
              D E K O G
            </span>
            <span className={`whitespace-nowrap text-[8px] md:text-[9px] font-bold uppercase tracking-[0.3em] mt-1 transition-colors ${scrolled ? 'text-gray-500' : 'text-white/70'}`}>
              DISEÑAMOS CONSTRUIMOS AMOBLAMOS
            </span>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center lg:gap-4 xl:gap-7">
            {navLinks.map((link) => (
              link.href ? (
                <a key={link.label} href={link.href} className={`nav-link text-[11px] font-semibold uppercase tracking-widest transition-colors ${scrolled ? 'text-gray-700 hover:text-black' : 'text-white/80 hover:text-white'}`}>
                  {link.label}
                </a>
              ) : (
                <button key={link.label} onClick={() => { link.action(); document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'}); }}
                  className={`nav-link text-[11px] font-semibold uppercase tracking-widest transition-colors ${scrolled ? 'text-gray-700 hover:text-black' : 'text-white/80 hover:text-white'}`}>
                  {link.label}
                </button>
              )
            ))}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(true)} className={`p-2 rounded-full transition-colors ${scrolled ? 'hover:bg-gray-100 text-black' : 'hover:bg-white/10 text-white'}`} aria-label="Buscar">
              <Search size={20} />
            </button>
            <a href="https://www.instagram.com/dekog.home/" target="_blank" rel="noopener noreferrer"
              className={`p-2 rounded-full transition-colors hidden md:flex ${scrolled ? 'hover:bg-gray-100 text-black' : 'hover:bg-white/10 text-white'}`} aria-label="Instagram">
              <Instagram size={20} />
            </a>
            <button onClick={onCartOpen} className={`relative p-2 rounded-full transition-colors ${scrolled ? 'hover:bg-gray-100 text-black' : 'hover:bg-white/10 text-white'}`} aria-label="Carrito">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={() => setMobileOpen(true)} className={`lg:hidden p-2 rounded-full transition-colors ${scrolled ? 'hover:bg-gray-100 text-black' : 'hover:bg-white/10 text-white'}`} aria-label="Menú">
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

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-[#f4f0ec] mobile-menu flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <img src="/logo.png?v=3" className="w-8 h-8 rounded-full object-cover" alt="Dekog Home" />
              <span className="font-black text-lg uppercase">Dekog Home</span>
            </div>
            <button onClick={() => setMobileOpen(false)}><X size={24} /></button>
          </div>
          <div className="flex-1 flex flex-col justify-center px-8 gap-6">
            {navLinks.map((link) => (
              link.href ? (
                <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)}
                  className="text-3xl font-bold uppercase tracking-tight text-black hover:text-gray-500 transition-colors">
                  {link.label}
                </a>
              ) : (
                <button key={link.label} onClick={() => { link.action(); setMobileOpen(false); document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'}); }}
                  className="text-3xl font-bold uppercase tracking-tight text-black hover:text-gray-500 transition-colors text-left">
                  {link.label}
                </button>
              )
            ))}
          </div>
          <div className="p-8 border-t">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <MapPin size={14} />
              <span>CC Via Veneto. Nivel Roma - Local R17</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-4">
              <MapPin size={14} />
              <span>Av. Carlos Sanda, El Viñedo</span>
            </div>
            <a href="https://www.instagram.com/dekog.home/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-black font-semibold text-sm">
              <Instagram size={16} /> @dekog.home
            </a>
          </div>
        </div>
      )}
    </>
  );
}

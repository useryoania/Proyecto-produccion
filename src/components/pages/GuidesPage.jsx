import { useState, useEffect } from 'react';
import LandingNavbar from '../shared/LandingNavbar';
import Footer from '../Footer';
import ParticlesCanvas from '../ui/ParticlesCanvas';

const GUIDES = [
  {
    id: 'cenco',
    label: 'CENCO',
    description: 'Guía de preparación de archivos para sublimación CENCO.',
    accent: '#00AEEF',
    file: '/guias/guia-cenco.pdf',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    id: 'dtf',
    label: 'DTF',
    description: 'Guía técnica de preparación de archivos para impresión DTF.',
    accent: '#EC008C',
    file: '/guias/guia-dtf.pdf',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>
      </svg>
    ),
  },
  {
    id: 'ecouv',
    label: 'ECOUV / Gran Formato',
    description: 'Guía de archivos para impresión ECOUV y gran formato.',
    accent: '#FFF200',
    file: '/guias/guia-ecouv.pdf',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
  {
    id: 'emblemas',
    label: 'Emblemas',
    description: 'Guía para la preparación de emblemas y parches sublimados.',
    accent: '#a78bfa',
    file: '/guias/guia-emblemas.pdf',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    id: 'sublimacion',
    label: 'Sublimación',
    description: 'Guía técnica de preparación de archivos para sublimación textil.',
    accent: '#00AEEF',
    file: '/guias/guia-sublimacion.pdf',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a5 5 0 0 1 5 5c0 5-5 13-5 13S7 12 7 7a5 5 0 0 1 5-5z"/>
        <circle cx="12" cy="7" r="2"/>
      </svg>
    ),
  },
  {
    id: 'impritex',
    label: 'Sublimación — Tela Cliente',
    description: 'Guía técnica para sublimación sobre tela aportada por el cliente.',
    accent: '#f4f4f5',
    file: '/guias/guia-impritex.pdf',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
  },
];

export default function GuidesPage() {
  const [selected, setSelected] = useState(GUIDES[0].id);
  const active = GUIDES.find(g => g.id === selected);

  useEffect(() => {
    document.body.style.overflow = 'auto';
    window.scrollTo(0, 0);
    return () => { document.body.style.overflow = 'hidden'; };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-custom-dark relative overflow-x-hidden font-sans">
      <LandingNavbar />
      <ParticlesCanvas />

      <div className="flex-1 z-10 pt-[85px] pb-10 flex flex-col">

        {/* Header */}
        <div className="px-6 md:px-12 pt-8 pb-6 max-w-7xl mx-auto w-full">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Recursos</p>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
            Guías de Preparación
          </h1>
          <p className="text-zinc-400 text-sm md:text-base">
            Descargá o revisá las guías técnicas de cada técnica de impresión antes de subir tus archivos.
          </p>
        </div>

        {/* Selector — lista vertical en mobile, sidebar en desktop */}
        <div className="flex-1 px-6 md:px-12 max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-6">

          {/* Sidebar / top-tabs */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:w-56 flex-shrink-0">
            {GUIDES.map(g => {
              const isActive = selected === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelected(g.id)}
                  style={{
                    border: `1.5px solid ${isActive ? g.accent : 'rgba(255,255,255,0.10)'}`,
                    background: isActive ? `${g.accent}14` : 'transparent',
                    color: isActive ? g.accent : 'rgba(255,255,255,0.55)',
                    boxShadow: isActive ? `0 0 18px ${g.accent}28` : 'none',
                    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                  }}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold cursor-pointer text-left"
                >
                  <span style={{ color: isActive ? g.accent : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{g.icon}</span>
                  {g.label}
                </button>
              );
            })}
          </div>

          {/* Viewer panel */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">

            {/* Info strip */}
            <div
              style={{
                borderLeft: `3px solid ${active.accent}`,
                background: `${active.accent}10`,
                transition: 'all 0.3s ease',
              }}
              className="px-4 py-3 rounded-r-xl flex items-center justify-between gap-4 flex-wrap"
            >
              <p className="text-sm font-semibold text-zinc-200">{active.description}</p>
              <a
                href={active.file}
                download
                style={{ border: `1.5px solid ${active.accent}`, color: active.accent }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-transparent hover:bg-white/5 transition-all flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Descargar
              </a>
            </div>

            {/* PDF iframe */}
            <div
              key={active.id}
              style={{
                border: `1px solid ${active.accent}22`,
                boxShadow: `0 0 40px ${active.accent}0D`,
                transition: 'all 0.3s ease',
              }}
              className="rounded-2xl overflow-hidden bg-zinc-900 flex-1"
            >
              <iframe
                src={`${active.file}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                title={`Guía ${active.label}`}
                className="w-full"
                style={{ height: 'clamp(500px, 70vh, 900px)', border: 'none', display: 'block' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="z-10 bg-[#111] relative">
        <Footer />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useEffect } from 'react';
import LandingNavbar from '../shared/LandingNavbar';
import Footer from '../Footer';
import ParticlesCanvas from '../ui/ParticlesCanvas';

const PALETTES = [
  {
    id: 'sublimacion',
    label: 'Sublimación',
    accent: '#00AEEF',
    gradFrom: 'rgba(0,174,239,0.15)',
    file: '/paletas/paleta-sublimacion.pdf',
    description: 'Colores optimizados para sublimación textil sobre polyester.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    id: 'gran-formato',
    label: 'Gran Formato',
    accent: '#FFF200',
    gradFrom: 'rgba(255,242,0,0.12)',
    file: '/paletas/paleta-gran-formato.pdf',
    description: 'Paleta ECOUV para impresión de gran formato, vinilos y banners.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
  {
    id: 'dtf',
    label: 'DTF',
    accent: '#EC008C',
    gradFrom: 'rgba(236,0,140,0.15)',
    file: '/paletas/paleta-dtf.pdf',
    description: 'Tabla de colores para impresión directa al film DTF.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>
      </svg>
    ),
  },
  {
    id: 'dtf-dorado',
    label: 'DTF Dorado',
    accent: '#F5C842',
    gradFrom: 'rgba(245,200,66,0.15)',
    file: '/paletas/paleta-dtf-dorado.pdf',
    description: 'Paleta especial para DTF con lámina dorada metalizada.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
];

export default function ColorPalettesPage() {
  const [selected, setSelected] = useState(PALETTES[0].id);
  const active = PALETTES.find(p => p.id === selected);

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
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
            Tablas de Color
          </h1>
          <p className="text-zinc-400 text-sm md:text-base">
            Seleccioná la técnica de impresión para ver la paleta de colores disponible.
          </p>
        </div>

        {/* Selector tabs */}
        <div className="px-6 md:px-12 max-w-7xl mx-auto w-full mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PALETTES.map(p => {
              const isActive = selected === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  style={{
                    border: `1.5px solid ${isActive ? p.accent : 'rgba(255,255,255,0.12)'}`,
                    background: isActive ? `${p.accent}18` : 'transparent',
                    color: isActive ? p.accent : 'rgba(255,255,255,0.6)',
                    boxShadow: isActive ? `0 0 20px ${p.accent}30` : 'none',
                    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
                >
                  <span style={{ color: isActive ? p.accent : 'rgba(255,255,255,0.4)' }}>
                    {p.icon}
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Descripción + visor */}
        <div className="flex-1 px-6 md:px-12 max-w-7xl mx-auto w-full flex flex-col gap-4">

          {/* Info strip */}
          <div
            style={{
              borderLeft: `3px solid ${active.accent}`,
              background: active.gradFrom,
              transition: 'all 0.3s ease',
            }}
            className="px-4 py-3 rounded-r-xl"
          >
            <p className="text-sm font-semibold text-zinc-200">{active.description}</p>
          </div>

          {/* PDF Viewer */}
          <div
            style={{
              border: `1px solid ${active.accent}22`,
              boxShadow: `0 0 40px ${active.accent}10`,
              transition: 'all 0.3s ease',
            }}
            className="rounded-2xl overflow-hidden bg-zinc-900 flex-1"
            key={active.id}
          >
            <iframe
              src={`${active.file}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
              title={`Tabla de colores ${active.label}`}
              className="w-full"
              style={{ height: 'clamp(500px, 70vh, 900px)', border: 'none', display: 'block' }}
            />
          </div>

          {/* Download button */}
          <div className="flex justify-end pb-2">
            <a
              href={active.file}
              download
              style={{
                border: `1.5px solid ${active.accent}`,
                color: active.accent,
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-transparent hover:bg-white/5 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar {active.label}
            </a>
          </div>
        </div>
      </div>

      <div className="z-10 bg-[#111] relative">
        <Footer />
      </div>
    </div>
  );
}

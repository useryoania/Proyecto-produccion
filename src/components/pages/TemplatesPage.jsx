import { useEffect } from 'react';
import LandingNavbar from '../shared/LandingNavbar';
import Footer from '../Footer';
import ParticlesCanvas from '../ui/ParticlesCanvas';

const SECTIONS = [
  {
    id: 'cenco',
    tag: 'PLANTILLAS PARA CENCO (Corte Láser y Costura)',
    tagColor: '#EC008C',
    tagBg: 'rgba(236,0,140,0.12)',
    description: 'Las piezas se entregan organizadas por tipo y talle para facilitar el proceso de confección. Para asegurar un mejor control y seguimiento de tu pedido, es necesario que completes la planilla correspondiente con los talles y cantidades, y la envíes junto a tu pedido en el formulario de CENCO o IMPRITEX.',
    files: [
      {
        label: 'Planilla de Pedido de Ropa',
        description: 'Planilla para pedidos de indumentaria (remeras, buzos, etc.)',
        url: 'https://drive.google.com/uc?export=download&id=1_u6vdtCQJZxjM-DgH6RhsamqV4EhtoHw',
        ext: 'XLSX',
        accent: '#1D6F42',   // Excel green
      },
      {
        label: 'Planilla de Pedido de Varios',
        description: 'Para banderas, pañuelos, toallas, entre otros.',
        url: 'https://drive.google.com/uc?export=download&id=1yKe8DbrUyGKm2_Je6dOc3or67BDotnjl',
        ext: 'XLSX',
        accent: '#1D6F42',
      },
    ],
  },
];

const ExcelIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#1D6F42"/>
    <text x="12" y="17" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial">X</text>
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default function TemplatesPage() {
  useEffect(() => {
    document.body.style.overflow = 'auto';
    window.scrollTo(0, 0);
    return () => { document.body.style.overflow = 'hidden'; };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-custom-dark relative overflow-x-hidden font-sans">
      <LandingNavbar />
      <ParticlesCanvas />

      <div className="flex-1 z-10 pt-[85px] pb-12">

        {/* Header */}
        <div className="px-6 md:px-12 pt-10 pb-8 max-w-4xl mx-auto w-full">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Recursos</p>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
            Plantillas para descargar
          </h1>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl">
            Descargá las planillas necesarias para completar tu pedido correctamente. Enviá la planilla correspondiente junto al PDF del pedido en el formulario.
          </p>
          <div className="mt-6 h-px bg-gradient-to-r from-[#00AEEF] via-[#EC008C] to-transparent" />
        </div>

        {/* Sections */}
        <div className="px-6 md:px-12 max-w-4xl mx-auto w-full flex flex-col gap-10">
          {SECTIONS.map((section) => (
            <div key={section.id} className="flex flex-col gap-6">

              {/* Section tag */}
              <div
                style={{ background: section.tagBg, border: `1px solid ${section.tagColor}40`, color: section.tagColor }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold self-start"
              >
                {section.tag}
              </div>

              {/* Description */}
              <p
                style={{ borderLeft: `3px solid ${section.tagColor}`, color: section.tagColor }}
                className="pl-4 text-sm md:text-[15px] leading-relaxed"
              >
                {section.description}
              </p>

              {/* File cards */}
              <div className="flex flex-col gap-4">
                {section.files.map((file, fi) => (
                  <div
                    key={fi}
                    style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
                    className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <ExcelIcon />
                      </div>
                      {/* Info */}
                      <div>
                        <p className="text-white font-bold text-sm md:text-base">{file.label}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">{file.description}</p>
                      </div>
                    </div>

                    {/* Download button */}
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: file.accent, color: '#fff' }}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 w-full sm:w-auto"
                    >
                      <DownloadIcon />
                      Descargar
                      <span className="text-xs opacity-70 font-medium">{file.ext}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="z-10 bg-[#111] relative">
        <Footer />
      </div>
    </div>
  );
}

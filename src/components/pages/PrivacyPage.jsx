import { useEffect } from 'react';
import LandingNavbar from '../shared/LandingNavbar';
import Footer from '../Footer';
import ParticlesCanvas from '../ui/ParticlesCanvas';

const SECTIONS = [
  {
    title: 'Recopilación de Información',
    accent: '#00AEEF',
    items: [
      {
        body: [
          'Recolectamos información personal que usted nos proporciona voluntariamente al registrarse en nuestra plataforma, realizar pedidos, suscribirse a nuestros boletines o comunicarse con nosotros.',
          'Esta información incluye su nombre, dirección de correo electrónico, número de teléfono, dirección de envío y los archivos (diseños) que usted sube para impresión. También recopilamos datos de forma automática, como su dirección IP y comportamiento en el sitio web.',
        ],
      },
    ],
  },
  {
    title: 'Uso de la Información',
    accent: '#EC008C',
    items: [
      {
        body: [
          'La información que recolectamos la utilizamos primordialmente para procesar y entregar sus pedidos de forma exacta y a tiempo.',
          'Asimismo, la usamos para mejorar nuestro sitio web, enviar comunicaciones comerciales y operativas relevantes (como el estado de sus impresiones) y para cumplir con obligaciones legales y contables propias de la operativa de USER.',
        ],
      },
    ],
  },
  {
    title: 'Protección de sus Diseños y Archivos',
    accent: '#FFF200',
    items: [
      {
        body: [
          'Entendemos que los archivos PDF y diseños que usted sube a nuestra plataforma pueden contener propiedad intelectual, material exclusivo o gráficos sensibles.',
          'Garantizamos que todos los archivos enviados a través de nuestro portal son utilizados de manera estricta y exclusiva para la producción del pedido que usted solicitó. No revendemos, no compartimos, ni republicamos sus diseños bajo ninguna circunstancia.',
        ],
      },
    ],
  },
  {
    title: 'Privacidad de Transacciones Financieras',
    accent: '#f4f4f5',
    items: [
      {
        body: [
          'Todas las transacciones de pago son procesadas a través de pasarelas de pago seguras (como MercadoPago o Handy). USER no almacena en ninguno de sus servidores números de tarjetas de crédito o códigos de seguridad.',
        ],
      },
    ],
  },
  {
    title: 'Compartir su Información',
    accent: '#06b6d4',
    items: [
      {
        body: [
          'No alquilamos, vendemos ni compartimos su información personal mercantil con terceros.',
          'Solo compartiremos su información con proveedores logísticos (exclusivamente para concretar la entrega de envíos en tiempo y forma) o si nos lo exige un mandato legal dictaminado por las autoridades de la República Oriental del Uruguay.',
        ],
      },
    ],
  },
  {
    title: 'Derechos del Usuario',
    accent: '#3b82f6',
    items: [
      {
        body: [
          'Usted tiene el derecho íntegro de acceder, corregir o eliminar su información personal almacenada en nuestro sistema en cualquier momento.',
          'Si desea dar de baja su cuenta o solicitar la eliminación total de sus archivos almacenados en nuestra nube de impresión histórica, puede hacerlo contactando directamente a Atención al Cliente desde nuestro portal.',
        ],
      },
    ],
  },
];

export default function PrivacyPage() {
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
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">Política Legal</p>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4 leading-tight">
            Políticas de Privacidad
          </h1>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl">
            En USER, valoramos y respetamos su privacidad. Esta política describe cómo recopilamos, usamos y resguardamos su información personal y su propiedad intelectual visual.
          </p>
          <div className="mt-6 h-px bg-gradient-to-r from-[#00AEEF] via-[#EC008C] to-transparent" />
        </div>

        {/* Sections */}
        <div className="px-6 md:px-12 max-w-4xl mx-auto w-full flex flex-col gap-10">
          {SECTIONS.map((section, si) => (
            <div key={si} className="flex flex-col gap-5">
              {/* Section title */}
              <div className="flex items-center gap-3">
                <div style={{ width: 4, height: 28, background: section.accent, borderRadius: 8, flexShrink: 0 }} />
                <h2 className="text-lg md:text-xl font-black text-white tracking-tight">{section.title}</h2>
              </div>

              {/* Items */}
              <div className="flex flex-col gap-6 pl-4 md:pl-7">
                {section.items.map((item, ii) => (
                  <div key={ii} className="flex flex-col gap-3">
                    {item.subtitle && (
                      <h3 style={{ color: section.accent }} className="text-sm font-bold uppercase tracking-wider">
                        {item.subtitle}
                      </h3>
                    )}
                    {item.body.map((para, pi) => (
                      <p key={pi} className="text-zinc-300 text-sm md:text-[15px] leading-relaxed">
                        {para}
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              {si < SECTIONS.length - 1 && (
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginTop: 4 }} />
              )}
            </div>
          ))}

          {/* Footer note */}
          <div className="mt-4 p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <p className="text-zinc-500 text-sm leading-relaxed italic">
              Nos reservamos el derecho de modificar esta política en cualquier momento. Cualquier cambio será publicado en esta página y entrará en vigor de forma inmediata. Al utilizar nuestra plataforma, usted acepta el tratamiento de la información aquí descrito.
            </p>
            <p className="text-zinc-600 text-xs mt-3 font-semibold">User | Centro de Impresiones</p>
          </div>
        </div>
      </div>

      <div className="z-10 bg-[#111] relative">
        <Footer />
      </div>
    </div>
  );
}

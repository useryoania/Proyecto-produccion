import { useEffect } from 'react';
import LandingNavbar from '../shared/LandingNavbar';
import Footer from '../Footer';
import ParticlesCanvas from '../ui/ParticlesCanvas';

const SECTIONS = [
  {
    title: 'Tiempos de Entrega y Recargos por Urgencia',
    accent: '#00AEEF',
    items: [
      {
        subtitle: 'Sublimación',
        body: [
          'El tiempo estimado de entrega es de 24 a 96 horas, una vez que contamos con el PDF enviado por el formulario y en condiciones para su correcta impresión.',
          'Puede solicitar su pedido con «Modalidad Urgente» indicándose en la solicitud del formulario para que sea entregado al día siguiente hábil. A esta modalidad se le aplicará un recargo del 25% adicional sobre el costo total del pedido.',
        ],
      },
      {
        subtitle: 'DTF (Direct to Film) y DTF UV',
        body: [
          'El tiempo estimado de entrega es de 24 a 96 horas, una vez que contamos con el PDF enviado por el formulario y en condiciones para su correcta impresión. Usualmente se entrega al segundo día hábil, pero dependerá de la demanda.',
          'Si necesita la impresión en el día, debe indicarlo al ingresar su pedido en el formulario como «Modalidad Urgente» antes de las 13 hs; de lo contrario, se procesa para entregar en 24 horas. A esta modalidad se le aplicará un recargo del 25% adicional sobre el costo total del pedido.',
        ],
      },
      {
        subtitle: 'Gran Formato (Lona, Vinilo, Banner PET, PET Backlight y Canva)',
        body: [
          'El tiempo estimado de entrega es de 24 a 96 horas, una vez que contamos con el PDF enviado por el formulario y en condiciones para su correcta impresión.',
          'Puede solicitar su pedido con «Modalidad Urgente» indicándose en la solicitud del formulario para que sea entregado al día siguiente hábil. A esta modalidad se le aplicará un recargo del 25% adicional sobre el costo total del pedido.',
        ],
      },
      {
        subtitle: 'Corte Láser',
        body: [
          'El tiempo estimado de entrega para pedidos de corte láser es de 24 a 96 horas, siguiendo los mismos plazos que el resto de los productos. Sin embargo, siempre se coordina con el cliente según disponibilidad.',
          'Por el momento, no se cobra recargo por modalidad urgente.',
        ],
      },
      {
        subtitle: 'Productos Varios',
        body: [
          'Para estos productos no existe la «Modalidad Urgente».',
          'Productos a pedido: el tiempo estimado de entrega para todos los productos Yazbek, medias y gorros es de 24 a 48 horas, pueden ser pedidos en el local o por los medios de comunicación disponibles.',
          'Productos en Stock (shorts confeccionados, reglas para estampar, canilleras, remeras "ready" y perfumadores): el tiempo de entrega es inmediato.',
          'El lapso de tiempo empieza a correr una vez confirmada la disponibilidad en stock. En todos los casos, los pedidos serán notificados en cuanto estén listos para su retiro dentro del plazo acordado.',
        ],
      },
    ],
  },
  {
    title: 'Cancelación de Pedidos',
    accent: '#EC008C',
    items: [
      {
        body: [
          'Para cancelar un pedido, comuníquese con los números correspondientes según el producto solicitado. Nuestro equipo estará disponible para asistirlo y proporcionarle la información necesaria sobre el estado del pedido y si este se encuentra en condiciones de ser cancelado.',
          'El plazo para solicitar la cancelación es dentro de las primeras 4 horas hábiles (9:00 a.m. – 5:00 p.m.). Una vez transcurrido este plazo, es posible que el pedido ya esté en proceso de producción o listo para ser retirado, lo que podría limitar nuestra capacidad para cancelarlo.',
          'Si necesita enviar un archivo corregido, siempre deberá hacerlo con el siguiente formato: renombre el archivo usando la palabra "CORREGIDO" al inicio, seguido del nombre idéntico al archivo original. Ejemplo: "CORREGIDO_LogosCliente.pdf".',
        ],
      },
    ],
  },
  {
    title: 'Cambios de Modalidad',
    accent: '#FFF200',
    items: [
      {
        body: [
          'Para cambiar la modalidad de un pedido, comuníquese al número correspondiente al producto. El plazo es dentro de las primeras 4 horas hábiles (9:00 a.m. – 5:00 p.m.). Los cambios de modalidad están sujetos a la demanda.',
        ],
      },
    ],
  },
  {
    title: 'Reclamos por Faltantes y/o Fallos',
    accent: '#f4f4f5',
    items: [
      {
        subtitle: 'Plazo para Reclamos',
        body: [
          'Los faltantes y/o fallos en los productos entregados deben ser reclamados dentro de los 20 días hábiles siguientes a la fecha de recepción del material. Pasado este plazo, no se aceptarán reclamos.',
        ],
      },
      {
        subtitle: 'Limitación de Responsabilidad',
        body: [
          'Nuestra responsabilidad se limita únicamente al material ya entregado. No nos hacemos cargo de costos adicionales incurridos, como el cosido, estampado u otros procesos realizados sobre el material entregado.',
        ],
      },
      {
        subtitle: 'Procedimiento de Reclamos',
        body: [
          'Para gestionar su reclamo, es necesario completar el formulario de "Gestión de quejas, reclamos y sugerencias". Asegúrese de proporcionar información detallada y evidencia fotográfica que respalde el faltante o fallo detectado. Nuestro equipo evaluará la solicitud y determinará si corresponde la aprobación del reclamo.',
        ],
      },
    ],
  },
  {
    title: 'Bloqueo de ID por Falta de Pago',
    accent: '#fb923c',
    items: [
      {
        body: [
          'Si un pedido permanece en depósito sin ser abonado por más de 20 días consecutivos, el ID del cliente asociado será bloqueado. Recuerde que el ID de cliente es esencial para la gestión de sus pedidos y es el medio con el que le identificamos en nuestro sistema.',
        ],
      },
    ],
  },
];

export default function TermsPage() {
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
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">Documento legal</p>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4 leading-tight">
            Términos y Condiciones
          </h1>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl">
            Información importante sobre tiempos de entrega, recargos por urgencia, cancelaciones, cambios de modalidad y bloqueo de ID. 
            Le recomendamos revisar detalladamente antes de subir sus pedidos.
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
              Esperamos que esta información sea útil para usted al planificar sus próximos pedidos. Estamos comprometidos a brindarle un servicio eficiente y de calidad, y estamos disponibles para responder cualquier pregunta que pueda tener al respecto.
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

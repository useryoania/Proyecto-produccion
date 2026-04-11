import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import LandingNavbar from '../shared/LandingNavbar';
import Footer from '../Footer';
import ParticlesCanvas from '../ui/ParticlesCanvas';
const CONTACTS = [
  { label: 'Atención al cliente', href: 'https://wa.me/59898665571' },
  /*
  { label: 'Asesores', divider: true },
  { label: 'Matías', boldLabel: 'Siri',      href: 'https://wa.me/59892284262' },
  { label: 'Soledad', boldLabel: 'Ferreri',   href: 'https://wa.me/59899182920' },
  { label: 'Fabiana',                          href: 'https://wa.me/59892698543' },
  { label: 'Lucas',   boldLabel: 'Fernandez', href: 'https://wa.me/59892713902' },
  { label: 'Roly',    boldLabel: 'Majenski',  href: 'https://wa.me/59891612909' },
  { label: 'Agustín', boldLabel: 'Palmero',   href: 'https://wa.me/59898284114' },
  */
];

const WaIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    background: '#18181b',
    color: '#e4e4e7',
    customClass: { popup: 'rounded-xl border border-zinc-700' }
});

export default function ContactPage() {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [sending, setSending] = useState(false);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.message) return;
        
        setSending(true);
        try {
            const res = await fetch('/api/web-content/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            
            if (data.success) {
                Toast.fire({ icon: 'success', title: '¡Mensaje enviado!', text: 'Nos contactaremos a la brevedad.' });
                setFormData({ name: '', email: '', message: '' });
            } else {
                Toast.fire({ icon: 'error', title: 'Error al enviar', text: 'Asegurate de rellenar todos los campos.' });
            }
        } catch (err) {
            Toast.fire({ icon: 'error', title: 'Error de conexión', text: 'Intentá nuevamente más tarde.' });
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        document.body.style.overflow = 'auto';
        window.scrollTo(0, 0);
        return () => { document.body.style.overflow = 'hidden'; };
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-custom-dark relative overflow-x-hidden font-sans">
            <LandingNavbar />
            <ParticlesCanvas />
            
            <div className="flex-1 flex flex-col items-center p-6 text-center z-10 pt-[100px] md:pt-[120px] pb-[80px] w-full max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                    Estamos para ayudarte
                </h1>
                <p className="text-lg text-zinc-300 max-w-lg mx-auto mb-12 font-medium">
                    {/* Contactá directamente a nuestros asesores por WhatsApp para recibir atención personalizada, o pasá por nuestro Showroom para ver nuestras soluciones gráficas en primera persona. */}
                    Contactanos por WhatsApp para recibir atención personalizada, o pasá por nuestro Showroom para ver nuestras soluciones gráficas en primera persona.
                </p>

                {/* Formulario de Contacto Directo estilo Login */}
                <div className="relative w-full max-w-3xl rounded-3xl p-[2px] bg-gradient-to-br from-[#00AEEF] via-[#EC008C] to-[#FFF200] mb-16 shadow-2xl">
                    <form className="w-full text-left flex flex-col gap-5 bg-custom-dark p-6 md:p-10 rounded-[22px] overflow-hidden">
                        <h2 className="text-2xl font-bold text-white mb-2">Dejanos un mensaje</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-100 uppercase tracking-wider ml-1">Nombre</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Tu nombre..." className="w-full px-4 py-3 bg-brand-dark border border-brand-cyan rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-100 uppercase tracking-wider ml-1">Correo Electrónico</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="tu@email.com" className="w-full px-4 py-3 bg-brand-dark border border-brand-magenta rounded-xl focus:ring-1 focus:ring-custom-magenta focus:border-custom-magenta transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-100 uppercase tracking-wider ml-1">Mensaje</label>
                            <textarea placeholder="¿En qué te podemos ayudar?" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} rows="4" className="w-full px-4 py-3 bg-brand-dark border border-brand-yellow rounded-xl focus:ring-1 focus:ring-custom-yellow focus:border-custom-yellow transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 resize-none"></textarea>
                        </div>
                        <button disabled={sending || !formData.name || !formData.email || !formData.message} type="submit" onClick={handleSend} className="mt-2 w-full py-3 bg-brand-cyan hover:bg-custom-cyan text-zinc-100 rounded-xl font-bold shadow-lg shadow-zinc-900 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {sending ? 'ENVIANDO...' : 'ENVIAR MENSAJE'}
                        </button>
                    </form>
                </div>
                

                {/* Botón de WhatsApp Centrado */}
                <div className="flex justify-center w-full max-w-md mx-auto mb-16">
                    {CONTACTS.filter(c => !c.divider).map((c, i) => (
                        <a
                            key={i}
                            href={c.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full relative group flex items-center justify-between p-4 rounded-[24px] bg-[#111111] border border-[#25d366]/30 hover:border-[#25d366] transition-all duration-300 hover:shadow-[0_0_30px_rgba(37,211,102,0.25)] hover:-translate-y-1 overflow-hidden z-10"
                        >
                            {/* Hover background fill effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#25d366]/0 to-[#25d366]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 rounded-full bg-[#25d366]/10 flex items-center justify-center text-[#25d366] group-hover:bg-[#25d366] group-hover:text-[#111111] transition-all duration-300 group-hover:scale-110 shadow-lg shadow-[#25d366]/5">
                                    {WaIcon}
                                </div>
                                <span className="text-white font-bold text-base tracking-wide group-hover:text-[#25d366] transition-colors">
                                    {c.label} {c.boldLabel && <strong className="font-black">{c.boldLabel}</strong>}
                                </span>
                            </div>
                            <span className="text-[#25d366]/50 group-hover:text-[#25d366] group-hover:translate-x-1 transition-all ml-4 relative z-10 text-xl font-bold">
                                →
                            </span>
                        </a>
                    ))}
                </div>

                <div className="flex flex-col items-center max-w-lg mb-4 w-full">
                    <p className="text-zinc-400 font-medium mb-4 tracking-wide uppercase text-xs font-bold">Ubicación del Showroom</p>
                    <a 
                        href="https://www.google.com/maps/search/Arenal+Grande+2667+Montevideo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-4 bg-transparent hover:bg-white/5 border border-white/20 text-zinc-100 rounded-xl font-bold transition-all shadow-none active:scale-[0.98] w-full max-w-[300px] flex items-center justify-center gap-3"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#eb008b"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                        Arenal Grande 2667
                    </a>
                </div>
            </div>
            
            <div className="z-10 bg-[#111] relative">
                <Footer />
            </div>
        </div>
    );
}

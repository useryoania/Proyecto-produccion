import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import LandingNavbar from '../shared/LandingNavbar';
import Footer from '../Footer';
import ParticlesCanvas from '../ui/ParticlesCanvas';

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

export default function WorkWithUsPage() {
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', linkedin: '', intro: ''
    });
    const [file, setFile] = useState(null);
    const [sending, setSending] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        // Validación básica
        if (!formData.name || !formData.phone || !formData.email) {
            Toast.fire({ icon: 'error', title: 'Faltan datos', text: 'Completá los campos obligatorios (*)' });
            return;
        }

        setSending(true);
        try {
            const bodyFormData = new FormData();
            bodyFormData.append('name', formData.name);
            bodyFormData.append('phone', formData.phone);
            bodyFormData.append('email', formData.email);
            bodyFormData.append('linkedin', formData.linkedin);
            bodyFormData.append('intro', formData.intro);
            if (file) {
                bodyFormData.append('cv', file);
            }
            
            const res = await fetch('/api/web-content/jobs', {
                method: 'POST',
                body: bodyFormData
            });
            const data = await res.json();

            if (data.success) {
                Toast.fire({ icon: 'success', title: '¡Solicitud enviada!', text: 'Revisaremos tu perfil y nos contactaremos a la brevedad.' });
            } else {
                Toast.fire({ icon: 'error', title: 'Error al enviar', text: data.error || 'Hubo un error del servidor.' });
                setSending(false);
                return;
            }
            
            // Reseteo
            setFormData({ name: '', phone: '', email: '', linkedin: '', intro: '' });
            setFile(null);
            const fileInput = document.getElementById('cv-upload');
            if (fileInput) fileInput.value = '';

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
            
            <div className="flex-1 flex flex-col items-center p-6 text-center z-10 pt-[100px] md:pt-[120px] pb-8 md:pb-12 w-full max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                    Formulario de solicitud de trabajo
                </h1>
                <p className="text-lg text-zinc-300 max-w-lg mx-auto mb-12 font-medium">
                    Sumate al equipo de impresión y sublimación líder. Dejanos tus datos, adjuntanos tu currículum y evaluremos tu perfil para nuestras próximas vacantes.
                </p>

                {/* Contenedor del Formulario */}
                <div className="relative w-full max-w-3xl rounded-3xl p-[2px] bg-gradient-to-br from-[#00AEEF] via-[#EC008C] to-[#FFF200] mb-0 shadow-2xl text-left">
                    <form onSubmit={handleSend} className="w-full flex flex-col gap-6 bg-custom-dark p-6 md:p-10 rounded-[22px] overflow-hidden">
                        
                        {/* Fila: Nombre */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                            <label className="text-sm font-bold text-slate-100 md:w-1/3">Nombre y apellido *</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="flex-1 px-4 py-3 bg-brand-dark border border-zinc-700 rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500" />
                        </div>

                        {/* Fila: Celular */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                            <label className="text-sm font-bold text-slate-100 md:w-1/3">Número de celular *</label>
                            <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className="flex-1 px-4 py-3 bg-brand-dark border border-zinc-700 rounded-xl focus:ring-1 focus:ring-custom-magenta focus:border-custom-magenta transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500" />
                        </div>

                        {/* Fila: Email */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                            <label className="text-sm font-bold text-slate-100 md:w-1/3">Correo electrónico *</label>
                            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className="flex-1 px-4 py-3 bg-brand-dark border border-zinc-700 rounded-xl focus:ring-1 focus:ring-custom-yellow focus:border-custom-yellow transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500" />
                        </div>

                        {/* Fila: LinkedIn */}
                        <div className="flex flex-col md:flex-row gap-2 md:gap-6">
                            <label className="text-sm font-bold text-slate-100 md:w-1/3 md:pt-3">Perfil de LinkedIn</label>
                            <div className="flex-1 flex overflow-hidden rounded-xl border border-zinc-700 focus-within:ring-1 focus-within:ring-[#0a66c2] focus-within:border-[#0a66c2] transition-all bg-brand-dark">
                                <span className="bg-[#0a66c2] text-white px-4 flex items-center justify-center font-bold">in</span>
                                <input type="url" value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})} placeholder="por ejemplo, https://linkedin.com/in/usuario" className="w-full px-4 py-3 bg-transparent outline-none font-semibold text-zinc-100 placeholder-zinc-500" />
                            </div>
                        </div>

                        {/* Fila: CV File Upload */}
                        <div className="flex flex-col md:flex-row gap-2 md:gap-6">
                            <label className="text-sm font-bold text-slate-100 md:w-1/3 md:pt-3">Currículum vitae</label>
                            <div className="flex-1 flex items-center overflow-hidden rounded-xl border border-zinc-700 bg-brand-dark">
                                {/* Label customizado para el input file */}
                                <label className="bg-zinc-800 hover:bg-zinc-700 transition-colors text-white text-sm font-bold py-3 px-4 cursor-pointer border-r border-zinc-700 whitespace-nowrap">
                                    Seleccionar archivo
                                    <input id="cv-upload" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                                </label>
                                <span className="px-4 text-sm font-semibold text-zinc-400 whitespace-nowrap overflow-hidden text-ellipsis">
                                    {file ? file.name : "Ningún archivo seleccionado"}
                                </span>
                            </div>
                        </div>

                        {/* Fila: Introducción */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-slate-100">Introducción Corta</label>
                            <textarea placeholder="Presentación opcional, o cualquier pregunta que tenga sobre el trabajo..." value={formData.intro} onChange={e => setFormData({...formData, intro: e.target.value})} rows="4" className="w-full px-4 py-3 bg-brand-dark border border-zinc-700 rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 resize-none"></textarea>
                        </div>
                        
                        <div className="mt-4 flex justify-center md:justify-end">
                            <button disabled={sending || !formData.name || !formData.phone || !formData.email} type="submit" className="py-3 px-8 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {sending ? 'Enviando...' : 'Enviar solicitud'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div className="z-10 bg-[#111] relative">
                <Footer />
            </div>
        </div>
    );
}

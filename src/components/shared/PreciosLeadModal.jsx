import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, X, AlertCircle, ChevronRight } from 'lucide-react';
import { trackAnalyticsEvent, submitLeadCapture } from '../../utils/analytics';

export default function PreciosLeadModal({ isOpen, onClose, onConfirm }) {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            trackAnalyticsEvent('MODAL_OPEN');
            setHasSubmitted(false);
            setEmail('');
            setPhone('');
            setError('');
        }
    }, [isOpen]);

    const handleClose = () => {
        if (!hasSubmitted) {
            trackAnalyticsEvent('FORM_ABANDON');
        }
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !phone.trim()) {
            setError('Por favor, completa ambos campos.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError('Por favor, ingresá un correo válido.');
            return;
        }

        if (phone.replace(/\D/g, '').length < 8) {
            setError('Por favor, ingresá un celular válido.');
            return;
        }
        
        setHasSubmitted(true);
        trackAnalyticsEvent('FORM_SUBMIT');
        submitLeadCapture(email, phone, 'catalogo_precios_modal');

        if (onConfirm) {
            onConfirm({ email, phone });
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-[#000000e6]"
                        style={{ willChange: 'opacity' }}
                        onClick={handleClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
                        style={{ willChange: 'transform, opacity' }}
                        className="relative w-full max-w-sm rounded-3xl z-10 p-[2px] login-gradient-border shadow-2xl shadow-black/50"
                    >
                        <button 
                            onClick={handleClose}
                            className="absolute top-4 right-4 z-50 text-zinc-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-2"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        
                        <div className="bg-custom-dark rounded-[22px] overflow-hidden p-8 flex flex-col gap-6">
                            <div className="text-center">
                                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Lista de Precios</h3>
                                <p className="text-zinc-400 text-sm">Dejanos tus datos para acceder a nuestra lista de precios actualizada.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                                        Email
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-cyan">
                                            <Mail size={18} className="text-zinc-500 group-focus-within:text-brand-cyan transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-[#111] border border-zinc-800 text-white text-sm rounded-xl focus:ring-1 focus:ring-brand-cyan focus:border-brand-cyan block pl-12 p-3.5 transition-all"
                                            placeholder="tu@email.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                                        Celular
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-cyan">
                                            <Phone size={18} className="text-zinc-500 group-focus-within:text-brand-cyan transition-colors" />
                                        </div>
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full bg-[#111] border border-zinc-800 text-white text-sm rounded-xl focus:ring-1 focus:ring-brand-cyan focus:border-brand-cyan block pl-12 p-3.5 transition-all"
                                            placeholder="099123456"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-brand-magenta p-3 rounded-xl text-xs font-bold flex items-center gap-2 justify-center animate-pulse">
                                        <AlertCircle size={14} />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full py-[14px] px-4 rounded-xl font-bold active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2 text-[15px] !shadow-none border cursor-pointer"
                                    style={{
                                        background: 'linear-gradient(90deg, rgba(0,174,239,0.1) 0%, rgba(0,174,239,0.2) 100%)',
                                        borderColor: 'rgba(0,174,239,0.4)',
                                        color: '#00AEEF',
                                        backdropFilter: 'blur(4px)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(90deg, rgba(0,174,239,0.15) 0%, rgba(0,174,239,0.3) 100%)';
                                        e.currentTarget.style.borderColor = 'rgba(0,174,239,0.7)';
                                        e.currentTarget.style.boxShadow = '0 0 15px rgba(0,174,239,0.2)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(90deg, rgba(0,174,239,0.1) 0%, rgba(0,174,239,0.2) 100%)';
                                        e.currentTarget.style.borderColor = 'rgba(0,174,239,0.4)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    Ver Lista de Precios <ChevronRight size={18} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

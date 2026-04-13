import { useState } from 'react';
import { Button } from '../ui/Button.jsx';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../../services/apiClient';
import { Logo } from '../Logo.jsx';
import ParticlesCanvas from '../ui/ParticlesCanvas';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email.trim()) {
            setError('Por favor, ingresá tu email.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Formato de email inválido.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/web-auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess('Si el email está registrado, se te enviará un enlace de recuperación. Revisá tu bandeja de entrada.');
            } else {
                setError(data.message || 'No se pudo procesar la solicitud.');
            }
        } catch (err) {
            setError('Error de conexión. Intentá de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-custom-dark relative overflow-x-hidden font-sans pt-[70px]">
            <ParticlesCanvas />

            <div className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-70px-100px)] z-10 w-full mb-10">
                <div className="relative w-full max-w-md md:max-w-sm z-10 md:rounded-3xl md:p-[2px] md:bg-gradient-to-br md:from-[#00AEEF] md:via-[#EC008C] md:to-[#FFF200]">
                    
                    <div className="relative bg-custom-dark pt-8 px-6 sm:px-10 md:px-8 pb-10 md:pb-8 w-full md:rounded-[22px] overflow-hidden">
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-black text-white tracking-tight">Recuperar cuenta</h2>
                            <p className="text-sm font-medium text-zinc-400 mt-1">Ingresá tu email para restaurar tu contraseña.</p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-100 uppercase tracking-wider ml-1">Email</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-cyan group-focus-within:text-custom-cyan transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        className="w-full pl-10 pr-4 py-3 bg-brand-dark border border-brand-cyan rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500"
                                        placeholder="tu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-custom-magenta p-3 rounded-xl text-xs font-bold flex items-center gap-2 justify-center animate-pulse">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-50 text-green-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-green-100">
                                    <CheckCircle2 size={14} />
                                    {success}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full py-2.5 bg-brand-cyan hover:bg-custom-cyan text-zinc-100 rounded-xl font-bold shadow-lg shadow-zinc-900 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2"
                                isLoading={isLoading}
                            >
                                Enviar enlace
                            </Button>

                            <p className="text-center text-sm text-zinc-500 mt-2">
                                <a href="/login" className="font-bold text-brand-cyan hover:text-custom-cyan transition-colors">
                                    ← Volver al login
                                </a>
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            {/* 4-color bar - mobile only */}
            <div className="fixed bottom-0 left-0 right-0 flex h-2 md:hidden z-50">
                <div className="flex-1 bg-custom-cyan" />
                <div className="flex-1 bg-custom-magenta" />
                <div className="flex-1 bg-custom-yellow" />
                <div className="flex-1 bg-white" />
            </div>
        </div>
    );
};

export default ForgotPasswordPage;

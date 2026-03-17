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

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess('Se envió un enlace de recuperación a tu email. Revisá tu bandeja de entrada.');
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
        <div className="min-h-screen flex items-center justify-center bg-custom-dark relative overflow-hidden font-sans">

            {/* Particles canvas */}
            <ParticlesCanvas />

            {/* Animated border keyframes */}
            <style>{`
                @keyframes rotateBorder {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>

            {/* Card wrapper with animated CMY border */}
            <div className="relative w-full max-w-md md:max-w-sm rounded-3xl z-10">
                {/* Animated gradient border - only on md+ */}
                <div className="hidden md:block absolute -inset-[2px] rounded-3xl overflow-hidden">
                    <div
                        className="absolute inset-[-50%] w-[200%] h-[200%]"
                        style={{
                            background: 'conic-gradient(#00AEEF, #EC008C, #FFF200, #FFFFFF, #00AEEF)',
                            animation: 'rotateBorder 3s linear infinite',
                        }}
                    />
                </div>

                <div className="relative bg-custom-dark pt-4 px-5 pb-10 md:px-8 md:pb-8 rounded-3xl w-full overflow-hidden">
                    <div className="flex flex-col items-center mb-6 md:mt-4">
                        <Logo className="h-32 w-auto text-white" />
                        <h2 className="text-xl font-bold text-zinc-100">Recuperar contraseña</h2>
                        <p className="text-sm text-zinc-100 text-center mt-1">Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña</p>
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
                                    className="w-full pl-10 pr-4 py-2.5 md:py-2 bg-brand-dark border border-brand-cyan rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 md:text-sm"
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
                            <div className="bg-green-950/50 text-green-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-green-800/50">
                                <CheckCircle2 size={14} />
                                {success}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full py-2.5 md:py-2 bg-brand-cyan hover:bg-custom-cyan text-zinc-100 rounded-xl font-bold shadow-lg shadow-zinc-900 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2 md:text-sm"
                            isLoading={isLoading}
                        >
                            Enviar enlace de recuperación
                        </Button>

                        <p className="text-center text-sm text-zinc-500">
                            <a href="/login" className="font-bold text-brand-cyan hover:text-custom-cyan transition-colors">
                                ← Volver al login
                            </a>
                        </p>
                    </form>
                </div>
            </div>

            {/* 4-color bar - mobile only */}
            <div className="fixed bottom-0 left-0 w-screen flex h-4 md:hidden z-50">
                <div className="flex-1 bg-custom-cyan" />
                <div className="flex-1 bg-custom-magenta" />
                <div className="flex-1 bg-custom-yellow" />
                <div className="flex-1 bg-white" />
            </div>
        </div>
    );
};

export default ForgotPasswordPage;

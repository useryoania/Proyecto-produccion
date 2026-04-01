import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button.jsx';
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { API_URL } from '../../services/apiClient';
import { Logo } from '../Logo.jsx';
import ParticlesCanvas from '../ui/ParticlesCanvas';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tokenValid, setTokenValid] = useState(true);

    useEffect(() => {
        if (!token) setTokenValid(false);
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!newPass) return setError('Ingresá una nueva contraseña.');
        if (newPass.length < 4) return setError('La contraseña debe tener al menos 4 caracteres.');
        if (newPass !== confirmPass) return setError('Las contraseñas no coinciden.');

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/web-auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: newPass }),
            });
            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 3500);
            } else if (data.expired) {
                setTokenValid(false);
            } else {
                setError(data.message || 'El enlace puede haber expirado. Solicitá uno nuevo.');
            }
        } catch {
            setError('Error de conexión. Intentá de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-custom-dark relative overflow-hidden font-sans">
            <ParticlesCanvas />

            <style>{`
                @keyframes rotateBorder {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>

            <div className="relative w-full max-w-md md:max-w-sm rounded-3xl z-10">
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
                    {/* === INVALID / EXPIRED TOKEN === */}
                    {!tokenValid && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <ShieldAlert size={48} className="text-custom-magenta" />
                            <h2 className="text-xl font-bold text-zinc-100">Enlace inválido</h2>
                            <p className="text-sm text-zinc-400 text-center">
                                Este enlace de recuperación no es válido o ya expiró.
                            </p>
                            <a
                                href="/forgot-password"
                                className="mt-2 font-bold text-brand-cyan hover:text-custom-cyan transition-colors text-sm"
                            >
                                Solicitar un nuevo enlace
                            </a>
                        </div>
                    )}

                    {/* === SUCCESS === */}
                    {tokenValid && success && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <CheckCircle2 size={48} className="text-green-400" />
                            <h2 className="text-xl font-bold text-zinc-100">¡Contraseña actualizada!</h2>
                            <p className="text-sm text-zinc-400 text-center">
                                Tu contraseña fue cambiada correctamente. Vas a ser redirigido al login en unos segundos…
                            </p>
                        </div>
                    )}

                    {/* === FORM === */}
                    {tokenValid && !success && (
                        <>
                            <div className="flex flex-col items-center mb-6 md:mt-4">
                                <Logo className="h-32 w-auto text-white" />
                                <h2 className="text-xl font-bold text-zinc-100">Nueva contraseña</h2>
                                <p className="text-sm text-zinc-400 text-center mt-1">
                                    Elegí una nueva contraseña para tu cuenta.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-zinc-100 uppercase tracking-wider ml-1">
                                        Nueva Contraseña
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-cyan group-focus-within:text-custom-cyan transition-colors">
                                            <KeyRound size={18} />
                                        </div>
                                        <input
                                            type={showNew ? 'text' : 'password'}
                                            className="w-full pl-10 pr-10 py-2.5 md:py-2 bg-brand-dark border border-brand-cyan rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 md:text-sm"
                                            placeholder="Nueva contraseña"
                                            value={newPass}
                                            onChange={(e) => setNewPass(e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            aria-label="Mostrar u ocultar contraseña"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-cyan hover:text-custom-cyan cursor-pointer"
                                            onClick={() => setShowNew((v) => !v)}
                                        >
                                            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-zinc-100 uppercase tracking-wider ml-1">
                                        Confirmar Contraseña
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-cyan group-focus-within:text-custom-cyan transition-colors">
                                            <KeyRound size={18} />
                                        </div>
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            className="w-full pl-10 pr-10 py-2.5 md:py-2 bg-brand-dark border border-brand-cyan rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 md:text-sm"
                                            placeholder="Repetir contraseña"
                                            value={confirmPass}
                                            onChange={(e) => setConfirmPass(e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            aria-label="Mostrar u ocultar confirmación"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-cyan hover:text-custom-cyan cursor-pointer"
                                            onClick={() => setShowConfirm((v) => !v)}
                                        >
                                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-custom-magenta p-3 rounded-xl text-xs font-bold flex items-center gap-2 justify-center animate-pulse">
                                        <AlertCircle size={14} />
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full py-2.5 md:py-2 bg-brand-cyan hover:bg-custom-cyan text-zinc-100 rounded-xl font-bold shadow-lg shadow-zinc-900 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2 md:text-sm"
                                    isLoading={isLoading}
                                >
                                    <>Guardar nueva contraseña <KeyRound size={18} /></>
                                </Button>

                                <p className="text-center text-sm text-zinc-500">
                                    <a href="/login" className="font-bold text-brand-cyan hover:text-custom-cyan transition-colors">
                                        ← Volver al login
                                    </a>
                                </p>
                            </form>
                        </>
                    )}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-screen flex h-4 md:hidden z-50">
                <div className="flex-1 bg-custom-cyan" />
                <div className="flex-1 bg-custom-magenta" />
                <div className="flex-1 bg-custom-yellow" />
                <div className="flex-1 bg-white" />
            </div>
        </div>
    );
};

export default ResetPasswordPage;

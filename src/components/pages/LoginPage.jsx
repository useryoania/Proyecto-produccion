import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../ui/Button.jsx';
import { User, Lock, Eye, EyeOff, AlertCircle, LogIn, KeyRound } from 'lucide-react';
import { Logo } from '../Logo.jsx';
import { API_URL } from '../../services/apiClient';
import ParticlesCanvas from '../ui/ParticlesCanvas';

const GOOGLE_CLIENT_ID = '731319806954-13nu06rau4pnvo1lu0fmai4f2inm7j6c.apps.googleusercontent.com';


// --- FORCED RESET PASSWORD SCREEN ---
const ResetPasswordScreen = ({ token, onSuccess }) => {
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!newPass) return setError('Ingresá una nueva contraseña.');
        if (newPass.length < 4) return setError('La contraseña debe tener al menos 4 caracteres.');
        if (newPass !== confirmPass) return setError('Las contraseñas no coinciden.');

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/web-auth/update-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword: newPass })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al actualizar');
            onSuccess();
        } catch (err) {
            setError(err.message || 'Error al actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-custom-dark relative overflow-hidden font-sans">
            <ParticlesCanvas />
            <div className="relative w-full max-w-md rounded-3xl z-10">
                <div className="hidden md:block absolute -inset-[2px] rounded-3xl overflow-hidden">
                    <div className="absolute inset-[-50%] w-[200%] h-[200%]"
                        style={{ background: 'conic-gradient(#FFF200, #EC008C, #00AEEF, #FFFFFF, #FFF200)', animation: 'rotateBorder 3s linear infinite' }}
                    />
                </div>
                <style>{`@keyframes rotateBorder { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <div className="relative p-10 rounded-3xl w-full bg-custom-dark">
                    <div className="flex flex-col items-center mb-6">
                        <KeyRound size={48} className="text-brand-yellow mb-3" />
                        <h2 className="text-2xl font-black text-white">Cambiar Contraseña</h2>
                        <p className="text-zinc-400 text-sm mt-2 text-center">
                            Por seguridad, necesitás establecer una nueva contraseña antes de continuar.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-100 uppercase tracking-wider ml-1">Nueva Contraseña</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-cyan">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPass ? "text" : "password"}
                                    className="w-full pl-10 pr-10 py-3 bg-brand-dark border border-brand-cyan rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500"
                                    placeholder="Nueva contraseña"
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    autoFocus
                                />
                                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-cyan hover:text-custom-cyan cursor-pointer"
                                    onClick={() => setShowPass(!showPass)}>
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-100 uppercase tracking-wider ml-1">Confirmar Contraseña</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-magenta">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPass ? "text" : "password"}
                                    className="w-full pl-10 pr-4 py-3 bg-brand-dark border border-brand-magenta rounded-xl focus:ring-1 focus:ring-custom-magenta focus:border-custom-magenta transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500"
                                    placeholder="Repetir contraseña"
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-custom-magenta p-3 rounded-xl text-xs font-bold flex items-center gap-2 justify-center animate-pulse">
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-transparent text-zinc-100 rounded-xl font-bold shadow-none border border-[#00AEEF]/40 hover:bg-[#00AEEF]/5 hover:border-[#00AEEF] active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="animate-spin h-5 w-5 border-2 border-[#00AEEF] border-t-transparent rounded-full" />
                            ) : (
                                <>Guardar Nueva Contraseña <KeyRound size={18} /></>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, googleLogin } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const googleWrapperRef = useRef(null);
    const [requireReset, setRequireReset] = useState(false);
    const [resetToken, setResetToken] = useState(null);

    const handleGoogleResponse = useCallback(async (response) => {
        setError('');
        setGoogleLoading(true);
        try {
            const result = await googleLogin(response.credential);
            if (result.userType === 'CLIENT') {
                navigate('/portal/pickup');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.message || 'Error al iniciar sesión con Google.');
        } finally {
            setGoogleLoading(false);
        }
    }, [googleLogin, navigate]);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google && googleWrapperRef.current) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse,
                });
                window.google.accounts.id.renderButton(googleWrapperRef.current, {
                    type: 'standard',
                    theme: 'filled_black',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'pill',
                    width: 350,
                    logo_alignment: 'left',
                });
            }
        };
        document.body.appendChild(script);
        return () => {
            if (document.body.contains(script)) document.body.removeChild(script);
        };
    }, [handleGoogleResponse]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('Por favor, completa todos los campos.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await login(username, password);
            // Check if client needs to reset password
            if (result.userType === 'CLIENT' && result.requireReset) {
                setResetToken(localStorage.getItem('auth_token'));
                setRequireReset(true);
                setIsLoading(false);
                return;
            }
            if (result.userType === 'CLIENT') {
                navigate('/portal/pickup');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.message || 'Credenciales inválidas. Por favor, intentá de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- FORCED PASSWORD RESET SCREEN ---
    if (requireReset) {
        return <ResetPasswordScreen token={resetToken} onSuccess={() => {
            // Clear session and redirect to login so user enters with new password
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_session');
            window.location.href = '/login';
        }} />;
    }

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

            {/* Card wrapper with animated CMY border (hidden on mobile) */}
            <div className="relative w-full max-w-md rounded-3xl z-10">
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

                <div className="relative p-10 rounded-3xl w-full backdrop-blur-sm overflow-hidden bg-custom-dark">
                    <div className="flex flex-col items-center mb-4 md:mt-8">
                        <Logo className="h-32 w-auto text-white" />
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-100 uppercase tracking-wider ml-1">Usuario</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-cyan group-focus-within:text-custom-cyan transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-3 bg-brand-dark border border-brand-cyan rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan focus:bg-brand-dark transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500"
                                    placeholder="Usuario o ID de Cliente"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-100 uppercase tracking-wider ml-1">Contraseña</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-magenta group-focus-within:text-custom-magenta transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full pl-10 pr-10 py-3 bg-brand-dark border border-brand-magenta rounded-xl focus:ring-1 focus:ring-custom-magenta focus:border-custom-magenta focus:bg-brand-dark transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500"
                                    placeholder="********"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-magenta hover:text-custom-magenta cursor-pointer"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <a href="/forgot-password" className="text-xs font-semibold text-zinc-500 hover:text-slate-100 transition-colors">
                                ¿Olvidaste tu contraseña?
                            </a>
                        </div>

                        {error && (
                            <div className="text-custom-magenta p-3 rounded-xl text-xs font-bold flex items-center gap-2 justify-center animate-pulse">
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full py-3.5 bg-brand-cyan hover:bg-custom-cyan text-zinc-100 rounded-xl font-bold shadow-lg shadow-zinc-900 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2"
                            isLoading={isLoading}
                        >
                            Ingresar al Sistema <LogIn size={18} />
                        </Button>

                        <p className="text-center text-sm text-zinc-500">
                            ¿No tenés cuenta?{' '}
                            <a href="/register" className="font-bold text-brand-cyan hover:text-custom-cyan transition-colors">
                                Registrate
                            </a>
                        </p>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-zinc-100"></div>
                        <span className="text-xs font-bold text-zinc-300 uppercase">o</span>
                        <div className="flex-1 h-px bg-zinc-100"></div>
                    </div>

                    {/* Google Sign-In - official button, dark theme, pill shape */}
                    <div className="flex justify-center" ref={googleWrapperRef}></div>

                </div>

            </div>
            <div className="absolute bottom-0 left-0 right-0 flex h-4 md:hidden">
                <div className="flex-1 bg-custom-cyan" />
                <div className="flex-1 bg-custom-magenta" />
                <div className="flex-1 bg-custom-yellow" />
                <div className="flex-1 bg-white" />
            </div>
        </div>
    );
};

export default LoginPage;
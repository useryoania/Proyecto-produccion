import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../ui/Button.jsx';
import { User, Lock, Eye, EyeOff, AlertCircle, LogIn, KeyRound, Mail, CheckCircle2, Send } from 'lucide-react';
import LandingNavbar from '../shared/LandingNavbar.jsx';
import { API_URL } from '../../services/apiClient';
import ParticlesCanvas from '../ui/ParticlesCanvas';
import Swal from 'sweetalert2';

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
        if (!newPass) return setError('La contraseña no puede estar vacía.');
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
        <div className="flex flex-col min-h-screen bg-custom-dark relative overflow-x-hidden font-sans">
            <ParticlesCanvas />

            <div className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-70px-100px)] z-10 w-full">
                <div className="relative w-full max-w-md md:max-w-sm z-10 md:rounded-3xl md:p-[2px] md:bg-gradient-to-br md:from-[#00AEEF] md:via-[#EC008C] md:to-[#FFF200]">
                    <div className="bg-custom-dark md:rounded-[22px] overflow-hidden">
                        <div className="relative pt-8 px-6 sm:px-10 md:px-8 pb-8 w-full">

                            <div className="flex flex-col items-center mb-6">
                                <h2 className="text-2xl font-black text-white tracking-tight">Cambiar Contraseña</h2>
                                <p className="text-sm font-medium text-zinc-400 mt-1 text-center">
                                    Por seguridad, establecé una nueva contraseña antes de continuar.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-5 md:gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-100 uppercase tracking-wider ml-1">Nueva Contraseña</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-cyan">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type={showPass ? "text" : "password"}
                                            className="w-full pl-10 pr-10 py-2.5 md:py-2 bg-brand-dark border border-brand-cyan rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 md:text-sm"
                                            placeholder="Nueva contraseña"
                                            value={newPass}
                                            onChange={(e) => setNewPass(e.target.value)}
                                            autoFocus
                                        />
                                        <button type="button" aria-label="Mostrar u ocultar contraseña"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-cyan hover:text-custom-cyan cursor-pointer"
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
                                            className="w-full pl-10 pr-4 py-2.5 md:py-2 bg-brand-dark border border-brand-magenta rounded-xl focus:ring-1 focus:ring-custom-magenta focus:border-custom-magenta transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 md:text-sm"
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
                                    className="w-full py-3 bg-transparent text-zinc-100 rounded-xl font-bold border border-[#00AEEF]/40 hover:bg-[#00AEEF]/5 hover:border-[#00AEEF] active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed md:text-sm"
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
            </div>

            {/* Barra inferior de colores — mobile only */}
            <div className="fixed bottom-0 left-0 right-0 flex h-2 md:hidden z-50">
                <div className="flex-1 bg-custom-cyan" />
                <div className="flex-1 bg-custom-magenta" />
                <div className="flex-1 bg-custom-yellow" />
                <div className="flex-1 bg-white" />
            </div>
        </div>
    );
};

// --- INACTIVE ACCOUNT EXTRACTED PARA REEMPLAZAR EL SWAL ---
const InactiveAccountBox = ({ identifier, maskedEmail, onBack, isVisible }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email.trim()) { setError('Por favor ingresá un correo válido.'); return; }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) { setError('Por favor ingresá un correo válido.'); return; }

        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/web-auth/resend-activation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, email })
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.message || 'El correo no coincide. Intentá de nuevo.');
            } else {
                setSuccess('¡Correo enviado! Revisá tu bandeja de entrada y hacé clic en el link de activación.');
            }
        } catch {
            setError('Error de conexión. Intentá de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`pt-8 px-6 sm:px-10 md:px-8 pb-10 md:pb-8 w-full transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 pointer-events-none -z-10'}`}>
            <div className="mb-6 text-center">
                <h2 className="text-2xl font-black text-white tracking-tight">Cuenta sin activar</h2>
                <div className="text-sm font-medium text-zinc-400 mt-2 space-y-2">
                    <p>
                        Para poder acceder, necesitás confirmar tu dirección de correo electrónico.
                    </p>
                    <p className="text-xs text-zinc-500">
                        Si no encontrás el correo de activación en tu bandeja de entrada o spam, podés solicitar uno nuevo.
                    </p>
                </div>
                {maskedEmail && (
                    <div className="mt-4 p-2.5 bg-[#111] rounded-[10px] border border-[#3f3f46] text-left">
                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Correo registrado</p>
                        <p className="text-sm font-bold text-zinc-200">
                            {maskedEmail}
                        </p>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 md:gap-4" noValidate>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-100 uppercase tracking-wider ml-1">Confirmá tu correo</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-cyan group-focus-within:text-custom-cyan transition-colors">
                            <Mail size={18} />
                        </div>
                        <input
                            type="email"
                            className="w-full pl-10 pr-4 py-2.5 md:py-2 bg-[#111] border border-[#3f3f46] rounded-[10px] focus:ring-1 focus:ring-[#00AEEF] focus:border-[#00AEEF] transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 md:text-sm"
                            placeholder="tu@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoFocus
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
                    <div className="bg-emerald-950/60 border border-emerald-700/40 text-emerald-400 p-3 rounded-xl text-sm font-bold flex items-start gap-2">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                        {success}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading || success}
                    className="w-full py-2.5 md:py-2 bg-transparent text-zinc-100 rounded-xl font-bold border border-[#00AEEF]/40 hover:bg-[#00AEEF]/5 hover:border-[#00AEEF] active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed md:text-sm"
                >
                    {isLoading ? (
                        <span className="animate-spin h-5 w-5 border-2 border-[#00AEEF] border-t-transparent rounded-full" />
                    ) : (
                        <>Reenviar enlace <Send size={16} /></>
                    )}
                </button>

                <p className="text-center text-sm text-zinc-500 mt-1">
                    <button type="button" onClick={onBack} className="font-bold text-brand-cyan hover:text-custom-cyan transition-colors">
                        ← Volver al login
                    </button>
                </p>
            </form>
        </div>
    );
};

// --- LOGIN FORM EXTRACTED PARA REUTILIZAR EN MODAL ---
export const LoginFormBox = ({ onRequireReset, onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, googleLogin } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [inactiveData, setInactiveData] = useState(null);
    const [googleLoading, setGoogleLoading] = useState(false);
    const googleWrapperRef = useRef(null);
    const googleCallbackRef = useRef(null);

    googleCallbackRef.current = async (response) => {
        setError('');
        setGoogleLoading(true);
        try {
            const result = await googleLogin(response.credential);
            if (onLoginSuccess) {
                onLoginSuccess(result);
            } else {
                if (result.userType === 'CLIENT') {
                    navigate('/portal/profile');
                } else {
                    navigate('/');
                }
            }
        } catch (err) {
            if (err.notFound && err.email) {
                // Si la cuenta no existe en BD, redirigir directo al formulario registro
                navigate('/register', { state: { prefilledEmail: err.email } });
            } else {
                setError(err.message || 'Error al iniciar sesión con Google.');
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    const googleRenderedRef = useRef(false);

    useEffect(() => {
        let isMounted = true;

        const renderBtn = () => {
            if (isMounted && window.google && googleWrapperRef.current && !googleRenderedRef.current) {
                // Forzar limpieza dura a nivel de DOM antes de que Google toque la caja
                if (googleWrapperRef.current) {
                    googleWrapperRef.current.innerHTML = '';
                }
                
                try {
                    // Inicializamos GSI globalmente para evitar duplicados en el SDK
                    if (!window.__gsi_initialized) {
                        window.google.accounts.id.initialize({
                            client_id: GOOGLE_CLIENT_ID,
                            callback: (resp) => {
                                // Llamamos directamente a la función de login del contexto window si es necesario, 
                                // pero el ref funciona siempre y cuando mantengamos la referencia vigente.
                                window.__gsi_callback?.(resp);
                            },
                        });
                        window.__gsi_initialized = true;
                    }

                    // Actualizamos el callback global para que siempre apunte al componente montado actualmente
                    window.__gsi_callback = (resp) => googleCallbackRef.current?.(resp);

                    // Calculamos el ancho disponible dinámicamente
                    let btnWidth = 300;
                    if (window.innerWidth < 380) {
                        btnWidth = 240;
                    } else if (window.innerWidth < 440) {
                        btnWidth = 280;
                    }

                    window.google.accounts.id.renderButton(googleWrapperRef.current, {
                        type: 'standard',
                        theme: 'filled_black',
                        size: 'large',
                        text: 'signin_with',
                        shape: 'pill',
                        width: btnWidth,
                        logo_alignment: 'left',
                    });
                } catch (e) { }
            }
        };

        if (window.google) {
            renderBtn();
        } else {
            const existingScript = document.getElementById('gsi-client-script');
            if (existingScript) {
                existingScript.addEventListener('load', renderBtn);
            } else {
                const script = document.createElement('script');
                script.id = 'gsi-client-script';
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = renderBtn;
                document.body.appendChild(script);
            }
        }

        return () => {
            isMounted = false;
            const existingScript = document.getElementById('gsi-client-script');
            if (existingScript) {
                existingScript.removeEventListener('load', renderBtn);
            }
        };
    }, []);

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

            console.log('🔍 LOGIN RESULT:', JSON.stringify(result));

            // Si el cliente necesita cambiar su contraseña, SIEMPRE bloqueamos aquí
            if (result.userType === 'CLIENT' && result.requireReset) {
                if (onRequireReset) {
                    onRequireReset(result);
                } else {
                    // Estamos en la página /login standalone — activamos la pantalla de reset directamente
                    window.location.href = '/login?reset=true';
                }
                return;
            }

            if (onLoginSuccess) {
                onLoginSuccess(result);
            } else {
                if (result.userType === 'CLIENT') {
                    const params = new URLSearchParams(window.location.search);
                    const redirect = params.get('redirect');
                    navigate(redirect || '/portal/profile');
                } else {
                    navigate('/');
                }
            }
        } catch (err) {
            if (err.accountInactive) {
                setInactiveData({
                    identifier: err.identifier || username,
                    maskedEmail: err.maskedEmail || ''
                });
                return;
            }
            setError(err.message || 'Credenciales inválidas. Por favor, intentá de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full overflow-hidden">
            {/* INACTIVE FORM */}
            <InactiveAccountBox 
                identifier={inactiveData ? inactiveData.identifier : ''} 
                maskedEmail={inactiveData ? inactiveData.maskedEmail : ''} 
                onBack={() => setInactiveData(null)} 
                isVisible={!!inactiveData}
            />

            {/* LOGIN FORM AND GOOGLE BOX */}
            <div className={`w-full transition-opacity duration-300 ease-in-out ${!inactiveData ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 pointer-events-none -z-10'}`}>
                <div className="pt-8 px-6 sm:px-10 md:px-8 pb-10 md:pb-8 w-full">
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-black text-white tracking-tight">Bienvenido de vuelta</h2>
                        <p className="text-sm font-medium text-zinc-400 mt-1">Ingresá para acceder a tu producción.</p>
                    </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 md:gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-100 uppercase tracking-wider ml-1">Usuario</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-cyan group-focus-within:text-custom-cyan transition-colors">
                            <User size={18} />
                        </div>
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2.5 md:py-2 bg-[#111] border border-[#3f3f46] rounded-[10px] focus:ring-1 focus:ring-[#00AEEF] focus:border-[#00AEEF] transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 md:text-sm"
                            placeholder="ID de Cliente"
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
                            className="w-full pl-10 pr-10 py-2.5 md:py-2 bg-[#111] border border-[#3f3f46] rounded-[10px] focus:ring-1 focus:ring-[#00AEEF] focus:border-[#00AEEF] transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 md:text-sm"
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-magenta hover:text-custom-magenta cursor-pointer"
                            aria-label="Mostrar u ocultar contraseña"
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
                    className="w-full py-[14px] px-4 bg-[#00AEEF]/[0.08] border border-[#00AEEF]/30 hover:bg-[#00AEEF]/20 text-[#00AEEF] rounded-xl font-bold active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2 text-[15px] !shadow-none"
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

            <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-zinc-100"></div>
                <span className="text-xs font-bold text-zinc-300 uppercase">o</span>
                <div className="flex-1 h-px bg-zinc-100"></div>
            </div>

                {/* Fijamos matemáticamente la caja a 40px (altura exacta del size="large" de GSI) con overflow-hidden para amputar cualquier sombra, rebote, o línea blanca muerta del iframe */}
                <div className="flex justify-center h-[40px] overflow-hidden w-full" ref={googleWrapperRef}></div>
                </div>
            </div>
        </div>
    );
};

const LoginPage = () => {
    const navigate = useNavigate();
    const [requireReset, setRequireReset] = useState(false);
    const [resetToken, setResetToken] = useState(null);
    // Capturamos redirect al montar — antes de que el auth state lo pise
    const [postLoginRedirect] = useState(() => new URLSearchParams(window.location.search).get('redirect'));

    const handleRequireReset = (result) => {
        setResetToken(localStorage.getItem('auth_token'));
        setRequireReset(true);
    };

    // Override global body overflow:hidden for this page
    useEffect(() => {
        document.body.style.overflow = 'auto';
        
        const params = new URLSearchParams(window.location.search);

        // Check if we came from a redirect that requires reset
        if (params.get('reset') === 'true') {
            const token = sessionStorage.getItem('reset_token') || localStorage.getItem('auth_token');
            setResetToken(token);
            setRequireReset(true);
        }

        return () => { document.body.style.overflow = 'hidden'; };
    }, []);

    // --- FORCED PASSWORD RESET SCREEN ---
    if (requireReset) {
        return <ResetPasswordScreen token={resetToken} onSuccess={() => {
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_session');
            sessionStorage.removeItem('reset_token');
            window.location.href = '/login';
        }} />;
    }

    return (
        <div className="flex flex-col min-h-[100dvh] bg-[#19181B] relative overflow-x-hidden font-sans pt-[85px] pb-[85px]">
            <LandingNavbar />
            <ParticlesCanvas />
            
            <div className="flex-1 flex items-center justify-center p-4 z-10 relative w-full">
                <div className="relative w-full max-w-md md:max-w-sm z-10 md:rounded-3xl md:p-[2px] md:bg-gradient-to-br md:from-[#00AEEF] md:via-[#EC008C] md:to-[#FFF200]">
                    {/* Aqui inyectamos el componente extraido */}
                    <div className="bg-custom-dark md:rounded-[22px] overflow-hidden">
                        <LoginFormBox 
                          onRequireReset={handleRequireReset}
                          onLoginSuccess={(result) => {
                            if (result.userType === 'CLIENT') {
                              navigate(postLoginRedirect || '/portal/profile');
                            } else {
                              navigate('/');
                            }
                          }}
                        />
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 flex h-2 md:hidden z-50">
                <div className="flex-1 bg-custom-cyan" />
                <div className="flex-1 bg-custom-magenta" />
                <div className="flex-1 bg-custom-yellow" />
                <div className="flex-1 bg-white" />
            </div>
        </div>
    );
};

export default LoginPage;
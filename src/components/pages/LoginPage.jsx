import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../ui/Button.jsx';
import { User, Lock, Eye, EyeOff, AlertCircle, LogIn, KeyRound } from 'lucide-react';
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

// --- LOGIN FORM EXTRACTED PARA REUTILIZAR EN MODAL ---
export const LoginFormBox = ({ onRequireReset, onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, googleLogin } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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
                    navigate('/portal');
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
                    navigate('/portal');
                } else {
                    navigate('/');
                }
            }
        } catch (err) {
            if (err.accountInactive) {
                const isMobile = window.innerWidth < 768;
                const identifier = err.identifier || username;
                const maskedEmail = err.maskedEmail || '';

                const showInactiveModal = async (errorMsg = '') => {
                    // Inyectar estilo UNA VEZ antes de abrir el modal
                    if (!document.getElementById('swal-inactive-style')) {
                        const s = document.createElement('style');
                        s.id = 'swal-inactive-style';
                        s.textContent = `.swal-inactive .swal2-validation-message{background:transparent!important;border:none!important;color:#ec008c!important;font-size:12px!important;font-weight:700!important;} .swal-inactive .swal2-validation-message::before{display:none!important;}`;
                        document.head.appendChild(s);
                    }

                    const result = await Swal.fire({
                        title: 'Cuenta sin activar',
                        html: `
                            <p style="color:#a1a1aa;font-size:14px;margin-bottom:8px;line-height:1.6">
                                Tu cuenta aún no fue activada.<br/>
                                ${maskedEmail ? `Correo registrado: <strong style="color:#f4f4f5">${maskedEmail}</strong>` : ''}
                            </p>
                            <p style="color:#71717a;font-size:13px;margin-bottom:14px">Ingresá tu correo para reenviar el link de activación:</p>
                            ${errorMsg ? `<p style="color:#ec008c;font-size:12px;font-weight:700;margin-bottom:10px">${errorMsg}</p>` : ''}
                            <input id="swal-email-input" type="email" placeholder="tu@correo.com"
                                style="width:100%;padding:10px 14px;background:#111;border:1px solid #3f3f46;border-radius:10px;color:#f4f4f5;font-size:14px;font-weight:600;outline:none;box-sizing:border-box"
                            />
                        `,
                        confirmButtonText: 'Reenviar activación',
                        showCancelButton: true,
                        cancelButtonText: 'Cancelar',
                        background: isMobile ? '#19181B' : 'linear-gradient(#19181B, #19181B) padding-box, linear-gradient(to bottom right, #00AEEF, #EC008C, #FFF200) border-box',
                        color: '#f4f4f5',
                        width: isMobile ? '100vw' : '420px',
                        customClass: { popup: isMobile ? 'swal-mobile-full swal-inactive' : 'swal-inactive' },
                        didOpen: () => {
                            const popup = Swal.getPopup();
                            if (isMobile) {
                                popup.style.borderRadius = '0';
                                popup.style.margin = '0';
                                popup.style.position = 'fixed';
                                popup.style.inset = '0';
                                popup.style.width = '100vw';
                                popup.style.maxWidth = '100vw';
                                popup.style.height = '100dvh';
                                popup.style.display = 'flex';
                                popup.style.flexDirection = 'column';
                                popup.style.justifyContent = 'center';
                            } else {
                                popup.style.border = '2px solid transparent';
                                popup.style.borderRadius = '24px';
                                popup.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.7)';
                            }
                            const confirmBtn = Swal.getConfirmButton();
                            if (confirmBtn) {
                                confirmBtn.style.cssText = 'background:transparent;color:#f4f4f5;border:1px solid rgba(0,174,239,0.4);border-radius:10px;padding:10px 20px;font-weight:700;font-size:13px;cursor:pointer;transition:all 0.2s';
                            }
                            const cancelBtn = Swal.getCancelButton();
                            if (cancelBtn) {
                                cancelBtn.style.cssText = 'background:transparent;color:#71717a;border:1px solid #3f3f46;border-radius:10px;padding:10px 20px;font-weight:600;font-size:13px;cursor:pointer';
                            }
                            document.getElementById('swal-email-input')?.focus();
                        },
                        preConfirm: async () => {
                            const val = document.getElementById('swal-email-input')?.value?.trim();
                            if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                                Swal.showValidationMessage('Ingresá un correo válido.');
                                return false;
                            }
                            try {
                                const res = await fetch(`${API_URL}/web-auth/resend-activation`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ identifier, email: val })
                                });
                                const data = await res.json();
                                if (!data.success) {
                                    Swal.showValidationMessage(data.message || 'El correo no coincide. Intentá de nuevo.');
                                    return false;
                                }
                                return true;
                            } catch {
                                Swal.showValidationMessage('Error de conexión. Intentá de nuevo.');
                                return false;
                            }
                        }
                    });

                    if (result.isConfirmed) {
                        Swal.fire({
                            title: '¡Correo enviado!',
                            text: 'Revisá tu bandeja de entrada y hacé clic en el link de activación.',
                            icon: 'success',
                            background: isMobile ? '#19181B' : 'linear-gradient(#19181B, #19181B) padding-box, linear-gradient(to bottom right, #00AEEF, #EC008C, #FFF200) border-box',
                            color: '#f4f4f5',
                            confirmButtonText: 'Ok',
                            width: isMobile ? '100vw' : undefined,
                            customClass: { popup: isMobile ? 'swal-mobile-full' : '' },
                            didOpen: () => {
                                const popup = Swal.getPopup();
                                if (isMobile) {
                                    popup.style.background = '#19181B';
                                    popup.style.borderRadius = '0';
                                    popup.style.margin = '0';
                                    popup.style.position = 'fixed';
                                    popup.style.inset = '0';
                                    popup.style.width = '100vw';
                                    popup.style.maxWidth = '100vw';
                                    popup.style.height = '100dvh';
                                    popup.style.display = 'flex';
                                    popup.style.flexDirection = 'column';
                                    popup.style.justifyContent = 'center';
                                } else {
                                    popup.style.border = '2px solid transparent';
                                    popup.style.borderRadius = '20px';
                                    popup.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.7)';
                                }
                                const btn = Swal.getConfirmButton();
                                if (btn) btn.style.cssText = 'background:#00AEEF;color:#fff;border:none;border-radius:10px;padding:10px 24px;font-weight:700;cursor:pointer;width:100%';
                            }
                        });
                    }
                };

                showInactiveModal();
                return;
            }
            setError(err.message || 'Credenciales inválidas. Por favor, intentá de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative pt-8 px-6 sm:px-10 md:px-8 pb-10 md:pb-8 w-full">
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
                            className="w-full pl-10 pr-4 py-2.5 md:py-2 bg-brand-dark border border-brand-cyan rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan focus:bg-brand-dark transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 md:text-sm"
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
                            className="w-full pl-10 pr-10 py-2.5 md:py-2 bg-brand-dark border border-brand-magenta rounded-xl focus:ring-1 focus:ring-custom-magenta focus:border-custom-magenta focus:bg-brand-dark transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 md:text-sm"
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
                    className="w-full py-2.5 md:py-2 bg-brand-cyan hover:bg-custom-cyan text-zinc-100 rounded-xl font-bold shadow-lg shadow-zinc-900 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2 md:text-sm"
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
    );
};

const LoginPage = () => {
    const navigate = useNavigate();
    const [requireReset, setRequireReset] = useState(false);
    const [resetToken, setResetToken] = useState(null);

    const handleRequireReset = (result) => {
        setResetToken(localStorage.getItem('auth_token'));
        setRequireReset(true);
    };

    // Override global body overflow:hidden for this page
    useEffect(() => {
        document.body.style.overflow = 'auto';
        
        // Check if we came from a redirect that requires reset
        const params = new URLSearchParams(window.location.search);
        if (params.get('reset') === 'true') {
            // El guard del portal guarda el token en sessionStorage antes de limpiar localStorage
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
        <div className="flex flex-col min-h-screen bg-custom-dark relative overflow-x-hidden font-sans pt-[70px]">
            {/* <LandingNavbar /> */}
            <ParticlesCanvas />
            
            <div className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-70px-100px)] z-10 w-full">
                <div className="relative w-full max-w-md md:max-w-sm z-10 md:rounded-3xl md:p-[2px] md:bg-gradient-to-br md:from-[#00AEEF] md:via-[#EC008C] md:to-[#FFF200]">
                    {/* Aqui inyectamos el componente extraido */}
                    <div className="bg-custom-dark md:rounded-[22px] overflow-hidden">
                        <LoginFormBox onRequireReset={handleRequireReset} />
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
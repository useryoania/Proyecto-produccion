import { useState } from 'react';
import { Mail, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { API_URL } from '../../services/apiClient';
import LandingNavbar from '../shared/LandingNavbar.jsx';
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

        if (!email.trim()) { setError('Por favor, ingresá tu email.'); return; }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) { setError('Formato de email inválido.'); return; }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/web-auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setSuccess('Si el email está registrado, recibirás un enlace de recuperación. Revisá tu bandeja de entrada.');
            } else {
                setError(data.message || 'No se pudo procesar la solicitud.');
            }
        } catch {
            setError('Error de conexión. Intentá de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-custom-dark relative overflow-x-hidden font-sans pt-[85px] pb-[85px]">
            <LandingNavbar />
            <ParticlesCanvas />

            <div className="flex-1 flex items-center justify-center p-4 z-10 w-full">
                <div
                    className="forgot-card"
                    style={{ width: '100%', maxWidth: 420, padding: '32px 28px' }}
                >
                    {/* Header */}
                    <h2 style={{ color: '#f4f4f5', fontWeight: 800, fontSize: 22, margin: '0 0 8px', textAlign: 'center' }}>
                        Recuperar contraseña
                    </h2>
                    <p style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 1.6, margin: '0 0 6px', textAlign: 'center' }}>
                        Ingresá el email de tu cuenta.
                    </p>
                    <p style={{ color: '#71717a', fontSize: 13, margin: '0 0 20px', textAlign: 'center' }}>
                        Te enviaremos un link para restablecer tu contraseña.
                    </p>

                    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Input email */}
                        <input
                            type="email"
                            placeholder="tu@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoFocus
                            style={{
                                width: '100%', padding: '10px 14px',
                                background: '#111', border: '1px solid #3f3f46',
                                borderRadius: 10, color: '#f4f4f5',
                                fontSize: 14, fontWeight: 600, outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={e => e.target.style.borderColor = '#00AEEF'}
                            onBlur={e => e.target.style.borderColor = '#3f3f46'}
                        />

                        {/* Error */}
                        {error && (
                            <div style={{ color: '#ec008c', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlertCircle size={13} /> {error}
                            </div>
                        )}

                        {success && (
                            <div style={{ color: '#34d399', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.5 }}>
                                <CheckCircle2 size={13} style={{ marginTop: 1, flexShrink: 0 }} /> {success}
                            </div>
                        )}

                        {/* Botón enviar */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                background: 'transparent', color: '#f4f4f5',
                                border: '1px solid rgba(0,174,239,0.4)',
                                borderRadius: 10, padding: '10px 20px',
                                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                                transition: 'all 0.2s', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', gap: 8,
                                opacity: isLoading ? 0.6 : 1,
                                marginTop: 4,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,174,239,0.07)'; e.currentTarget.style.borderColor = '#00AEEF'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(0,174,239,0.4)'; }}
                        >
                            {isLoading
                                ? <span style={{ width: 18, height: 18, border: '2px solid #00AEEF', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                                : <><Send size={14} /> Enviar enlace</>
                            }
                        </button>

                        {/* Volver */}
                        <button
                            type="button"
                            onClick={() => window.location.href = '/login'}
                            style={{
                                background: 'transparent', color: '#71717a',
                                border: '1px solid #3f3f46', borderRadius: 10,
                                padding: '10px 20px', fontWeight: 600, fontSize: 13,
                                cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.borderColor = '#52525b'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#71717a'; e.currentTarget.style.borderColor = '#3f3f46'; }}
                        >
                            ← Volver al login
                        </button>
                    </form>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .forgot-card {
                    background: #19181B;
                    border: none;
                    border-radius: 16px;
                }
                @media (min-width: 768px) {
                    .forgot-card {
                        background: linear-gradient(#19181B, #19181B) padding-box, linear-gradient(to bottom right, #00AEEF, #EC008C, #FFF200) border-box;
                        border: 2px solid transparent;
                        border-radius: 24px;
                        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
                    }
                }
            `}</style>

            {/* Barra inferior mobile */}
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

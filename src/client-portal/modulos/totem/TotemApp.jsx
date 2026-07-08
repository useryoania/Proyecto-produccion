import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { TotemDashboard } from './TotemDashboard';
import { ShieldX } from 'lucide-react';
import { Logo } from '../../../components/Logo'
import ParticlesCanvas from '../../../components/ui/ParticlesCanvas';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes

export const TotemApp = () => {
    const [screen, setScreen] = useState('loading'); // loading | welcome | dashboard | blocked
    const [sessionKey, setSessionKey] = useState(0);
    const timeoutRef = useRef(null);

    // Verify IP on mount
    useEffect(() => {
        const verify = async () => {
            try {
                const res = await fetch(`${API_BASE}/web-orders/totem-verify`);
                const data = await res.json();
                if (data.authorized) {
                    setScreen('welcome');
                } else {
                    setScreen('blocked');
                }
            } catch {
                // If verification fails (e.g. dev mode, no backend), allow access
                setScreen('welcome');
            }
        };
        verify();
    }, []);

    const handleLogout = useCallback(() => {
        setScreen('welcome');
        setSessionKey(k => k + 1);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    const resetTimer = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (screen === 'dashboard') {
            timeoutRef.current = setTimeout(() => {
                handleLogout();
            }, INACTIVITY_TIMEOUT);
        }
    }, [screen, handleLogout]);

    useEffect(() => {
        const events = ['touchstart', 'mousedown', 'keydown', 'scroll'];
        const handler = () => resetTimer();
        events.forEach(e => window.addEventListener(e, handler, { passive: true }));
        resetTimer();
        return () => {
            events.forEach(e => window.removeEventListener(e, handler));
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [resetTimer]);

    // ── Escape del kiosco (staff) ─────────────────────────────────────────────
    // 5 toques rápidos en la esquina superior izquierda → PIN → sale de pantalla
    // completa (exitFullscreen) e intenta cerrar la pestaña (best-effort). Oculto
    // para que un cliente no lo dispare de casualidad. PIN configurable por env.
    const EXIT_PIN = import.meta.env.VITE_TOTEM_EXIT_PIN || '2580';
    const escTapsRef = useRef([]);
    const handleEscapeTap = useCallback(async () => {
        const now = Date.now();
        escTapsRef.current = [...escTapsRef.current.filter(t => now - t < 2000), now];
        if (escTapsRef.current.length < 5) return;
        escTapsRef.current = [];
        const { value } = await Swal.fire({
            title: 'Salir del tótem',
            text: 'Ingresá el PIN para salir de pantalla completa.',
            input: 'password',
            inputAttributes: { inputmode: 'numeric', maxlength: 8, autocomplete: 'off' },
            inputPlaceholder: 'PIN',
            showCancelButton: true,
            confirmButtonText: 'Salir',
            cancelButtonText: 'Cancelar',
            background: '#212121',
            color: '#f4f4f5',
            confirmButtonColor: '#ef4444',
        });
        if (value === EXIT_PIN) {
            try { await document.exitFullscreen?.(); } catch { /* noop */ }
            try { window.close(); } catch { /* solo cierra si la abrió un script */ }
        } else if (value) {
            Swal.fire({ icon: 'error', title: 'PIN incorrecto', timer: 1500, showConfirmButton: false, background: '#212121', color: '#f4f4f5' });
        }
    }, [EXIT_PIN]);

    // Zona invisible en la esquina sup-izq (siempre por encima de todo).
    const escapeHotspot = (
        <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={handleEscapeTap}
            className="fixed top-0 left-0 w-16 h-16 z-[99999] opacity-0"
        />
    );

    // Blocked screen
    if (screen === 'blocked') {
        return (
            <div className="min-h-screen bg-custom-dark flex items-center justify-center">
                {escapeHotspot}
                <div className="text-center flex flex-col items-center gap-4">
                    <ShieldX size={64} strokeWidth={1.5} className="text-red-400" />
                    <h1 className="text-3xl font-bold text-white">Acceso no autorizado</h1>
                    <p className="text-white/40 text-lg">Este tótem no está habilitado desde esta ubicación.</p>
                </div>
            </div>
        );
    }

    // Loading screen
    if (screen === 'loading') {
        return (
            <div className="min-h-screen bg-custom-dark flex items-center justify-center">
                {escapeHotspot}
                <div className="text-white/30 text-xl animate-pulse">Verificando acceso...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-custom-dark text-gray-100 font-sans select-none relative overflow-hidden">
            {escapeHotspot}

            {/* Dashboard always behind */}
            {screen === 'dashboard' && (
                <TotemDashboard key={sessionKey} onLogout={handleLogout} />
            )}

            {/* Welcome curtain */}
            <AnimatePresence>
                {screen === 'welcome' && (
                    <motion.div
                        key="welcome"
                        initial={{ y: '-100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '-100%' }}
                        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute inset-0 z-10 flex items-center justify-center bg-custom-dark cursor-pointer"
                        onClick={() => {
                            document.documentElement.requestFullscreen?.().catch(() => { });
                            setScreen('dashboard');
                        }}
                    >
                        <ParticlesCanvas />
                        <div className="flex flex-col items-center justify-between min-h-screen pt-16 pb-6">
                            {/* Logo top */}
                            <Logo className="h-50 mt-[10vh] text-white" />

                            {/* Circle center */}
                            <div className="w-20 h-20 rounded-full border-2 border-white/60 animate-ping" />

                            {/* Text bottom */}
                            <div className="text-center flex flex-col items-center gap-2 mb-10">
                                <h1 className="text-5xl md:text-6xl font-extrabold text-white">
                                    Bienvenido
                                </h1>
                                <p className="text-xl text-white/60 animate-pulse">
                                    Tocá la pantalla para continuar
                                </p>
                            </div>
                        </div>

                        {/* CMYK color bar — full width, bottom */}
                        <div className="absolute bottom-0 left-0 right-0 flex h-2">
                            <div className="flex-1 bg-custom-cyan" />
                            <div className="flex-1 bg-custom-magenta" />
                            <div className="flex-1 bg-custom-yellow" />
                            <div className="flex-1 bg-white" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

import React from 'react';
import { recargarLimpio } from '../../utils/hardReload';

// Errores típicos de carga de un chunk dinámico que ya no existe en el server
// (caso esperado cuando un cliente viejo intenta cargar tras un deploy nuevo).
const CHUNK_ERR = /Loading chunk|Loading CSS chunk|dynamically imported module|Failed to fetch dynamically imported|Importing a module script failed/i;

const RELOAD_KEY = 'chunk_reload_ts';
const RELOAD_WINDOW = 20000; // 20s: si ya recargamos hace menos, no volver a hacerlo (anti-loop)

/**
 * Atrapa errores de render — en particular los ChunkLoadError que aparecen
 * tras un deploy. Ante un chunk error recarga limpio UNA sola vez; si vuelve a
 * fallar (o es otro tipo de error) muestra una UI de reintento en vez de dejar
 * una pantalla negra muerta.
 */
class ChunkErrorBoundary extends React.Component {
    state = { hasError: false, showRetry: false };

    static getDerivedStateFromError() {
        // Renderizar fallback (no los children que acaban de tirar) para no loopear el render.
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        const msg = (error && error.message) || String(error || '');

        if (CHUNK_ERR.test(msg) && !this.recargoReciente()) {
            // Chunk viejo/muerto tras deploy → recarga limpia automática, una vez.
            this.marcarRecarga();
            recargarLimpio(); // la página se recarga; mientras tanto el render muestra el spinner
            return;
        }

        // Otro error, o ya recargamos recién (no loopear) → ofrecer reintento manual.
        console.error('[ChunkErrorBoundary]', error, info);
        this.setState({ showRetry: true });
    }

    recargoReciente() {
        try {
            const ts = parseInt(sessionStorage.getItem(RELOAD_KEY) || '0', 10);
            return Date.now() - ts < RELOAD_WINDOW;
        } catch {
            return false;
        }
    }

    marcarRecarga() {
        try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* ignore */ }
    }

    render() {
        if (this.state.hasError) {
            if (this.state.showRetry) {
                return (
                    <div style={{
                        minHeight: '100vh', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '18px',
                        background: '#0d0d0d', color: '#e0e0e0', padding: '24px',
                        textAlign: 'center', fontFamily: "'Inter', 'Segoe UI', sans-serif"
                    }}>
                        <div style={{ fontSize: '15px', color: '#aaa' }}>
                            No se pudo cargar la aplicación.
                        </div>
                        <button
                            onClick={() => recargarLimpio()}
                            style={{
                                background: '#00d4ff', color: '#0d0d0d', border: 'none',
                                borderRadius: '8px', padding: '10px 24px', fontSize: '14px',
                                fontWeight: 700, cursor: 'pointer'
                            }}
                        >
                            Reintentar
                        </button>
                    </div>
                );
            }
            // Chunk error en proceso de auto-recarga: spinner oscuro, no pantalla negra muerta.
            return <FallbackSpinner />;
        }
        return this.props.children;
    }
}

export function FallbackSpinner() {
    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: '#0d0d0d'
        }}>
            <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                border: '3px solid #1f1f1f', borderTopColor: '#00d4ff',
                animation: 'ceb-spin 0.8s linear infinite'
            }} />
            <style>{`@keyframes ceb-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

export default ChunkErrorBoundary;

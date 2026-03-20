/**
 * Global frontend error reporter.
 * Captures unhandled errors and sends them to /api/client-error.
 * Import once in main.jsx or App.jsx.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function reportError(data) {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        navigator.sendBeacon?.(`${API_BASE}/client-error`, new Blob([JSON.stringify({
            ...data,
            userId: user?.userId || user?.id || null,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
        })], { type: 'application/json' }));
    } catch (e) { /* silently fail */ }
}

// Capture unhandled JS errors
window.addEventListener('error', (event) => {
    reportError({
        message: event.message,
        stack: event.error?.stack || '',
        source: `${event.filename}:${event.lineno}:${event.colno}`,
    });
});

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    reportError({
        message: `Unhandled Promise: ${event.reason?.message || String(event.reason)}`,
        stack: event.reason?.stack || '',
    });
});

export default reportError;

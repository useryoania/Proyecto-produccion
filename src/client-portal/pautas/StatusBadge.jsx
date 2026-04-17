import React from 'react';

export const StatusBadge = ({ status, className = '' }) => {
    const getStatusConfig = (s) => {
        const normalizedStatus = s?.toLowerCase() || '';
        
        if (normalizedStatus.includes('entregado') || normalizedStatus.includes('finalizado') || normalizedStatus.includes('completado')) {
            return {
                dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
                text: 'text-emerald-400',
                pulse: true
            };
        }
        
        if (normalizedStatus.includes('pendiente') || normalizedStatus.includes('espera')) {
            return {
                dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
                text: 'text-amber-400',
                pulse: true
            };
        }

        if (normalizedStatus.includes('proceso') || normalizedStatus.includes('produccion') || normalizedStatus.includes('avisado')) {
            return {
                dot: 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]',
                text: 'text-sky-400',
                pulse: true
            };
        }

        if (normalizedStatus.includes('cancelado') || normalizedStatus.includes('eliminado')) {
            return {
                dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
                text: 'text-rose-400',
                pulse: false
            };
        }

        return {
            dot: 'bg-zinc-500 shadow-[0_0_8px_rgba(113,113,122,0.4)]',
            text: 'text-zinc-400',
            pulse: false
        };
    };

    const config = getStatusConfig(status);

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/5 ${className}`}>
            <div className={`w-2 h-2 rounded-full ${config.dot} ${config.pulse ? 'animate-pulse' : ''}`} />
            <span className={`text-[10px] uppercase font-bold tracking-widest ${config.text}`}>
                {status}
            </span>
        </div>
    );
};


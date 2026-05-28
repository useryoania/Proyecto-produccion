import React from 'react';
import { Scissors } from 'lucide-react';

export const CosturaTechnicalUI = ({ isCorteActive, costuraNote, setCosturaNote, compact = false }) => (
    <div className={`animate-in slide-in-from-top duration-500 ${compact ? 'mb-4' : 'mb-12'}`}>
        <div className={`${compact ? 'bg-zinc-900/40 p-6' : 'bg-zinc-900/60 p-8'} rounded-[2rem] border border-zinc-700/50 relative`}>
            <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-gold">
                <Scissors size={compact ? 60 : 120} />
            </div>

            <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 bg-brand-gold text-zinc-900 text-[10px] font-black rounded-lg">PASO {isCorteActive ? '2' : '1'}</span>
                <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest">Especificaciones de Costura / Confección</h3>
            </div>

            <div className="relative z-10 bg-zinc-800/30 p-5 rounded-2xl border border-zinc-700/50">
                <label className="block text-[10px] uppercase font-black text-zinc-500 mb-3 tracking-widest">Instrucciones Especiales de Costura</label>
                <textarea
                    className="w-full p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl font-bold text-zinc-200 outline-none focus:border-brand-gold transition-all min-h-[120px] text-xs placeholder:text-zinc-600 resize-none"
                    placeholder="Ej: Tipo de hilo, refuerzos, terminaciones específicas..."
                    value={costuraNote || ''}
                    onChange={(e) => setCosturaNote(e.target.value)}
                />
            </div>
        </div>
    </div>
);

export default CosturaTechnicalUI;

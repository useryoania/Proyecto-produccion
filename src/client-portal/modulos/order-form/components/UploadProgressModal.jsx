import React from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, AlertTriangle, Zap } from 'lucide-react';

export const UploadProgressModal = ({ isOpen, progress, isError, onRetry }) => {
    if (!isOpen) return null;
    const percentage = Math.round((progress.current / progress.total) * 100) || 0;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 animate-in fade-in duration-300">
            <div className="bg-zinc-900/90 rounded-[3rem] shadow-2xl p-10 max-w-md w-full mx-4 border border-zinc-700/50 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 animate-gradient-x" />

                <div className="flex flex-col items-center text-center gap-8 relative z-10">
                    {isError ? (
                        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2 border border-red-500/20 shadow-lg shadow-red-500/10 animate-bounce">
                            <AlertTriangle size={48} />
                        </div>
                    ) : (
                        <div className="w-24 h-24 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400 mb-2 border border-cyan-500/20 shadow-lg shadow-cyan-500/10 relative">
                            <UploadCloud size={48} className="animate-pulse" />
                            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10 border-t-cyan-400 animate-spin" />
                        </div>
                    )}

                    <div>
                        <h3 className="text-2xl font-black text-zinc-100 tracking-widest uppercase mb-3">
                            {isError ? '¡Ups! Algo falló' : 'Subiendo Pedido'}
                        </h3>
                        <p className="text-sm text-zinc-400 font-bold leading-relaxed px-4">
                            {isError
                                ? 'Hubo un problema al subir uno de los archivos. No te preocupes, puedes reintentar.'
                                : `Por favor no cierres esta ventana. Estamos enviando ${progress.current} de ${progress.total} archivos a producción.`}
                        </p>
                    </div>

                    {!isError && (
                        <div className="w-full space-y-4">
                            <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                <span>Progreso Total</span>
                                <span className="text-cyan-400">{percentage}%</span>
                            </div>
                            <div className="h-4 bg-zinc-800/50 rounded-full overflow-hidden border border-zinc-700/30">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <div className="bg-zinc-800/40 py-2 px-4 rounded-xl border border-zinc-700/30 overflow-hidden">
                                <p className="text-[10px] text-zinc-500 truncate font-mono uppercase tracking-tighter">
                                    {progress.filename || 'Preparando archivos...'}
                                </p>
                            </div>
                        </div>
                    )}

                    {isError && (
                        <button
                            onClick={onRetry}
                            className="mt-2 w-full py-5 bg-zinc-100 hover:bg-white text-zinc-900 font-black rounded-[2rem] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest"
                        >
                            <Zap size={20} fill="currentColor" />
                            REINTENTAR AHORA
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default UploadProgressModal;

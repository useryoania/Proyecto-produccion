import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export const ErrorModal = ({ isOpen, onClose, message }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 animate-in fade-in duration-200">
            <div className="bg-zinc-900/90 rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full mx-4 border border-zinc-700/50 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                {/* Accent line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500/50" />
                
                <div className="flex flex-col items-center text-center gap-6">
                    <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mb-2 border border-red-500/20 shadow-lg shadow-red-500/10">
                        <AlertTriangle size={36} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-zinc-100 uppercase tracking-widest mb-3">
                            Error de Validación
                        </h3>
                        <p className="text-sm text-zinc-400 font-bold leading-relaxed">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="mt-4 w-full py-4 bg-red-500 hover:bg-red-400 text-zinc-100 font-black rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 uppercase tracking-widest"
                    >
                        ENTENDIDO
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ErrorModal;

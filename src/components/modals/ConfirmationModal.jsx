import React from 'react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", isDestructive = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border-t-4 border-slate-500">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">
                        {isDestructive ? <i className="fa-solid fa-triangle-exclamation text-red-500 mr-2"></i> : <i className="fa-solid fa-circle-question text-blue-500 mr-2"></i>}
                        {title}
                    </h3>
                    <button onClick={onClose}><i className="fa-solid fa-xmark text-slate-400 hover:text-red-500"></i></button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-6 whitespace-pre-line leading-relaxed">
                        {message}
                    </p>
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold text-white shadow-md transition-all transform active:scale-95 ${isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;

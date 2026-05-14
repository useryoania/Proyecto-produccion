const ImportLogModal = ({ isOpen, onClose, logs, isImporting }) => {
    if (!isOpen) return null;

    return (
                        </div>
                    )}
                </div>

                {/* LA CONSOLA ESTILO TERMINAL */}
                <div className="p-6">
                    <div className="bg-zinc-900 rounded-2xl p-6 h-80 overflow-y-auto font-mono text-sm shadow-inner">
                        {logs.map((log, index) => (
                            <div key={index} className="mb-2 flex gap-3 animate-fade-in">
                                <span className="text-zinc-600 shrink-0">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                                <span className={
                                    log.includes('✅') ? 'text-emerald-400' : 
                                    log.includes('❌') ? 'text-red-400' : 
                                    log.includes('📊') ? 'text-sky-400' : 'text-zinc-300'
                                }>
                                    {log}
                                </span>
                            </div>
                        ))}
                        {isImporting && (
                            <div className="text-indigo-400 animate-pulse">_</div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                    <button
                        onClick={onClose}
                        disabled={isImporting}
                        className={`px-8 py-3 rounded-xl font-bold transition-all ${
                            isImporting 
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                        }`}
                    >
                        {isImporting ? 'Procesando datos...' : 'Entendido'}
                    </button>
                </div>
            </div>
        </div>
    );
};

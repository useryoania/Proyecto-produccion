import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { downloadManager } from '../../utils/downloadManager';
import { socket } from '../../services/socketService';

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FloatingDownloadPanel = () => {
    const [state, setState] = useState(downloadManager.state);
    const [speedBytes, setSpeedBytes] = useState(0);
    const [lastBytes, setLastBytes] = useState(0);

    useEffect(() => {
        const unsubscribe = downloadManager.subscribe(setState);
        
        const handleZipProgress = (data) => {
            if (downloadManager.state.phase === 'downloading') {
                downloadManager.updateSubTask(`Empaquetando: ${data.currentFile} de ${data.totalFiles}`);
            }
        };
        
        socket.on('zip:progress', handleZipProgress);
        
        return () => {
            unsubscribe();
            socket.off('zip:progress', handleZipProgress);
        };
    }, []);

    // Calcular velocidad de descarga
    useEffect(() => {
        // También en 'processing': la descarga archivo-por-archivo reporta bytes en esa fase y sin
        // esto la velocidad quedaba siempre en 0.
        if (state.phase !== 'downloading' && state.phase !== 'processing') {
            setSpeedBytes(0);
            setLastBytes(0);
            return;
        }

        const interval = setInterval(() => {
            // Al pasar al archivo siguiente los bytes vuelven a 0 → el delta da negativo: se ignora.
            setSpeedBytes(Math.max(0, state.bytesDownloaded - lastBytes));
            setLastBytes(state.bytesDownloaded);
        }, 1000);

        return () => clearInterval(interval);
    }, [state.phase, state.bytesDownloaded, lastBytes]);

    if (!state.isActive) return null;

    // Calcular porcentaje de descarga
    const unknownTotal = state.phase === 'downloading' && state.totalBytes === 0;
    let percentage = 0;
    if (state.phase === 'downloading' && state.totalBytes > 0) {
        percentage = Math.round((state.bytesDownloaded / state.totalBytes) * 100);
    } else if (state.phase === 'processing' && state.totalFiles > 0) {
        percentage = Math.round((state.currentFile / state.totalFiles) * 100);
    } else if (state.phase === 'done') {
        percentage = 100;
    }

    // Calcular ETA
    let etaSeconds = 0;
    if (state.phase === 'downloading' && speedBytes > 0 && state.totalBytes > 0) {
        const remainingBytes = state.totalBytes - state.bytesDownloaded;
        etaSeconds = Math.max(0, Math.round(remainingBytes / speedBytes));
    }

    const formatSpeed = (bps) => {
        if (bps <= 0) return '';
        if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
        return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
    };

    const formatETA = (seconds) => {
        if (seconds === 0 || !isFinite(seconds)) return '';
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    return createPortal(
        <div className="fixed bottom-6 right-6 z-[9999] w-80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl border border-slate-100 overflow-hidden flex flex-col transition-all duration-300 transform translate-y-0 opacity-100">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {state.phase === 'error' ? (
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                            <i className="fa-solid fa-xmark"></i>
                        </div>
                    ) : state.phase === 'done' ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500">
                            <i className="fa-solid fa-check"></i>
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 animate-pulse">
                            <i className="fa-solid fa-cloud-arrow-down"></i>
                        </div>
                    )}
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 leading-tight">
                            {state.phase === 'error' ? 'Error en la descarga' :
                             state.phase === 'done' ? 'Descarga Completada' :
                             state.taskName || 'Descargando Archivos...'}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-500">
                            {state.subTaskName ? state.subTaskName : (
                             state.phase === 'downloading' ? 'Obteniendo del servidor...' : 
                             state.phase === 'processing' ? 'Guardando en PC...' : 
                             state.phase === 'done' ? 'Listo' : 'Ocurrió un problema')}
                        </p>
                    </div>
                </div>
                <button onClick={() => downloadManager.close()} className="text-slate-400 hover:text-slate-600 transition-colors h-6 w-6 flex justify-center items-center rounded-full hover:bg-slate-200">
                    <i className="fa-solid fa-xmark text-sm"></i>
                </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
                {state.phase === 'error' ? (
                    <p className="text-xs text-red-600 font-medium">{state.errorMsg}</p>
                ) : (
                    <>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            {unknownTotal ? (
                                // Barra indeterminada animada cuando no se conoce el total
                                <div 
                                    className="h-full bg-cyan-500 rounded-full"
                                    style={{
                                        width: '40%',
                                        animation: 'indeterminate-progress 1.5s ease-in-out infinite',
                                    }}
                                />
                            ) : (
                                <div 
                                    className={`h-full transition-all duration-300 ease-out ${state.phase === 'done' ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            )}
                        </div>
                        <style>{`
                            @keyframes indeterminate-progress {
                                0% { transform: translateX(-150%); }
                                100% { transform: translateX(350%); }
                            }
                        `}</style>

                        {/* Details */}
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                            {state.phase === 'downloading' ? (
                                <>
                                    <span>{formatBytes(state.bytesDownloaded)}{state.totalBytes > 0 ? ` / ${formatBytes(state.totalBytes)}` : ' descargados'}</span>
                                    {speedBytes > 0 && <span className="text-cyan-600">{formatSpeed(speedBytes)}</span>}
                                    {etaSeconds > 0 && <span className="text-cyan-600">Faltan {formatETA(etaSeconds)}</span>}
                                </>
                            ) : state.phase === 'processing' ? (
                                <>
                                    <span>Archivo {state.currentFile} de {state.totalFiles}</span>
                                    {/* Bytes del archivo EN CURSO: sin esto, bajando uno pesado el panel
                                        quedaba clavado en "Archivo 3 de 11" y parecía colgado. */}
                                    {state.bytesDownloaded > 0 && (
                                        <span className="text-cyan-600">
                                            {formatBytes(state.bytesDownloaded)}{state.totalBytes > 0 ? ` / ${formatBytes(state.totalBytes)}` : ''}
                                        </span>
                                    )}
                                    {speedBytes > 0 && <span className="text-cyan-600">{formatSpeed(speedBytes)}</span>}
                                    <span>{percentage}%</span>
                                </>
                            ) : state.phase === 'done' ? (
                                <span className="text-emerald-600">Todo guardado correctamente.</span>
                            ) : null}
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

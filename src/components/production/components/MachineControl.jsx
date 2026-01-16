import React, { useState, useEffect } from 'react';
import RollCard from './RollCard';

const MachineControl = ({ machine, onAssign, onToggleStatus, onViewDetails, onUnassign }) => {
    // machine.rolls tiene los rollos asignados
    // machine.status es el estado de la maquina

    // Identificar rollo activo (En maquina)
    const activeRoll = machine.rolls.find(r => r.status && r.status.includes('En maquina'));

    // Estado local para la selección del combo
    // Si hay un rollo activo, el combo se forza a ese rollo
    // Si no, se puede seleccionar libremente de la cola
    const [selectedRollId, setSelectedRollId] = useState('');

    useEffect(() => {
        if (activeRoll) {
            setSelectedRollId(activeRoll.id);
        } else if (machine.rolls.length > 0 && !selectedRollId) {
            // Predeterminar el primero si no hay activo
            setSelectedRollId(machine.rolls[0].id);
        }
    }, [activeRoll, machine.rolls, selectedRollId]);

    const isRunning = !!activeRoll;

    // State for Decision Modal
    const [showFinishModal, setShowFinishModal] = useState(false);

    // Handlers
    const handlePlay = () => {
        if (selectedRollId) onToggleStatus(selectedRollId, 'start');
    };

    const handlePause = () => {
        if (activeRoll) onToggleStatus(activeRoll.id, 'pause');
    };

    const handleStop = () => {
        if (!activeRoll) return;
        setShowFinishModal(true);
    };

    const confirmFinish = (destination) => {
        // destination: 'production' | 'quality'
        if (activeRoll) {
            // Pasamos el destino como tercer argumento (la funcion padre debe soportarlo)
            onToggleStatus(activeRoll.id, 'finish', destination);
        }
        setShowFinishModal(false);
    };

    return (
        <div className={`w-80 min-w-[320px] bg-white rounded-2xl shadow-lg border-t-4 flex flex-col max-h-full transition-colors shrink-0 
            ${isRunning ? 'border-emerald-500' : 'border-slate-400'}`}>

            {/* ENCABEZADO DE CONTROL */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 rounded-t-xl flex flex-col gap-2 relative z-10 shadow-sm">

                {/* 1. Nombre y Estado */}
                <div className="flex justify-between items-center">
                    <div className="font-black text-slate-800 text-sm flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isRunning ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                            <i className={`fa-solid ${isRunning ? 'fa-gear fa-spin' : 'fa-print'}`}></i>
                        </div>
                        <span className="truncate max-w-[120px]" title={machine.name}>{machine.name}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isRunning ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {isRunning ? 'PROCESANDO' : machine.status || 'PAUSADO'}
                    </span>
                </div>

                {/* 2. Controles (Play/Pause/Stop/Detail) */}
                <div className="flex items-center gap-1 justify-between bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1">
                        <button onClick={handlePlay} disabled={isRunning || !selectedRollId}
                            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${isRunning || !selectedRollId ? 'text-slate-300 cursor-not-allowed' : 'text-emerald-600 hover:bg-emerald-50 hover:scale-110 active:scale-95'}`} title="Iniciar">
                            <i className="fa-solid fa-play"></i>
                        </button>
                        <button onClick={handlePause} disabled={!isRunning}
                            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${!isRunning ? 'text-slate-300 cursor-not-allowed' : 'text-amber-500 hover:bg-amber-50 hover:scale-110 active:scale-95'}`} title="Pausar">
                            <i className="fa-solid fa-pause"></i>
                        </button>
                        <button onClick={handleStop} disabled={!isRunning}
                            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${!isRunning ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 hover:scale-110 active:scale-95'}`} title="Finalizar Lote">
                            <i className="fa-solid fa-flag-checkered"></i>
                        </button>
                    </div>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <button onClick={() => onViewDetails(machine)} className="w-8 h-8 rounded flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-all hover:scale-110" title="Ver Detalles">
                        <i className="fa-solid fa-circle-info"></i>
                    </button>
                </div>

                {/* 3. Selector de Rollo */}
                <div className="relative flex items-center gap-1">
                    <div className="relative flex-1">
                        <select
                            value={selectedRollId}
                            onChange={(e) => setSelectedRollId(e.target.value)}
                            disabled={isRunning}
                            className={`w-full text-[10px] font-bold py-1.5 pl-2 pr-6 rounded border appearance-none outline-none transition-all
                                ${isRunning ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-indigo-600 border-indigo-200 hover:border-indigo-400 cursor-pointer shadow-sm'}`}
                        >
                            <option value="" disabled>Seleccionar Lote...</option>
                            {machine.rolls.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.name || `Lote #${r.id}`} {r.status.includes('En maquina') ? '(Actual)' : ''}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                            <i className="fa-solid fa-sort"></i>
                        </div>
                    </div>

                    {/* Botón EJECT / Desmontar */}
                    {selectedRollId && !isRunning && (
                        <button
                            onClick={() => onUnassign(selectedRollId)}
                            className="w-8 h-[29px] rounded bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-all shadow-sm"
                            title="Desmontar Lote (Volver a Mesa)"
                        >
                            <i className="fa-solid fa-eject text-xs"></i>
                        </button>
                    )}
                </div>

            </div>

            {/* TABLA / LISTA DE ROLLOS (VISIBLE) */}
            <div className="p-3 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 space-y-2">
                {machine.rolls.map((roll, index) => (
                    <RollCard
                        key={roll.id}
                        roll={roll}
                        index={index}
                        isMachineView={true}
                        isSelected={String(roll.id) === String(selectedRollId)}
                        onViewDetails={(r) => onViewDetails(r, machine)} // Pass machine context if needed
                    />
                ))}
                {machine.rolls.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-300 gap-2">
                        <i className="fa-solid fa-power-off text-2xl opacity-20"></i>
                        <span className="text-xs font-medium">Disponible para Asignar</span>
                    </div>
                )}
            </div>

            {/* MODAL DECISION FINALIZAR */}
            {showFinishModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border-t-4 border-blue-500">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 text-center">Finalizar Producción</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-6 text-center">
                                ¿El proceso con este lote ha terminado completamente?
                            </p>

                            <div className="flex flex-col gap-3">
                                {/* OPCIÓN: FINALIZAR Y ENVIAR A CALIDAD */}
                                <button
                                    onClick={() => confirmFinish('quality')}
                                    className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200 hover:scale-[1.02]"
                                >
                                    <i className="fa-solid fa-clipboard-check"></i>
                                    Finalizar y Enviar a Calidad
                                </button>

                                {/* OPCIÓN: SEGUIR EN PROD */}
                                <button
                                    onClick={() => confirmFinish('production')}
                                    className="w-full py-3 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 hover:scale-[1.02]"
                                >
                                    <i className="fa-solid fa-arrow-rotate-right"></i>
                                    Mantener en Producción
                                </button>

                                <button
                                    onClick={() => setShowFinishModal(false)}
                                    className="w-full py-2 px-4 text-slate-400 font-bold hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all mt-2"
                                >
                                    Cancelar
                                </button>
                            </div>

                            {/* ALERT DE INVENTARIO (Solo visual por ahora, redirigimos la lógica al padre si es necesario o implementamos aquí en el futuro) */}
                            {activeRoll?.BobinaID && (
                                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded text-xs text-amber-700">
                                    <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                                    Este lote usa la Bobina #{activeRoll.BobinaID}. Si se agotó, recuerde cerrarla en Inventario.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MachineControl;

import React, { useState, useEffect } from 'react';
import { ordersService, rollsService } from '../../services/api';

const RollAssignmentModal = ({ isOpen, onClose, selectedIds = [], selectedOrders = [], areaCode, onSuccess }) => {

    // States
    const [mode, setMode] = useState('existing'); // 'new' | 'existing'
    const [rollName, setRollName] = useState('');
    const [selectedRollId, setSelectedRollId] = useState('');
    const [activeRolls, setActiveRolls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingRolls, setLoadingRolls] = useState(false);

    // Initial Load
    useEffect(() => {
        if (isOpen && areaCode) {
            setLoadingRolls(true);

            // 1. Fetch Active Rolls
            rollsService.getActiveRolls(areaCode)
                .then(data => {
                    const rollsList = Array.isArray(data) ? data : [];
                    setActiveRolls(rollsList);
                    if (rollsList.length > 0) setSelectedRollId(rollsList[0].id);
                    else setMode('new');
                })
                .catch(err => console.error("Error loading rolls:", err))
                .finally(() => setLoadingRolls(false));

            // 2. Default Name
            setRollName(`Lote ${new Date().toLocaleDateString('es-ES').replace(/\//g, '')}-${new Date().getHours()}${new Date().getMinutes()}`);
        }
    }, [isOpen, areaCode]);

    const handleAssign = async () => {
        if (mode === 'existing' && !selectedRollId) return alert("Selecciona un rollo existente");

        if (mode === 'new') {
            if (!rollName.trim()) return alert("Ingresa un nombre para el nuevo lote");
        }

        setLoading(true);
        try {
            // Prepare Payload
            const payload = {
                orderIds: selectedIds,
                rollId: mode === 'existing' ? selectedRollId : null,
                rollName: mode === 'new' ? rollName : null,
                isNew: mode === 'new',
                areaCode: areaCode,
                capacity: 100 // Default placeholder capacity
            };

            await ordersService.assignRoll(payload);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al asignar rollo: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-t-4 border-emerald-500">

                {/* HEADER */}
                <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                        <i className="fa-solid fa-scroll text-emerald-600"></i> Asignar a Rollo / Lote
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600/60 hover:bg-emerald-100 hover:text-emerald-700 transition-colors">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                {/* CONTENT */}
                <div className="p-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-3 mb-5">
                        <i className="fa-solid fa-circle-info mt-0.5 text-blue-500"></i>
                        <div>
                            Se agruparán <strong className="font-bold text-blue-900">{selectedIds.length} órdenes</strong> seleccionadas.
                        </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
                        <button
                            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${mode === 'existing' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setMode('existing')}
                            disabled={activeRolls.length === 0}
                        >
                            Existente ({activeRolls.length})
                        </button>
                        <button
                            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${mode === 'new' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setMode('new')}
                        >
                            Crear Nuevo
                        </button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            {mode === 'new' ? 'Nombre del Nuevo Lote' : 'Seleccionar Rollo (Por Nombre)'}
                        </label>
                        <div className="relative">
                            <i className={`fa-solid ${mode === 'new' ? 'fa-pen' : 'fa-list'} absolute left-3 top-3 text-slate-400`}></i>

                            {mode === 'new' ? (
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-3 py-2.5 border border-emerald-200 rounded-lg text-lg font-bold text-slate-800 bg-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-300"
                                    value={rollName}
                                    onChange={(e) => setRollName(e.target.value)}
                                    placeholder="Nombre del Lote"
                                    autoFocus
                                />
                            ) : (
                                <div className="relative">
                                    <select
                                        className="w-full pl-9 pr-10 py-2.5 border border-emerald-200 rounded-lg text-sm font-bold text-slate-700 bg-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer"
                                        value={selectedRollId}
                                        onChange={(e) => setSelectedRollId(e.target.value)}
                                        disabled={loadingRolls}
                                    >
                                        {loadingRolls ? (
                                            <option>Cargando rollos...</option>
                                        ) : (
                                            activeRolls.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.nombre} {r.material ? `- ${r.material}` : ''}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                                        <i className="fa-solid fa-chevron-down text-xs"></i>
                                    </div>
                                </div>
                            )}
                        </div>
                        {mode === 'existing' && activeRolls.length === 0 && !loadingRolls && (
                            <p className="text-xs text-red-500 mt-1">No hay rollos activos. Crea uno nuevo.</p>
                        )}
                        {mode === 'new' && (
                            <p className="text-[10px] text-slate-400 mt-1 italic">El ID se generará automáticamente.</p>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold transition-colors">Cancelar</button>
                    <button
                        onClick={handleAssign}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading || (mode === 'new' && !rollName.trim())}
                    >
                        {loading ? 'Procesando...' : <><i className="fa-solid fa-check"></i> Asignar</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RollAssignmentModal;
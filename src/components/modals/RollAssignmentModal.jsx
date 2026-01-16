import React, { useState, useEffect } from 'react';
import { ordersService, rollsService, insumosService } from '../../services/api';

const RollAssignmentModal = ({ isOpen, onClose, selectedIds = [], selectedOrders = [], areaCode, onSuccess }) => {

    // States
    const [mode, setMode] = useState('existing'); // 'new' | 'existing'
    const [rollName, setRollName] = useState('');
    const [selectedRollId, setSelectedRollId] = useState('');
    const [activeRolls, setActiveRolls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingRolls, setLoadingRolls] = useState(false);

    // Inventory States (New Logic)
    const [inventory, setInventory] = useState([]);
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [suggestedBobina, setSuggestedBobina] = useState(null);
    const [useBobina, setUseBobina] = useState(true); // Default true
    const [bobinaError, setBobinaError] = useState(null);

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

            // 3. Load Inventory (for Smart Suggestion)
            loadInventory();
        }
    }, [isOpen, areaCode]);

    const loadInventory = async () => {
        try {
            let queryArea = areaCode;
            // Hack para Sublimacion: Buscar también en General/Insumos por si el Papel está ahí
            if (areaCode && areaCode.toLowerCase().includes('sublima')) {
                queryArea = `${areaCode},General,Insumos,Bodega`;
            }

            const invData = await insumosService.getInventoryByArea(queryArea);
            setInventory(invData || []);
            // Reset selection on open
            setSelectedMaterialId('');
            setSuggestedBobina(null);
            setUseBobina(true);
            setBobinaError(null);
        } catch (e) {
            console.error("Error loading inventory:", e);
        }
    };

    // Auto-Detect Material Effect
    useEffect(() => {
        if (mode === 'new' && inventory.length > 0 && selectedOrders.length > 0 && !selectedMaterialId) {
            const normalize = s => s.toLowerCase().trim();
            const isSublimation = areaCode && normalize(areaCode).includes('sublima');

            if (isSublimation) {
                // For Sublimation, default to "Papel" regardless of Fabric
                const match = inventory.find(i => normalize(i.Nombre).includes('papel'));
                if (match) {
                    console.log("Auto-Detected Sublimation Paper:", match.Nombre);
                    handleMaterialChange(match.InsumoID);
                }
            } else {
                // Get material from first order (assuming homogeneity or taking dominant)
                const matName = selectedOrders[0].material || '';
                if (!matName) return;

                const target = normalize(matName);
                const match = inventory.find(i => normalize(i.Nombre).includes(target) || target.includes(normalize(i.Nombre)));

                if (match) {
                    console.log("Auto-Detected Material:", match.Nombre);
                    handleMaterialChange(match.InsumoID);
                }
            }
        }
    }, [inventory, selectedOrders, mode, selectedMaterialId, areaCode]);

    // Material Selection Handler
    const handleMaterialChange = (insumoId) => {
        setSelectedMaterialId(insumoId);
        setUseBobina(true);
        setSuggestedBobina(null);
        setBobinaError(null);

        if (!insumoId) return;

        const insumo = inventory.find(i => String(i.InsumoID) === String(insumoId));
        if (insumo && insumo.ActiveBatches) {
            // FIFO Logic: Filter by MetrosRestantes > 0, allow 'En Uso'
            const available = insumo.ActiveBatches
                .filter(b => b.MetrosRestantes > 0 && (b.Estado === 'Disponible' || b.Estado === 'En Uso'))
                .sort((a, b) => new Date(a.FechaIngreso) - new Date(b.FechaIngreso));

            if (available.length > 0) {
                setSuggestedBobina({ ...available[0], MaterialName: insumo.Nombre });
                setUseBobina(true);
                // Suggest Name
                const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }).replace('/', '');
                setRollName(`${insumo.Nombre} ${dateStr}`);
            } else {
                setBobinaError("No hay bobinas con capacidad disponible para este material.");
            }
        } else {
            setBobinaError("No hay stock registrado para este material.");
        }
    };

    const handleAssign = async () => {
        if (mode === 'existing' && !selectedRollId) return alert("Selecciona un rollo existente");

        if (mode === 'new') {
            if (!rollName.trim()) return alert("Ingresa un nombre para el nuevo lote");

            // STRICT VALIDATION
            if (!selectedMaterialId) return alert("❌ Debe seleccionar el Material para asignar la bobina.");
            if (bobinaError || !suggestedBobina) return alert("❌ No se puede crear el lote: No hay bobina disponible para el material seleccionado.");
            // Force true for safety
            if (!useBobina) return alert("❌ Debe confirmar el uso de la bobina asignada.");
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
                // Add Bobina properties if creating new
                bobinaId: (mode === 'new' && suggestedBobina) ? suggestedBobina.BobinaID : null,
                capacity: (mode === 'new' && suggestedBobina) ? suggestedBobina.MetrosRestantes : 100
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

                    {/* Create New Roll Sections */}
                    {mode === 'new' && (
                        <div className="flex flex-col gap-3 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                            {/* Material Selector */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between mb-1">
                                    Material (Detectar Bobina)
                                    <i className="fa-solid fa-wand-magic-sparkles text-purple-400"></i>
                                </label>
                                <select
                                    className={`w-full text-xs p-2 border rounded focus:outline-none bg-white transition-colors ${!selectedMaterialId ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-300 focus:border-blue-500'}`}
                                    value={selectedMaterialId}
                                    onChange={(e) => handleMaterialChange(e.target.value)}
                                >
                                    <option value="">-- Seleccionar Material --</option>
                                    {inventory
                                        .filter(i => {
                                            const hasStock = i.ActiveBatches && i.ActiveBatches.some(b => b.MetrosRestantes > 0);
                                            if (!hasStock) return false;

                                            // Filter by Order Material (Strict Match)
                                            // SKIP Strict Match for Sublimation (as Roll Material != Fabric Material)
                                            const normalize = s => s.toLowerCase().trim();
                                            const isSublimation = areaCode && normalize(areaCode).includes('sublima');

                                            if (!isSublimation && selectedOrders.length > 0 && selectedOrders[0].material) {
                                                const orderMat = normalize(selectedOrders[0].material);
                                                const invMat = normalize(i.Nombre);
                                                return invMat.includes(orderMat) || orderMat.includes(invMat);
                                            }
                                            return true;
                                        })
                                        .map(i => {
                                            const totalMetros = i.ActiveBatches.reduce((acc, b) => acc + (b.MetrosRestantes || 0), 0);
                                            return (
                                                <option key={i.InsumoID} value={i.InsumoID}>
                                                    {i.Nombre} ({totalMetros}m disp.)
                                                </option>
                                            );
                                        })}
                                </select>
                            </div>

                            {/* Suggested Bobina Card */}
                            {suggestedBobina && (
                                <div className={`p-2 rounded border transition-all ${useBobina ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-dashed border-slate-300 opacity-70'}`}>
                                    <div className="flex items-start gap-2">
                                        <div className="mt-1">
                                            <i className="fa-solid fa-check-circle text-green-600"></i>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[11px] font-bold text-slate-800">Bobina Asignada: {suggestedBobina.CodigoEtiqueta}</p>
                                            <div className="text-[10px] text-slate-500 mt-0.5 grid grid-cols-2 gap-x-2">
                                                <span>Restan: <strong>{suggestedBobina.MetrosRestantes}m</strong></span>
                                                <span>Ingreso: {new Date(suggestedBobina.FechaIngreso).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {bobinaError && (
                                <div className="p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-600 font-bold flex items-center gap-2">
                                    <i className="fa-solid fa-ban"></i>
                                    {bobinaError}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            {mode === 'new' ? 'Nombre del Nuevo Rollo' : 'Seleccionar Rollo (Por Nombre)'}
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
                        disabled={loading || (mode === 'new' && (bobinaError || !selectedMaterialId))}
                    >
                        {loading ? 'Procesando...' : <><i className="fa-solid fa-check"></i> Asignar</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RollAssignmentModal;
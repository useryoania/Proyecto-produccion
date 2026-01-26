import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productionService } from '../../services/api'; // Adjust path if needed
import RollSplitModal from '../modals/RollSplitModal';
import RollCard from '../production/components/RollCard';
import { toast } from 'sonner';

const MachineDetailView = () => {
    const { machineId } = useParams();
    const navigate = useNavigate();

    // Parse machineId to ensuring we match types (string vs number)
    const targetId = machineId;

    // We likely need the area code. 
    // This is tricky if the URL doesn't have the area code.
    // However, usually we can deduce it or fetch a general board?
    // Actually, productionService.getBoard requires detailed area code?
    // Let's assume we can get it or we might need to pass it in URL.
    // For now, let's try to get it from query param or assume a default if not present,
    // BUT getting Board usually requires an Area.
    // OPTION: Pass area in URL: /machine-detail/:area/:machineId

    // Changing route plan to: /production/machine/:area/:machineId

    const { area } = useParams(); // Note: we should update route to include area
    const [splitModalRoll, setSplitModalRoll] = useState(null);

    const { data: prodData, isLoading, refetch } = useQuery({
        queryKey: ['productionBoard', area],
        queryFn: () => productionService.getBoard(area),
        enabled: !!area,
        refetchInterval: 10000 // Faster refresh for focused view
    });

    const machine = prodData?.machines?.find(m => String(m.id) === String(targetId));

    if (isLoading) return (
        <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-400 gap-3">
            <i className="fa-solid fa-circle-notch fa-spin text-4xl text-blue-500"></i>
            <span className="text-xl font-bold">Cargando Máquina...</span>
        </div>
    );

    if (!machine) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-400">
            <i className="fa-solid fa-server text-6xl mb-4 opacity-30"></i>
            <h2 className="text-2xl font-bold text-slate-600">Máquina No Encontrada</h2>
            <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
                Regresar
            </button>
        </div>
    );

    // LOGIC duplicated from MachineControl but expanded

    const activeRoll = machine.rolls.find(r => r.status && r.status.includes('En maquina'));
    const pendingRolls = machine.rolls.filter(r => r.id !== activeRoll?.id);

    const handleToggleStatus = async (rollId, action, destination) => {
        try {
            await productionService.toggleStatus(rollId, action, destination);
            refetch();
            toast.success("Estado actualizado");
        } catch (error) {
            const msg = error.response?.data?.error || error.message || "Error desconocido";

            if (error.response?.status === 400) {
                console.warn("Accion bloqueada por validación:", msg);
            } else {
                console.error("Error toggling status:", error);
            }
            toast.error(msg);
        }
    };

    const handleUnassign = async (rollId) => {
        if (!window.confirm("¿Desmontar rollo y devolver a mesa de armado?")) return;
        try {
            await productionService.unassignRoll(rollId);
            refetch();
            toast.success("Rollo desmontado");
        } catch (error) {
            console.error("Error unassigning:", error);
            toast.error("Error al desmontar");
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-6 flex flex-col">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                        <i className="fa-solid fa-arrow-left text-xl"></i>
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <i className="fa-solid fa-print text-blue-600"></i>
                            {machine.name}
                        </h1>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${activeRoll ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {activeRoll ? 'EN PRODUCCIÓN' : machine.status || 'DETENIDO'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => refetch()} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold flex items-center gap-2">
                        <i className="fa-solid fa-rotate-right"></i> Actualizar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
                {/* LEFT: ACTIVE JOB & CONTROLS */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-lg border-t-8 border-blue-500 p-6 flex flex-col items-center text-center">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Trabajo Actual</h2>

                        {activeRoll ? (
                            <div className="w-full">
                                <div className="text-5xl font-black text-slate-800 mb-2">
                                    {activeRoll.name || `Lote #${activeRoll.id}`}
                                </div>
                                <div className="text-sm font-medium text-slate-500 mb-8 truncate">
                                    {activeRoll.orders?.[0]?.client || 'Sin Cliente'}
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <button
                                        onClick={() => handleToggleStatus(activeRoll.id, 'pause')}
                                        className="py-4 bg-amber-100 text-amber-600 rounded-xl font-bold hover:bg-amber-200 transition-colors flex flex-col items-center gap-2"
                                    >
                                        <i className="fa-solid fa-pause text-2xl"></i>
                                        PAUSAR
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm("¿Finalizar Lote?")) handleToggleStatus(activeRoll.id, 'finish', 'quality');
                                        }}
                                        className="py-4 bg-emerald-100 text-emerald-600 rounded-xl font-bold hover:bg-emerald-200 transition-colors flex flex-col items-center gap-2"
                                    >
                                        <i className="fa-solid fa-check text-2xl"></i>
                                        FINALIZAR
                                    </button>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Material</span>
                                        <span className="text-sm font-bold text-slate-700">{activeRoll.material || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Metros Total</span>
                                        <span className="text-sm font-bold text-slate-700">{(activeRoll.totalMeters || 0).toFixed(2)}m</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                                <i className="fa-solid fa-power-off text-6xl mb-4"></i>
                                <span className="font-bold">Máquina Disponible</span>
                                <p className="text-xs mt-2 text-slate-400">Seleccione un lote de la cola para iniciar.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: QUEUE LIST (EXPANDED) */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <i className="fa-solid fa-list-ol text-slate-400"></i>
                            Cola de Producción
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{machine.rolls.length}</span>
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                        {machine.rolls.map((roll, idx) => {
                            const isActive = activeRoll?.id === roll.id;
                            return (
                                <div key={roll.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isActive ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'}`}>
                                    <div className={`text-2xl font-black ${isActive ? 'text-blue-500' : 'text-slate-300'} w-12 text-center`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-lg text-slate-800">{roll.name}</span>
                                            {isActive && (
                                                <div className="flex gap-2">
                                                    <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded uppercase">En Proceso</span>
                                                    {/*  Botón de Corte/Cambio Bobina SOLO en el activo */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSplitModalRoll(roll); }}
                                                        className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded uppercase hover:bg-amber-600 flex items-center gap-1"
                                                    >
                                                        <i className="fa-solid fa-scissors"></i> CAMBIO BOBINA
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-4 text-xs text-slate-500">
                                            <span className="flex items-center gap-1"><i className="fa-solid fa-box"></i> {roll.orders?.length || 0} Ordenes</span>
                                            <span className="flex items-center gap-1"><i className="fa-solid fa-ruler"></i> {(roll.totalMeters || 0).toFixed(2)}m</span>
                                            <span className="truncate max-w-[200px]">{roll.material}</span>
                                        </div>
                                    </div>

                                    {/* ACTIONS */}
                                    {!isActive && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleStatus(roll.id, 'start')}
                                                className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-105 transition-all flex items-center justify-center shadow-sm"
                                                title="Iniciar este lote"
                                            >
                                                <i className="fa-solid fa-play"></i>
                                            </button>
                                            <button
                                                onClick={() => handleUnassign(roll.id)}
                                                className="w-10 h-10 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500 transition-all flex items-center justify-center"
                                                title="Retirar"
                                            >
                                                <i className="fa-solid fa-xmark"></i>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {machine.rolls.length === 0 && (
                            <div className="text-center py-20 text-slate-400">
                                No hay lotes asignados a esta máquina.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {
                splitModalRoll && (
                    <RollSplitModal
                        isOpen={!!splitModalRoll}
                        onClose={() => setSplitModalRoll(null)}
                        roll={splitModalRoll}
                        areaId={area} // Pass area to fetch valid bobbins
                    />
                )
            }
        </div >
    );
};

export default MachineDetailView;

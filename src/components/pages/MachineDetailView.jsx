import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productionService, machineControlService } from '../../services/api';
import RollSplitModal from '../modals/RollSplitModal';
import SlotActionModal from '../modals/SlotActionModal';
import { toast } from 'sonner';

const MachineDetailView = () => {
    const { machineId, area } = useParams();
    const navigate = useNavigate();
    const targetId = machineId;

    const [splitModalRoll, setSplitModalRoll] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);

    // --- PRODUCTION BOARD DATA ---
    const { data: prodData, isLoading, refetch } = useQuery({
        queryKey: ['productionBoard', area],
        queryFn: () => productionService.getBoard(area),
        enabled: !!area,
        refetchInterval: 10000
    });

    // --- MACHINE SLOTS DATA ---
    const { data: slots, refetch: refetchSlots } = useQuery({
        queryKey: ['machineSlots', targetId],
        queryFn: () => machineControlService.getSlots(targetId),
        enabled: !!targetId,
        refetchInterval: 5000
    });

    const machine = prodData?.machines?.find(m => String(m.id) === String(targetId));

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-400 gap-3">
            <i className="fa-solid fa-circle-notch fa-spin text-4xl text-blue-500"></i>
            <span className="text-xl font-bold">Cargando Panel...</span>
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

    const activeRoll = machine.rolls.find(r => r.status && r.status.includes('En maquina'));

    const handleToggleStatus = async (rollId, action, destination) => {
        try {
            await productionService.toggleStatus(rollId, action, destination);
            refetch();
            toast.success("Estado actualizado");
        } catch (error) {
            const msg = error.response?.data?.error || error.message || "Error desconocido";
            if (error.response?.status === 400) {
                console.warn("Accion bloqueada por validación de stock (Ignorada por usuario):", msg);
                // Si queremos permitir saltar validacion: aqui alertamos.
                // Pero el usuario pidió quitar logica.
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
            toast.error("Error al desmontar");
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 flex flex-col gap-4 overflow-hidden">
            {/* HEADER COMPACTO */}
            <div className="flex items-center justify-between bg-white px-6 py-3 rounded-xl shadow-sm border border-slate-200 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-print text-blue-600"></i>
                        {machine.name}
                    </h1>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${activeRoll ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {activeRoll ? 'PRODUCIENDO' : machine.status || 'DETENIDO'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { refetch(); refetchSlots(); }} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                        <i className="fa-solid fa-rotate-right"></i>
                    </button>
                    <button onClick={toggleFullScreen} className="p-2 text-slate-400 hover:text-slate-700 transition-colors" title="Pantalla Completa">
                        <i className="fa-solid fa-expand"></i>
                    </button>
                </div>
            </div>

            {/* MAIN GRID */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">

                {/* LEFT: ACTIVE JOB DASHBOARD (Grande) */}
                <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
                    <div className="flex-1 bg-white rounded-2xl shadow-lg border-l-8 border-blue-500 p-8 flex flex-col justify-center relative overflow-hidden group">
                        {/* Background Decoration */}
                        <i className="fa-solid fa-gears absolute -right-10 -bottom-10 text-[200px] text-slate-50 opacity-50 group-hover:rotate-12 transition-transform duration-700"></i>

                        {activeRoll ? (
                            <div className="z-10 w-full max-w-3xl mx-auto">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="text-sm font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg">Lote Activo</span>
                                    <span className="text-4xl font-black text-slate-200">#{activeRoll.id}</span>
                                </div>
                                <h2 className="text-5xl md:text-6xl font-black text-slate-800 leading-tight mb-2 truncate">
                                    {activeRoll.name}
                                </h2>
                                <p className="text-2xl text-slate-500 font-medium mb-8 truncate">
                                    {activeRoll.orders?.[0]?.client || 'Sin Cliente Asignado'}
                                </p>

                                {/* Progress Metrics */}
                                <div className="grid grid-cols-3 gap-6 mb-8">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Ordenes</div>
                                        <div className="text-3xl font-black text-slate-700">{activeRoll.orders?.length || 0}</div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Metros Totales</div>
                                        <div className="text-3xl font-black text-slate-700">{(activeRoll.totalMeters || 0).toFixed(1)}m</div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Material</div>
                                        <div className="text-lg font-bold text-slate-700 truncate">{activeRoll.material}</div>
                                    </div>
                                </div>

                                {/* Actions Big Buttons */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleToggleStatus(activeRoll.id, 'pause')}
                                        className="h-20 bg-amber-100 text-amber-700 rounded-xl font-black text-xl hover:bg-amber-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-sm"
                                    >
                                        <i className="fa-solid fa-pause text-2xl"></i> PAUSAR LOTE
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm("¿Confirmar FINALIZACIÓN del lote?")) handleToggleStatus(activeRoll.id, 'finish', 'quality');
                                        }}
                                        className="h-20 bg-emerald-500 text-white rounded-xl font-black text-xl hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/30"
                                    >
                                        <i className="fa-solid fa-check-circle text-2xl"></i> FINALIZAR
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center z-10 w-full">
                                <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center mb-6 animate-pulse">
                                    <i className="fa-solid fa-power-off text-6xl text-slate-300"></i>
                                </div>
                                <h2 className="text-3xl font-bold text-slate-400 mb-2">Máquina en Espera</h2>
                                <p className="text-slate-400 max-w-md">Seleccione un lote de la cola de producción para iniciar el trabajo.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: QUEUE (Compacta) */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Cola Próxima <span className="bg-slate-200 px-2 rounded-full text-xs ml-2">{machine.rolls.length}</span></h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {machine.rolls.filter(r => r.id !== activeRoll?.id).map((roll, idx) => (
                            <div key={roll.id} className="p-3 rounded-lg border border-slate-100 bg-white hover:border-blue-300 group transition-all relative">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-slate-700 text-sm truncate w-2/3">{roll.name}</span>
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 rounded">#{roll.id}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs text-slate-400 flex flex-col">
                                        <span>{(roll.totalMeters || 0).toFixed(1)}m · {roll.orders?.length} ord.</span>
                                        <span className="text-[10px] truncate max-w-[150px]">{roll.material}</span>
                                    </div>
                                    <button
                                        onClick={() => handleToggleStatus(roll.id, 'start')}
                                        className="text-white bg-blue-500 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg hover:bg-blue-600 hover:scale-110 active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                                        title="Subir a Producción"
                                    >
                                        <i className="fa-solid fa-play"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {machine.rolls.filter(r => r.id !== activeRoll?.id).length === 0 && (
                            <div className="text-center py-10 text-slate-300 text-sm italic">Cola vacía</div>
                        )}
                    </div>
                </div>
            </div>

            {/* BOTTOM: INSUMOS / SLOTS */}
            <div className="h-48 shrink-0 bg-slate-800 rounded-2xl p-4 shadow-xl border border-slate-700 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                        <i className="fa-solid fa-boxes-stacked text-blue-400"></i> Slots & Insumos
                    </h3>
                    <div className="flex gap-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Activo</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600"></span> Vacío</span>
                    </div>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {slots?.map(slot => (
                        <div
                            key={slot.SlotID}
                            onClick={() => setSelectedSlot(slot)}
                            className={`
                                min-w-[200px] p-4 rounded-xl cursor-pointer transition-all border-l-4 relative group hover:-translate-y-1
                                ${slot.BobinaMontadaID || slot.Tipo === 'CONSUMIBLE' ? 'bg-slate-700 border-blue-500' : 'bg-slate-700/50 border-slate-600 opacity-70 hover:opacity-100'}
                            `}
                        >
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 truncate">{slot.Nombre}</div>

                            {slot.Tipo === 'BOBINA' ? (
                                slot.BobinaMontadaID ? (
                                    <>
                                        <div className="text-white font-bold text-lg leading-tight truncate mb-1">
                                            {slot.CodigoEtiqueta || slot.BobinaMontadaID}
                                        </div>
                                        <div className="text-xs text-blue-400 font-medium">
                                            {(slot.MetrosRestantes || 0).toFixed(1)} m disp.
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-2 truncate">
                                            {slot.NombreInsumoMontado}
                                        </div>
                                        {/* Status Dot */}
                                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                        <i className="fa-solid fa-plus-circle text-2xl mb-1 group-hover:text-white transition-colors"></i>
                                        <span className="text-xs font-bold uppercase">Montar</span>
                                    </div>
                                )
                            ) : (
                                // CONSUMIBLE / TINTA
                                <>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${slot.Nombre.toLowerCase().includes('cyan') ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' :
                                                slot.Nombre.toLowerCase().includes('magenta') ? 'bg-pink-500/20 border-pink-500 text-pink-400' :
                                                    slot.Nombre.toLowerCase().includes('yellow') ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                                                        slot.Nombre.toLowerCase().includes('black') ? 'bg-black/40 border-slate-400 text-slate-300' :
                                                            'bg-slate-600 border-slate-500 text-slate-300'
                                            }`}>
                                            <i className="fa-solid fa-fill-drip"></i>
                                        </div>
                                        <div className="text-right flex-1">
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Acción</div>
                                            <div className="text-white font-bold text-xs">RECARGAR</div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {!slots?.length && (
                        <div className="text-slate-500 italic text-sm py-4">No hay slots configurados para esta máquina.</div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <SlotActionModal
                isOpen={!!selectedSlot}
                onClose={() => setSelectedSlot(null)}
                slot={selectedSlot}
                machineId={targetId}
                onSuccess={() => {
                    refetchSlots();
                    toast.success("Operación Exitosa");
                }}
            />
            {
                splitModalRoll && (
                    <RollSplitModal
                        isOpen={!!splitModalRoll}
                        onClose={() => setSplitModalRoll(null)}
                        roll={splitModalRoll}
                        areaId={area}
                    />
                )
            }
        </div>
    );
};

export default MachineDetailView;

import React, { useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ordersService, rollsService } from '../../services/api';
import { printLabelsHelper } from '../../utils/printHelper';

/**
 * Modal detallado para ver la información de un lote específico.
 * Muestra métricas clave (órdenes, archivos, metros) y una tabla detallada de las órdenes contenidas.
 * Permite exportar a Excel.
 */
const RollDetailsModal = ({ roll, onClose, onViewOrder, onUpdate = () => { } }) => {
    // Referencia para cerrar al hacer clic fuera
    const modalRef = useRef(null);

    // Estado local para datos frescos
    const [freshRoll, setFreshRoll] = React.useState(roll);
    const [loading, setLoading] = React.useState(false);

    // Función auxiliar para cargar datos frescos
    const loadFreshData = () => {
        if (roll?.id) {
            setLoading(true);
            rollsService.getDetails(roll.id)
                .then(data => setFreshRoll(data))
                .catch(err => console.error("Error cargando detalles frescos del rollo:", err))
                .finally(() => setLoading(false));
        }
    };

    // Efecto para cargar datos frescos al montar
    useEffect(() => {
        loadFreshData();
    }, [roll?.id]);

    // Si no hay roll, no mostramos nada
    if (!freshRoll) return null;

    // Calcular Totales (Y Ordenar por Secuencia)
    // Usamos freshRoll para los cálculos
    const orders = (freshRoll.orders || []).sort((a, b) => (a.sequence || a.Secuencia || 0) - (b.sequence || b.Secuencia || 0));
    const totalOrders = orders.length;
    const totalMeters = orders.reduce((sum, o) => sum + (o.magnitude || 0), 0);
    const totalFiles = orders.reduce((sum, o) => sum + (o.fileCount || 0), 0);
    const capacityPercent = freshRoll.capacity > 0 ? Math.min((freshRoll.currentUsage / freshRoll.capacity) * 100, 100) : 0;

    // Acción de Desasignar (Undo)
    const handleUnassign = async (order) => {
        const isBusy = freshRoll.status === 'Producción' || freshRoll.status === 'Imprimiendo' || (freshRoll.maquinaId && freshRoll.maquinaId !== null);

        if (isBusy) {
            if (!window.confirm(`⚠️ EL ROLLO ESTÁ EN MÁQUINA (${freshRoll.maquinaId || 'Producción'}).\n\n¿Estás seguro de sacar esta orden? Esto podría afectar la secuencia.`)) {
                return;
            }
        } else {
            if (!window.confirm(`¿Quitar la orden ${order.code || order.CodigoOrden} del rollo? Volverá a Pendientes.`)) {
                return;
            }
        }

        try {
            await ordersService.unassignRoll(order.id || order.OrdenID);

            // 1. Avisar al padre para que refresque el tablero de atrás
            onUpdate();

            // 2. Recargar datos LOCALES del modal para que la orden desaparezca visualmente
            // sin cerrar la ventana
            loadFreshData();

        } catch (error) {
            console.error("Error desasignando:", error);
            alert("Error al desasignar orden.");
        }
    };

    // Función de generación/impresión de etiquetas
    const handleGenerateLabels = async () => {
        const hasLabels = freshRoll.labelsCount > 0;

        if (!hasLabels) {
            if (!window.confirm(`¿Generar etiquetas de bulto para TODAS las órdenes del rollo?\n\nEl sistema calculará las etiquetas necesarias según los metros (aprox 1 por c/50m).`)) return;
        }

        try {
            setLoading(true);

            if (!hasLabels) {
                const res = await rollsService.generateLabels(freshRoll.id);
                // alert(res.message); Skip success alert to go straight to print prompt if desired, or keep it.
                // Keeping alert for feedback
                alert(res.message);
            }

            // Preguntar Imprimir (o imprimir directo si ya existian)
            if (hasLabels || window.confirm("Etiquetas Listas. ¿Desea imprimirlas ahora?")) {
                setLoading(true);
                const allLabels = await rollsService.getLabels(freshRoll.id);
                setLoading(false);
                if (allLabels && allLabels.length > 0) {
                    printLabelsHelper(allLabels, null);
                    onClose(); // Auto-close modal after printing
                } else {
                    alert("No se encontraron etiquetas para imprimir.");
                }
            }

            onUpdate(); // Refrescar tablero padre
            // loadFreshData(); // No need to reload if closing
        } catch (error) {
            console.error("Error generating labels:", error);
            alert("Error al generar etiquetas: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Función de exportación
    const handleExportExcel = () => {
        const dataToExport = orders.map((o, index) => ({
            '#': index + 1,
            'Código Orden': o.code || o.CodigoOrden,
            'Cliente': o.client || o.Cliente,
            'Trabajo': o.desc || o.DescripcionTrabajo,
            'Material': o.material || o.Material,
            'Archivos': o.fileCount || 0,
            'Metros': o.magnitude || 0,
            'Prioridad': o.priority || o.Prioridad,
            'Estado': o.status || o.Estado
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Detalle Lote");
        XLSX.writeFile(workbook, `Reporte_Lote_${freshRoll.name.replace(/\s+/g, '_')}.xlsx`);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1400] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                ref={modalRef}
                className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                onClick={e => e.stopPropagation()}
            >

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div className="flex flex-col">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <i className="fa-solid fa-scroll text-blue-500"></i>
                            {loading ? 'Cargando...' : freshRoll.name}
                            {loading && <i className="fa-solid fa-spinner fa-spin text-sm text-slate-400 ml-2"></i>}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            {freshRoll.id && String(freshRoll.id).startsWith('R-') && (
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-wider">
                                    {freshRoll.id}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors"
                    >
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                {/* Stats Bar */}
                <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex gap-8 items-center flex-wrap shrink-0">
                    <div className="flex flex-col items-start min-w-[80px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Órdenes</span>
                        <span className="text-3xl font-black text-slate-700 leading-none">{totalOrders}</span>
                    </div>

                    <div className="w-px h-10 bg-slate-200"></div>

                    <div className="flex flex-col items-start min-w-[80px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Archivos</span>
                        <span className={`text-3xl font-black leading-none flex items-center gap-1 ${totalFiles > 0 ? 'text-blue-500' : 'text-slate-300'}`}>
                            {totalFiles} <i className="fa-solid fa-paperclip text-sm opacity-40 -mt-2"></i>
                        </span>
                    </div>

                    <div className="w-px h-10 bg-slate-200"></div>

                    <div className="flex flex-col items-start min-w-[80px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Metros</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-700 leading-none">{totalMeters.toFixed(2)}</span>
                            <span className="text-xs font-bold text-slate-400">m</span>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end items-end min-w-[200px] ml-auto">
                        <div className="text-xs font-bold text-slate-500 mb-2 flex justify-between w-full">
                            <span className="uppercase tracking-wide text-[10px]">Capacidad del Rollo</span>
                            <span><span className="text-slate-800">{freshRoll.currentUsage?.toFixed(1)}</span> <span className="text-slate-400">/ {freshRoll.capacity}m</span></span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full transition-all duration-700 ease-out relative overflow-hidden"
                                style={{
                                    width: `${capacityPercent}%`,
                                    background: freshRoll.color || '#3b82f6'
                                }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body Table */}
                <div className="flex-1 overflow-y-auto bg-slate-50/30 p-6 min-h-[300px]">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[800px]">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-bold tracking-wider sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 w-12 text-center text-slate-300">#</th>
                                    <th className="px-4 py-3">Orden</th>
                                    <th className="px-4 py-3">Cliente / Trabajo</th>
                                    <th className="px-4 py-3">Material</th>
                                    <th className="px-4 py-3 w-16 text-center"><i className="fa-solid fa-paperclip"></i></th>
                                    <th className="px-4 py-3 w-16 text-center">Metros</th>
                                    <th className="px-4 py-3 w-32 text-center">Prioridad</th>
                                    <th className="px-4 py-3 w-24 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orders.map((o, idx) => (
                                    <tr key={o.id} className="hover:bg-blue-50/40 transition-colors group">
                                        <td className="px-4 py-3 text-center text-slate-300 font-mono text-xs">{idx + 1}</td>
                                        <td className="px-4 py-3 font-bold text-slate-700 min-w-[120px]">Orden No.: {o.code || o.CodigoOrden}</td>
                                        <td className="px-4 py-3 max-w-[240px]">
                                            <div className="font-bold text-slate-700 truncate">{o.client || o.Cliente}</div>
                                            <div className="text-xs text-slate-400 truncate italic">{o.desc || o.DescripcionTrabajo}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-600 font-medium truncate uppercase text-xs">{o.material || o.Material || '-'}</div>
                                            {o.variantCode && (
                                                <div className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold text-indigo-500 bg-indigo-50 mt-1 border border-indigo-100">
                                                    {o.variantCode}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {o.fileCount > 0 ? (
                                                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-200">
                                                    {o.fileCount}
                                                </span>
                                            ) : (
                                                <span className="text-slate-200 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                                            {o.magnitude || 0}<span className="text-[10px] text-slate-400 ml-0.5">m</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wide
                                                ${o.priority === 'Urgente'
                                                    ? 'bg-red-50 text-red-600 border-red-100'
                                                    : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                {(o.priority || 'Normal')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => onViewOrder && onViewOrder(o)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                                    title="Ver detalle orden"
                                                >
                                                    <i className="fa-regular fa-eye"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleUnassign(o)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                    title="Sacar del Rollo (Deshacer)"
                                                >
                                                    <i className="fa-solid fa-rotate-left"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center opacity-40">
                                                <i className="fa-solid fa-folder-open text-4xl mb-2 text-slate-300"></i>
                                                <span className="text-slate-500 italic">No hay órdenes en este lote.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 z-10 shrink-0">
                    <button
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 active:scale-95 mr-auto"
                        onClick={handleExportExcel}
                    >
                        <i className="fa-solid fa-file-excel"></i> Descargar Reporte Excel
                    </button>
                    <button
                        className={`px-4 py-2 ${freshRoll.labelsCount > 0 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-500 hover:bg-indigo-600'} text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20 active:scale-95 mr-auto ml-2`}
                        onClick={handleGenerateLabels}
                        disabled={loading}
                    >
                        <i className={`fa-solid ${freshRoll.labelsCount > 0 ? 'fa-print' : 'fa-tags'}`}></i>
                        {freshRoll.labelsCount > 0 ? 'Imprimir Etiquetas Existentes' : 'Generar Etiquetas'}
                    </button>
                    <button
                        className="px-6 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-bold transition-colors active:scale-95"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RollDetailsModal;

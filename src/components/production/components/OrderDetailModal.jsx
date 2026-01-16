import React, { useState, useEffect } from 'react';
import { ordersService, fileControlService } from '../../../services/api';
import { printLabelsHelper } from '../../../utils/printHelper';
import FileItem, { ActionButton } from './FileItem';

const OrderDetailModal = ({ order, onClose, onOrderUpdated }) => {
    // Estado local
    const [currentOrder, setCurrentOrder] = useState(null);
    const [files, setFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);

    // Estado de Edición
    const [editingFileId, setEditingFileId] = useState(null);
    const [editValues, setEditValues] = useState({ copias: 1, metros: 0, link: '' });

    // Estado Cancelación
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelType, setCancelType] = useState(null); // 'ORDER' | 'REQUEST' | 'FILE'
    const [fileToCancel, setFileToCancel] = useState(null);

    // Estado Etiquetas
    const [activeTab, setActiveTab] = useState('files');
    const [labels, setLabels] = useState([]);
    const [loadingLabels, setLoadingLabels] = useState(false);

    useEffect(() => {
        if (currentOrder?.id) {
            fileControlService.getEtiquetas(currentOrder.id)
                .then(data => setLabels(data))
                .catch(e => console.error(e));
        } else {
            setLabels([]);
        }
    }, [currentOrder?.id]);

    const handleAddLabel = async () => {
        if (!window.confirm("¿Crear una etiqueta EXTRA para esta orden?")) return;
        try {
            setLoadingLabels(true);
            await fileControlService.createExtraLabel(currentOrder.id);
            const data = await fileControlService.getEtiquetas(currentOrder.id);
            setLabels(data);
        } catch (e) { alert("Error: " + e.message); }
        finally { setLoadingLabels(false); }
    };

    const handlePrintLabels = () => {
        printLabelsHelper(labels, currentOrder);
    };

    const handleRegenerate = async () => {
        // Smart Suggestion based on meters (approx 50m per label)
        let defaultQty = 1;
        const magClean = (currentOrder.magnitude || '').toString().toLowerCase();
        const magVal = parseFloat(magClean.replace(/[^\d.]/g, '')) || 0;

        // Si hay 'm' o el valor es significativo, aplicamos regla de 50m
        if (magVal > 0) {
            defaultQty = Math.max(1, Math.ceil(magVal / 50));
        }

        const qty = prompt(`¿Cuántas etiquetas (bultos) desea generar?\n(Sug: ${defaultQty} para ${currentOrder.magnitude || '0'})\n\nIMPORTANTE: Esto BORRARÁ las etiquetas existentes de esta orden`, defaultQty);

        if (!qty) return;
        try {
            setLoadingLabels(true);
            await fileControlService.regenerateLabels(currentOrder.id, parseInt(qty));
            const data = await fileControlService.getEtiquetas(currentOrder.id);
            setLabels(data);
            if (window.confirm("Etiquetas generadas. ¿Desea imprimirlas ahora?")) {
                printLabelsHelper(data, currentOrder);
            }
        } catch (e) { alert("Error: " + e.message); }
        finally { setLoadingLabels(false); }
    };

    const handleDeleteLabel = async (labelId) => {
        if (!window.confirm("¿Eliminar esta etiqueta permanentemente?")) return;
        try {
            await fileControlService.deleteLabel(labelId);
            const data = await fileControlService.getEtiquetas(currentOrder.id);
            setLabels(data || []);
        } catch (e) {
            console.error(e);
            alert("Error eliminando etiqueta: " + e.message);
        }
    };

    const loadData = (orderId, area) => {
        setLoadingFiles(true);
        ordersService.getById(orderId, area)
            .then(data => {
                if (data) {
                    setCurrentOrder(data);
                    setFiles(data.filesData || data.files || []);
                }
            })
            .catch(err => console.error("Error cargando orden", err))
            .finally(() => setLoadingFiles(false));
    };

    const reloadFiles = () => {
        if (currentOrder?.id) loadData(currentOrder.id, currentOrder.area);
    };

    const startEditing = (file) => {
        const url = file.link || file.url || file.RutaAlmacenamiento || '';
        const id = file.id || file.ArchivoID;
        setEditingFileId(id);
        setEditValues({
            copias: file.copias || file.copies || file.Copias || 1,
            metros: file.metros || file.width || file.Metros || 0,
            link: url
        });
    };

    const startCancellingFile = (file) => {
        setFileToCancel(file);
        setCancelType('FILE');
        setCancelReason("");
        setCancelModalOpen(true);
    };

    const saveEditing = async () => {
        if (!editingFileId) return;

        const user = JSON.parse(localStorage.getItem('user')) || {};
        const payload = {
            fileId: editingFileId,
            copias: parseInt(editValues.copias) || 1,
            metros: parseFloat(editValues.metros) || 0,
            link: editValues.link,
            userId: user.id || user.UsuarioID
        };

        try {
            await ordersService.updateFile(payload);
            setEditingFileId(null);
            reloadFiles();
            if (onOrderUpdated) onOrderUpdated();
        } catch (e) {
            console.error(e);
            alert("No se pudo guardar los cambios: " + (e.response?.data?.error || e.message));
        }
    };

    const handleConfirmCancel = async () => {
        if (!cancelReason.trim()) {
            alert("Debe ingresar un motivo para cancelar.");
            return;
        }

        const user = JSON.parse(localStorage.getItem('user')) || {};
        const commonPayload = {
            reason: cancelReason,
            usuario: user.id || user.UsuarioID || "Desconocido"
        };

        try {
            if (cancelType === 'FILE') {
                if (!fileToCancel) return;
                const fileId = fileToCancel.id || fileToCancel.ArchivoID;
                const res = await ordersService.cancelFile({ ...commonPayload, fileId });
                alert(res.message);
                if (res.orderCancelled) {
                    onClose(); // Orden entera cancelada
                } else {
                    reloadFiles(); // Solo archivo
                }
            } else if (cancelType === 'REQUEST') {
                // Cancelar Pedido GLOBAL
                await ordersService.cancelRequest({ ...commonPayload, orderId: currentOrder.id });
                alert("Pedido completo cancelado correctamente (todas las áreas).");
                onClose();
            } else {
                // Default: Cancelar Orden (Área)
                await ordersService.cancel({ ...commonPayload, orderId: currentOrder.id });
                alert("Orden cancelada correctamente.");
                onClose();
            }

            setCancelModalOpen(false);
            setCancelReason("");
            setCancelType(null);
            setFileToCancel(null);

            if (onOrderUpdated) onOrderUpdated();

        } catch (e) {
            console.error(e);
            alert("Error al cancelar: " + (e.response?.data?.error || e.message));
        }
    };

    useEffect(() => {
        setCurrentOrder(order);
        if (order && order.id) {
            loadData(order.id, order.area);
        } else {
            setFiles([]);
        }
    }, [order]);

    if (!order || !currentOrder) return null;

    const totalMetrosVisual = files.reduce((acc, f) => {
        const copias = f.copias || f.copies || f.Copias || 1;
        const metros = f.metros || f.width || f.Metros || 0;
        return acc + (copias * metros);
    }, 0);

    return (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center p-4 overflow-y-auto">

            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 my-8">

                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-start shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold text-xs border border-slate-300">
                                Orden No.: {currentOrder.code || currentOrder.id}
                            </span>
                            {labels.length > 0 && (
                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-xs font-bold border border-indigo-100 flex items-center gap-1">
                                    <i className="fa-solid fa-tags text-[10px]"></i> {labels.length} Bultos
                                </span>
                            )}
                            <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider border border-blue-100">
                                Detalle de Orden
                            </span>
                            {currentOrder.status === 'CANCELADO' && (
                                <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded uppercase tracking-wider">CANCELADA</span>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 leading-tight">{currentOrder.client}</h2>
                        <p className="text-sm text-slate-500 mt-1 max-w-2xl truncate">{currentOrder.desc}</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center shadow-sm"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <div className="p-6 bg-white">

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Material</label>
                            <div className="font-semibold text-slate-700 text-sm leading-tight">{currentOrder.variant || currentOrder.material || '-'}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cantidad Global</label>
                            <div className="font-bold text-blue-600 text-lg leading-none">{currentOrder.magnitude || '0'}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Lote / Rollo</label>
                            <div className="font-mono text-slate-700 text-sm">{currentOrder.rollId || '-'}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Prioridad</label>
                            <div className={`font-bold text-sm ${currentOrder.priority === 'Urgente' ? 'text-red-600' : 'text-slate-600'}`}>
                                {currentOrder.priority || 'Normal'}
                            </div>
                        </div>
                    </div>

                    {currentOrder.note && (
                        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 shadow-sm">
                            <i className="fa-solid fa-note-sticky text-amber-400 text-xl"></i>
                            <div>
                                <h4 className="font-bold text-amber-800 text-xs uppercase mb-1">Nota de Producción</h4>
                                <p className="text-amber-900 text-sm italic">"{currentOrder.note}"</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex gap-6 border-b border-slate-200 mb-6">
                            <button onClick={() => setActiveTab('files')} className={`pb-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'files' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400'}`}>Archivos ({files.length})</button>
                            <button onClick={() => setActiveTab('labels')} className={`pb-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'labels' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400'}`}>Etiquetas</button>
                        </div>
                        {activeTab === 'files' ? (
                            <>
                                <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
                                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <i className="fa-regular fa-folder-open text-slate-400"></i>
                                        Archivos de Producción
                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs font-bold">{files.length}</span>
                                    </h3>
                                </div>

                                {loadingFiles ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                                        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-blue-500"></i>
                                        <span className="text-sm font-medium">Obteniendo detalles...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2 pr-2 p-1">
                                        {files.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 italic bg-slate-50/50 rounded-xl border border-slate-100">
                                                No hay archivos asociados a esta orden.
                                            </div>
                                        ) : (
                                            files.map((f, idx) => {
                                                const fileId = f.id || f.ArchivoID || idx;
                                                const rawStatus = f.Estado || f.estado || 'PENDIENTE';
                                                const status = rawStatus.toUpperCase();
                                                const isEditing = editingFileId === fileId;
                                                const isCancelled = status === 'CANCELADO';

                                                // Valores actuales
                                                const valCopias = f.copias || f.copies || f.Copias || 1;
                                                const valMetros = f.metros || f.width || f.Metros || 0;

                                                return (
                                                    <FileItem
                                                        key={idx}
                                                        file={f}
                                                        readOnly={true}
                                                        extraInfo={{
                                                            roll: currentOrder?.rollId || 'General',
                                                            machine: currentOrder?.printer || 'Sin Asignar'
                                                        }}
                                                        actions={
                                                            <div className="flex items-center gap-3">
                                                                {isEditing ? (
                                                                    <>
                                                                        <div className="flex items-center gap-2 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 shadow-sm animate-fadeIn">
                                                                            <div className="flex flex-col items-center gap-0.5">
                                                                                <label className="text-[9px] text-teal-600 font-bold leading-none uppercase">Copias</label>
                                                                                <input
                                                                                    type="number"
                                                                                    className="w-12 text-center text-xs font-bold bg-white border border-teal-200 rounded outline-none text-teal-800 h-6 focus:ring-1 focus:ring-teal-300"
                                                                                    value={editValues.copias}
                                                                                    onChange={e => setEditValues({ ...editValues, copias: e.target.value })}
                                                                                />
                                                                            </div>
                                                                            <span className="text-teal-300 font-bold text-xs mt-3">x</span>
                                                                            <div className="flex flex-col items-center gap-0.5">
                                                                                <label className="text-[9px] text-teal-600 font-bold leading-none uppercase">{currentOrder.um ? 'Cant.' : 'Metros'}</label>
                                                                                <input
                                                                                    type="number" step="0.1"
                                                                                    className="w-14 text-center text-xs font-bold bg-white border border-teal-200 rounded outline-none text-teal-800 h-6 focus:ring-1 focus:ring-teal-300"
                                                                                    value={editValues.metros}
                                                                                    onChange={e => setEditValues({ ...editValues, metros: e.target.value })}
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        {/* Botones Acción Edición */}
                                                                        <div className="flex gap-1 ml-1">
                                                                            <ActionButton icon="fa-check" color="emerald" onClick={saveEditing} title="Guardar Cambios" />
                                                                            <ActionButton icon="fa-xmark" color="slate" onClick={() => setEditingFileId(null)} title="Cancelar" />
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {/* Badge de Estado: SIEMPRE VISIBLE */}
                                                                        <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider border select-none ${status === 'OK' || status === 'FINALIZADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                            status === 'FALLA' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                                status === 'CANCELADO' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                                    status === 'EN PROCESO' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                                            }`}>
                                                                            {status}
                                                                        </div>

                                                                        {/* Visualización de Datos (Right aligned) */}
                                                                        {!isCancelled && (
                                                                            <div className="flex items-center gap-3 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-colors mr-1">
                                                                                <div className="flex flex-col items-center">
                                                                                    <span className="text-xs font-black text-slate-700">{valCopias}</span>
                                                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Copias</span>
                                                                                </div>
                                                                                <div className="w-px h-6 bg-slate-200"></div>
                                                                                <div className="flex flex-col items-center">
                                                                                    <span className="text-xs font-black text-slate-700">{valMetros}{currentOrder.um || 'm'}</span>
                                                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">{currentOrder.um ? 'Magnit.' : 'Largo'}</span>
                                                                                </div>
                                                                                <div className="w-px h-6 bg-slate-200"></div>
                                                                                <div className="flex flex-col items-center min-w-[3rem]">
                                                                                    <span className="text-xs font-black text-blue-600">{(valCopias * valMetros).toFixed(2)}{currentOrder.um || 'm'}</span>
                                                                                    <span className="text-[8px] text-blue-300 font-bold uppercase">Total</span>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Botones Acción (Editar y Cancelar) */}
                                                                        {!isCancelled && currentOrder.status !== 'CANCELADO' && (
                                                                            <div className='flex gap-1'>
                                                                                <ActionButton
                                                                                    icon="fa-pen"
                                                                                    color="blue"
                                                                                    onClick={() => startEditing({ ...f, id: fileId })}
                                                                                    title="Editar Medición"
                                                                                />
                                                                                <ActionButton
                                                                                    icon="fa-ban"
                                                                                    color="red"
                                                                                    onClick={() => startCancellingFile({ ...f, id: fileId })}
                                                                                    title="Cancelar Archivo"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        }
                                                    />
                                                );
                                            })
                                        )}
                                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-sm px-2">
                                            <span className="font-bold text-slate-400 uppercase text-xs tracking-wider">Metraje Total Estimado</span>
                                            <span className="font-black text-blue-600 text-lg">
                                                {files.reduce((acc, f) => {
                                                    if ((f.Estado || '').toUpperCase() === 'CANCELADO') return acc;
                                                    return acc + ((f.copias || f.copies || f.Copias || 1) * (f.metros || f.width || f.Metros || 0));
                                                }, 0).toFixed(2)}m
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="min-h-[200px]">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-700 text-sm">Etiquetas Generadas</h3>
                                    <div className="flex gap-2">
                                        <button onClick={handleAddLabel} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-2"><i className="fa-solid fa-plus"></i> Extra</button>
                                        <button onClick={handleRegenerate} className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-2" title="Borrar y Regenerar Todo"><i className="fa-solid fa-arrows-rotate"></i> Regenerar</button>
                                        <button onClick={handlePrintLabels} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"><i className="fa-solid fa-print"></i> Imprimir Todas</button>
                                    </div>
                                </div>
                                {loadingLabels ? <div className="py-12 text-center text-slate-400"><i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i><br />Cargando...</div> : labels.length === 0 ? <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">No hay etiquetas.<button onClick={handleAddLabel} className="block mx-auto mt-2 text-blue-500 hover:underline">Generar Primera</button></div> :
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {labels.map(l => (
                                            <div key={l.EtiquetaID} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-400 font-bold text-lg">{l.NumeroBulto}</div>
                                                    <div><div className="font-bold text-slate-700 text-sm">Bulto {l.NumeroBulto}/{l.TotalBultos}</div><div className="text-[10px] text-slate-400 font-mono">{l.CodigoEtiqueta || '-'}</div></div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right hidden sm:block"><div className="text-[10px] text-slate-400 font-bold">Generado</div><div className="text-[10px] text-slate-600 font-medium">{new Date(l.FechaGeneracion).toLocaleDateString()}</div></div>
                                                    <button onClick={() => handleDeleteLabel(l.EtiquetaID)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all border border-transparent hover:border-red-100" title="Eliminar Etiqueta">
                                                        <i className="fa-solid fa-trash-can text-xs"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between gap-3 shrink-0">
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setCancelType('REQUEST'); setCancelModalOpen(true); }}
                            className={`px-4 py-2 border font-black rounded-lg transition shadow-sm uppercase text-xs ${currentOrder.status === 'CANCELADO' ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}
                            disabled={currentOrder.status === 'CANCELADO'}
                        >
                            <i className="fa-solid fa-dumpster-fire mr-2"></i>
                            Cancelar Pedido Completo
                        </button>

                        <button
                            onClick={() => { setCancelType('ORDER'); setCancelModalOpen(true); }}
                            className={`px-4 py-2 border font-bold rounded-lg transition shadow-sm text-xs ${currentOrder.status === 'CANCELADO' ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'bg-white border-red-200 text-red-500 hover:bg-red-50'}`}
                            disabled={currentOrder.status === 'CANCELADO'}
                        >
                            Cancelar Orden (Solo Área)
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition shadow-sm"
                    >
                        Cerrar
                    </button>
                </div>

            </div>

            {cancelModalOpen && (
                <div className="fixed inset-0 z-[2100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
                            <h3 className="text-lg font-black uppercase">
                                {cancelType === 'REQUEST' ? 'Cancelar Pedido Completo' :
                                    cancelType === 'FILE' ? 'Cancelar Archivo' : 'Cancelar Orden'}
                            </h3>
                        </div>

                        <p className="text-slate-600 text-sm mb-4">
                            {cancelType === 'REQUEST' ? (
                                <>
                                    Se cancelarán <b>TODAS las órdenes</b> del pedido <b>{currentOrder.code.split('(')[0]}</b> en <b>TODAS las áreas</b>.
                                    <span className="block mt-2 font-bold text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                        Esta acción afecta a todo el flujo de producción.
                                    </span>
                                </>
                            ) : cancelType === 'FILE' ? (
                                <>
                                    Se cancelará el archivo <b>{fileToCancel?.name || fileToCancel?.NombreArchivo}</b>.
                                    <br />Si este es el último archivo activo, la orden se cancelará automáticamente.
                                </>
                            ) : (
                                <>
                                    Se cancelará solo esta orden <b>({currentOrder.code})</b> del área <b>{currentOrder.area}</b> con sus archivos.
                                </>
                            )}
                        </p>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Motivo de Cancelación</label>
                            <textarea
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-400 min-h-[100px] text-sm font-medium text-slate-700 resize-none"
                                placeholder="Indique un motivo..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                autoFocus
                            ></textarea>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setCancelModalOpen(false); setCancelType(null); setFileToCancel(null); }}
                                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition"
                            >
                                Volver
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg shadow-lg shadow-red-200 hover:bg-red-600 transition transform active:scale-95"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderDetailModal;

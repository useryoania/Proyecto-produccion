import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Box, Scroll, Package } from 'lucide-react';
import api from '../../services/apiClient';
import { toast } from 'sonner';

const OrderRequirementsList = ({ ordenId, areaId, readOnly = false }) => {
    const [requirements, setRequirements] = useState([]);
    const [loading, setLoading] = useState(false);

    // Resource Selection State
    const [resourceModalOpen, setResourceModalOpen] = useState(false);
    const [availableResources, setAvailableResources] = useState([]);
    const [selectedReq, setSelectedReq] = useState(null); // The requirement being toggled

    const fetchRequirements = async () => {
        if (!ordenId || !areaId) return;
        try {
            setLoading(true);
            const res = await api.get(`/logistics/requirements?ordenId=${ordenId}&areaId=${areaId}`);
            setRequirements(res.data);
        } catch (error) {
            console.error("Error fetching requirements", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequirements();
    }, [ordenId, areaId]);

    const handleToggleAttempt = async (req, currentStatus) => {
        if (readOnly) return;
        const newStatus = !currentStatus;

        // Si se está MARCANDO como listo y es un requisito de material tangible
        if (newStatus && (req.CodigoRequisito.includes('TELA') || req.CodigoRequisito.includes('PRENDA') || req.CodigoRequisito.includes('CORTES'))) {
            try {
                // Verificar stock disponible
                const res = await api.get(`/logistics/requirements/resources?ordenId=${ordenId}&reqCode=${req.CodigoRequisito}&areaId=${areaId}`);
                const resources = res.data;

                if (resources && resources.length > 0) {
                    // Hay recursos, mostrar modal selección
                    setAvailableResources(resources);
                    setSelectedReq(req);
                    setResourceModalOpen(true);
                    return; // Detener flujo normal, esperar selección
                } else {
                    toast.info("No se encontraron recursos vinculados automáticamente.");
                }
            } catch (e) {
                console.error("Error checking resources", e);
            }
        }

        // Flujo normal (sin recursos o desmarcando)
        executeToggle(req.RequisitoID, newStatus);
    };

    const executeToggle = async (reqId, newStatus, observation = '') => {
        // Optimistic update
        setRequirements(prev => prev.map(r =>
            r.RequisitoID === reqId ? { ...r, Cumplido: newStatus, Observaciones: observation || r.Observaciones } : r
        ));

        try {
            await api.post('/logistics/requirements/toggle', {
                ordenId,
                requisitoId: reqId,
                cumplido: newStatus,
                observaciones: observation
            });
        } catch (err) {
            console.error(err);
            toast.error("Error al actualizar requisito");
            fetchRequirements(); // Revert
        }
    };

    const handleResourceSelect = (resource) => {
        if (!selectedReq) return;

        const note = `Asignado: ${resource.description} [${resource.label}]`;
        executeToggle(selectedReq.RequisitoID, true, note);

        // Close modal
        setResourceModalOpen(false);
        setAvailableResources([]);
        setSelectedReq(null);
    };

    if (loading && requirements.length === 0) return <div className="text-xs text-gray-500">Cargando requisitos...</div>;
    if (!loading && requirements.length === 0) return null;

    return (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-lg relative">
            <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                Requisitos de Producción ({areaId})
            </h4>
            <div className="space-y-2">
                {requirements.map(req => (
                    <div
                        key={req.RequisitoID}
                        onClick={() => handleToggleAttempt(req, !!req.Cumplido)}
                        className={`
                            flex items-center justify-between p-2 rounded-md border cursor-pointer transition-all duration-200
                            ${req.Cumplido
                                ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }
                        `}
                    >
                        <div className="flex items-center gap-3">
                            {req.Cumplido ? (
                                <CheckCircle size={18} className="text-emerald-500" />
                            ) : (
                                <AlertCircle size={18} className="text-rose-400" />
                            )}
                            <div className="flex flex-col">
                                <span className={`text-sm font-medium ${req.Cumplido ? 'text-emerald-800' : 'text-gray-700'}`}>
                                    {req.Descripcion}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400 font-mono">
                                        {req.CodigoRequisito}
                                    </span>
                                    {req.EsBloqueante && <span className="text-[9px] bg-rose-100 text-rose-600 px-1 rounded uppercase font-bold">Bloqueante</span>}
                                </div>
                            </div>
                        </div>

                        {!readOnly && (
                            <div className="text-xs text-right">
                                {req.Cumplido ? (
                                    <>
                                        <div className="text-emerald-600 font-bold">OK</div>
                                        {req.Observaciones && <div className="text-[9px] text-emerald-500 max-w-[100px] truncate" title={req.Observaciones}>{req.Observaciones}</div>}
                                    </>
                                ) : (
                                    <div className="text-gray-400">Pendiente</div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* RESOURCE SELECTION MODAL */}
            {resourceModalOpen && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                            <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                                <Package size={16} />
                                Seleccionar Recurso Disponible
                            </h3>
                            <button onClick={() => setResourceModalOpen(false)} className="text-indigo-400 hover:text-indigo-700">
                                <XCircle size={18} />
                            </button>
                        </div>

                        <div className="p-2 max-h-[300px] overflow-y-auto">
                            <p className="text-xs text-gray-500 mb-2 px-2">
                                Se encontraron los siguientes ítems que coinciden con el requisito. Seleccione uno para asignarlo:
                            </p>
                            {availableResources.map(res => (
                                <div
                                    key={res.id}
                                    onClick={() => handleResourceSelect(res)}
                                    className="p-3 mb-1 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer group transition-all"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-slate-700 text-sm group-hover:text-indigo-700">{res.description}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-0.5">{res.label}</div>
                                        </div>
                                        {res.location && (
                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 group-hover:bg-white">
                                                {res.location}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between">
                            <button
                                onClick={() => setResourceModalOpen(false)}
                                className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    executeToggle(selectedReq.RequisitoID, true, "Confirmación Manual (Sin recurso vinculado)");
                                    setResourceModalOpen(false);
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded"
                            >
                                Confirmar sin vincular
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderRequirementsList;

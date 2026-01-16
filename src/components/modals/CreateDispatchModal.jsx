import React, { useState, useEffect, useMemo } from 'react';
import { logisticsService } from '../../services/api';
import QRCode from "react-qr-code";

const CreateDispatchModal = ({ isOpen, onClose, selectedOrders, originArea, nextServices, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        destArea: 'LOGISTICA',
        observations: ''
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    // Determinar destinos basados en el campo ProximoServicio de las órdenes
    const destinations = useMemo(() => {
        const found = new Set();

        // Add from prop first (more reliable if passed from parent logic)
        if (nextServices && Array.isArray(nextServices)) {
            nextServices.forEach(s => found.add(s));
        }

        selectedOrders.forEach(o => {
            const dest = o.nextService || o.destino || o.ProximoServicio;
            if (dest && dest !== 'Logistica Central' && dest !== 'LOGISTICA') {
                found.add(dest);
            }
        });

        const list = [
            { id: 'LOGISTICA', name: 'Punto Logístico Central' },
            { id: 'CLIENTE', name: 'Salida a Cliente (Ruta)' }
        ];

        found.forEach(d => {
            if (d !== 'LOGISTICA' && d !== 'CLIENTE') {
                list.push({ id: d, name: `HACIA ${d}` });
            }
        });

        return list;
    }, [selectedOrders, nextServices]);

    // Auto-seleccionar si hay un único destino claro
    useEffect(() => {
        if (isOpen) {
            const foundDestinations = destinations.filter(d => d.id !== 'LOGISTICA' && d.id !== 'CLIENTE');
            if (foundDestinations.length === 1) {
                setFormData(prev => ({ ...prev, destArea: foundDestinations[0].id }));
            }
        }
    }, [isOpen, destinations]);

    if (!isOpen) return null;

    const handleCreate = async () => {
        setLoading(true);
        try {
            // Extract all bulto IDs from selected orders
            const allBultosIds = selectedOrders.flatMap(o => o.bultos ? o.bultos.map(b => b.id) : []);

            if (allBultosIds.length === 0) {
                alert("No hay bultos/etiquetas generadas para las órdenes seleccionadas. Genere etiquetas primero.");
                setLoading(false);
                return;
            }

            const payload = {
                codigoRemito: 'AUTO',
                areaOrigen: originArea || 'PRODUCCION',
                areaDestino: formData.destArea,
                usuarioId: 1,
                bultosIds: allBultosIds,
                observations: formData.observations
            };

            const data = await logisticsService.createDispatch(payload);
            setResult(data);
            setStep(2); // Show Receipt
            if (onSuccess) onSuccess();
        } catch (error) {
            alert("Error creando despacho: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print(); // Simplest way for now, usually you'd print just the modal content or a specific div
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[1400] print:p-0 print:bg-white">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:h-full print:max-h-none print:rounded-none">

                {/* HEADER */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-truck-ramp-box text-blue-600"></i>
                        {step === 1 ? 'Generar Nuevo Despacho' : 'Despacho Generado'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                {/* CONTENT STEP 1: CONFIG */}
                {step === 1 && (
                    <div className="p-6 flex flex-col gap-6 overflow-y-auto">

                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4 items-center">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-500 text-xl shadow-sm shrink-0">
                                <i className="fa-solid fa-layer-group"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-900 text-sm">Resumen del Lote</h4>
                                <p className="text-xs text-blue-700 mt-1">
                                    Se empaquetarán <strong className="text-blue-900 text-sm">{selectedOrders.length}</strong> órdenes con un total de <strong className="text-blue-900 text-sm">{selectedOrders.reduce((a, b) => a + (b.bultos?.length || 0), 0)}</strong> bultos.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Destino del Envío</label>
                            <select
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={formData.destArea}
                                onChange={e => setFormData({ ...formData, destArea: e.target.value })}
                            >
                                {destinations.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observaciones (Opcional)</label>
                            <textarea
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-24"
                                placeholder="Ej: Entregar a Juan, frágil, urgente..."
                                value={formData.observations}
                                onChange={e => setFormData({ ...formData, observations: e.target.value })}
                            ></textarea>
                        </div>
                    </div>
                )}

                {/* CONTENT STEP 2: PRINT PREVIEW */}
                {step === 2 && result && (
                    <div className="p-8 flex flex-col items-center gap-6 overflow-y-auto print:p-0">
                        {/* MANIFIESTO IMPRIMIBLE */}
                        <div className="w-full border-2 border-dashed border-slate-800 p-6 rounded-xl bg-white text-center print:border-4 print:border-black print:rounded-none">
                            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-6">
                                <h1 className="text-4xl font-black uppercase text-slate-900 tracking-tighter">REMITO</h1>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-slate-500">FECHA</div>
                                    <div className="font-mono font-bold">{new Date().toLocaleDateString()}</div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-slate-100 p-3 rounded mb-6 print:bg-slate-100 print:print-color-adjust-exact">
                                <div className="text-left">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ORIGEN</div>
                                    <div className="font-black text-xl text-slate-800">{originArea || 'PRODUCCION'}</div>
                                </div>
                                <div className="text-2xl text-slate-300"><i className="fa-solid fa-arrow-right"></i></div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DESTINO</div>
                                    <div className="font-black text-xl text-slate-800">{formData.destArea}</div>
                                </div>
                            </div>

                            <div className="flex justify-center mb-4">
                                <QRCode value={result.dispatchCode} size={150} />
                            </div>

                            <div className="text-3xl font-black font-mono tracking-widest text-slate-900 mb-6 select-all border-b border-t border-slate-200 py-4">
                                {result.dispatchCode}
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full mb-4">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Órdenes</span>
                                    <span className="text-2xl font-black text-slate-800">{selectedOrders.length}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bultos Totales</span>
                                    <span className="text-2xl font-black text-slate-800">{selectedOrders.reduce((a, b) => a + (b.bultos?.length || 0), 0)}</span>
                                </div>
                            </div>


                        </div>

                        <p className="text-xs text-slate-400 text-center print:hidden">
                            Imprime este documento y pégalo en el carro/paquete maestro.
                            <br />El área de destino deberá escanear el QR para recibir la mercadería.
                        </p>
                    </div>
                )}

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 print:hidden">
                    {step === 1 ? (
                        <>
                            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white transition-colors">Cancelar</button>
                            <button
                                onClick={handleCreate}
                                disabled={loading}
                                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-paper-plane mr-2"></i> Generar Despacho</>}
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white transition-colors">Cerrar</button>
                            <button
                                onClick={handlePrint}
                                className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-sm shadow-lg hover:bg-slate-900 active:scale-95 transition-all"
                            >
                                <i className="fa-solid fa-print mr-2"></i> Imprimir Manifiesto
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateDispatchModal;

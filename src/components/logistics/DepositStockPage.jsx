
import React, { useState, useEffect } from "react";
import http from "../../services/apiClient";
import { toast } from "sonner";
import { Loader2, RefreshCw, CheckCircle, XCircle, Package, CheckSquare, Square, Truck, Send, Info, QrCode } from "lucide-react";

const DepositStockPage = () => {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [releasing, setReleasing] = useState(false);
    const [results, setResults] = useState(null);

    // State for inputs and selections
    const [selectedQRs, setSelectedQRs] = useState(new Set());
    const [inputData, setInputData] = useState({}); // { [qr]: { price, quantity, profile } }

    // Global profile text (optional, if user wants to apply to all selected)
    // Could implement a bulk apply function if requested, but for now individual inputs plus maybe a default.

    // 1. Fetch Data
    const fetchStock = async () => {
        setLoading(true);
        try {
            const res = await http.get("/logistics/deposit-stock");
            setStock(res.data);
            setResults(null);
            setSelectedQRs(new Set());
            setInputData(prev => {
                // Preserve existing inputs if QR still exists, or init with defaults
                const newItemData = { ...prev };
                res.data.forEach(item => {
                    if (!newItemData[item.V3String]) {
                        newItemData[item.V3String] = {
                            price: '',
                            quantity: item.CantidadBultos || '',
                            profile: ''
                        };
                    }
                });
                return newItemData;
            });
        } catch (err) {
            console.error(err);
            toast.error("Error cargando stock de depósito");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStock();
    }, []);

    // Selection Handlers
    const toggleSelect = (qr) => {
        const newSet = new Set(selectedQRs);
        if (newSet.has(qr)) newSet.delete(qr);
        else newSet.add(qr);
        setSelectedQRs(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedQRs.size === stock.length) {
            setSelectedQRs(new Set());
        } else {
            setSelectedQRs(new Set(stock.map(s => s.V3String)));
        }
    };

    // Input Handlers
    const handleInputChange = (qr, field, value) => {
        setInputData(prev => ({
            ...prev,
            [qr]: { ...prev[qr], [field]: value }
        }));
    };

    // 2. Sync Logic
    const handleSync = async () => {
        if (selectedQRs.size === 0) {
            toast.info("Seleccione al menos un pedido para sincronizar");
            return;
        }

        setSyncing(true);
        setResults(null);
        try {
            // Prepare payload from SELECTED items only
            const itemsToSync = stock
                .filter(item => selectedQRs.has(item.V3String))
                .map(item => ({
                    qr: item.V3String,
                    count: item.CantidadBultos,
                    price: parseFloat(item.Precio) || 0,
                    quantity: parseFloat(item.Cantidad) || 0,
                    profile: item.PerfilesPrecio || ''
                }));

            const res = await http.post("/logistics/deposit-sync", { items: itemsToSync });

            const resData = res.data.results;
            setResults(resData); // [{ qr, success, data/error }]

            const okCount = resData.filter(r => r.success).length;
            if (okCount > 0) {
                toast.success(`Sincronizados ${okCount} de ${resData.length} pedidos. Refrescando...`);
            } else {
                toast.error("Fallo general u ocurrencias de error en sincronización");
            }

            // Refrescar para traer los estados (Enviado_OK, Error) y Observaciones grabadas de la BD
            await fetchStock();

        } catch (err) {
            console.error(err);
            toast.error("Error de conexión al sincronizar");
        } finally {
            setSyncing(false);
        }
    };

    // 3. Release Logic (Liberar Stock)
    const handleRelease = async () => {
        // En lugar de usar results temporal, ahora basamos la liberación 100% en la base de datos robusta
        const successfulQRs = stock
            .filter(item => selectedQRs.has(item.V3String) && item.EstadoSyncReact === 'Enviado_OK' && item.EstadoSyncERP === 'Enviado_OK')
            .map(item => item.V3String);

        if (successfulQRs.length === 0) {
            toast.error("Ninguno de los pedidos seleccionados está sincronizado con éxito (React y ERP) en la Base de Datos. No se permite la liberación.");
            return;
        }

        if (successfulQRs.length !== selectedQRs.size) {
            if (!confirm(`CUIDADO: Solo ${successfulQRs.length} de los ${selectedQRs.size} pedidos seleccionados están OK en React y ERP.\n\n¿Desea liberar ÚNICAMENTE los ${successfulQRs.length} exitosos e ignorar los erróneos?`)) return;
        } else {
            if (!confirm(`¿Desea despachar / liberar del repositorio los ${successfulQRs.length} pedidos sincronizados exitosamente?`)) return;
        }

        setReleasing(true);
        try {
            const res = await http.post("/logistics/deposit-release", { items: successfulQRs.map(qr => ({ qr })) });
            if (res.data.success) {
                toast.success(`Liberados ${res.data.count} bultos del stock`);
                // Refresh table
                fetchStock();
            } else {
                toast.error("Error al liberar stock");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error de comunicación al liberar");
        } finally {
            setReleasing(false);
        }
    };

    // Helper to get nice order number
    const getNiceOrderNumber = (fullCode) => {
        if (!fullCode) return '';
        const parts = fullCode.toString().split('(');
        return parts[0].trim();
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-y-auto w-full">
            <div className="p-6 max-w-[1600px] mx-auto w-full">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Package className="w-8 h-8 text-indigo-600" />
                        Stock en Depósito (Pendiente Sync)
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchStock}
                            disabled={loading || syncing || releasing}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refrescar
                        </button>
                        <button
                            onClick={handleSync}
                            disabled={loading || syncing || releasing || selectedQRs.size === 0}
                            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 font-medium flex items-center gap-2 shadow-lg"
                        >
                            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sincronizar"} <Send className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleRelease}
                            disabled={loading || syncing || releasing || selectedQRs.size === 0}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center gap-2 shadow-lg"
                        >
                            {releasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                            Liberar Seleccionados
                        </button>
                    </div>
                </div>

                {/* --- RESULTS SUMMARY --- */}
                {results && (
                    <div className="mb-8 bg-white p-4 rounded-xl shadow border border-gray-100 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">Resultados Inmediatos (Última Sincronización)</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {results.map((r, i) => {
                                const originalItem = stock.find(s => s.V3String === r.qr);
                                const label = originalItem ? `Pedido ${getNiceOrderNumber(originalItem.CodigoOrden)}` : 'Desconocido';
                                return (
                                    <div key={i} className={`p-3 rounded-lg border flex items-start gap-3 ${r.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        {r.success ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-600 mt-0.5" />}
                                        <div>
                                            <div className="font-bold text-sm text-gray-900">{label}</div>
                                            <div className="text-xs text-gray-500 break-all">{r.qr.substring(0, 30)}...</div>
                                            <div className="text-xs font-semibold mt-1">
                                                {r.success ? "OK" : `Error: ${r.error || 'API Fail'}`}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- TABLE --- */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex justify-center text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin mr-2" /> Cargando stock...
                        </div>
                    ) : stock.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            No hay bultos en Stock de Depósito actualmente.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                        <th className="p-4 w-10 text-center cursor-pointer hover:bg-gray-100" onClick={toggleSelectAll}>
                                            {selectedQRs.size === stock.length && stock.length > 0 ? (
                                                <CheckSquare className="w-5 h-5 text-indigo-600" />
                                            ) : (
                                                <Square className="w-5 h-5 text-gray-400" />
                                            )}
                                        </th>
                                        <th className="p-4">QR / Pedido</th>
                                        <th className="p-4">Cliente / Trabajo</th>
                                        <th className="p-4 w-24 text-center">Cantidad</th>
                                        <th className="p-4 w-24 text-right">Importe</th>
                                        <th className="p-4 w-20 text-center">Perfiles Aplicados</th>
                                        <th className="p-4 text-center">Bultos</th>
                                        <th className="p-4 text-center">React</th>
                                        <th className="p-4 text-center">ERP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {stock.map((item, idx) => {
                                        const niceOrder = getNiceOrderNumber(item.CodigoOrden);
                                        const syncResult = results?.find(r => r.qr === item.V3String);
                                        const isSelected = selectedQRs.has(item.V3String);

                                        // Data format
                                        const profiles = item.PerfilesPrecio || "";
                                        const price = parseFloat(item.Precio || 0).toLocaleString('es-UY', { style: 'currency', currency: 'UYU' });

                                        return (
                                            <tr key={idx} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="p-4 text-center cursor-pointer" onClick={() => toggleSelect(item.V3String)}>
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-indigo-600 mx-auto" />
                                                    ) : (
                                                        <Square className="w-5 h-5 text-gray-300 mx-auto" />
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="group relative cursor-help" title={item.V3String}>
                                                            <QrCode className="w-6 h-6 text-gray-600 hover:text-indigo-600 transition-colors" />
                                                        </div>
                                                        <span className="font-bold text-gray-900 text-base">{niceOrder}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-semibold text-gray-800">{item.Cliente}</div>
                                                    <div className="text-gray-500 text-xs truncate max-w-[200px]" title={item.Descripcion}>{item.Descripcion}</div>
                                                </td>

                                                {/* READ ONLY COLUMNS */}
                                                <td className="p-4 text-center font-medium text-gray-700">
                                                    {item.Cantidad ? item.Cantidad : '-'}
                                                </td>

                                                <td className="p-4 text-right font-medium text-gray-700">
                                                    {price}
                                                </td>

                                                <td className="p-4 text-center">
                                                    {profiles ? (
                                                        <div className="flex justify-center" title={profiles}>
                                                            <Info className="w-5 h-5 text-blue-500 cursor-help hover:scale-110 transition-transform" />
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>

                                                <td className="p-4 text-center font-bold text-gray-600">{item.CantidadBultos}</td>
                                                <td className="p-4 text-center">
                                                    {item.EstadoSyncReact === 'Enviado_OK' ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-700 text-[10px] font-bold cursor-help" title={item.ObsReact}>OK</span>
                                                    ) : item.EstadoSyncReact === 'Error' ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-bold cursor-help" title={item.ObsReact}>ERROR</span>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {item.EstadoSyncERP === 'Enviado_OK' ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-700 text-[10px] font-bold cursor-help" title={item.ObsERP}>OK</span>
                                                    ) : item.EstadoSyncERP === 'Error' ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-bold cursor-help" title={item.ObsERP}>ERROR</span>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DepositStockPage;

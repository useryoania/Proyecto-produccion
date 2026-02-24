import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../services/api';

import { useAuth } from '../../context/AuthContext'; // Import Auth

const LabelGenerationPage = () => {
    const { user } = useAuth(); // Get user
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [areaFilter, setAreaFilter] = useState('');
    const [searchFilter, setSearchFilter] = useState('');
    const [batchFilter, setBatchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, generable, blocked

    const [selection, setSelection] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [areas, setAreas] = useState([]);

    // Modal State
    const [configOrder, setConfigOrder] = useState(null);
    const [bultosInput, setBultosInput] = useState(1);

    useEffect(() => {
        loadProductiveAreas();
    }, []);

    const loadProductiveAreas = async () => {
        try {
            const res = await api.get('/areas');
            if (Array.isArray(res.data)) {
                // Filtrar solo áreas productivas: Usar flag Productiva (si existe) o Categoria
                let productive = res.data.filter(a =>
                    (a.Productiva === true || a.Productiva === 1 || (a.Categoria || '').toUpperCase().includes('PRODUCC'))
                    && a.Activa !== false
                );

                // FILTER: Only ADMIN sees ALL.
                const isAdmin = user?.rol === 'ADMIN' || user?.rol === 'admin';
                if (!isAdmin && user) {
                    const userArea = (user.areaKey || user.areaId || '').trim();
                    if (userArea) {
                        productive = productive.filter(a => (a.AreaID || '').trim() === userArea);
                    } else {
                        productive = [];
                    }
                }

                setAreas(productive);

                // Preseleccionar área
                if (productive.length > 0) {
                    if (productive.length === 1) {
                        setAreaFilter(productive[0].AreaID.trim());
                    } else if (user) {
                        const userArea = (user.areaId || user.areaKey || '').trim();
                        if (userArea && productive.some(a => (a.AreaID || '').trim() === userArea)) {
                            setAreaFilter(userArea);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error loading areas", err);
        }
    };

    // Fetch orders on mount or area change
    useEffect(() => {
        fetchOrders();
    }, [areaFilter]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Updated endpoint for Label Dashboard
            const response = await api.get('/production-file-control/ordenes-labels', {
                params: {
                    area: areaFilter || undefined,
                    search: ''
                }
            });
            console.log("Orders received (Labels Mode):", response.data.length);
            setOrders(response.data);
        } catch (error) {
            console.error("Error fetching orders:", error);
            toast.error("Error cargando órdenes");
        } finally {
            setLoading(false);
        }
    };

    const handlePrintSelected = () => {
        if (selection.length === 0) return;
        const ids = selection.join(',');
        window.open(`/api/production-file-control/orden/batch/etiquetas/print?ids=${ids}`, '_blank');
    };

    const toggleSelect = (orderId) => {
        setSelection(prev => {
            if (prev.includes(orderId)) return prev.filter(id => id !== orderId);
            return [...prev, orderId];
        });
    };

    // Helper to check validity
    const isOrderBlocked = (order) => {
        let mag = 0;
        if (typeof order.Magnitud === 'number') mag = order.Magnitud;
        else if (order.Magnitud) {
            const clean = order.Magnitud.toString().replace(/[^0-9.]/g, '');
            mag = parseFloat(clean) || 0;
        }
        const isZero = mag <= 0;
        const hasError = order.ValidacionOBS && order.ValidacionOBS.trim() !== '';
        // Returning message logic moved here
        return {
            isBlocked: isZero || hasError,
            isZero,
            message: hasError ? (order.ValidacionOBS || 'Error de validación') : "Metros en 0"
        };
    };

    // Aplicar Filtros Locales
    const visibleOrders = orders.filter(o => {
        // Orden/Cliente search
        if (searchFilter) {
            const term = searchFilter.toLowerCase();
            const matchCod = o.CodigoOrden && o.CodigoOrden.toLowerCase().includes(term);
            const matchCli = o.Cliente && o.Cliente.toLowerCase().includes(term);
            const matchMat = o.Material && o.Material.toLowerCase().includes(term);
            if (!matchCod && !matchCli && !matchMat) return false;
        }

        // Lotes / Batches match (Using CodigoOrden prefix normally as lot logic or order text description logic)
        if (batchFilter) {
            const batchTerm = batchFilter.toLowerCase();
            const codText = (o.CodigoOrden || '').toLowerCase();
            const descText = (o.Descripcion || '').toLowerCase();
            if (!codText.includes(batchTerm) && !descText.includes(batchTerm)) return false;
        }

        // statusFilter
        if (statusFilter !== 'all') {
            const { isBlocked } = isOrderBlocked(o);
            if (statusFilter === 'generable' && isBlocked) return false;
            if (statusFilter === 'blocked' && !isBlocked) return false;
        }

        return true;
    });

    const toggleSelectAll = () => {
        const validOrders = visibleOrders.filter(o => !isOrderBlocked(o).isBlocked);
        const validIds = validOrders.map(o => o.OrdenID);

        // If all VALID visible orders are selected, deselect all. Otherwise, select all VALID visible orders.
        const allValidSelected = validIds.length > 0 && validIds.every(id => selection.includes(id));

        if (allValidSelected) setSelection(selection.filter(id => !validIds.includes(id)));
        else setSelection([...new Set([...selection, ...validIds])]);
    };

    const handleGenerateClick = () => {
        if (selection.length === 0) return;

        const alreadyFacturadas = visibleOrders.filter(o => selection.includes(o.OrdenID) && o.CantidadEtiquetas > 0);

        let confirmMsg = `¿Generar etiquetas para ${selection.length} órdenes seleccionadas?\nSe usarán valores automáticos.`;
        if (alreadyFacturadas.length > 0) {
            confirmMsg = `⚠️ ATENCIÓN: ${alreadyFacturadas.length} órdenes seleccionadas YA tienen etiquetas/facturación.\n\n¿Desea REFACTURAR y sobrescribir las etiquetas existentes?`;
        }

        if (confirm(confirmMsg)) {
            processGenerationBatch(selection, null);
        }
    };

    const openManualConfig = (order) => {
        let magVal = 0;
        if (order.Magnitud) {
            const m = order.Magnitud.toString().match(/[\d\.]+/);
            if (m) magVal = parseFloat(m[0]);
        }
        const propuesto = magVal > 0 ? Math.ceil(magVal / 60) : 1;
        setBultosInput(propuesto);
        setConfigOrder(order);
    };

    const processGenerationBatch = async (ids, fixedQty = null) => {
        setGenerating(true);
        let successCount = 0;
        let failCount = 0;
        let specificError = "";

        for (const orderId of ids) {
            try {
                const payload = fixedQty ? { cantidad: fixedQty } : {};
                await api.post(`/production-file-control/regen-labels/${orderId}`, payload);
                successCount++;
            } catch (error) {
                console.error(`Error order ${orderId}:`, error);
                if (error.response?.data?.error) {
                    specificError = error.response.data.error; // Keep last or concatenate
                }
                failCount++;
            }
        }

        setGenerating(false);
        setConfigOrder(null);

        if (failCount === 0) {
            toast.success(`Proceso finalizado.\nGeneradas: ${successCount}`);
        } else {
            toast.error(`Finalizado con errores.\nÉxito: ${successCount} | Fallos: ${failCount}\nÚltimo error: ${specificError || 'Error de validación.'}`, { duration: 5000 });
        }
        // Removed setSelection([]) to keep items selected for preview

        // Force refresh of preview
        setPreviewTimestamp(Date.now());

        fetchOrders(); // Reload to update label counts
    };

    // Preview URL Logic
    const [previewTimestamp, setPreviewTimestamp] = useState(Date.now());

    // Update preview URL to include timestamp for cache busting/refresh
    const previewUrl = selection.length > 0
        ? `/api/production-file-control/orden/batch/etiquetas/print?ids=${selection.join(',')}&t=${previewTimestamp}`
        : null;

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">
            <Toaster position="top-right" />

            {/* Left Panel: List */}
            <div className="w-1/2 flex flex-col border-r border-slate-200 bg-white">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Órdenes de Producción</h1>
                            <p className="text-xs text-slate-500">Gestión de Etiquetas</p>
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={areaFilter}
                                onChange={(e) => setAreaFilter(e.target.value)}
                                className="p-2 border rounded shadow-sm text-sm"
                            >
                                <option value="">-- Todas --</option>
                                {areas.map(area => (
                                    <option key={area.AreaID} value={area.AreaID}>{area.Nombre}</option>
                                ))}
                            </select>
                            <button onClick={fetchOrders} className="p-2 border rounded bg-white hover:bg-slate-50">
                                <i className="fa-solid fa-sync text-slate-600"></i>
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center gap-2 mb-2">
                        <div className="flex-1 flex gap-2">
                            <input
                                type="text"
                                placeholder="🔍 Buscar Orden/Cliente..."
                                className="w-1/3 p-2 text-sm border-b-2 border-slate-200 outline-none focus:border-indigo-500 bg-transparent"
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Lote (ej: 82232)..."
                                className="w-1/4 p-2 text-sm border-b-2 border-slate-200 outline-none focus:border-indigo-500 bg-transparent"
                                value={batchFilter}
                                onChange={(e) => setBatchFilter(e.target.value)}
                            />
                            <select
                                className="w-1/4 p-2 text-sm border-b-2 border-slate-200 outline-none focus:border-indigo-500 bg-transparent text-slate-600"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Ver Todas</option>
                                <option value="generable">✅ Generables</option>
                                <option value="blocked">🚫 Bloqueadas</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleGenerateClick}
                            disabled={selection.length === 0 || generating}
                            className={`flex-1 py-2 px-4 rounded font-bold text-sm shadow-sm transition flex items-center justify-center gap-2
                                ${selection.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                            `}
                        >
                            {generating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-plus-circle"></i>}
                            Generar Etiquetas
                        </button>
                        <button
                            onClick={handlePrintSelected}
                            disabled={selection.length === 0}
                            className={`flex-1 py-2 px-4 rounded font-bold text-sm shadow-sm transition flex items-center justify-center gap-2
                                ${selection.length > 0 ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                            `}
                        >
                            <i className="fa-solid fa-print"></i>
                            Imprimir Seleccionadas ({selection.length})
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-slate-300"></i>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr className="text-slate-500 text-xs uppercase tracking-wider">
                                    <th className="p-3 border-b text-center w-10">
                                        <input
                                            type="checkbox"
                                            checked={visibleOrders.length > 0 && selection.length > 0 &&
                                                visibleOrders.filter(o => !isOrderBlocked(o).isBlocked).every(o => selection.includes(o.OrdenID))
                                            }
                                            onChange={toggleSelectAll}
                                            className="rounded cursor-pointer transform scale-125"
                                        />
                                    </th>
                                    <th className="p-3 border-b">Orden</th>
                                    <th className="p-3 border-b">Detalle</th>
                                    <th className="p-3 border-b text-center">Cant.</th>
                                    <th className="p-3 border-b text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {visibleOrders.map(order => {
                                    const isSelected = selection.includes(order.OrdenID);
                                    const hasLabels = order.CantidadEtiquetas > 0;
                                    const { isBlocked, isZero, message } = isOrderBlocked(order);

                                    return (
                                        <tr
                                            key={order.OrdenID}
                                            className={`transition border-l-4 ${isBlocked ? 'bg-slate-50 cursor-not-allowed border-l-red-400 opacity-75' : 'hover:bg-indigo-50/50 cursor-pointer'} ${isSelected ? 'bg-indigo-50 border-l-indigo-500' : (isBlocked ? '' : 'border-l-transparent')}`}
                                            onClick={() => {
                                                if (isBlocked) return;
                                                toggleSelect(order.OrdenID);
                                            }}
                                        >
                                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                {isBlocked ? (
                                                    <div className="group relative flex justify-center">
                                                        <i className="fa-solid fa-ban text-red-500 text-lg cursor-help"></i>
                                                        <div className="absolute left-10 top-0 hidden group-hover:block bg-red-600 text-white text-xs font-bold rounded py-1 px-2 whitespace-nowrap z-[100] shadow-lg border border-red-700 pointer-events-none w-max max-w-[200px] text-left">
                                                            <div className="flex items-center gap-1 border-b border-red-500 pb-1 mb-1">
                                                                <i className="fa-solid fa-triangle-exclamation"></i>
                                                                <span>No se puede procesar</span>
                                                            </div>
                                                            {message}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelect(order.OrdenID)}
                                                        className="rounded cursor-pointer text-indigo-600 focus:ring-indigo-500 transform scale-125"
                                                    />
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-700 font-mono">{order.CodigoOrden}</div>
                                                <div className={`text-[10px] px-1.5 py-0.5 rounded inline-block font-bold mt-1 ${order.Estado === 'Pronto' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                                                    {order.Estado}
                                                </div>
                                            </td>
                                            <td className="p-3 max-w-[180px]">
                                                <div className="truncate font-medium text-slate-800" title={order.Cliente}>{order.Cliente}</div>
                                                <div className="truncate text-xs text-slate-500" title={order.Descripcion || order.Material}>{order.Descripcion || order.Material}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">Mag: {order.Magnitud || '-'}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                {hasLabels ?
                                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">{order.CantidadEtiquetas}</span>
                                                    : <span className="text-slate-300">-</span>
                                                }
                                            </td>
                                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => openManualConfig(order)}
                                                    disabled={isBlocked}
                                                    className={`p-1.5 rounded transition ${isBlocked ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-200 text-slate-500'}`}
                                                    title={isBlocked ? "Bloqueado por validación" : "Configuración Manual"}
                                                >
                                                    <i className="fa-solid fa-cog"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Right Panel: Preview */}
            <div className="w-1/2 bg-slate-200/50 flex flex-col h-full border-l border-slate-300 shadow-inner">
                <div className="bg-white p-3 border-b border-slate-200 shadow-sm flex justify-between items-center h-[72px]">
                    <span className="font-bold text-slate-700 flex items-center gap-2">
                        <i className="fa-solid fa-eye text-slate-400"></i> Vista Previa Seleccionada
                    </span>
                    {selection.length > 0 && (
                        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                            {selection.length} órdenes
                        </span>
                    )}
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {selection.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <i className="fa-solid fa-arrow-left text-4xl mb-4 opacity-30"></i>
                            <p className="font-medium">Selecciona órdenes para ver sus etiquetas</p>
                        </div>
                    ) : (
                        <iframe
                            src={previewUrl}
                            className="w-full h-full border-0 bg-white"
                            title="Label Preview"
                        />
                    )}
                </div>
            </div>

            {/* Configuration Modal */}
            {configOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up">
                        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg">Configurar Etiquetas</h3>
                            <button onClick={() => setConfigOrder(null)} className="hover:bg-indigo-700 p-1 rounded transition">
                                <i className="fa-solid fa-times"></i>
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="text-xs text-slate-400 uppercase tracking-wide font-bold mb-1">Orden Seleccionada</div>
                                <div className="text-xl font-bold text-slate-800 mb-1">{configOrder.CodigoOrden}</div>
                                <div className="text-sm text-slate-600 mb-2">{configOrder.Cliente}</div>
                                <div className="flex gap-4 mt-3">
                                    <div>
                                        <div className="text-xs text-slate-400">Magnitud Detectada</div>
                                        <div className="font-mono font-bold text-indigo-600">{configOrder.Magnitud || '0'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400">Tipo</div>
                                        <div className="font-bold text-slate-700">{configOrder.Material}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Cantidad de Bultos a Generar</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setBultosInput(Math.max(1, bultosInput - 1))}
                                        className="w-10 h-10 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition"
                                    >-</button>
                                    <input
                                        type="number"
                                        min="1"
                                        value={bultosInput}
                                        onChange={(e) => setBultosInput(parseInt(e.target.value) || 1)}
                                        className="flex-1 text-center p-2 border-2 border-indigo-100 rounded-lg font-bold text-lg text-indigo-900 focus:border-indigo-500 outline-none"
                                    />
                                    <button
                                        onClick={() => setBultosInput(bultosInput + 1)}
                                        className="w-10 h-10 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition"
                                    >+</button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2 text-center">
                                    Se generarán {bultosInput} etiquetas QR secuenciales.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfigOrder(null)}
                                    className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => processGenerationBatch([configOrder.OrdenID], bultosInput)}
                                    disabled={generating}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition flex justify-center items-center gap-2"
                                >
                                    {generating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                                    Generar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LabelGenerationPage;

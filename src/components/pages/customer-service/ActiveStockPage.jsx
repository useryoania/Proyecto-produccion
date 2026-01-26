import React, { useState, useEffect, useMemo } from 'react';
import { receptionService } from '../../../services/api';
import CreateDispatchModal from '../../modals/CreateDispatchModal';
import { toast } from 'sonner';

const ActiveStockPage = () => {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]); // Array of BultoIDs
    const [searchTerm, setSearchTerm] = useState('');
    const [isDispatchOpen, setIsDispatchOpen] = useState(false);
    const [viewMode, setViewMode] = useState('STOCK'); // 'STOCK' | 'TRANSIT'

    useEffect(() => {
        loadStock();
    }, []);

    const loadStock = async () => {
        setLoading(true);
        try {
            const data = await receptionService.getStock();
            setStock(data);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando stock");
        } finally {
            setLoading(false);
        }
    };

    // AGRUPAR POR ORDEN (PRE-XXXX)
    // El CreateDispatchModal espera "Orders" que tienen "bultos" dentro.
    // Vamos a estructurar los bultos seleccionados como "Ordenes simuladas" para el modal.
    const groupedStock = useMemo(() => {
        const groups = {};
        stock.forEach(item => {
            // Unir por CodigoEtiqueta BASE (Ej: PRE-25-1/2 -> PRE-25).
            // En este caso, el Codigo es PRE-25 y los bultos no tienen sub-sufijo en el campo "CodigoEtiqueta"
            // de la tabla Recepciones, pero en Logistica_Bultos el codigo es "PRE-25".
            // Espera... receptionController inserta "PRE-25" como CodigoEtiqueta en Logistica_Bultos.
            // Si hay varios bultos, todos tienen "PRE-25"?
            // En receptionController.js:
            // INSERT INTO Logistica_Bultos ... VALUES (@Cod, ...)
            // @Cod es PRE-ID.
            // Pero el bulto tiene un campo ID unico.
            // Si el ingreso son 3 bultos, solo se crea 1 registro en Logistica (vimos solo 1 INSERT).
            // REVISION: receptionController.js linea 34 inserta en Recepciones.
            // Linea 50 inserta en Logistica_Bultos 1 solo registro con Bultos=X.
            // ESTO ES UN PROBLEMA LOGISTICO si queremos etiquetar cada bulto individualmente y escanearlos.
            // "TRAE LA FUNCIONALIDAD DE AREA VIEW... ESCANEA ESOS BULTOS DEBE COINCIDIR"
            // Si Reception crea 1 solo registro de Bulto para N paquetes físicos, entonces tenemos 1 etiqueta logistica.
            // Pero ReceptionPage.jsx imprime N QRs.
            // linea 223: const qrTxt = `${orden}|${refsText}|Bulto ${bultoStr}|...`
            // El QR tiene data variable, pero el sistema solo tiene 1 ID.
            // Para que el cadete escanee, el sistema debe saber que hay N items.
            // PERO, por ahora trabajaremos con lo que hay: 1 Registro Logistico representa el lote completo.

            // NEW: Grouping Logic by Base Prefix (PRE-XXX) ignoring suffix (-Y)
            // Regex matches PRE-123 and optionally -1, -2 etc.
            // Capture group 1 is the base.
            let key = item.CodigoEtiqueta;
            const match = key.match(/^(PRE-\d+)(-\d+)?$/);
            if (match) {
                key = match[1]; // Use Base Code (e.g., PRE-9)
            }

            if (!groups[key]) {
                groups[key] = {
                    id: key, // Usamos codigo como ID de agrupación
                    code: key,
                    client: item.Cliente || 'Sin Cliente', // Fallback
                    desc: item.Detalle ? `${item.Tipo || ''} - ${item.Detalle}` : 'Sin detalles',
                    date: item.FechaRecepcion,
                    status: item.Estado,
                    nextService: item.ProximoServicio, // NEW: Capture Next Service
                    totalBultos: item.TotalBultosOrden || 1, // Dato con JOIN correcto
                    bultos: []
                };
            }
            groups[key].bultos.push({
                id: item.BultoID, // ID unico tabla logistica
                code: item.CodigoEtiqueta, // Mismo codigo para el lote
                desc: item.Detalle,
                num: groups[key].bultos.length + 1,
                total: item.TotalBultosOrden || 1,
                status: item.Estado // NEW
            });
        });
        return Object.values(groups);
    }, [stock]);

    // Calcular items visibles + FILTRO POR MODO
    const filteredGroups = useMemo(() => {
        let result = groupedStock;

        // 1. Filtrar por Modo (STOCK vs TRANSIT)
        if (viewMode === 'STOCK') {
            result = result.filter(g => g.bultos.some(b => b.status === 'EN_STOCK'));
        } else {
            result = result.filter(g => g.bultos.some(b => b.status === 'EN_TRANSITO'));
        }

        // 2. Filtrar por Busqueda
        if (searchTerm) {
            const low = searchTerm.toLowerCase();
            result = result.filter(g =>
                g.code.toLowerCase().includes(low) ||
                (g.client || '').toLowerCase().includes(low) ||
                (g.desc || '').toLowerCase().includes(low)
            );
        }
        return result;
    }, [groupedStock, searchTerm, viewMode]);

    const handleSelectGroup = (group) => {
        if (viewMode !== 'STOCK') return; // Selection only allowed in Stock mode

        // Toggle ALL bultos in the group THAT ARE AVAILABLE
        const availableBultos = group.bultos.filter(b => b.status === 'EN_STOCK');
        const availableIds = availableBultos.map(b => b.id);

        if (availableIds.length === 0) return; // Cannot select transit group

        const allSelected = availableIds.every(id => selectedItems.includes(id));

        if (allSelected) {
            // Deselect all from this group
            setSelectedItems(prev => prev.filter(id => !availableIds.includes(id)));
        } else {
            // Select all available
            setSelectedItems(prev => [...new Set([...prev, ...availableIds])]);
        }
    };

    const handleToggleSelectAll = () => {
        if (viewMode !== 'STOCK') return;

        // Only consider available items
        const allVisibleIds = filteredGroups.flatMap(g =>
            g.bultos.filter(b => b.status === 'EN_STOCK').map(b => b.id)
        );

        if (allVisibleIds.length === 0) return;

        const allSelected = allVisibleIds.every(id => selectedItems.includes(id));

        if (allSelected) {
            // Deselect visible
            setSelectedItems(prev => prev.filter(id => !allVisibleIds.includes(id)));
        } else {
            // Select all visible
            const newSelected = new Set([...selectedItems, ...allVisibleIds]);
            setSelectedItems(Array.from(newSelected));
        }
    };

    const handleGenerateRemito = () => {
        if (selectedItems.length === 0) return;
        setIsDispatchOpen(true);
    };

    // Prepare data for Modal
    const selectedOrdersForModal = useMemo(() => {
        // Return groups that have at least one selected bulto
        // AND filter the bultos inside to ONLY those selected
        return filteredGroups
            .filter(g => g.bultos.some(b => selectedItems.includes(b.id)))
            .map(g => ({
                id: g.id,
                code: g.code,
                client: g.client,
                nextService: g.nextService,
                // Filter bultos to only send selected ones to the modal
                bultos: g.bultos.filter(b => selectedItems.includes(b.id))
            }));
    }, [filteredGroups, selectedItems]);


    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* HEADER */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 gap-4">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-boxes-stacked text-indigo-600"></i>
                                Stock en Recepción
                            </h1>
                            <p className="text-slate-500 text-sm">Gestiona el inventario físico y despachos</p>
                        </div>
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('STOCK')}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'STOCK' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                En Stock
                            </button>
                            <button
                                onClick={() => setViewMode('TRANSIT')}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'TRANSIT' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                En Viaje
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full">
                        <div className="relative flex-1">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Buscar cliente, orden..."
                                className="pl-8 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-bold w-full focus:ring-2 focus:ring-indigo-100 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {viewMode === 'STOCK' && (
                            <button
                                onClick={handleGenerateRemito}
                                disabled={selectedItems.length === 0}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow-md shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none whitespace-nowrap"
                            >
                                <i className="fa-solid fa-truck-fast"></i>
                                <span className="hidden sm:inline">Generar Remito</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* LIST */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-slate-400">
                            <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                            <p>Cargando inventario...</p>
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">
                            <i className="fa-solid fa-box-open text-4xl mb-3 opacity-30"></i>
                            <p className="font-bold">No hay material en stock para despachar.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 w-10 text-center" onClick={handleToggleSelectAll} role="button">
                                            <div className={`w-5 h-5 rounded border mx-auto flex items-center justify-center transition-all ${filteredGroups.length > 0 &&
                                                filteredGroups.every(g => g.bultos.every(b => selectedItems.includes(b.id)))
                                                ? 'bg-indigo-500 border-indigo-500'
                                                : 'bg-white border-slate-300'
                                                }`}
                                            >
                                                {filteredGroups.length > 0 &&
                                                    filteredGroups.every(g => g.bultos.every(b => selectedItems.includes(b.id))) && (
                                                        <i className="fa-solid fa-check text-white text-xs"></i>
                                                    )}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4">Código</th>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Detalle / Referencias</th>
                                        <th className="px-6 py-4 text-center">Antigüedad</th>
                                        <th className="px-6 py-4 text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredGroups.map(group => {
                                        // Analyze group status
                                        const stockItems = group.bultos.filter(b => b.status === 'EN_STOCK').length;
                                        const transitItems = group.bultos.filter(b => b.status === 'EN_TRANSITO').length;

                                        const isDisabled = stockItems === 0;
                                        const isMixed = transitItems > 0 && stockItems > 0;

                                        // Check if available items are selected
                                        const availableIds = group.bultos.filter(b => b.status === 'EN_STOCK').map(b => b.id);
                                        const isSelected = availableIds.length > 0 && availableIds.every(id => selectedItems.includes(id));

                                        return (
                                            <tr
                                                key={group.id}
                                                onClick={() => !isDisabled && handleSelectGroup(group)}
                                                className={`transition-colors ${isDisabled ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'} ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                            >
                                                <td className="px-6 py-4 text-center">
                                                    {!isDisabled ? (
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-slate-300'}`}>
                                                            {isSelected && <i className="fa-solid fa-check text-white text-xs"></i>}
                                                        </div>
                                                    ) : (
                                                        <i className="fa-solid fa-truck-arrow-right text-slate-400" title="En Tránsito"></i>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-black text-slate-700">{group.code}</span>
                                                    {isMixed && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">PARCIAL</span>}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-600">
                                                    {group.client}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-medium text-slate-700">{group.desc}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{group.bultos.length} item(s) logísticos.</p>
                                                </td>
                                                <td className="px-6 py-4 text-center text-xs text-slate-500 font-mono">
                                                    {new Date(group.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {transitItems > 0 && isDisabled ? (
                                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-blue-200">
                                                            En Viaje
                                                        </span>
                                                    ) : (
                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-emerald-200">
                                                            En Stock
                                                        </span>
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

            <CreateDispatchModal
                isOpen={isDispatchOpen}
                onClose={() => setIsDispatchOpen(false)}
                selectedOrders={selectedOrdersForModal}
                originArea="RECEPCION"
                onSuccess={() => {
                    loadStock();
                    setSelectedItems([]);
                }}
            />
        </div>
    );
};

export default ActiveStockPage;

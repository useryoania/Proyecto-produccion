import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { inventoryService } from '../../services/modules/inventoryService';
import { areasService } from '../../services/modules/areasService';
import { Button } from '../ui/Button';
import { Plus, Printer, History, Package, BarChart, ChevronDown, Check } from 'lucide-react';
import CloseBobinaModal from '../modals/inventory/CloseBobinaModal';
import AddStockModal from '../modals/inventory/AddStockModal';
import InventoryReports from './InventoryReports';
import { toast } from 'sonner';

const MultiAreaSelector = ({ areas, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleToggle = (code) => {
        if (selected.includes(code)) {
            onChange(selected.filter(c => c !== code));
        } else {
            onChange([...selected, code]);
        }
    };

    const handleToggleAll = () => {
        if (selected.length === areas.length) {
            onChange([]);
        } else {
            onChange(areas.map(a => a.code));
        }
    };

    return (
        <div className="relative inline-block text-left z-30" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-white border rounded p-2 min-w-[150px] text-sm font-medium flex justify-between items-center shadow-sm hover:border-blue-400 transition-colors"
                type="button"
            >
                <span className="truncate max-w-[120px]">
                    {selected.length === 0 ? 'Seleccionar Áreas' :
                        selected.length === areas.length ? 'Todas las Áreas' :
                            `${selected.length} Áreas`}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-2 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-100 mb-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={selected.length === areas.length && areas.length > 0}
                                onChange={handleToggleAll}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-slate-700">Seleccionar Todas</span>
                        </label>
                    </div>
                    <div className="space-y-1">
                        {areas.map(area => (
                            <label key={area.code} className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer select-none transition-colors">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(area.code)}
                                    onChange={() => handleToggle(area.code)}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-600">{area.name}</span>
                                {area.category && <span className="text-[10px] bg-slate-100 text-slate-400 px-1 rounded ml-auto">{area.category}</span>}
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const InventoryPage = () => {
    const { user } = useAuth();
    // selectedAreas es un Array de strings
    const [selectedAreas, setSelectedAreas] = useState([]);

    const [inventory, setInventory] = useState([]);
    const [areasList, setAreasList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'report'

    // Modales
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [closingBobina, setClosingBobina] = useState(null);

    useEffect(() => {
        loadAreas();
    }, []);

    const loadAreas = async () => {
        try {
            // withStock: true para traer solo areas relevantes
            const data = await areasService.getAll({ productive: true, withStock: true });
            setAreasList(data);

            // Inicializar selección: Preferir área del usuario, o la primera, o todas?
            // Usuario suele querer ver su area.
            if (data.length > 0) {
                if (user?.areaKey && data.some(a => a.code === user.areaKey)) {
                    setSelectedAreas([user.areaKey]);
                } else {
                    // Si no tiene area asignada o es admin, quizás seleccionar la primera por defecto para no cargar todo de golpe
                    setSelectedAreas([data[0].code]);
                }
            }
        } catch (e) { console.error("Error loading areas", e); }
    };

    useEffect(() => {
        if (viewMode === 'list' && selectedAreas.length > 0) {
            loadInventory();
        } else if (viewMode === 'list' && selectedAreas.length === 0) {
            setInventory([]); // Limpiar si no hay seleccion
        }
    }, [selectedAreas, viewMode]);

    const loadInventory = async () => {
        if (selectedAreas.length === 0) return;
        setLoading(true);
        try {
            // Enviar areas separadas por coma
            const areasStr = selectedAreas.join(',');
            const data = await inventoryService.getInventoryByArea(areasStr);
            setInventory(data);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando inventario");
        } finally {
            setLoading(false);
        }
    };

    const handlePrintLabel = (bobina, nombreInsumo, codRef) => {
        // ... (Logica de impresion igual)
        // Por brevedad mantengo la lógica pero comprimida
        const printWindow = window.open('', '_blank', 'width=600,height=400');
        const qrContent = bobina.CodigoEtiqueta;
        printWindow.document.write(`<html><head><title>${qrContent}</title><script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script><style>@page{size:6in 4in;margin:0}body{font-family:Arial,sans-serif;margin:0;padding:20px;display:flex}h1{font-size:18px}</style></head><body><div id="qrcode"></div><script>new QRCode(document.getElementById("qrcode"),{text:"${qrContent}",width:128,height:128});window.print();</script></body></html>`);
        printWindow.document.close();
    };

    const handleViewHistory = (bobina) => {
        toast.info("Historial detallado en desarrollo.", { duration: 3000 });
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="w-8 h-8 text-blue-600" />
                        Control de Insumos
                    </h1>
                    <p className="text-slate-500 text-sm">Gestión de stock físico por área</p>
                </div>

                <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Package className="w-4 h-4" /> Inventario
                        </button>
                        <button
                            onClick={() => setViewMode('report')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'report' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <BarChart className="w-4 h-4" /> Reportes
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-300 mx-2 hidden md:block"></div>

                    {/* Multi Area Selector */}
                    <MultiAreaSelector
                        areas={areasList}
                        selected={selectedAreas}
                        onChange={setSelectedAreas}
                    />

                    {viewMode === 'list' && (
                        <Button onClick={() => setIsAddModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Ingresar
                        </Button>
                    )}
                </div>
            </div>

            {/* CONTENT */}
            {viewMode === 'report' ? (
                // Pasar las areas seleccionadas como string separado por comas, o pasar array si InventoryReports se adapta (mejor string para consistencia)
                <InventoryReports defaultArea={selectedAreas.join(',')} />
            ) : (
                /* GRID DE INSUMOS */
                <>
                    {selectedAreas.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>Seleccione al menos un área para ver el inventario.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {inventory.length === 0 && !loading && (
                                <div className="col-span-full text-center py-10 text-slate-500">
                                    No se encontraron insumos en las áreas seleccionadas.
                                </div>
                            )}

                            {inventory.map((item) => (
                                <div key={item.InsumoID} className="bg-white rounded-lg shadow border border-slate-200 p-4 animate-in fade-in duration-300">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-semibold text-lg text-slate-800">{item.Nombre}</h3>
                                            <div className="text-xs font-mono text-slate-500 bg-slate-100 inline-block px-2 py-1 rounded mt-1">
                                                REF: {item.CodArt || 'S/REF'}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-2xl font-bold ${item.MetrosTotales < 20 ? 'text-red-500' : 'text-green-600'}`}>
                                                {item.MetrosTotales}
                                            </span>
                                            <span className="text-xs text-slate-400 block">{item.UnidadDefault || 'mts'}</span>
                                        </div>
                                    </div>

                                    {/* LISTA DE BOBINAS ACTIVAS */}
                                    <div className="space-y-2 mt-4">
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between">
                                            <span>Bobinas Activas ({item.BobinasDisponibles})</span>
                                        </h4>

                                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                            {item.ActiveBatches.length === 0 && (
                                                <div className="text-sm text-slate-400 italic">No hay stock disponible.</div>
                                            )}
                                            {item.ActiveBatches.map((batch) => (
                                                <div key={batch.BobinaID} className="flex justify-between items-center bg-slate-50 p-2 rounded text-sm border border-slate-100 hover:border-blue-200 transition-colors group">
                                                    <div className="flex gap-2 items-center">
                                                        <div className={`w-2 h-2 rounded-full ${batch.Estado === 'En Uso' ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`} title={batch.Estado}></div>
                                                        <span className="font-medium text-slate-700">{batch.CodigoEtiqueta}</span>
                                                        {selectedAreas.length > 1 && (
                                                            <span className="text-[10px] items-center px-1 rounded bg-gray-200 text-gray-600">{batch.AreaID}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-600 font-mono">{batch.MetrosRestantes}m</span>

                                                        {/* Acciones */}
                                                        <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handlePrintLabel(batch, item.Nombre, item.CodArt)}
                                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                                title="Imprimir Etiqueta"
                                                            >
                                                                <Printer className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleViewHistory(batch)}
                                                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                                title="Historial"
                                                            >
                                                                <History className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setClosingBobina({ bobina: batch, insumoName: item.Nombre })}
                                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                                title="Cerrar/Terminar"
                                                            >
                                                                <span className="font-bold text-xs px-1">✕</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {isAddModalOpen && (
                <AddStockModal
                    isOpen={true}
                    onClose={() => setIsAddModalOpen(false)}
                    areaId={selectedAreas[0]} // Por defecto al primero
                    onSuccess={loadInventory}
                />
            )}

            {closingBobina && (
                <CloseBobinaModal
                    bobina={closingBobina.bobina}
                    insumoName={closingBobina.insumoName}
                    onClose={() => setClosingBobina(null)}
                    onSuccess={loadInventory}
                />
            )}
        </div>
    );
};

export default InventoryPage;

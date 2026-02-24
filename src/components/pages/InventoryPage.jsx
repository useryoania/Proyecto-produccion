import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { inventoryService } from '../../services/modules/inventoryService';
import { areasService } from '../../services/modules/areasService';
import { Button } from '../ui/Button';
import { Plus, Printer, History, Package, BarChart, ChevronDown, Check, Search, Filter, Settings2 } from 'lucide-react';
import { MultiAreaSelector } from '../ui/MultiAreaSelector';
import ManageBobinaModal from '../modals/inventory/ManageBobinaModal';
import AddStockModal from '../modals/inventory/AddStockModal';
import InventoryReports from './InventoryReports';
import { toast } from 'sonner';



const InventoryPage = () => {
    const { user } = useAuth();
    const isAdmin = user?.rol?.toLowerCase() === 'admin';
    const isDeposito = user?.areaKey?.trim().toUpperCase() === 'DEPOSITO';
    const hasFullAccess = isAdmin || isDeposito;
    // selectedAreas es un Array de strings
    const [selectedAreas, setSelectedAreas] = useState([]);

    const [inventory, setInventory] = useState([]);
    const [areasList, setAreasList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'report'

    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyStock, setShowOnlyStock] = useState(false);

    // Modales
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [managingBobina, setManagingBobina] = useState(null); // Replaces closingBobina

    useEffect(() => {
        loadAreas();
    }, []);

    const loadAreas = async () => {
        try {
            // withStock: true para traer solo areas relevantes
            const data = await areasService.getAll({ productive: true, withStock: true });

            // Mapper para adaptar al MultiAreaSelector que puede esperar {AreaID, Nombre} o {code, name}
            // areasService devuelve normalmente {AreaID, Nombre...}
            let adaptedData = data.map(d => ({ ...d, code: d.AreaID, name: d.Nombre }));

            // Initial Filter based on User Role
            if (!hasFullAccess && user) {
                const userArea = (user.areaKey || user.areaId || '').trim();
                if (userArea) {
                    adaptedData = adaptedData.filter(a => a.code === userArea);
                } else {
                    adaptedData = [];
                }
            }
            setAreasList(adaptedData);

            // Inicializar selección
            if (adaptedData.length > 0) {
                // Si es admin o DEPOSITO -> Seleccionar TODAS por defecto (o permitir escoger, aqui seleccionamos todas para dar visión global)
                // const isAdminOrDeposito = user?.role === 'admin' || user?.areaKey === 'DEPOSITO' || !user?.areaKey; // OLD LOGIC

                if (hasFullAccess) {
                    // Admin selects all by default? Or first? usually all for overview.
                    setSelectedAreas(adaptedData.map(a => a.code));
                } else {
                    // User selects their only area
                    setSelectedAreas([adaptedData[0].code]);
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
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        const qrContent = bobina.CodigoEtiqueta;

        // Formato detallado de etiqueta
        const htmlContent = `
            <html>
                <head>
                    <title>${qrContent}</title>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
                    <style>
                        @page { size: 10cm 5cm; margin: 0; }
                        body { 
                            font-family: 'Arial', sans-serif; 
                            margin: 0; 
                            padding: 10px; 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: center; 
                            height: 100vh;
                            box-sizing: border-box;
                        }
                        .label-container {
                            width: 100%;
                            height: 100%;
                            border: 2px solid #000;
                            border-radius: 8px;
                            padding: 10px;
                            display: flex;
                            flex-direction: row;
                            align-items: center;
                            gap: 15px;
                        }
                        .info {
                            flex: 1;
                            text-align: left;
                        }
                        .qr-code {
                            width: 128px;
                            height: 128px;
                        }
                        h1 { font-size: 16px; margin: 0 0 5px 0; font-weight: bold; line-height: 1.2; }
                        p { font-size: 12px; margin: 2px 0; }
                        .meta { font-size: 10px; color: #555; margin-top: 5px; }
                        .tag { font-weight: bold; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="label-container">
                        <div class="info">
                            <h1>${nombreInsumo}</h1>
                            <p><strong>Cod. ERP:</strong> ${codRef || 'N/A'}</p>
                            <p><strong>Lote Prov:</strong> ${bobina.LoteProveedor || 'S/L'}</p>
                            <p><strong>Metros:</strong> ${bobina.MetrosIniciales} m</p>
                            <p><strong>ID Etiqueta:</strong> ${bobina.CodigoEtiqueta}</p>
                            <div class="meta">Ingreso: ${new Date(bobina.FechaIngreso).toLocaleDateString()}</div>
                        </div>
                        <div id="qrcode" class="qr-code"></div>
                    </div>
                    <script>
                        new QRCode(document.getElementById("qrcode"), {
                            text: "${qrContent}",
                            width: 110,
                            height: 110
                        });
                        setTimeout(() => window.print(), 500);
                    </script>
                </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
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

                    {/* FILTROS SEARCH & STOCK */}
                    {viewMode === 'list' && (
                        <>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded px-2 py-1.5 shadow-sm">
                                <Search className="w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar insumo..."
                                    className="outline-none text-sm w-32 md:w-48 placeholder:text-slate-300"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={() => setShowOnlyStock(!showOnlyStock)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium border transition-colors ${showOnlyStock ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                title="Mostrar solo con existencia"
                            >
                                <Filter className="w-4 h-4" />
                                <span className="hidden sm:inline">{showOnlyStock ? 'Con Stock' : 'Todos'}</span>
                            </button>
                        </>
                    )}

                    <div className="h-8 w-px bg-slate-300 mx-2 hidden md:block"></div>

                    {/* Multi Area Selector */}
                    <MultiAreaSelector
                        areas={areasList}
                        selected={selectedAreas}
                        onChange={setSelectedAreas}
                        disabled={!hasFullAccess}
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

                            {inventory
                                .filter(item => {
                                    // Búsqueda
                                    if (searchTerm && !item.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) &&
                                        !item.CodArt?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                                    // Filtro Stock
                                    if (showOnlyStock && item.MetrosTotales <= 0) return false;
                                    return true;
                                })
                                .map((item) => (
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
                                                                    onClick={() => setManagingBobina({ bobina: batch, insumoName: item.Nombre })}
                                                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                                                                    title="Administrar / Ajustar"
                                                                >
                                                                    <Settings2 className="w-4 h-4" />
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
                    areas={areasList.filter(a => selectedAreas.includes(a.code))} // Pasar las áreas seleccionadas (el modal debe manejar si es 1 o mas)
                    onSuccess={loadInventory}
                />
            )}

            {managingBobina && (
                <ManageBobinaModal
                    bobina={managingBobina.bobina}
                    insumoName={managingBobina.insumoName}
                    onClose={() => setManagingBobina(null)}
                    onSuccess={loadInventory}
                />
            )}
        </div>
    );
};

export default InventoryPage;
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { inventoryService } from '../../services/modules/inventoryService';
import { areasService } from '../../services/modules/areasService';
import { Button } from '../ui/Button';
import { Plus, Printer, History, Package, BarChart, ChevronDown, Check, Search, Filter, Settings2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { MultiAreaSelector } from '../ui/MultiAreaSelector';
import ManageBobinaModal from '../modals/inventory/ManageBobinaModal';
import EstadoTelaModal from '../modals/inventory/EstadoTelaModal';
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
    const [isAddModalOpen, setIsAddModalOpen]   = useState(false);
    const [managingBobina, setManagingBobina]   = useState(null);

    // Confirmar Medida
    const [confirmando, setConfirmando]         = useState(null);
    const [metrosRealesInput, setMetrosRealesInput] = useState('');
    const [anchoInput, setAnchoInput]           = useState('');
    const [pesoInput, setPesoInput]             = useState('');
    const [confirmLoading, setConfirmLoading]   = useState(false);

    // Estado de Tela
    const [estadoTelaBobina, setEstadoTelaBobina] = useState(null); // BobinaID

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
                            ${bobina.ClienteID ? `
                            <p><strong>Declarados:</strong> ${bobina.MetrosIniciales} m</p>
                            <p><strong>Confirmados:</strong> ${
                                bobina.Estado === 'Pendiente'
                                    ? '<span style="color:#d97706;font-weight:bold">⏳ Pendiente confirmación</span>'
                                    : `<span style="color:#16a34a;font-weight:bold">${bobina.MetrosRestantes} m ✓</span>`
                            }</p>
                            ` : `
                            <p><strong>Metros:</strong> ${bobina.MetrosIniciales} m</p>
                            `}
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
                            onClick={() => setViewMode('tela-cliente')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                                viewMode === 'tela-cliente'
                                    ? 'bg-amber-500 shadow text-white'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <FileText className="w-4 h-4" /> Tela Cliente
                        </button>
                        <button
                            onClick={() => setViewMode('report')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'report' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <BarChart className="w-4 h-4" /> Reportes
                        </button>
                    </div>

                    {/* FILTROS SEARCH & STOCK */}
                    {(viewMode === 'list' || viewMode === 'tela-cliente') && (
                        <>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded px-2 py-1.5 shadow-sm">
                                <Search className="w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={viewMode === 'tela-cliente' ? 'Buscar cliente / tela...' : 'Buscar insumo...'}
                                    className="outline-none text-sm w-32 md:w-48 placeholder:text-slate-300"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {viewMode === 'list' && (
                                <button
                                    onClick={() => setShowOnlyStock(!showOnlyStock)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium border transition-colors ${showOnlyStock ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    title="Mostrar solo con existencia"
                                >
                                    <Filter className="w-4 h-4" />
                                    <span className="hidden sm:inline">{showOnlyStock ? 'Con Stock' : 'Todos'}</span>
                                </button>
                            )}
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

                    {(viewMode === 'list' || viewMode === 'tela-cliente') && (
                        <Button onClick={() => setIsAddModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Ingresar
                        </Button>
                    )}
                </div>
            </div>

            {/* CONTENT */}
            {viewMode === 'report' ? (
                <InventoryReports defaultArea={selectedAreas.join(',')} />

            ) : viewMode === 'tela-cliente' ? (
                /* ===== VISTA TELA DE CLIENTE ===== */
                (() => {
                    // Aplanar todas las bobinas con ClienteID de todos los insumos
                    const bobinasTela = inventory.flatMap(item =>
                        (item.ActiveBatches || []).filter(b => b.ClienteID)
                            .map(b => ({ ...b, TipoTela: item.Nombre, CodArt: item.CodArt }))
                    ).filter(b => {
                        if (!searchTerm) return true;
                        const q = searchTerm.toLowerCase();
                        return (
                            b.NombreCliente?.toLowerCase().includes(q) ||
                            b.ClienteID?.toLowerCase().includes(q) ||
                            b.DescripcionTela?.toLowerCase().includes(q) ||
                            b.TipoTela?.toLowerCase().includes(q) ||
                            b.CodigoEtiqueta?.toLowerCase().includes(q)
                        );
                    });

                    if (selectedAreas.length === 0) return (
                        <div className="text-center py-20 text-slate-400">
                            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>Seleccione al menos un área para ver telas de cliente.</p>
                        </div>
                    );

                    if (bobinasTela.length === 0) return (
                        <div className="text-center py-20 text-slate-400">
                            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>No hay telas de cliente en las áreas seleccionadas.</p>
                        </div>
                    );

                    return (
                        <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {bobinasTela.map(bob => {
                                const esPendiente = bob.Estado === 'Pendiente';
                                const pctUsado = bob.MetrosIniciales > 0
                                    ? Math.round((1 - bob.MetrosRestantes / bob.MetrosIniciales) * 100)
                                    : 0;

                                return (
                                    <div key={bob.BobinaID}
                                        className={`bg-white rounded-xl shadow border-2 p-4 transition-all ${
                                            esPendiente ? 'border-amber-300' : 'border-slate-200 hover:border-indigo-300'
                                        }`}>

                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                        esPendiente
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-green-100 text-green-700'
                                                    }`}>
                                                        {esPendiente ? '⏳ Pendiente' : '✅ Disponible'}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-mono">{bob.AreaID}</span>
                                                </div>
                                                <h3 className="font-bold text-slate-800 mt-1 text-sm leading-tight truncate">
                                                    {bob.DescripcionTela || bob.TipoTela}
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                                    👤 {bob.NombreCliente || bob.ClienteID}
                                                </p>
                                            </div>
                                            <div className="text-right ml-3">
                                                <span className={`text-2xl font-black ${
                                                    bob.MetrosRestantes < 5 ? 'text-red-500' : 'text-slate-800'
                                                }`}>{parseFloat(bob.MetrosRestantes).toFixed(1)}</span>
                                                <span className="text-xs text-slate-400 block">m restantes</span>
                                            </div>
                                        </div>

                                        <p className="text-[10px] font-mono text-slate-400 mb-3 truncate">{bob.CodigoEtiqueta}</p>

                                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                            <span>Declarados: <strong>{parseFloat(bob.MetrosIniciales).toFixed(1)} m</strong></span>
                                            <span>{pctUsado}% utilizado</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
                                            <div
                                                className={`h-1.5 rounded-full transition-all ${
                                                    pctUsado > 80 ? 'bg-red-500' : pctUsado > 50 ? 'bg-amber-400' : 'bg-green-500'
                                                }`}
                                                style={{ width: `${Math.min(pctUsado, 100)}%` }}
                                            />
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex gap-2 justify-end">
                                            {esPendiente ? (
                                                <button
                                                    onClick={() => {
                                                        setConfirmando({ bobina: bob, insumoName: bob.DescripcionTela || bob.TipoTela });
                                                        setMetrosRealesInput(String(bob.MetrosRestantes));
                                                        setAnchoInput(bob.Ancho ? String(bob.Ancho) : '');
                                                        setPesoInput(bob.Peso  ? String(bob.Peso)  : '');
                                                    }}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" /> Confirmar medida
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setEstadoTelaBobina(bob.BobinaID)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors border border-indigo-200"
                                                >
                                                    <FileText className="w-3.5 h-3.5" /> Estado de Cuenta
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setManagingBobina({ bobina: bob, insumoName: bob.TipoTela })}
                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                                                title="Administrar"
                                            >
                                                <Settings2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Panel de confirmación — fuera de las tarjetas pero dentro del Fragment */}
                        {confirmando && (
                            <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-xl shadow-sm">
                                <p className="text-sm font-bold text-amber-800 mb-3">
                                    ✏️ Confirmar medidas — {confirmando.insumoName}
                                </p>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Largo (m) *</label>
                                        <input
                                            type="number" step="0.01" min="0.01" autoFocus
                                            value={metrosRealesInput}
                                            onChange={e => setMetrosRealesInput(e.target.value)}
                                            className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-500 text-center"
                                            placeholder={String(confirmando.bobina.MetrosRestantes)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ancho (m)</label>
                                        <input
                                            type="number" step="0.01" min="0"
                                            value={anchoInput}
                                            onChange={e => setAnchoInput(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-500 text-center"
                                            placeholder={confirmando.bobina.Ancho ? String(confirmando.bobina.Ancho) : '0.00'}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Peso (kg)</label>
                                        <input
                                            type="number" step="0.01" min="0"
                                            value={pesoInput}
                                            onChange={e => setPesoInput(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-500 text-center"
                                            placeholder={confirmando.bobina.Peso ? String(confirmando.bobina.Peso) : '0.00'}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        disabled={confirmLoading}
                                        onClick={async () => {
                                            const metros = parseFloat(metrosRealesInput);
                                            if (!metros || metros <= 0) { toast.error('Ingresá el largo real'); return; }
                                            setConfirmLoading(true);
                                            try {
                                                const ancho = parseFloat(anchoInput) || null;
                                                const peso  = parseFloat(pesoInput)  || null;
                                                const res = await inventoryService.confirmarMedida(
                                                    confirmando.bobina.BobinaID, metros, ancho, peso
                                                );
                                                if (res.alerta) toast.warning(res.alertaMsg);
                                                else toast.success('✅ Medidas confirmadas. Tela disponible.');
                                                setConfirmando(null);
                                                loadInventory();
                                            } catch (err) {
                                                toast.error(err?.response?.data?.error || 'Error al confirmar');
                                            } finally { setConfirmLoading(false); }
                                        }}
                                        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                                    >
                                        {confirmLoading ? 'Confirmando...' : '✓ Confirmar medidas'}
                                    </button>
                                    <button
                                        onClick={() => setConfirmando(null)}
                                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 transition-colors"
                                    >Cancelar</button>
                                </div>
                            </div>
                        )}
                        </>
                    );
                })()

            ) : (
                /* GRID DE INSUMOS NORMAL */
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
                                                {item.ActiveBatches.map((batch) => {
                                                    const esPendiente = batch.Estado === 'Pendiente';
                                                    const esConfirmando = confirmando?.bobina?.BobinaID === batch.BobinaID;

                                                    // Restricción de área para mostrar botón Confirmar
                                                    const userArea = (user?.areaKey || '').trim().toUpperCase();
                                                    const bobinaArea = (batch.AreaID || '').trim().toUpperCase();
                                                    const puedeConfirmar = isAdmin || userArea === bobinaArea;

                                                    return (
                                                        <div key={batch.BobinaID}>
                                                            <div className={`flex justify-between items-center p-2 rounded text-sm border transition-colors group ${
                                                                esPendiente
                                                                    ? 'bg-amber-50 border-amber-200'
                                                                    : 'bg-slate-50 border-slate-100 hover:border-blue-200'
                                                            }`}>
                                                                <div className="flex gap-2 items-center flex-1 min-w-0">
                                                                    {/* Dot de estado */}
                                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                                        esPendiente ? 'bg-amber-400 animate-pulse'
                                                                        : batch.Estado === 'En Uso' ? 'bg-orange-400 animate-pulse'
                                                                        : 'bg-green-500'
                                                                    }`} title={batch.Estado} />

                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="font-medium text-slate-700 truncate">{batch.CodigoEtiqueta}</span>
                                                                        {esPendiente && (
                                                                            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
                                                                                ⏳ Pendiente Medida
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {selectedAreas.length > 1 && (
                                                                        <span className="text-[10px] px-1 rounded bg-gray-200 text-gray-600 flex-shrink-0">{batch.AreaID}</span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    {/* Metros: para pendiente muestra declarados */}
                                                                    <div className="text-right">
                                                                        <span className="text-slate-600 font-mono">{batch.MetrosRestantes}m</span>
                                                                        {esPendiente && (
                                                                            <span className="block text-[10px] text-amber-500">declarados</span>
                                                                        )}
                                                                    </div>

                                                                    {esPendiente ? (
                                                                        /* BOTÓN CONFIRMAR MEDIDA */
                                                                        puedeConfirmar && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setConfirmando({ bobina: batch, insumoName: item.Nombre });
                                                                                    setMetrosRealesInput(String(batch.MetrosRestantes));
                                                                                    setAnchoInput(batch.Ancho ? String(batch.Ancho) : '');
                                                                                    setPesoInput(batch.Peso  ? String(batch.Peso)  : '');
                                                                                }}
                                                                                className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
                                                                                title="Confirmar medida real"
                                                                            >
                                                                                <CheckCircle className="w-3 h-3" />
                                                                                Confirmar
                                                                            </button>
                                                                        )
                                                                    ) : (
                                                                        /* ACCIONES NORMALES */
                                                                        <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={() => handlePrintLabel(batch, item.Nombre, item.CodArt)}
                                                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                                                title="Imprimir Etiqueta"
                                                                            >
                                                                                <Printer className="w-4 h-4" />
                                                                            </button>
                                                                            {/* Botón estado de cuenta — solo tela de cliente */}
                                                                            {batch.ClienteID && (
                                                                                <button
                                                                                    onClick={() => setEstadoTelaBobina(batch.BobinaID)}
                                                                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                                                    title="Ver estado de cuenta"
                                                                                >
                                                                                    <FileText className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={() => setManagingBobina({ bobina: batch, insumoName: item.Nombre })}
                                                                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                                                                                title="Administrar / Ajustar"
                                                                            >
                                                                                <Settings2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* PANEL INLINE DE CONFIRMACIÓN */}
                                                            {esConfirmando && (
                                                                <div className="mt-1 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                                                                    <p className="text-xs font-bold text-amber-800 mb-2">
                                                                        Confirmar medida real — {confirmando.insumoName}
                                                                    </p>
                                                                    <div className="flex items-center gap-1 mb-2 text-xs text-slate-600">
                                                                        <span>Declarados:</span>
                                                                        <strong>{batch.MetrosIniciales} m</strong>
                                                                    </div>
                                                                    <div className="flex gap-2 items-center">
                                                                        <label className="text-xs text-slate-600 whitespace-nowrap">Largo (m):</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0.01"
                                                                            value={metrosRealesInput}
                                                                            onChange={e => setMetrosRealesInput(e.target.value)}
                                                                            className="border border-amber-300 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:border-amber-500"
                                                                            autoFocus
                                                                        />
                                                                        <span className="text-xs text-slate-500">m</span>
                                                                    </div>
                                                                    <div className="flex gap-2 items-center mt-2">
                                                                        <label className="text-xs text-slate-600 whitespace-nowrap">Ancho (m):</label>
                                                                        <input
                                                                            type="number" step="0.01" min="0"
                                                                            value={anchoInput}
                                                                            onChange={e => setAnchoInput(e.target.value)}
                                                                            className="border border-slate-300 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:border-amber-500"
                                                                            placeholder="0.00"
                                                                        />
                                                                        <span className="text-xs text-slate-500">m</span>
                                                                    </div>
                                                                    <div className="flex gap-2 items-center mt-2">
                                                                        <label className="text-xs text-slate-600 whitespace-nowrap">Peso (kg):</label>
                                                                        <input
                                                                            type="number" step="0.01" min="0"
                                                                            value={pesoInput}
                                                                            onChange={e => setPesoInput(e.target.value)}
                                                                            className="border border-slate-300 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:border-amber-500"
                                                                            placeholder="0.00"
                                                                        />
                                                                        <span className="text-xs text-slate-500">kg</span>
                                                                    </div>

                                                                    {/* Alerta diferencia >10% */}
                                                                    {(() => {
                                                                        const decl = parseFloat(batch.MetrosIniciales) || 0;
                                                                        const real = parseFloat(metrosRealesInput) || 0;
                                                                        const pct  = decl > 0 ? Math.abs((real - decl) / decl) * 100 : 0;
                                                                        return pct > 10 ? (
                                                                            <div className="flex items-center gap-1 mt-2 text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded px-2 py-1">
                                                                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                                                                Diferencia del {pct.toFixed(1)}% ({(real - decl) > 0 ? '+' : ''}{(real - decl).toFixed(2)} m)
                                                                            </div>
                                                                        ) : null;
                                                                    })()}

                                                                    <div className="flex gap-2 mt-3">
                                                                        <button
                                                                            disabled={confirmLoading}
                                                                            onClick={async () => {
                                                                                const metros = parseFloat(metrosRealesInput);
                                                                                if (!metros || metros <= 0) {
                                                                                    toast.error('Ingresá los metros reales medidos');
                                                                                    return;
                                                                                }
                                                                                setConfirmLoading(true);
                                                                                try {
                                                                                    const ancho = parseFloat(anchoInput) || null;
                                                                                    const peso  = parseFloat(pesoInput)  || null;
                                                                                    const res = await inventoryService.confirmarMedida(batch.BobinaID, metros, ancho, peso);
                                                                                    if (res.alerta) toast.warning(res.alertaMsg);
                                                                                    else toast.success('✅ Medida confirmada. Tela disponible para producción.');
                                                                                    setConfirmando(null);
                                                                                    loadInventory();
                                                                                } catch (err) {
                                                                                    toast.error(err?.response?.data?.error || 'Error al confirmar');
                                                                                } finally {
                                                                                    setConfirmLoading(false);
                                                                                }
                                                                            }}
                                                                            className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                                                                        >
                                                                            {confirmLoading ? 'Confirmando...' : '✓ Confirmar'}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setConfirmando(null)}
                                                                            className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 transition-colors"
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
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

            {estadoTelaBobina && (
                <EstadoTelaModal
                    bobinaId={estadoTelaBobina}
                    onClose={() => setEstadoTelaBobina(null)}
                />
            )}
        </div>
    );
};

export default InventoryPage;

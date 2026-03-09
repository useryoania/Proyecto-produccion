import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import { Package, Truck, Search, QrCode, FileText, CheckCircle, RefreshCcw, DollarSign, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

const EntregaPedidosView = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('encomiendas'); // Arrancamos en encomiendas por pedido del user 
    const [loading, setLoading] = useState(false);

    // --- TAB: MOSTRADOR (Gestión por Cliente / Pedido) ---
    const [searchTerm, setSearchTerm] = useState('');
    const [clientData, setClientData] = useState(null);

    // --- TAB: ENCOMIENDAS (DESPACHOS) ---
    const [lugaresRetiro, setLugaresRetiro] = useState([]);
    const [filtroLugar, setFiltroLugar] = useState('1'); // Default 1 (Encomienda) 
    const [filtroPagoEncomiendas, setFiltroPagoEncomiendas] = useState('todas'); // todas, pagas, nopagas

    const [encomiendas, setEncomiendas] = useState([]);
    const [selectedEncomiendas, setSelectedEncomiendas] = useState(new Set());

    // UI State para expandir filas (ver las ordenes hijas)
    const [expandedRows, setExpandedRows] = useState(new Set());

    // --- INICIALIZACIÓN ---
    useEffect(() => {
        loadLugaresRetiro();
    }, []);

    useEffect(() => {
        if (activeTab === 'encomiendas') {
            loadDespachos();
        }
    }, [activeTab, filtroLugar, filtroPagoEncomiendas]);

    // Cargar Catálogo de Lugares
    const loadLugaresRetiro = async () => {
        try {
            const response = await api.get('/apilugaresRetiro/lugares-retiro');
            setLugaresRetiro(response.data);
            // Si la data viene vacía, no pisamos el filtro por ahora
        } catch (error) {
            console.error("Error cargando lugares:", error);
            toast.error("Error al cargar los Lugares de Retiro");
        }
    };

    // Cargar las "Encomiendas" desde el Endpoint de Backend
    const loadDespachos = async () => {
        if (!filtroLugar) return;
        setLoading(true);
        try {
            let pagas = '';
            let nopagas = '';
            if (filtroPagoEncomiendas === 'pagas') pagas = 'true';
            if (filtroPagoEncomiendas === 'nopagas') nopagas = 'true';

            const response = await api.get(`/apiordenesretiro/lugar/${filtroLugar}?pagas=${pagas}&no_pagas=${nopagas}`);
            setEncomiendas(response.data);
            setSelectedEncomiendas(new Set());
        } catch (error) {
            console.error("Error cargando despachos:", error);
            toast.error("Error al cargar las Órdenes de Retiro");
        } finally {
            setLoading(false);
        }
    };

    // --- ACCIONES TAB ENCOMIENDAS ---
    const toggleRow = (ordenRetiro) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(ordenRetiro)) {
            newSet.delete(ordenRetiro);
        } else {
            newSet.add(ordenRetiro);
        }
        setExpandedRows(newSet);
    };

    const toggleCheckEncomienda = (ordenRetiro) => {
        const newSet = new Set(selectedEncomiendas);
        if (newSet.has(ordenRetiro)) {
            newSet.delete(ordenRetiro);
        } else {
            newSet.add(ordenRetiro);
        }
        setSelectedEncomiendas(newSet);
    };

    const toggleAllEncomiendas = () => {
        if (selectedEncomiendas.size === encomiendas.length && encomiendas.length > 0) {
            setSelectedEncomiendas(new Set());
        } else {
            setSelectedEncomiendas(new Set(encomiendas.map(e => e.ordenDeRetiro)));
        }
    };

    const marcarEntregadas = async () => {
        if (selectedEncomiendas.size === 0) {
            return toast.warning("Selecciona al menos una orden para entregar.");
        }

        // Revisar si requiere password
        const requiereAuth = Array.from(selectedEncomiendas).some(ordenCodigo => {
            const orden = encomiendas.find(e => e.ordenDeRetiro === ordenCodigo);
            if (!orden) return false;
            // Si no esta paga y es tipo cliente comun (no 2 ni 3)
            const esNoPaga = orden.pagorealizado === 0;
            const requierePass = (orden.TClIdTipoCliente !== 2 && orden.TClIdTipoCliente !== 3);
            return esNoPaga && requierePass;
        });

        let password = null;
        if (requiereAuth) {
            const { value: pass, isConfirmed } = await Swal.fire({
                title: 'Autorización Requerida',
                text: 'Estás intentando entregar una orden no paga (Cliente Común). Ingresa la clave de autorización:',
                input: 'password',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#2563EB',
                cancelButtonColor: '#64748B',
                confirmButtonText: 'Autorizar Entrega',
                cancelButtonText: 'Cancelar'
            });

            if (!isConfirmed) return;
            if (!pass) return toast.error("La contraseña no puede estar vacía.");
            password = pass;
        }

        setLoading(true);
        try {
            const payload = {
                ordenesParaEntregar: Array.from(selectedEncomiendas),
                password
            };
            const response = await api.post('/apiordenesretiro/despachos/entregar-autorizado', payload);
            toast.success(response.data.message || "Órdenes entregadas correctamente.");
            loadDespachos(); // Recargar grilla
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Error al procesar la entrega.";
            Swal.fire('Error', errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- ACCIONES TAB MOSTRADOR (Mock por ahora) ---
    const mockSearch = () => {
        /* mockData omitido en este paso, pero la grilla se mantiene intacta */
        toast.info("Estamos conectando la pestaña Mostrador enseguida...");
    };

    return (
        <div className="p-4 lg:p-8 w-full max-w-[1400px] mx-auto min-h-[85vh] flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <Package className="text-blue-600" size={32} />
                        Entrega de Pedidos & Logística
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Gestión integral de despachos, retiros y cobranza remota.</p>
                </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('encomiendas')}
                    className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'encomiendas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Package size={18} /> Logística y Despachos
                </button>
                <button
                    onClick={() => setActiveTab('mostrador')}
                    className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'mostrador' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Truck size={18} /> Mostrador & Facturación Remota
                </button>
            </div>

            {/* TAB: ENCOMIENDAS (DESPACHOS) */}
            {activeTab === 'encomiendas' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                        <h2 className="text-xl font-black text-slate-800">Órdenes a Despachar / Entregar</h2>

                        {/* Filtros Especiales */}
                        <div className="flex flex-wrap gap-4 items-center w-full xl:w-auto">
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Lugar de Retiro:</span>
                                <select
                                    className="bg-transparent font-bold text-slate-800 text-sm outline-none cursor-pointer"
                                    value={filtroLugar}
                                    onChange={(e) => setFiltroLugar(e.target.value)}
                                >
                                    {lugaresRetiro.map(lr => (
                                        <option key={lr.LReIdLugarRetiro} value={lr.LReIdLugarRetiro}>{lr.LReNombreLugar}</option>
                                    ))}
                                    {lugaresRetiro.length === 0 && <option value="">Cargando...</option>}
                                </select>
                            </div>

                            <select
                                value={filtroPagoEncomiendas}
                                onChange={(e) => setFiltroPagoEncomiendas(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="todas">⭐ Mostrar Todas</option>
                                <option value="pagas">💰 Sólo Pagas</option>
                                <option value="nopagas">❗️ No Pagas</option>
                            </select>

                            <button onClick={loadDespachos} disabled={loading} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Recargar">
                                <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>

                            <div className="flex-1"></div> {/* Separador elástico para alinear botones a derecha en Mobile */}

                            <button className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2">
                                <FileText size={16} /> Reporte Despacho
                            </button>
                            <button
                                onClick={marcarEntregadas}
                                disabled={selectedEncomiendas.size === 0 || loading}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
                            >
                                <CheckCircle size={16} /> {loading ? <RefreshCcw className="animate-spin" size={16} /> : `Entregar (${selectedEncomiendas.size})`}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] font-black border-b border-slate-200">
                                    <th className="p-4 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            checked={selectedEncomiendas.size === encomiendas.length && encomiendas.length > 0}
                                            onChange={toggleAllEncomiendas}
                                        />
                                    </th>
                                    <th className="p-4">Orden Retiro</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Total Importe</th>
                                    <th className="p-4">Estado / Lugar</th>
                                    <th className="p-4 text-center">Pago</th>
                                </tr>
                            </thead>
                            <tbody>
                                {encomiendas.map((enc, i) => {
                                    const isExpanded = expandedRows.has(enc.ordenDeRetiro);
                                    const isSelected = selectedEncomiendas.has(enc.ordenDeRetiro);
                                    const clienteEsComun = enc.TClIdTipoCliente !== 2 && enc.TClIdTipoCliente !== 3;

                                    return (
                                        <React.Fragment key={enc.ordenDeRetiro}>
                                            <tr className={`border-b border-slate-100 transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                                <td className="p-4 text-center h-full align-middle">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        checked={isSelected}
                                                        onChange={() => toggleCheckEncomienda(enc.ordenDeRetiro)}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <button onClick={() => toggleRow(enc.ordenDeRetiro)} className="flex items-center gap-2 font-black text-blue-600 hover:text-blue-800 transition-colors">
                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                        {enc.ordenDeRetiro}
                                                    </button>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-6 mt-1">
                                                        {enc.orders?.length || 0} HIJAS
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-bold text-slate-800 block text-base leading-none mb-1">
                                                        {enc.CliCodigoCliente}
                                                    </span>
                                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${clienteEsComun ? 'bg-slate-100 text-slate-500' : 'bg-purple-100 text-purple-700'}`}>
                                                        {enc.TClDescripcion}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-black text-slate-800 text-lg">
                                                        UYU {/* Hardcodeado simbolicamente o usamos enc.orders[0]?.moneda o asuminos el total global si no hay multi-moneda en la ordenretiro principal */} {enc.totalCost}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="bg-slate-200/80 text-slate-700 px-3 py-1 rounded shadow-sm text-xs font-bold uppercase block w-fit mb-1">{enc.estado}</span>
                                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Truck size={12} /> {enc.lugarRetiro}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {enc.pagorealizado === 1 ?
                                                        <div className="inline-flex flex-col items-center">
                                                            <span className="text-green-700 font-black bg-green-100 px-3 py-1 rounded-md text-xs tracking-wider shadow-sm border border-green-200">
                                                                PAGADO
                                                            </span>
                                                        </div>
                                                        :
                                                        <div className="inline-flex flex-col items-center">
                                                            <span className="text-red-600 font-black bg-red-100 px-3 py-1 rounded-md text-xs tracking-wider shadow-sm border border-red-200">
                                                                PENDIENTE
                                                            </span>
                                                            {clienteEsComun && (
                                                                <i className="fa-solid fa-lock text-slate-400 mt-1" title="Requiere Autorización"></i>
                                                            )}
                                                        </div>
                                                    }
                                                </td>
                                            </tr>
                                            {/* Fila expandible con sub-órdenes */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50">
                                                    <td colSpan="6" className="p-0 border-b border-slate-200">
                                                        <div className="p-4 pl-14 pt-0">
                                                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-2">
                                                                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                                                                    <span className="text-xs font-black text-slate-500 uppercase">Composición de {enc.ordenDeRetiro}</span>
                                                                </div>
                                                                <table className="w-full text-xs text-left">
                                                                    <tbody>
                                                                        {enc.orders?.map(o => (
                                                                            <tr key={o.orderNumber} className="border-b border-slate-50 hover:bg-slate-50">
                                                                                <td className="p-3 pl-4 font-bold text-slate-700 w-32">{o.orderNumber}</td>
                                                                                <td className="p-3 text-slate-500 font-medium">Estado Sub-Orden: <span className="text-slate-700 font-bold">{o.orderEstado}</span></td>
                                                                                <td className="p-3 font-bold text-blue-600 text-right pr-4">{o.orderCosto}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {!loading && encomiendas.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-10 text-center text-slate-500">
                                            <Truck size={40} className="mx-auto mb-3 text-slate-300" />
                                            <p className="font-bold text-lg">No hay órdenes para despachar</p>
                                            <p className="text-sm font-medium">bajo los filtros seleccionados.</p>
                                        </td>
                                    </tr>
                                )}

                                {loading && encomiendas.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-10 text-center text-blue-600">
                                            <RefreshCcw className="animate-spin mx-auto mb-3 text-blue-500" size={30} />
                                            <p className="font-bold">Cargando...</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB MOSTRADOR (Skeleton Mantenido) */}
            {activeTab === 'mostrador' && (
                <div className="flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[300px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Buscar por Cliente o N° Orden</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Ej: MACROSOFT o R-8327 o O-15020"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-bold transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && mockSearch()}
                                />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                            </div>
                        </div>
                        <button
                            onClick={mockSearch}
                            disabled={!searchTerm}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <Search size={20} />
                            Buscar Expediente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EntregaPedidosView;

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Search, Loader2, Save, Trash2, Download, Filter, RefreshCcw, CheckSquare, Square, ChevronDown, CheckCircle, Database, X } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';
import { utils, writeFile } from 'xlsx';

const OrderSearchPage = () => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [orders, setOrders] = useState([]);
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [estadosOrden, setEstadosOrden] = useState([]);
    const [tiposClientes, setTiposClientes] = useState([]);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
    const dropdownRef = useRef(null);

    // Filters match the old BaseDeposito.js state
    const [filters, setFilters] = useState({
        codigoCliente: '',
        estados: [], // array of strings
        fechaDesde: '',
        fechaHasta: '',
        codigoOrden: '',
        tipoCliente: ''
    });

    const [nuevoEstado, setNuevoEstado] = useState('');
    const [loading, setLoading] = useState(false);
    const [bulkUpdating, setBulkUpdating] = useState(false);

    useEffect(() => {
        fetchEstadosOrdenes();
        fetchTiposClientes();

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const fetchEstadosOrdenes = async () => {
        try {
            const res = await api.get('/apiordenes/estados/list');
            setEstadosOrden(res.data || []);
        } catch (error) {
            console.error('Error al obtener estados de órdenes:', error);
            toast.error('Error al cargar la lista de estados');
        }
    };

    const fetchTiposClientes = async () => {
        try {
            const res = await api.get('/clients/tipos');
            setTiposClientes(res.data || []);
        } catch (error) {
            console.error('Error al obtener tipos de clientes:', error);
            // toast.error('Error al cargar la lista de tipos de cliente'); // Silent error or handle differently
        }
    };

    const fetchAllOrders = async (currentFilters = filters) => {
        const hasFilters =
            currentFilters.codigoCliente ||
            currentFilters.codigoOrden ||
            currentFilters.fechaDesde ||
            currentFilters.fechaHasta ||
            currentFilters.tipoCliente ||
            (currentFilters.estados && currentFilters.estados.length > 0);

        if (!hasFilters) {
            toast.warning('Por favor ingrese al menos un filtro de búsqueda.');
            return;
        }

        try {
            setLoading(true);
            setOrders([]); // clear
            setSelectedOrders(new Set()); // clear selection

            const queryParams = new URLSearchParams();
            if (currentFilters.codigoCliente) queryParams.append("codigoCliente", currentFilters.codigoCliente);
            if (currentFilters.codigoOrden) queryParams.append("codigoOrden", currentFilters.codigoOrden);
            if (currentFilters.fechaDesde) queryParams.append("fechaDesde", currentFilters.fechaDesde);
            if (currentFilters.fechaHasta) queryParams.append("fechaHasta", currentFilters.fechaHasta);
            if (currentFilters.tipoCliente) queryParams.append("tipoCliente", currentFilters.tipoCliente);
            if (currentFilters.estados && currentFilters.estados.length > 0) {
                currentFilters.estados.forEach(est => queryParams.append("estado", est));
            }

            const response = await api.get(`/apiordenes/datafilter?${queryParams.toString()}`);
            if (Array.isArray(response.data)) {
                setOrders(response.data);
                if (response.data.length === 0) {
                    toast.info('No se encontraron órdenes con esos filtros.');
                } else {
                    toast.success(`Se encontraron ${response.data.length} órdenes.`);
                }
            } else {
                toast.error('La respuesta del servidor fue inválida.');
            }
        } catch (error) {
            console.error('Error buscando ordenes:', error);
            toast.error('Error al realizar la búsqueda.');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({
            codigoCliente: '',
            estados: [],
            fechaDesde: '',
            fechaHasta: '',
            codigoOrden: '',
            tipoCliente: ''
        });
        setOrders([]);
        setSelectedOrders(new Set());
    };

    const toggleOrderSelection = (idOrden) => {
        setSelectedOrders(prev => {
            const next = new Set(prev);
            if (next.has(idOrden)) next.delete(idOrden);
            else next.add(idOrden);
            return next;
        });
    };

    const toggleAllSelection = () => {
        if (selectedOrders.size === orders.length && orders.length > 0) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(orders.map(o => o.IdOrden)));
        }
    };

    // ACCIONES EN LOTE
    const handleUpdateEstado = async () => {
        if (selectedOrders.size === 0) {
            toast.warning('No hay órdenes seleccionadas.');
            return;
        }
        if (!nuevoEstado) {
            toast.warning('Seleccione el nuevo estado.');
            return;
        }

        try {
            setBulkUpdating(true);

            // Replicando viejo endpoint /apiordenes/actualizarEstado
            await api.post('/apiordenes/actualizarEstado', {
                nuevoEstado: nuevoEstado,
                orderIds: Array.from(selectedOrders)
            });

            toast.success(`Se actualizaron ${selectedOrders.size} órdenes a ${nuevoEstado}`);
            setSelectedOrders(new Set());
            setNuevoEstado('');
            fetchAllOrders(filters); // recargar
        } catch (error) {
            console.error('Error batch update:', error);
            toast.error('Hubo un problema al actualizar estados');
        } finally {
            setBulkUpdating(false);
        }
    };

    const handleDeleteOrders = async () => {
        if (selectedOrders.size === 0) return;
        if (!window.confirm(`¿Estás seguro de que deseas ELIMINAR ${selectedOrders.size} órdenes seleccionadas?`)) return;

        try {
            setBulkUpdating(true);
            // Replicando viejo endpoint /apiordenes/eliminar (usualmente data:{ordenes:[id,id]})
            await api.request({
                url: '/apiordenes/eliminar',
                method: 'DELETE',
                data: { orderIds: Array.from(selectedOrders) }
            });

            toast.success(`Órdenes eliminadas correctamente`);
            setSelectedOrders(new Set());
            fetchAllOrders(filters);
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('Error al eliminar órdenes');
        } finally {
            setBulkUpdating(false);
        }
    };

    const handleDownloadExcel = async () => {
        if (orders.length === 0) {
            toast.warning('No hay órdenes para exportar.');
            return;
        }

        try {
            // Filtrar y mapear igual a BaseDeposito.js
            const filteredOrders = orders
                .filter(order => order.ExportadoOdoo === false)
                .map(order => ({
                    'Líneas del pedido/Producto': order.CodigoOdoo + (order.Modo === 'Normal' ? 'N' : order.Modo === 'Urgente' ? 'U' : ''),
                    'Referencia del pedido': order.CodigoOrden,
                    'Líneas del pedido/Cantidad': order.Cantidad ? parseFloat(order.Cantidad) : 0,
                    'Cliente': order.IdCliente,
                    'Referencia cliente': order.NombreTrabajo,
                    'Modo': order.Modo,
                }));

            if (filteredOrders.length === 0) {
                toast.info('No hay órdenes pendientes de exportación a Odoo.');
                return;
            }

            const worksheet = utils.json_to_sheet(filteredOrders);
            const workbook = utils.book_new();
            utils.book_append_sheet(workbook, worksheet, 'Órdenes');
            writeFile(workbook, 'Ordenes.xlsx');

            // Actualizar exportación en la DB
            const orderIds = orders.filter(o => o.ExportadoOdoo === false).map(o => o.IdOrden);

            await api.post('/apiordenes/actualizarExportacion', { orderIds });
            toast.success('Órdenes exportadas y marcadas en servidor.');

            // Recargar
            fetchAllOrders(filters);

        } catch (error) {
            console.error('EXCEL ERROR:', error);
            toast.error('Error al generar Excel o marcar exportación');
        }
    };

    // Manejo de Estados MultiSelect Simplificado (Tailwind custom render)
    const handleEstadoToggle = (estado) => {
        setFilters(prev => {
            const set = new Set(prev.estados);
            if (set.has(estado)) set.delete(estado);
            else set.add(estado);
            return { ...prev, estados: Array.from(set) };
        });
    };

    const handleSelectAllEstados = (e) => {
        e.stopPropagation();
        if (filters.estados.length === estadosOrden.length) {
            setFilters(prev => ({ ...prev, estados: [] }));
        } else {
            setFilters(prev => ({ ...prev, estados: estadosOrden.map(est => est.Estado || est.EOrNombreEstado) }));
        }
    };

    const allSelected = orders.length > 0 && selectedOrders.size === orders.length;

    return (
        <div className="p-4 lg:p-8 w-full max-w-[1400px] mx-auto min-h-[85vh] flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Header Tipo Base Datos de Ordenes */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <Database className="text-blue-600" size={32} />
                        Base de Datos de Órdenes
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Buscador global multiplataforma. Use los filtros para actualizar estados en masivo.</p>
                </div>
            </div>

            {/* Main Filters Module (Like Old View) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Código Cliente</label>
                        <input
                            type="text"
                            name="codigoCliente"
                            value={filters.codigoCliente}
                            onChange={handleFilterChange}
                            placeholder="Ej. MACROSOFT"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Código Orden</label>
                        <input
                            type="text"
                            name="codigoOrden"
                            value={filters.codigoOrden}
                            onChange={handleFilterChange}
                            placeholder="Ej. O-1234..."
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha Desde</label>
                        <input
                            type="date"
                            name="fechaDesde"
                            value={filters.fechaDesde}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha Hasta</label>
                        <input
                            type="date"
                            name="fechaHasta"
                            value={filters.fechaHasta}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Cliente</label>
                        <select
                            name="tipoCliente"
                            value={filters.tipoCliente}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium transition-all appearance-none"
                        >
                            <option value="">TODOS</option>
                            {tiposClientes.map(tc => (
                                <option key={tc.TClIdTipoCliente} value={tc.TClIdTipoCliente}>
                                    {tc.TClDescripcion}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Multiselect Estados Combo */}
                <div ref={dropdownRef} className="mb-6 relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estados a Filtrar</label>
                    <div
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full md:w-1/2 mx-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer flex justify-between items-center text-slate-700 font-medium transition-all"
                    >
                        <span className="truncate pr-4 font-bold text-sm">
                            {filters.estados.length === 0
                                ? 'Seleccione estados...'
                                : `${filters.estados.length} estado(s) seleccionado(s)`}
                        </span>
                        <ChevronDown size={18} className={`flex-shrink-0 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {dropdownOpen && (
                        <div className="absolute z-10 w-full md:w-1/2 left-1/2 -translate-x-1/2 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <button
                                onClick={handleSelectAllEstados}
                                className="w-full text-left px-4 py-2 bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider flex justify-between items-center border-b border-slate-200 hover:bg-slate-200 transition-colors"
                            >
                                <span>Seleccionar Todos ({estadosOrden.length})</span>
                                {filters.estados.length === estadosOrden.length && <CheckCircle size={14} className="text-blue-600" />}
                            </button>
                            {estadosOrden.map((est) => {
                                const selected = filters.estados.includes(est.Estado || est.EOrNombreEstado);
                                return (
                                    <button
                                        key={est.IdEstadoOrden || est.Estado || est.EOrNombreEstado}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEstadoToggle(est.Estado || est.EOrNombreEstado);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-bold flex items-center justify-between transition-colors border-b border-slate-50 last:border-0 hover:bg-blue-50 ${selected ? 'bg-blue-50/50 text-blue-700' : 'text-slate-600'}`}
                                    >
                                        <span>{est.Estado || est.EOrNombreEstado}</span>
                                        {selected && <CheckCircle size={16} className="text-blue-600" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Selected Filters Chips */}
                    {filters.estados.length > 0 && (
                        <div className="flex flex-wrap gap-2 w-full md:w-1/2 mx-auto mt-3 animate-in fade-in zoom-in-95 duration-200">
                            {filters.estados.map(est => (
                                <span key={est} className="bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-xs font-extrabold px-3 py-1.5 rounded-full border border-blue-300 shadow-sm flex items-center gap-1.5 cursor-default">
                                    {est}
                                    <X
                                        size={14}
                                        className="cursor-pointer hover:bg-blue-300 rounded-full p-0.5"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEstadoToggle(est);
                                        }}
                                    />
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Row 1: Filters */}
                <div className="flex justify-center flex-wrap gap-3 pb-6 border-b border-slate-100 mb-6">
                    <button
                        onClick={() => fetchAllOrders(filters)}
                        disabled={loading}
                        className="bg-blue-600 py-2.5 px-6 rounded-lg text-white font-black flex items-center gap-2 hover:bg-blue-700 transition shadow-sm disabled:opacity-50 uppercase text-sm tracking-wider"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />}
                        Filtrar
                    </button>
                    <button
                        onClick={resetFilters}
                        className="bg-white border-2 border-slate-200 py-2.5 px-6 rounded-lg text-slate-500 font-black flex items-center gap-2 hover:bg-slate-50 transition uppercase text-sm tracking-wider"
                    >
                        <RefreshCcw size={16} /> Restablecer
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        className="bg-emerald-600 py-2.5 px-6 rounded-lg text-white font-black flex items-center gap-2 hover:bg-emerald-700 transition shadow-sm uppercase text-sm tracking-wider"
                    >
                        <Download size={16} /> Descargar Excel
                    </button>
                </div>

                {/* Action Row 2: Bulk Updaters */}
                <div className="flex justify-center flex-wrap gap-3 items-stretch">
                    <select
                        value={nuevoEstado}
                        onChange={(e) => setNuevoEstado(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 text-sm font-bold text-slate-600"
                    >
                        <option value="">Nuevo estado...</option>
                        {estadosOrden.map(e => <option key={e.IdEstadoOrden || e.Estado || e.EOrNombreEstado} value={e.Estado || e.EOrNombreEstado}>{e.Estado || e.EOrNombreEstado}</option>)}
                    </select>

                    <button
                        disabled={selectedOrders.size === 0 || !nuevoEstado || bulkUpdating}
                        onClick={handleUpdateEstado}
                        className={`py-2.5 px-6 rounded-lg font-black flex items-center gap-2 uppercase text-sm tracking-wider transition-all
                            ${selectedOrders.size > 0 && nuevoEstado && !bulkUpdating ? 'bg-slate-800 text-white shadow-md hover:bg-black' : 'bg-slate-100 text-slate-400 cursor-not-allowed'} 
                        `}
                    >
                        {bulkUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Actualizar Estado ({selectedOrders.size})
                    </button>

                    <button
                        disabled={selectedOrders.size === 0 || bulkUpdating}
                        onClick={handleDeleteOrders}
                        className={`py-2.5 px-6 rounded-lg font-black flex items-center gap-2 uppercase text-sm tracking-wider transition-all
                            ${selectedOrders.size > 0 && !bulkUpdating ? 'bg-rose-100 text-rose-600 border border-rose-200 shadow-sm hover:bg-rose-500 hover:text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'} 
                        `}
                    >
                        <Trash2 size={16} /> Eliminar Órdenes
                    </button>
                </div>
            </div>

            {/* Data Grid Section */}
            <div className="flex-1 flex flex-col items-center">
                <h2 className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-tight">Órdenes</h2>

                {orders.length === 0 ? (
                    <p className="text-slate-400 font-medium italic mb-10">No hay órdenes disponibles. Realiza una búsqueda.</p>
                ) : (
                    <div className="bg-white w-full rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-100 border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="p-3 border-r border-slate-200 w-10 text-center">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={toggleAllSelection}
                                                className="w-4 h-4 cursor-pointer accent-blue-600"
                                            />
                                        </th>
                                        <th className="p-3 text-[11px] font-black uppercase text-slate-500 tracking-wider">CÓDIGO ORDEN</th>
                                        <th className="p-3 text-[11px] font-black uppercase text-slate-500 tracking-wider">ORDEN RETIRO</th>
                                        <th className="p-3 text-[11px] font-black uppercase text-slate-500 tracking-wider">CLIENTE</th>
                                        <th className="p-3 text-[11px] font-black uppercase text-slate-500 tracking-wider">NOMBRE TRABAJO</th>
                                        <th className="p-3 text-[11px] font-black uppercase text-slate-500 tracking-wider">PRODUCTO</th>
                                        <th className="p-3 text-[11px] font-black uppercase text-slate-500 tracking-wider">ESTADO</th>
                                        <th className="p-3 text-[11px] font-black uppercase text-slate-500 tracking-wider">CANTIDAD</th>
                                        <th className="p-3 text-[11px] font-black uppercase text-slate-500 tracking-wider">COSTO FINAL</th>
                                        <th className="p-3 text-[11px] font-black uppercase text-slate-500 tracking-wider">FECHA INGRESO</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-sm">
                                    {orders.map(order => (
                                        <tr key={order.IdOrden}
                                            onClick={() => setSelectedOrderDetail(order)}
                                            className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${selectedOrders.has(order.IdOrden) ? 'bg-blue-50/80' : ''}`}
                                        >
                                            <td className="p-3 border-r border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrders.has(order.IdOrden)}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        toggleOrderSelection(order.IdOrden);
                                                    }}
                                                    className="w-4 h-4 cursor-pointer accent-blue-600"
                                                />
                                            </td>
                                            <td className="p-3 text-slate-800 font-bold">{order.CodigoOrden}</td>
                                            <td className="p-3">
                                                {order.OrdenRetiro ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-blue-600">#{order.OrdenRetiro}</span>
                                                        {order.EstadoOrdenRetiro && (
                                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{order.EstadoOrdenRetiro}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-slate-600">{order.IdCliente}</td>
                                            <td className="p-3 text-slate-500 truncate max-w-[150px]" title={order.NombreTrabajo}>{order.NombreTrabajo || '-'}</td>
                                            <td className="p-3 text-slate-600 truncate max-w-[150px]">{order.Producto || '-'}</td>
                                            <td className="p-3">
                                                <span className="bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded text-xs border border-slate-200">{order.EstadoAprobacionStr || order.Estado}</span>
                                            </td>
                                            <td className="p-3 text-slate-600">{order.Cantidad}</td>
                                            <td className="p-3 font-black text-slate-800">{order.CostoFinal ? `${order.MonSimbolo || '$'}${Number(order.CostoFinal).toFixed(2)}` : '-'}</td>
                                            <td className="p-3 text-slate-500 text-xs">{order.FechaIngresoOrden ? order.FechaIngresoOrden : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Detail Order */}
            {selectedOrderDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Modal */}
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h3 className="text-xl font-medium text-slate-700">Detalles de la Orden</h3>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedOrderDetail(null); }}
                                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-full transition-colors focus:outline-none"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body Modal */}
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">

                                {/* Info Row 1 */}
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Código Orden:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.CodigoOrden || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Orden Retiro:</p>
                                    <p className="font-bold text-blue-600">
                                        {selectedOrderDetail.OrdenRetiro ? `#${selectedOrderDetail.OrdenRetiro}` : '-'}
                                        {selectedOrderDetail.EstadoOrdenRetiro && <span className="ml-2 px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] uppercase font-black">{selectedOrderDetail.EstadoOrdenRetiro}</span>}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">ID Cliente:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.IdCliente || '-'}</p>
                                </div>

                                {/* Info Row 2 */}
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Nombre Trabajo:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.NombreTrabajo || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Producto:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.Producto || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Estado:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.Estado || '-'}</p>
                                </div>

                                {/* Info Row 3 */}
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Cantidad:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.Cantidad || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Precio Unitario:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.PrecioUnitario ? `${selectedOrderDetail.MonSimbolo || '$'}${Number(selectedOrderDetail.PrecioUnitario).toFixed(2)}` : '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Costo Final:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.CostoFinal ? `${selectedOrderDetail.MonSimbolo || '$'}${Number(selectedOrderDetail.CostoFinal).toFixed(2)}` : '-'}</p>
                                </div>

                                {/* Info Row 4 */}
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Descuento Aplicado:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.DescuentoAplicado || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Modo:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.Modo || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Lugar Retiro:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.LugarRetiro || '-'}</p>
                                </div>

                                {/* Info Row 5 */}
                                <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Fecha Ingreso Orden:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.FechaIngresoOrden ? selectedOrderDetail.FechaIngresoOrden : '-'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Nota Cliente:</p>
                                    <p className="text-slate-600">{selectedOrderDetail.OrdNotaCliente || '-'}</p>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderSearchPage;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { SOCKET_URL } from '../../services/apiClient';
import { io } from 'socket.io-client';
import {
    DollarSign, CreditCard, Search, X, CheckCircle, AlertTriangle,
    RefreshCw, Loader2, User, Phone, Package, FileText, Filter
} from 'lucide-react';

export const CargaGestionPagosView = () => {
    const { user } = useAuth();
    const [retiros, setRetiros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRetiro, setSelectedRetiro] = useState(null);
    const [formaPago, setFormaPago] = useState('');
    const [moneda, setMoneda] = useState('USD');
    const [monto, setMonto] = useState('');
    const [fileComprobante, setFileComprobante] = useState(null);
    const [metodosPago, setMetodosPago] = useState([]);

    // Cotización
    const [cotizacion, setCotizacion] = useState(null);
    const [loadingCotizacion, setLoadingCotizacion] = useState(false);
    const [isManualCotizacion, setIsManualCotizacion] = useState(false);
    const [manualCotizacion, setManualCotizacion] = useState('');

    // Buscador + Modal
    const [searchTerm, setSearchTerm] = useState('');
    const [searchModal, setSearchModal] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchInput, setSearchInput] = useState('');

    // Filtros
    const [filtroTipoCliente, setFiltroTipoCliente] = useState('todos');
    const [incluirSemanales, setIncluirSemanales] = useState(false);

    const [socketInstance, setSocketInstance] = useState(null);

    // ─── SOCKET ───────────────────────────────────────────
    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
        socket.on("connect", () => console.log("Caja conectada a Sockets:", socket.id));
        socket.on("retiros:update", () => { fetchOrders(); });
        socket.on("actualizado", () => { fetchOrders(); });
        setSocketInstance(socket);
        fetchData();
        return () => {
            socket.disconnect();
            if (selectedRetiro) unlockOrder(selectedRetiro.ordenDeRetiro);
        };
    }, []);

    // Refetch cuando cambian filtros
    useEffect(() => {
        fetchOrders();
    }, [filtroTipoCliente, incluirSemanales]);

    // ─── FETCH ────────────────────────────────────────────
    const fetchOrders = async () => {
        try {
            let url = '/apiordenesRetiro/caja';
            const params = new URLSearchParams();
            if (filtroTipoCliente && filtroTipoCliente !== 'todos') params.append('tipoCliente', filtroTipoCliente);
            if (incluirSemanales) params.append('incluirSemanales', 'true');
            if (params.toString()) url += '?' + params.toString();

            const resRetiros = await api.get(url);
            const dataRetiros = Array.isArray(resRetiros.data) ? resRetiros.data : (Array.isArray(resRetiros) ? resRetiros : []);
            setRetiros(dataRetiros);
        } catch (e) {
            console.error("Error fetching orders:", e);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            await fetchOrders();
            const [resMetodos, resCotiz] = await Promise.allSettled([
                api.get('/apipagos/metodos'),
                api.get('/apicotizaciones/hoy')
            ]);
            if (resMetodos.status === 'fulfilled') {
                setMetodosPago(Array.isArray(resMetodos.value.data) ? resMetodos.value.data : []);
            }
            if (resCotiz.status === 'fulfilled' && resCotiz.value.data?.cotizaciones?.length > 0) {
                setCotizacion(resCotiz.value.data.cotizaciones[0].CotDolar);
            } else {
                setCotizacion(null);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    // ─── COTIZACIÓN: Buscar del banco ─────────────────────
    const handleBuscarCotizacion = async () => {
        setLoadingCotizacion(true);
        try {
            const res = await api.get('/apicotizaciones/hoy');
            if (res.data?.cotizaciones?.length > 0) {
                setCotizacion(res.data.cotizaciones[0].CotDolar);
                setIsManualCotizacion(false);
            } else {
                setIsManualCotizacion(true);
            }
        } catch {
            setIsManualCotizacion(true);
        } finally {
            setLoadingCotizacion(false);
        }
    };

    const handleSetManualCotizacion = async () => {
        if (!manualCotizacion || isNaN(manualCotizacion)) {
            return alert('Ingrese un valor válido para la cotización.');
        }
        if (window.confirm(`¿Establecer la cotización del dólar en ${manualCotizacion} UYU?`)) {
            try {
                await api.post('/apicotizaciones/insertar', { cotizacion: parseFloat(manualCotizacion) });
                setCotizacion(parseFloat(manualCotizacion));
                setIsManualCotizacion(false);
            } catch (error) {
                console.error('Error insertando cotización:', error);
                alert('Error al guardar la cotización. Puede que ya exista una para hoy.');
            }
        }
    };

    // ─── MONEDA / MONTO ───────────────────────────────────
    const handleCurrencyChange = (e) => {
        const newCurrency = e.target.value;
        let payment = parseFloat(monto);
        if (isNaN(payment) || payment <= 0) payment = 0;
        if (moneda === 'USD' && newCurrency === 'UYU' && cotizacion) payment = payment * cotizacion;
        else if (moneda === 'UYU' && newCurrency === 'USD' && cotizacion) payment = payment / cotizacion;
        setMoneda(newCurrency);
        if (payment > 0) setMonto(payment.toFixed(2));
    };

    // ─── LOCK / UNLOCK ────────────────────────────────────
    const lockOrder = async (orderId) => {
        try { await api.post('/apiordenesRetiro/marcarpasarporcaja/1', { ordenDeRetiro: orderId }); }
        catch (e) { console.error("Error locking:", e); }
    };
    const unlockOrder = async (orderId) => {
        try { await api.post('/apiordenesRetiro/marcarpasarporcaja/0', { ordenDeRetiro: orderId }); }
        catch (e) { console.error("Error unlocking:", e); }
    };

    // ─── SELECCIÓN DE RETIRO ──────────────────────────────
    const handleSelectRetiro = async (retiro) => {
        if (selectedRetiro?.ordenDeRetiro === retiro.ordenDeRetiro) {
            await unlockOrder(retiro.ordenDeRetiro);
            setSelectedRetiro(null);
            setMonto('');
            return;
        }
        if (selectedRetiro) await unlockOrder(selectedRetiro.ordenDeRetiro);
        setSelectedRetiro(retiro);
        // Auto-fill monto
        const { sumUSD, sumUYU } = calculatePendingSums(retiro);
        if (moneda === 'USD') {
            const val = sumUSD + (cotizacion ? sumUYU / cotizacion : 0);
            setMonto(val > 0 ? val.toFixed(2) : '');
        } else {
            const val = sumUYU + (cotizacion ? sumUSD * cotizacion : 0);
            setMonto(val > 0 ? val.toFixed(2) : '');
        }
        await lockOrder(retiro.ordenDeRetiro);
    };

    const getOrdenes = (retiro) => retiro?.orders || [];

    const calculatePendingSums = (retiro) => {
        let sumUSD = 0, sumUYU = 0;
        getOrdenes(retiro).forEach(o => {
            if (o.orderIdMetodoPago !== null || o.orderPago !== null) return;
            let costStr = o.orderCosto || "";
            let cost = parseFloat(costStr.replace(/[^0-9.-]+/g, "")) || 0;
            const curSym = costStr.includes('USD') || costStr.includes('U$S') ? 'USD' : (costStr.includes('$') ? 'UYU' : 'USD');
            if (curSym === 'USD') sumUSD += cost;
            else sumUYU += cost;
        });
        return { sumUSD, sumUYU };
    };

    const displayTotal = (retiro) => {
        if (!cotizacion) return "Requiere cotización";
        const { sumUSD, sumUYU } = calculatePendingSums(retiro);
        if (moneda === 'USD') return `USD ${(sumUSD + (sumUYU / cotizacion)).toFixed(2)}`;
        return `$ ${(sumUYU + (sumUSD * cotizacion)).toFixed(2)}`;
    };

    // ─── PAGO ─────────────────────────────────────────────
    const handleRealizarPago = async () => {
        if (!selectedRetiro) return alert("Seleccione una orden para pagar.");
        if (!formaPago) return alert("Seleccione un método de pago.");
        const importe = parseFloat(monto);
        if (isNaN(importe) || importe <= 0) return alert("El importe debe ser mayor que cero.");

        const ordersToPay = getOrdenes(selectedRetiro)
            .filter(o => o.orderIdMetodoPago === null && o.orderPago === null)
            .map(o => o.orderId);
        if (ordersToPay.length === 0) return alert("No hay sub-órdenes listas para pagar.");

        try {
            const monedaId = moneda === 'USD' ? 2 : 1;
            let filenameDest = null;
            if (fileComprobante) {
                const formData = new FormData();
                formData.append('comprobante', fileComprobante);
                const uploadRes = await api.post('/apipagos/uploadComprobante', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                filenameDest = uploadRes.data?.filename || uploadRes.data?.comprobanteUrl || null;
            }
            await api.post('/apipagos/realizarPago', {
                metodoPagoId: parseInt(formaPago),
                monedaId,
                monto: importe,
                ordenRetiro: selectedRetiro.ordenDeRetiro,
                orderNumbers: ordersToPay,
                comprobanteUrl: filenameDest
            });
            alert("Pago guardado exitosamente.");
            setMonto(''); setFormaPago(''); setFileComprobante(null); setSelectedRetiro(null);
            const fileInput = document.getElementById('file-upload');
            if (fileInput) fileInput.value = '';
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Error al procesar el pago.");
        }
    };

    // ─── BUSCADOR INTELIGENTE ──────────────────────────────
    // Si el término coincide con un retiro en la lista → seleccionarlo directamente
    // Si no → buscar en el backend y abrir modal con la situación
    const handleSearch = async () => {
        const term = searchInput.trim();
        if (!term || term.length < 2) return;

        const termLower = term.toLowerCase();

        // 1. Buscar en la lista local de retiros
        const match = retiros.find(retiro => {
            if (retiro.ordenDeRetiro?.toLowerCase() === termLower) return true;
            if (retiro.CliCodigoCliente?.toLowerCase() === termLower) return true;
            if (retiro.CliNombre?.toLowerCase().includes(termLower)) return true;
            // Buscar por código de sub-orden
            return getOrdenes(retiro).some(o => o.orderNumber?.toLowerCase() === termLower);
        });

        if (match) {
            // Encontrado en la lista → seleccionar directamente
            await handleSelectRetiro(match);
            setSearchInput('');
            return;
        }

        // 2. No encontrado en la lista → buscar situación en el backend
        setSearchLoading(true);
        try {
            const res = await api.get(`/apiordenesRetiro/mostrador/buscar?q=${encodeURIComponent(term)}`);
            setSearchModal(res.data);
        } catch (err) {
            console.error(err);
            alert('Error al buscar.');
        } finally {
            setSearchLoading(false);
        }
    };

    // ─── FILTRO LOCAL ─────────────────────────────────────
    const filteredRetiros = retiros.filter((retiro) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        if (retiro.ordenDeRetiro?.toLowerCase().includes(term)) return true;
        if (retiro.CliNombre?.toLowerCase().includes(term)) return true;
        if (retiro.CliCodigoCliente?.toLowerCase().includes(term)) return true;
        for (let o of getOrdenes(retiro)) {
            if (o.codigoOrden?.toLowerCase().includes(term)) return true;
            if (o.orderNumber?.toLowerCase().includes(term)) return true;
        }
        return false;
    });

    // ─── RENDER ───────────────────────────────────────────
    if (loading && retiros.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-500" size={40} />
                <span className="ml-3 text-zinc-500 font-medium">Cargando caja...</span>
            </div>
        );
    }

    return (
        <div className="min-h-full flex flex-col gap-5 p-4 lg:p-8 font-sans bg-[#f6f8fb]">

            {/* ─── BANNER COTIZACIÓN (ARRIBA) ─────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl">
                        <DollarSign size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cotización del Dólar</p>
                        {cotizacion !== null ? (
                            <p className="text-xl font-black text-slate-800">1 USD = <span className="text-blue-600">{Number(cotizacion).toFixed(2)}</span> UYU</p>
                        ) : (
                            <p className="text-sm font-semibold text-amber-600">Sin cotización cargada</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={handleBuscarCotizacion}
                        disabled={loadingCotizacion}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all disabled:opacity-50"
                    >
                        {loadingCotizacion ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Buscar del Banco
                    </button>

                    {(isManualCotizacion || cotizacion === null) && (
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={manualCotizacion}
                                onChange={(e) => setManualCotizacion(e.target.value)}
                                placeholder="Ej: 42.50"
                                className="w-28 border-2 border-amber-300 rounded-xl px-3 py-2 font-bold text-center text-sm focus:border-blue-500 outline-none bg-amber-50"
                            />
                            <button
                                onClick={handleSetManualCotizacion}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all"
                            >
                                Confirmar
                            </button>
                        </div>
                    )}

                    {cotizacion !== null && !isManualCotizacion && (
                        <button
                            onClick={() => setIsManualCotizacion(true)}
                            className="text-xs text-slate-400 hover:text-blue-500 underline transition-colors"
                        >
                            Cambiar manual
                        </button>
                    )}
                </div>
            </div>

            {/* ─── FORMULARIO DE PAGO (COMPACTO) ──────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-end gap-3 flex-wrap">
                    {/* Forma de pago */}
                    <div className="flex flex-col gap-1 min-w-[180px] flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Método de Pago</label>
                        <select
                            className="bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 text-sm font-semibold"
                            value={formaPago}
                            onChange={(e) => setFormaPago(e.target.value)}
                        >
                            <option value="">Seleccione...</option>
                            {metodosPago.map((m) => (
                                <option key={m.MPaIdMetodoPago} value={m.MPaIdMetodoPago}>{m.MPaDescripcionMetodo}</option>
                            ))}
                        </select>
                    </div>

                    {/* Moneda */}
                    <div className="flex flex-col gap-1 w-[100px]">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Moneda</label>
                        <select
                            className="bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 text-sm font-semibold"
                            value={moneda}
                            onChange={handleCurrencyChange}
                        >
                            <option value="USD">USD</option>
                            <option value="UYU">UYU</option>
                        </select>
                    </div>

                    {/* Monto + Botón Pagar */}
                    <div className="flex items-end gap-2 flex-1 min-w-[280px]">
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monto a cobrar</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{moneda === 'USD' ? 'U$S' : '$'}</span>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 outline-none focus:border-blue-500 text-lg font-black"
                                    value={monto}
                                    onChange={(e) => setMonto(e.target.value)}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleRealizarPago}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all hover:scale-[1.02] text-sm whitespace-nowrap flex items-center gap-2"
                        >
                            <CreditCard size={16} /> Realizar Pago
                        </button>
                    </div>

                    {/* Comprobante */}
                    <div className="flex flex-col gap-1 min-w-[160px]">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comprobante</label>
                        <input
                            type="file"
                            id="file-upload"
                            onChange={(e) => setFileComprobante(e.target.files[0])}
                            className="text-xs border-2 border-dashed border-slate-200 p-2 rounded-xl cursor-pointer hover:border-blue-400 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* ─── CONTENIDO PRINCIPAL ─────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 flex-1">

                {/* PANEL IZQUIERDO: Lista de Retiros */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">

                    {/* Filtro rápido + Buscador */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filtrar retiros..."
                                className="w-full pl-9 pr-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                placeholder="Buscar situación..."
                                className="w-36 pl-3 pr-2 py-2 border-2 border-blue-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-blue-50"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button
                                onClick={handleSearch}
                                disabled={searchLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-all disabled:opacity-50"
                                title="Buscar situación de pago"
                            >
                                {searchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* Filtros por tipo de cliente */}
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Filter size={12} className="text-slate-400" />
                        {[
                            { val: 'todos', label: 'Todos' },
                            { val: '1', label: 'Comunes' },
                            { val: '3', label: 'Rollo Adelantado' },
                        ].map(f => (
                            <button
                                key={f.val}
                                onClick={() => setFiltroTipoCliente(f.val)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border
                                    ${filtroTipoCliente === f.val
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                        <label className="flex items-center gap-1 text-xs text-slate-500 ml-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={incluirSemanales}
                                onChange={(e) => setIncluirSemanales(e.target.checked)}
                                className="rounded border-slate-300"
                            />
                            Semanales
                        </label>
                        <span className="ml-auto text-xs text-slate-400 font-semibold">{filteredRetiros.length} retiros</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-3 leading-tight">
                        Muestra retiros <strong>con cobro pendiente</strong> (Ingresado, Pasar por caja, Abonado de antemano con saldo, Empaquetado sin abonar).
                        Los <strong>semanales</strong> se excluyen por defecto. El filtro consulta al servidor al cambiar.
                    </p>

                    {/* Lista de retiros — chips compactos */}
                    <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[60vh] pr-1 content-start">
                        {filteredRetiros.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center w-full py-8">No hay órdenes pendientes de pago.</p>
                        ) : (
                            filteredRetiros.map((retiro) => {
                                const isSelected = selectedRetiro?.ordenDeRetiro === retiro.ordenDeRetiro;
                                return (
                                    <button
                                        key={retiro.ordenDeRetiro}
                                        onClick={() => handleSelectRetiro(retiro)}
                                        title={retiro.CliNombre || retiro.CliCodigoCliente || ''}
                                        className={`px-4 py-2 rounded-xl border-2 font-black text-sm transition-all whitespace-nowrap
                                            ${isSelected
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600'
                                            }`}
                                    >
                                        {retiro.ordenDeRetiro}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* PANEL DERECHO: Detalle del Retiro */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
                    {selectedRetiro ? (
                        <>
                            {/* Header del retiro — sin total duplicado */}
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-3xl font-black text-blue-600">{selectedRetiro.ordenDeRetiro}</h2>
                                <span className="text-sm text-slate-400 font-medium mt-1">{selectedRetiro.lugarRetiro} • {selectedRetiro.estado}</span>
                            </div>

                            {/* Datos del cliente */}
                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-slate-400" />
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Cliente</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{selectedRetiro.CliNombre || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-slate-400" />
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">ID</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedRetiro.CliCodigoCliente || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" />
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Teléfono</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedRetiro.CliTelefono || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Package size={14} className="text-slate-400" />
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Tipo</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedRetiro.TClDescripcion || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sub-órdenes */}
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Órdenes del retiro</h3>
                            <div className="flex flex-col gap-2 overflow-y-auto max-h-[50vh] pr-1">
                                {getOrdenes(selectedRetiro).length > 0 ? (
                                    getOrdenes(selectedRetiro).map((po, i) => {
                                        const costStr = po.orderCosto || "";
                                        const curSym = costStr.includes('USD') || costStr.includes('U$S') ? 'USD' : (costStr.includes('$') ? 'UYU' : 'USD');
                                        const rawValor = parseFloat(costStr.replace(/[^0-9.-]+/g, "")) || 0;
                                        const isPaid = po.orderIdMetodoPago !== null || po.orderPago !== null;

                                        let converted = '';
                                        if (moneda === 'UYU' && (curSym === 'USD' || curSym === 'U$S') && cotizacion) {
                                            converted = ` → $ ${(rawValor * cotizacion).toFixed(2)}`;
                                        }
                                        if (moneda === 'USD' && (curSym === '$' || curSym === 'UYU') && cotizacion) {
                                            converted = ` → USD ${(rawValor / cotizacion).toFixed(2)}`;
                                        }

                                        return (
                                            <div
                                                key={i}
                                                className={`p-3 rounded-xl border-2 flex items-center justify-between transition-all
                                                    ${isPaid ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {isPaid ? (
                                                        <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                                                    ) : (
                                                        <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                                                    )}
                                                    <div>
                                                        <span className="font-bold text-sm text-slate-800">{po.orderNumber || `Item ${i + 1}`}</span>
                                                        <span className={`ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {isPaid ? 'Pagado' : po.orderEstado || 'Pendiente'}
                                                        </span>
                                                        {po.orderCantidad != null && (
                                                            <span className="ml-2 text-[10px] text-slate-400 font-semibold">
                                                                Cant: <strong className="text-slate-600">{po.orderCantidad % 1 === 0 ? po.orderCantidad : po.orderCantidad.toFixed(2)}</strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-sm text-slate-800">{curSym} {rawValor.toFixed(2)}</p>
                                                    {converted && <p className="text-xs text-slate-400">{converted}</p>}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-slate-400 text-sm text-center py-4">No hay detalles de órdenes.</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-1 text-slate-300">
                            <CreditCard size={64} className="mb-4" />
                            <p className="text-lg font-bold">Seleccione un retiro para cobrar</p>
                            <p className="text-sm mt-1">Haga clic en un retiro de la lista izquierda</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── MODAL DE BÚSQUEDA (SITUACIÓN DE PAGO) ── */}
            {searchModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSearchModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-200 p-4">
                            <h3 className="text-lg font-black text-slate-800">Situación de Pago — "{searchInput}"</h3>
                            <button onClick={() => setSearchModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            {/* Retiros encontrados */}
                            {searchModal.retiroRows && searchModal.retiroRows.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">Con Retiro Asignado</h4>
                                    {(() => {
                                        const groups = {};
                                        searchModal.retiroRows.forEach(r => {
                                            const key = r.OReIdOrdenRetiro;
                                            if (!groups[key]) groups[key] = { ...r, orders: [] };
                                            if (r.OrdIdOrden) groups[key].orders.push(r);
                                        });
                                        return Object.values(groups).map(g => (
                                            <div key={g.OReIdOrdenRetiro} className="bg-slate-50 rounded-xl border border-slate-200 p-3 mb-2">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-black text-blue-700">R-{String(g.OReIdOrdenRetiro).padStart(4, '0')}</span>
                                                    <span className="text-xs font-bold text-slate-500">{g.estadoRetiro} • {g.lugarRetiro}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-2">{g.CliNombre} ({g.CliCodigo}) — {g.TClDescripcion}</p>
                                                {g.orders.map((o, i) => (
                                                    <div key={i} className="flex items-center justify-between py-1 border-t border-slate-200 text-sm">
                                                        <span className="font-semibold">{o.OrdCodigoOrden}</span>
                                                        <span className={`text-xs font-bold ${o.estadoOrden === 'Entregado' || o.estadoOrden === 'Cancelado' ? 'text-slate-400' : 'text-slate-700'}`}>{o.estadoOrden}</span>
                                                        <span className="font-bold">{o.MonSimbolo} {parseFloat(o.OrdCostoFinal || 0).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            )}

                            {/* Sin retiro */}
                            {searchModal.sinRetiro && searchModal.sinRetiro.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Sin Retiro Asignado</h4>
                                    {searchModal.sinRetiro.map((o, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 text-sm">
                                            <div>
                                                <span className="font-bold text-slate-800">{o.OrdCodigoOrden}</span>
                                                <span className="ml-2 text-xs text-slate-400">{o.CliNombre} ({o.CliCodigo})</span>
                                                <span className="ml-2 text-xs text-slate-400">{o.TClDescripcion}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-bold ${o.Pagada ? 'text-emerald-600' : 'text-amber-600'}`}>{o.Pagada ? 'PAGADA' : o.estadoOrden}</span>
                                                <span className="font-bold">{o.MonSimbolo} {parseFloat(o.OrdCostoFinal || 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Sin resultados */}
                            {(!searchModal.retiroRows || searchModal.retiroRows.length === 0) && (!searchModal.sinRetiro || searchModal.sinRetiro.length === 0) && (
                                <p className="text-center text-slate-400 py-8">No se encontraron resultados para "{searchInput}"</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CargaGestionPagosView;

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { receptionService } from '../../../services/api';

const ReceptionPage = () => {
    // Data Lists
    const [clients, setClients] = useState([]);
    const [servicesList, setServicesList] = useState([]);
    const [configLoaded, setConfigLoaded] = useState(false);

    // Form State
    const [nextCode, setNextCode] = useState('PRE-#');
    const [formData, setFormData] = useState({
        clienteId: '',
        tipo: 'PAQUETE DE PRENDAS', // Default
        bultos: 1,
        servicios: [], // Array of strings
        telaCliente: '',
        referencias: [''] // Array of strings
    });

    // Validations & UI
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    // History State
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyFilters, setHistoryFilters] = useState({
        cliente: '', orden: '', fechaDesde: '', fechaHasta: ''
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filter Suggestions
    const [clientSuggestions, setClientSuggestions] = useState([]);

    useEffect(() => {
        loadInitData();
        loadHistory();
    }, []);

    const loadInitData = async () => {
        try {
            const data = await receptionService.getInitData();
            setClients(data.clientes || []);
            setServicesList(data.servicios || []);
            setNextCode(data.nextCode || 'PRE-#');
            setConfigLoaded(true);
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Error cargando configuración inicial.' });
        }
    };

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await receptionService.getHistory({ ...historyFilters, page, pageSize: 20 });
            setHistory(res.rows || []);
            setTotalPages(Math.ceil((res.total || 0) / 20));
        } catch (error) {
            console.error(error);
        } finally {
            setHistoryLoading(false);
        }
    };

    // FORM HANDLERS
    // State for Pending Orders
    const [clientOrders, setClientOrders] = useState([]);

    const handleClientChange = async (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, clienteId: val }));

        // Autocomplete logic
        if (val.length > 1) {
            const matches = clients.filter(c => c.toLowerCase().includes(val.toLowerCase())).slice(0, 10);
            setClientSuggestions(matches);

            // If exact match, fetch orders
            if (clients.includes(val)) {
                fetchClientOrders(val);
            }
        } else {
            setClientSuggestions([]);
            setClientOrders([]);
        }
    };

    // Explicit fetch when selecting from datalist (browser handles change, but checking exact match above covers it mostly. 
    // We can also add onBlur check)
    const handleClientBlur = () => {
        if (clients.includes(formData.clienteId)) {
            fetchClientOrders(formData.clienteId);
        }
    };

    const fetchClientOrders = async (clientName) => {
        try {
            const orders = await receptionService.getOrdersByClient(clientName);
            setClientOrders(orders || []);
        } catch (error) {
            console.error("Error fetching orders:", error);
        }
    };

    const handleServiceToggle = (srv) => {
        setFormData(prev => {
            const exists = prev.servicios.includes(srv);
            const newServices = exists
                ? prev.servicios.filter(s => s !== srv)
                : [...prev.servicios, srv];
            return { ...prev, servicios: newServices };
        });
    };

    const handleRefChange = (idx, val) => {
        const newRefs = [...formData.referencias];
        newRefs[idx] = val;
        setFormData({ ...formData, referencias: newRefs });
    };

    const addRef = () => setFormData({ ...formData, referencias: [...formData.referencias, ''] });
    const removeRef = (idx) => {
        const newRefs = formData.referencias.filter((_, i) => i !== idx);
        setFormData({ ...formData, referencias: newRefs });
    };

    const validate = () => {
        const errs = {};
        if (!formData.clienteId.trim()) errs.clienteId = 'Requerido';

        if (formData.tipo === 'PAQUETE DE PRENDAS' && formData.servicios.length === 0) {
            errs.servicios = 'Selecciona al menos un servicio';
        }

        if (formData.tipo === 'TELA DE CLIENTE' && !formData.telaCliente.trim()) {
            errs.telaCliente = 'Describe la tela';
        }
        // Validacion opcional para servicios en tela? Por ahora opcional.

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };


    const handleReset = () => {
        setFormData({
            clienteId: '',
            tipo: 'PAQUETE DE PRENDAS',
            bultos: 1,
            servicios: [],
            telaCliente: '',
            referencias: ['']
        });
        setErrors({});
        setMessage(null);
        loadInitData(); // Refresh counter
    };

    const handleSaveAndPrint = async () => {
        if (!validate()) return;
        setLoading(true);
        setMessage(null);

        try {
            // 1. Save
            const payload = {
                ...formData,
                referencias: formData.referencias.filter(r => r.trim())
            };
            const res = await receptionService.createReception(payload);

            if (res.success) {
                setMessage({ type: 'success', text: `Orden ${res.ordenAsignada} guardada.` });
                // 2. Print
                await printLabel({
                    orden: res.ordenAsignada,
                    ...payload,
                    fechaHora: new Date().toLocaleString()
                });
                // 3. Reset & Reload
                handleReset();
                loadHistory();
            }

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Error al guardar: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    // PRINT LOGIC
    const iframeRef = useRef(null);

    const printLabel = async (data) => {
        const { orden, tipo, clienteId, bultos, servicios, telaCliente, referencias, fechaHora } = data;

        const contenido = tipo === 'TELA DE CLIENTE' ? telaCliente : servicios.join('/'); // Fixed type string check
        const tituloContenido = tipo === 'TELA DE CLIENTE' ? 'TELA' : 'SERVICIO'; // Fixed type string check
        const refsText = Array.isArray(referencias) ? referencias.join(' | ') : referencias;

        try {
            // HTML Template embedded
            // Update loop for pages to include QR per page with specific bulto info
            // We need to generate QR for each page if we want the unique bulto info encoded in QR? 
            // "en el codigo QR incluye la referencia, y el numero de bulto 1/2"
            // Yes, QR changes per page.

            // This requires generating N QRs.
            // Or we can generate them inside the HTML using a library, but iframe isolation might block scripts or be slow.
            // Better: Generate N data URLs in JSLoop.

            const pages = [];
            for (let i = 0; i < parseInt(bultos); i++) {
                const bultoStr = `${i + 1}/${bultos}`;
                // QR Content: CODIGO | REFS | BULTO X/Y | CONTENIDO
                const qrTxt = `${orden}|${refsText}|Bulto ${bultoStr}|${contenido}`;
                const qrUrl = await QRCode.toDataURL(qrTxt, { width: 300, margin: 2 });
                pages.push({ i, qrUrl, bultoStr });
            }

            const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Etiqueta ${orden}</title>
                <style>
                    @page { size: 100mm 150mm; margin: 0; }
                    body { margin:0; padding:0; background:#fff; font-family: Arial, Helvetica, sans-serif; }
                    .page {
                        width:100mm; height:150mm; box-sizing:border-box;
                        page-break-after: always; display:flex; flex-direction:column; gap:3mm;
                        padding:6mm;
                    }
                    .orden { font-size:22pt; font-weight:800; text-align:center; line-height:1.1; margin-bottom:5px; }
                    .info { display:grid; grid-template-columns: auto 1fr; column-gap:3mm; row-gap:1.5mm; font-size:11pt; line-height:1.2; }
                    .info b { font-weight:700; }
                    .bultoInfo { font-size:12pt; font-weight:700; text-align:left; margin-top:5px; border-top:1px solid #000; padding-top:5px; }
                    .sectionTitle { text-align:center; font-size:12pt; font-weight:700; text-transform:uppercase; margin-top:10px; background:#000; color:#fff; padding:2px; }
                    .content { text-align:center; font-size:14pt; white-space:pre-wrap; word-break:break-word; margin: 5px 0; font-weight:bold; }
                    .qrbox { flex:1; display:flex; align-items:center; justify-content:center; }
                    .qrbox img { width:70mm; height:70mm; object-fit:contain; }
                </style>
            </head>
            <body>
                ${pages.map(p => `
                <div class="page">
                    <div class="orden">${orden}</div>
                    <div class="info">
                        <b>Cliente:</b> <span>${clienteId}</span>
                        <b>Tipo:</b>    <span>${tipo}</span>
                        <b>Fecha:</b>   <span>${fechaHora}</span>
                        <b>Refs:</b>    <span>${refsText || '-'}</span>
                    </div>
                    
                    <div class="bultoInfo">Bulto ${p.bultoStr}</div>
                    
                    <div class="sectionTitle">${tituloContenido}</div>
                    <div class="content">${contenido}</div>
                    
                    <div class="qrbox">
                        <img src="${p.qrUrl}" />
                    </div>
                </div>
                `).join('')}
                <script>
                    window.onload = () => { window.print(); }
                </script>
            </body>
            </html>
            `;

            const iframe = iframeRef.current;
            if (iframe) {
                iframe.srcdoc = htmlContent;
            }

        } catch (e) {
            console.error("Error generating QR or Print:", e);
            alert("Error al generar impresión.");
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* HIDDEN IFRAME FOR PRINTING */}
            <iframe ref={iframeRef} className="hidden" title="PrintFrame" />

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN: FORM */}
                <div className="lg:col-span-2 space-y-6">
                    {/* HEADER */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Recepción de Materiales</h1>
                            <p className="text-slate-500 text-sm">Atención al Cliente</p>
                        </div>
                        <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-mono font-bold text-xl border border-emerald-200">
                            {nextCode}
                        </div>
                    </div>

                    {/* MAIN FORM CARD */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">

                        {/* 1. Cliente & Tipo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente *</label>
                                <input
                                    type="text"
                                    className={`w-full p-2.5 border rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none ${errors.clienteId ? 'border-red-500' : 'border-slate-300'}`}
                                    placeholder="Buscar Cliente..."
                                    value={formData.clienteId}
                                    onChange={handleClientChange}
                                    list="clientOptions"
                                />
                                <datalist id="clientOptions">
                                    {clients.map(c => <option key={c} value={c} />)}
                                </datalist>
                                {errors.clienteId && <p className="text-xs text-red-500 mt-1">{errors.clienteId}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Ingreso *</label>
                                <select
                                    className="w-full p-2.5 border border-slate-300 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.tipo}
                                    onChange={(e) => {
                                        setFormData({ ...formData, tipo: e.target.value, servicios: [] }); // Reset services on type change
                                    }}
                                >
                                    <option value="PAQUETE DE PRENDAS">📦 Paquete de Prendas</option>
                                    <option value="TELA DE CLIENTE">🧵 Tela de Cliente</option>
                                </select>
                            </div>
                        </div>

                        {/* 2. Dynamic Content (Services or Tela) */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            {formData.tipo === 'PAQUETE DE PRENDAS' || formData.tipo === 'TELA DE CLIENTE' ? (
                                <div className="space-y-4">
                                    {/* DESCRIPCIÓN DE TELA SI ES TELA */}
                                    {formData.tipo === 'TELA DE CLIENTE' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descripción de la Tela *</label>
                                            <input
                                                type="text"
                                                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none ${errors.telaCliente ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'}`}
                                                placeholder="Ej: Algodón Jersey Negro..."
                                                value={formData.telaCliente}
                                                onChange={(e) => setFormData({ ...formData, telaCliente: e.target.value })}
                                            />
                                            {errors.telaCliente && <p className="text-xs text-red-500 mt-1">{errors.telaCliente}</p>}
                                        </div>
                                    )}

                                    {/* SERVICIOS */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Servicios Solicitados *</label>
                                        <div className="flex flex-wrap gap-2">
                                            {servicesList.filter(srv => {
                                                const s = srv.toLowerCase();
                                                const isTela = formData.tipo === 'TELA DE CLIENTE';

                                                if (isTela) {
                                                    // Corte, Costura, Bordado, Estampado, SUBLIMACION
                                                    return s.includes('corte') || s.includes('costura') || s.includes('bordado') || s.includes('estampado') || s.includes('sublima');
                                                } else {
                                                    // Solo Bordado o Estampado
                                                    return s.includes('bordado') || s.includes('estampado');
                                                }
                                            }).map(srv => (
                                                <button
                                                    key={srv}
                                                    onClick={() => handleServiceToggle(srv)}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm ${formData.servicios.includes(srv)
                                                            ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                                                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                                        }`}
                                                >
                                                    {formData.servicios.includes(srv) && <i className="fa-solid fa-check mr-1.5"></i>}
                                                    {srv}
                                                </button>
                                            ))}
                                            {/* Mensaje si no hay servicios disponibles */}
                                            {servicesList.length === 0 && <span className="text-xs text-slate-400 font-style-italic">Cargando servicios...</span>}
                                        </div>
                                        {errors.servicios && (formData.tipo === 'PAQUETE DE PRENDAS' || (formData.tipo === 'TELA DE CLIENTE' && formData.servicios.length === 0)) && (
                                            <p className="text-xs text-red-500 mt-2">{errors.servicios}</p>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* 3. Bultos, Referencias & Observaciones */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Bultos</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.bultos}
                                    onChange={(e) => setFormData({ ...formData, bultos: Math.max(1, parseInt(e.target.value) || 1) })}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between">
                                    <span>Referencias (OC / Pedido Pendiente)</span>
                                    <button onClick={addRef} className="text-blue-500 hover:text-blue-700 text-[10px] uppercase font-bold">+ Agregar</button>
                                </label>
                                <div className="space-y-2">
                                    {formData.referencias.map((ref, idx) => (
                                        <div key={idx} className="flex gap-2 relative">
                                            {/* COMBO CON DATALIST PARA PERMITIR TEXTO LIBRE U ORDEN */}
                                            <input
                                                type="text"
                                                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm"
                                                placeholder={`Ref #${idx + 1} o Seleccionar Orden`}
                                                value={ref}
                                                onChange={(e) => handleRefChange(idx, e.target.value)}
                                                list={`ordersList-${idx}`}
                                            />
                                            <datalist id={`ordersList-${idx}`}>
                                                {clientOrders.map(o => <option key={o} value={o} />)}
                                            </datalist>

                                            {formData.referencias.length > 1 && (
                                                <button onClick={() => removeRef(idx)} className="text-slate-400 hover:text-red-500 px-2">
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {clientOrders.length === 0 && formData.clienteId && <p className="text-[10px] text-slate-400 italic">No se encontraron órdenes pendientes o no se ha seleccionado un cliente válido.</p>}
                                </div>
                            </div>


                            {/* Observaciones */}
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</label>
                                <textarea
                                    rows="2"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Notas adicionales..."
                                    value={formData.observaciones || ''}
                                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                />
                            </div>
                        </div>


                        {/* ACTIONS */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <button onClick={handleReset} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-semibold transition-colors">
                                Cancelar / Reset
                            </button>
                            <button
                                onClick={handleSaveAndPrint}
                                disabled={loading}
                                className="px-6 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center gap-2"
                            >
                                {loading ? (
                                    <>Procesando...</>
                                ) : (
                                    <><i className="fa-solid fa-print"></i> Guardar e Imprimir</>
                                )}
                            </button>
                        </div>
                        {message && (
                            <div className={`p-3 rounded-lg text-sm font-bold text-center ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {message.text}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: HISTORY */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-slate-700">Historial Reciente</h2>
                            <button onClick={loadHistory} className="text-slate-400 hover:text-blue-500"><i className="fa-solid fa-rotate-right"></i></button>
                        </div>

                        {/* Mini Filters */}
                        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                            <input
                                placeholder="Cliente..."
                                className="p-1.5 border rounded"
                                value={historyFilters.cliente}
                                onChange={e => setHistoryFilters({ ...historyFilters, cliente: e.target.value })}
                            />
                            <input
                                placeholder="Orden..."
                                className="p-1.5 border rounded"
                                value={historyFilters.orden}
                                onChange={e => setHistoryFilters({ ...historyFilters, orden: e.target.value })}
                            />
                            <button onClick={loadHistory} className="col-span-2 bg-slate-100 py-1 rounded text-slate-600 font-bold hover:bg-slate-200">Buscar</button>
                        </div>

                        <div className="flex-1 overflow-auto max-h-[600px] space-y-3 pr-1">
                            {historyLoading ? (
                                <p className="text-center text-slate-400 text-sm py-4">Cargando...</p>
                            ) : history.length === 0 ? (
                                <p className="text-center text-slate-400 text-sm py-4">Sin registros.</p>
                            ) : (
                                history.map(item => (
                                    <div key={item.RecepcionID} className="p-3 border rounded-lg hover:shadow-md transition-shadow bg-slate-50 group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-xs font-bold text-slate-500 block">{item.Codigo}</span>
                                                <h4 className="font-bold text-slate-800 text-sm">{item.Cliente}</h4>
                                                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.Detalle}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">{new Date(item.FechaRecepcion).toLocaleDateString()} {new Date(item.FechaRecepcion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const isTela = item.Tipo === 'TELA CLIENTE';
                                                    printLabel({
                                                        orden: item.Codigo,
                                                        clienteId: item.Cliente,
                                                        tipo: item.Tipo,
                                                        bultos: item.CantidadBultos,
                                                        servicios: isTela ? [] : (item.Detalle || '').split('/'),
                                                        telaCliente: isTela ? (item.Detalle || '').replace('TELA: ', '') : '',
                                                        referencias: item.Referencias,
                                                        fechaHora: new Date(item.FechaRecepcion).toLocaleString()
                                                    });
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-2 bg-white border rounded shadow text-slate-600 hover:text-blue-600 transition-all"
                                                title="Reimprimir Etiqueta"
                                            >
                                                <i className="fa-solid fa-print"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceptionPage;

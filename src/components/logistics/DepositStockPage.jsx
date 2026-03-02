import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    RefreshCw,
    Package,
    Truck,
    CheckCircle2,
    AlertCircle,
    Eye,
    XCircle,
    ShieldCheck,
    FileText,
    DollarSign,
    CheckSquare,
    Square,
    ArrowRightCircle,
    Send,
    Code,
    ChevronRight,
    ChevronLeft,
    Terminal,
    Activity,
    ChevronUp,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../../services/api';

const DepositStockPage = () => {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeArea, setActiveArea] = useState('DEPOSITO');
    const [selectedQRs, setSelectedQRs] = useState(new Set());
    const [showDetail, setShowDetail] = useState(null);
    const [inputData, setInputData] = useState({});
    const [currentStep, setCurrentStep] = useState(1); // 1: Selección, 2: Validación, 3: Sincronización, 4: Liberado
    const [isExecuting, setIsExecuting] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditData, setAuditData] = useState({ title: '', json: null, type: 'info' });
    const [logs, setLogs] = useState([]);
    const [showTerminal, setShowTerminal] = useState(true);

    const addLog = (msg, type = 'info', data = null) => {
        const newLog = {
            id: Date.now() + Math.random(),
            time: new Date().toLocaleTimeString(),
            message: msg,
            type,
            data: data ? JSON.stringify(data, null, 2) : null
        };
        setLogs(prev => [newLog, ...prev].slice(0, 50));
        console.log(`[SYS-LOG] ${type.toUpperCase()}: ${msg}`, data || '');
    };

    useEffect(() => {
        fetchStock();
    }, [activeArea]);

    const fetchStock = async (keepPayloads = false) => {
        try {
            setLoading(true);
            const response = await http.get(`/logistics/deposit-stock?area=${activeArea}`);
            const data = response.data || [];
            setStock(data);

            setInputData(prev => {
                const initialInputs = {};
                data.forEach(item => {
                    // Try to parse DB payloads
                    let dbReact = null;
                    if (item.ObsReact) {
                        try { dbReact = item.ObsReact.startsWith('{') ? JSON.parse(item.ObsReact) : { message: item.ObsReact }; } catch (e) { dbReact = { message: item.ObsReact }; }
                    }
                    let dbERP = null;
                    if (item.ObsERP) {
                        try { dbERP = item.ObsERP.startsWith('{') ? JSON.parse(item.ObsERP) : { message: item.ObsERP }; } catch (e) { dbERP = { message: item.ObsERP }; }
                    }

                    initialInputs[item.V3String] = {
                        notes: item.Observaciones || '',
                        price: undefined,
                        quantity: undefined,
                        profile: undefined,
                        reactPayload: (keepPayloads && prev[item.V3String]?.reactPayload) ? prev[item.V3String].reactPayload : dbReact,
                        erpPayload: (keepPayloads && prev[item.V3String]?.erpPayload) ? prev[item.V3String].erpPayload : dbERP
                    };
                });
                return initialInputs;
            });
        } catch (error) {
            toast.error('Error al cargar stock de depósito');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (qr, field, value) => {
        setInputData(prev => ({
            ...prev,
            [qr]: {
                ...prev[qr],
                [field]: value
            }
        }));
    };

    const toggleSelect = (qr) => {
        const next = new Set(selectedQRs);
        if (next.has(qr)) next.delete(qr);
        else next.add(qr);
        setSelectedQRs(next);
        if (next.size > 0 && currentStep === 1) setCurrentStep(1);
    };

    const toggleSelectAll = () => {
        if (selectedQRs.size === stock.length) {
            setSelectedQRs(new Set());
        } else {
            setSelectedQRs(new Set(stock.map(i => i.V3String)));
        }
    };

    const handleRecalculate = async () => {
        const selectedItems = stock.filter(i => selectedQRs.has(i.V3String));
        if (selectedItems.length === 0) {
            toast.error('Selecciona al menos una orden para calcular');
            return;
        }

        try {
            setIsExecuting(true);
            addLog(`Iniciando Recálculo de Precios para ${selectedItems.length} items...`, 'process');
            toast.loading('Calculando precios y actualizando costos...', { id: 'recalc' });
            
            const dataToSync = selectedItems.map(item => ({
                qr: item.V3String,
                CodigoOrden: item.CodigoOrden,
                ...inputData[item.V3String]
            }));

            addLog('Payload enviado al servidor de cálculo', 'request', dataToSync);
            const response = await http.post('/logistics/deposit-recalculate', { items: dataToSync });
            
            addLog('Respuesta del servidor recibida', 'success', response.data);
            toast.success('Cálculo de precios completado', { id: 'recalc' });

            // ALMACENAR PAYLOADS DE PREVIEW (Vienen del backend ahora)
            if (response.data && Array.isArray(response.data)) {
                 const newInputData = { ...inputData };
                 response.data.forEach(res => {
                     if (res.qr) {
                         newInputData[res.qr] = {
                             ...newInputData[res.qr],
                             reactPayload: res.reactPayload,
                             erpPayload: res.erpPayload
                         };
                         addLog(`PayLoads auditables generados para QR: ${res.qr}`, 'info');
                     }
                 });
                 setInputData(newInputData);
            }

            setCurrentStep(2);
            await fetchStock(true);
        } catch (error) {
            const errMsg = error.response?.data?.error || error.message;
            addLog(`Error en cálculo: ${errMsg}`, 'error');
            toast.error('Error en cálculo: ' + errMsg, { id: 'recalc' });
        } finally {
            setIsExecuting(false);
        }
    };

    const handleSync = async (target) => {
        const selectedItems = stock.filter(i => selectedQRs.has(i.V3String));
        if (selectedItems.length === 0) {
            toast.error(`Selecciona órdenes para enviar a ${target}`);
            return;
        }

        // Manejo de Re-Sincronización
        const fieldEstado = target === 'REACT' ? 'EstadoSyncReact' : 'EstadoSyncERP';
        let itemsToSync = selectedItems.filter(i => i[fieldEstado] !== 'Enviado_OK');
        const alreadySyncedCount = selectedItems.length - itemsToSync.length;

        // Check global config variables before prompts
        let isConfigEnabled = true;
        try {
            const confRes = await http.get('/configuraciones');
            const targetId = target === 'REACT' ? 'SYNC_REACT_CORE' : 'SYNC_ERP_MACROSOFT';
            const cfg = confRes.data.find(c => c.ProcesoID === targetId);
            if (cfg && !cfg.Activo) isConfigEnabled = false;
        } catch (e) {
            console.error("Config check error:", e);
        }

        if (isConfigEnabled) {
            if (alreadySyncedCount > 0) {
                const confirmReSync = window.confirm(`Hay ${alreadySyncedCount} órdenes que ya figuran como enviadas a ${target}. Si agregaste nuevos bultos y realizaste un recálculo, deberías actualizar los montos.\n\n¿Deseas FORZAR la actualización de estas órdenes en ${target}?`);
                if (confirmReSync) {
                    itemsToSync = selectedItems; // Omitir el filtro y enviar todos
                } else if (itemsToSync.length === 0) {
                    toast.success(`Sincronización omitida. Avanzando...`);
                    if (target === 'REACT' && (currentStep === 3 || currentStep === 2)) setCurrentStep(4);
                    return;
                }
            }

            if (itemsToSync.length > 0 && !window.confirm(`¿Estás seguro que deseas enviar ${itemsToSync.length} órdenes a ${target}?`)) {
                return;
            }
        } else {
            const confirmBypass = window.confirm(`ATENCIÓN: La sincronización a ${target} está APAGADA por el administrador.\n\nAceptar marcará localmente las órdenes como eludidas (Escudo verde) y pasará al siguiente nodo sin enviar los datos a ${target}.\n\n¿Deseas continuar en modo Bypass Local?`);
            if (!confirmBypass) return;
            itemsToSync = selectedItems;
        }

        try {
            setIsExecuting(true);
            addLog(`Iniciando Sincronización con sistema ${target}...`, 'process');
            if (isConfigEnabled) {
                toast.loading(`Enviando ${itemsToSync.length} órdenes a ${target}...`, { id: 'sync' });
            }
            
            const dataToSync = itemsToSync.map(item => ({
                qr: item.V3String,
                CodigoOrden: item.CodigoOrden,
                ...inputData[item.V3String]
            }));

            addLog(`Enviando instrucción al integrador backend. Target: ${target}`, 'request', { target, itemsSent: dataToSync.length });
            
            const res = await http.post('/logistics/deposit-sync', { items: dataToSync, target });
            
            const hasErrors = res.data.results && res.data.results.some(r => r.success === false);

            if (hasErrors) {
                addLog(`Integrador Backend finalizó con ERRORES para ${target}`, 'error', res.data);
                toast.error(`Sincronización a ${target} finalizó con errores marcados en rojo.`, { id: 'sync' });
            } else {
                addLog(`Integrador Backend respondió satisfactoriamente para ${target}`, 'success', res.data);
                if (isConfigEnabled) {
                    toast.success(`Datos enviados a ${target} correctamente`, { id: 'sync' });
                } else {
                    toast.success(`Completado: React Bypass Aplicado en Servidor`, { id: 'sync' });
                }
            }
            
            // Avanzar automáticamente si el target coincide con el step actual y NO huvo errores
            if (!hasErrors) {
                if (target === 'REACT' && (currentStep === 3 || currentStep === 2)) {
                    setCurrentStep(4);
                }
            }
            
            await fetchStock(true);
            addLog('Estado de órdenes actualizado desde base de datos', 'info');
        } catch (error) {
            const errMsg = error.response?.data?.error || error.message;
            addLog(`Error al sincronizar ${target}: ${errMsg}`, 'error');
            toast.error(`Error al sincronizar ${target}: ` + errMsg, { id: 'sync' });
        } finally {
            setIsExecuting(false);
        }
    };

    const handleSyncSingle = async (item, target) => {
        if (target === 'REACT' && item.EstadoSyncReact === 'Enviado_OK') return;
        if (target === 'ERP' && item.EstadoSyncERP === 'Enviado_OK') return;

        try {
            setIsExecuting(true);
            addLog(`Sincronización manual individual con ${target} para ${item.CodigoOrden}...`, 'process');
            toast.loading(`Enviando ${item.CodigoOrden} a ${target}...`, { id: `sync-${item.V3String}` });
            
            const dataToSync = [{
                qr: item.V3String,
                CodigoOrden: item.CodigoOrden,
                ...inputData[item.V3String]
            }];

            addLog(`Enviando instrucción al integrador backend. Target: ${target}`, 'request', { target, itemsSent: 1 });
            
            const res = await http.post('/logistics/deposit-sync', { items: dataToSync, target });
            addLog(`Integrador Backend respondió satisfactoriamente para ${target}`, 'success', res.data);
            
            toast.success(`${item.CodigoOrden} enviado a ${target} correctamente`, { id: `sync-${item.V3String}` });
            
            await fetchStock(true);
        } catch (error) {
            const errMsg = error.response?.data?.error || error.message;
            addLog(`Error al sincronizar ${target}: ${errMsg}`, 'error');
            toast.error(`Error al sincronizar ${target}: ` + errMsg, { id: `sync-${item.V3String}` });
        } finally {
            setIsExecuting(false);
        }
    };

    const handleRelease = async () => {
        const selectedItems = stock.filter(i => selectedQRs.has(i.V3String));
        if (selectedItems.length === 0) {
            toast.error('Selecciona bultos para liberar');
            return;
        }

        try {
            setIsExecuting(true);
            addLog('Iniciando proceso de liberación de stock...', 'process');
            toast.loading('Liberando órdenes...', { id: 'release' });
            
            const dataToSync = selectedItems.map(item => ({ qr: item.V3String }));
            addLog('Solicitando liberación al servidor', 'request', { items: dataToSync.length });
            
            await http.post('/logistics/deposit-release', { items: dataToSync });
            
            addLog('Stock liberado satisfactoriamente', 'success');
            toast.success('Bultos liberados del depósito', { id: 'release' });
            
            setCurrentStep(1); // Reset to start
            setSelectedQRs(new Set());
            fetchStock();
        } catch (error) {
            addLog('Error en liberación: ' + error.message, 'error');
            toast.error('Error al liberar bultos', { id: 'release' });
        } finally {
            setIsExecuting(false);
        }
    };

    // FORMATEO PARA PREVIEW (Simula lo que hace el backend)

    const getNiceOrderNumber = (code) => {
        if (!code) return 'N/A';
        return code.toString().startsWith('ORD-') ? code : `ORD-${code}`;
    };

    const getPreviewString = (item, target) => {
        const isReact = target === 'REACT';
        const fieldObs = isReact ? item.ObsReact : item.ObsERP;
        const fieldEstado = isReact ? item.EstadoSyncReact : item.EstadoSyncERP;
        const payloadInput = isReact ? inputData[item.V3String]?.reactPayload : inputData[item.V3String]?.erpPayload;
        
        let content;
        if (!fieldEstado && payloadInput) {
            content = payloadInput;
        } else if (fieldObs) {
            try {
                content = fieldObs.startsWith('{') ? JSON.parse(fieldObs) : { message: fieldObs };
            } catch(e) { content = fieldObs; }
        } else {
            content = "Generación en el Servidor (Automático)";
        }
        
        return `${typeof content === 'object' ? JSON.stringify(content, null, 2) : content}`;
    };

    const steps = [
        { id: 1, name: 'Selección', icon: CheckSquare },
        { id: 2, name: 'Validación', icon: RefreshCw }, // Incluye el cálculo técnico
        { id: 3, name: 'React', icon: ShieldCheck },
        { id: 4, name: 'Liberación', icon: Package }
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] p-0 font-sans">
            {/* NAVIGATION-FIRST HEADER */}
            <div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-2xl border-b border-slate-200 shadow-sm px-10 py-4">
                <div className="max-w-[1800px] mx-auto flex items-center gap-10">
                    {/* FAR LEFT: BACK BUTTON */}
                    <div className="w-14 min-w-[56px]">
                        {currentStep > 1 && (
                            <button
                                onClick={() => setCurrentStep(prev => prev - 1)}
                                disabled={currentStep >= 5}
                                className={`w-14 h-14 rounded-[2rem] flex items-center justify-center transition-all ${currentStep >= 5 ? 'bg-slate-50 text-slate-200 border border-slate-100 cursor-not-allowed' : 'bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 active:scale-90 shadow-sm'}`}
                                title="Volver al paso anterior"
                            >
                                <ChevronLeft className="w-7 h-7" />
                            </button>
                        )}
                    </div>

                    {/* CENTER-LEFT: SEARCH (COMPACT) */}
                    <div className="relative flex-1 max-w-sm group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar bulto..."
                            className="w-full bg-slate-50 border-2 border-transparent rounded-[1.5rem] py-3 pl-14 pr-6 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all outline-none placeholder:text-slate-300"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* CENTER: STEPPER (INTEGRATED) */}
                    <div className="flex-1 flex justify-center border-x border-slate-100 px-10">
                        <div className="flex items-center gap-4">
                            {steps.map((step, idx) => {
                                const Icon = step.icon;
                                const isActive = currentStep >= step.id;
                                const isCurrent = currentStep === step.id;
                                return (
                                    <div key={step.id} className="flex items-center gap-4">
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-700 ${isActive ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200' : 'bg-slate-50 text-slate-200 border border-slate-100'} ${isCurrent && 'ring-8 ring-indigo-50 border-indigo-300 scale-110'} ${isCurrent && isExecuting && 'animate-spin shadow-indigo-400'}`}>
                                            <Icon className={`w-5 h-5 ${(isCurrent && !isExecuting) && 'animate-pulse'}`} />
                                        </div>
                                        {isCurrent && (
                                            <div className="flex flex-col animate-in slide-in-from-left-4 fade-in duration-500">
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none ${isExecuting ? 'text-indigo-600 animate-pulse' : 'text-slate-800'}`}>
                                                    {isExecuting ? 'Procesando...' : step.name}
                                                </span>
                                                <span className="text-[8px] font-bold text-indigo-500 uppercase mt-1 tracking-widest">Paso {step.id} de 4</span>
                                            </div>
                                        )}
                                        {idx < steps.length - 1 && (
                                            <div className="w-8 h-1 mx-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full bg-indigo-500 transition-all duration-1000 ${currentStep > step.id ? 'w-full' : 'w-0'}`} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* FAR RIGHT: MAIN ACTION BUTTON */}
                    <div className="min-w-max">
                        {currentStep < 4 ? (
                            <button
                                onClick={() => {
                                    if (currentStep === 1) handleRecalculate();
                                    else if (currentStep === 2) setCurrentStep(3); // Pasar de Validación a React
                                    else if (currentStep === 3) handleSync('REACT');
                                    else if (currentStep === 4) handleRelease();
                                }}
                                disabled={selectedQRs.size === 0}
                                className={`flex items-center gap-5 px-10 py-4 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-200 transition-all active:scale-95 shadow-xl shadow-indigo-100/50 ${selectedQRs.size === 0 && 'opacity-30 grayscale pointer-events-none'}`}
                            >
                                <span>
                                    {currentStep === 1 && "Iniciar Cálculo"}
                                    {currentStep === 2 && "Siguiente: React"}
                                    {currentStep === 3 && "Sincronizar React"}
                                    {currentStep === 4 && "Finalizar Operación"}
                                </span>
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        ) : (
                            <button
                                onClick={() => handleRelease()}
                                disabled={selectedQRs.size === 0}
                                className={`flex items-center gap-4 px-10 py-4 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95 ${selectedQRs.size === 0 && 'opacity-30 grayscale pointer-events-none'}`}
                            >
                                Liberar Stock
                                <Package className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* TABLE SECTION */}
            <div className="max-w-[1600px] mx-auto p-8">
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    {loading ? (
                        <div className="p-32 flex flex-col items-center justify-center gap-6">
                            <div className="relative">
                                <RefreshCw className="w-16 h-16 text-indigo-100 animate-spin" />
                                <Package className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-500" />
                            </div>
                            <p className="font-black text-[11px] text-slate-400 uppercase tracking-[0.4em]">Sincronizando Inventario Real...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="p-6 w-20 text-center cursor-pointer group" onClick={toggleSelectAll}>
                                            <div className="flex items-center justify-center">
                                                {selectedQRs.size === stock.length && stock.length > 0 ? (
                                                    <CheckSquare className="w-7 h-7 text-indigo-600 drop-shadow-md" />
                                                ) : (
                                                    <Square className="w-7 h-7 text-slate-200 group-hover:text-slate-300 transition-all" />
                                                )}
                                            </div>
                                        </th>
                                        <th className="p-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identificador / Pedido</th>
                                        <th className="p-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cliente & Especificaciones</th>
                                        <th className="p-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Gestión de Precios</th>
                                        <th className="p-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Importe Final</th>
                                        <th className="p-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sincronización</th>
                                        <th className="p-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {stock.map((item, idx) => {
                                        const isSelected = selectedQRs.has(item.V3String);
                                        const niceOrder = getNiceOrderNumber(item.CodigoOrden);

                                        return (
                                            <tr key={idx} className={`group transition-all duration-300 ${isSelected ? 'bg-indigo-50/20' : 'hover:bg-slate-50/80'}`}>
                                                <td className="p-6 text-center cursor-pointer" onClick={() => toggleSelect(item.V3String)}>
                                                    <div className="flex items-center justify-center">
                                                        {isSelected ? (
                                                            <CheckSquare className="w-7 h-7 text-indigo-600 drop-shadow-md animate-in zoom-in-75 duration-300" />
                                                        ) : (
                                                            <Square className="w-7 h-7 text-slate-100 group-hover:text-slate-200 transition-all" />
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="p-6">
                                                    <div className="flex flex-col gap-1 w-32">
                                                        <span className="text-xl font-black text-slate-800 tracking-tighter group-hover:text-indigo-600 transition-colors uppercase leading-none">{niceOrder}</span>
                                                        <span className="mt-2 inline-flex w-max px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                            {item.CantidadBultos} {item.CantidadBultos === 1 ? 'BULTO' : 'BULTOS'} EN STOCK
                                                        </span>
                                                        {item.BultosList && (
                                                            <div className="mt-1 flex flex-col gap-0.5 max-h-20 overflow-y-auto no-scrollbar">
                                                                {item.BultosList.split(',').map((bCode, bIdx) => (
                                                                    <span key={bIdx} className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1 py-px rounded w-max">
                                                                        {bCode.trim()}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="p-6">
                                                    <div className="flex flex-col gap-2 max-w-sm">
                                                        <div className="font-extrabold text-slate-700 text-xs tracking-tight uppercase leading-none">{item.Cliente}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 italic line-clamp-1 group-hover:line-clamp-none transition-all">
                                                            {item.Descripcion}
                                                        </div>
                                                        {isSelected && (
                                                            <div className="mt-2 p-3 bg-white border border-slate-100 rounded-2xl shadow-inner animate-in slide-in-from-top-2">
                                                                <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest block mb-1.5">Anotaciones de Logística</span>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Escribir observaciones..."
                                                                    value={inputData[item.V3String]?.notes || ''}
                                                                    onChange={(e) => handleInputChange(item.V3String, 'notes', e.target.value)}
                                                                    className="w-full text-xs font-bold text-slate-600 bg-transparent border-none p-0 focus:ring-0 placeholder:text-slate-200"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="p-6">
                                                    {isSelected ? (
                                                        <div className="flex gap-4 items-center justify-center animate-in fade-in zoom-in-95">
                                                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Payload (Envío a React)</span>
                                                                <input
                                                                    readOnly
                                                                    title={typeof inputData[item.V3String]?.reactPayload === 'object' ? JSON.stringify(inputData[item.V3String].reactPayload) : (inputData[item.V3String]?.reactPayload || '')}
                                                                    value={typeof inputData[item.V3String]?.reactPayload === 'object' ? JSON.stringify(inputData[item.V3String].reactPayload) : (inputData[item.V3String]?.reactPayload || '')}
                                                                    className="text-[10px] font-mono font-medium p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-300 text-slate-600 shadow-inner w-full cursor-text"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-1 w-20">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unds Real</span>
                                                                <input
                                                                    type="number"
                                                                    value={(inputData[item.V3String]?.quantity !== undefined) ? inputData[item.V3String].quantity : (item.Cantidad || '')}
                                                                    onChange={(e) => handleInputChange(item.V3String, 'quantity', e.target.value)}
                                                                    className="text-xs font-black p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 shadow-sm text-center"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{item.Cantidad || '0'} Unidades</span>
                                                            </div>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.PerfilesPrecio || 'P. Predeterminado'}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="p-6 text-right">
                                                    {isSelected ? (
                                                        <div className="flex flex-col items-end gap-1.5 animate-in fade-in slide-in-from-right-2">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ajuste Manual</span>
                                                            <div className="relative">
                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-400">USD</span>
                                                                <input
                                                                    type="number"
                                                                    value={(inputData[item.V3String]?.price !== undefined) ? inputData[item.V3String].price : (item.Precio || '')}
                                                                    onChange={(e) => handleInputChange(item.V3String, 'price', e.target.value)}
                                                                    className="text-sm font-black pl-8 pr-3 py-2 w-28 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 shadow-sm text-right"
                                                                />
                                                            </div>
                                                            <div className="flex px-2 py-0.5 bg-indigo-50 rounded text-[7px] font-black text-indigo-600 uppercase tracking-widest">Modificable</div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <div className="font-black text-2xl text-slate-900 tracking-tighter">
                                                                {(parseFloat(item.Precio) || 0).toLocaleString('es-UY', { style: 'currency', currency: item.Moneda || 'UYU' })}
                                                            </div>
                                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Precio Calculado</span>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="p-6">
                                                    <div className="flex items-center justify-center gap-3">
                                                        {/* REACT STATUS AND HOVER INFO */}
                                                        <div className="relative group/btn cursor-help">
                                                            <div
                                                                className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-sm 
                                                                    ${item.EstadoSyncReact === 'Enviado_OK' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-50' :
                                                                        item.EstadoSyncReact === 'Error' ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-rose-50 hover:scale-110 active:scale-95' :
                                                                            'bg-slate-50 border-slate-100 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-white hover:scale-110 active:scale-95'}`}
                                                            >
                                                                <ShieldCheck className="w-5 h-5" />
                                                                {item.EstadoSyncReact === 'Error' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-bounce" />}
                                                                {item.EstadoSyncReact === 'Enviado_OK' && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full border-2 border-white flex items-center justify-center"><Check className="w-2 h-2" /></div>}
                                                            </div>
                                                            {/* CUSTOM SMALL TOOLTIP */}
                                                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[280px] p-3 bg-slate-800 text-slate-100 rounded-2xl opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all z-50 pointer-events-none shadow-2xl scale-95 group-hover/btn:scale-100 origin-bottom">
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-700 pb-1">Payload React (Deseado/Respuesta)</div>
                                                                <pre className="text-[9px] font-mono leading-relaxed overflow-hidden text-emerald-400 max-h-32 overflow-y-auto custom-scrollbar">
                                                                    {getPreviewString(item, 'REACT')}
                                                                </pre>
                                                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45"></div>
                                                            </div>
                                                        </div>

                                                        {item.LogFacturacion && (
                                                            <div
                                                                className="w-10 h-10 rounded-2xl flex items-center justify-center border bg-blue-50 border-blue-200 text-blue-600 cursor-help hover:bg-blue-100 transition-colors"
                                                                title={`LOG DE CÁLCULO:\n\n${item.LogFacturacion}`}
                                                            >
                                                                <Code className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="p-6 text-center">
                                                    <button
                                                        className="w-10 h-10 inline-flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-slate-300 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all active:scale-90"
                                                        onClick={() => setShowDetail(item)}
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
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


            {/* MODAL AUDITORÍA JSON (JHONS) */}
            {showAuditModal && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`p-8 border-b border-slate-100 flex justify-between items-center ${auditData.type === 'success' ? 'bg-emerald-50/50' : (auditData.type === 'error' ? 'bg-rose-50/50' : 'bg-slate-50/50')}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${auditData.type === 'success' ? 'bg-emerald-600' : (auditData.type === 'error' ? 'bg-rose-600' : 'bg-indigo-600')}`}>
                                    {auditData.title.includes('React') ? <ShieldCheck className="w-6 h-6 text-white" /> : <FileText className="w-6 h-6 text-white" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{auditData.title}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Visor de Payload e Integración</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAuditModal(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all">
                                <XCircle className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="mb-6 flex gap-3">
                                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${auditData.type === 'success' ? 'bg-emerald-100 text-emerald-700' : (auditData.type === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600')}`}>
                                    {auditData.type === 'success' ? 'Sincronizado' : (auditData.type === 'error' ? 'Error en Respuesta' : 'Previsualización')}
                                </div>
                            </div>
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                                <pre className="relative p-6 bg-slate-900 text-indigo-300 rounded-2xl text-[10px] font-mono whitespace-pre-wrap overflow-x-auto shadow-inner leading-relaxed border border-indigo-900/30 max-h-[400px] custom-scrollbar">
                                    {auditData.json ? JSON.stringify(auditData.json, null, 4) : '// Ninguna información disponible'}
                                </pre>
                            </div>
                            <p className="mt-6 text-[10px] text-slate-400 font-bold italic text-center">
                                * Los datos mostrados corresponden a la última interacción con los sistemas externos.
                            </p>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button onClick={() => setShowAuditModal(false)} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETALLE TÉCNICO */}
            {showDetail && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-3xl w-full overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200 rotate-6">
                                    <Eye className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Ficha Técnica</h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[11px] font-black uppercase text-indigo-500 tracking-widest leading-none bg-indigo-50 px-2 py-1 rounded-md">{getNiceOrderNumber(showDetail.CodigoOrden)}</span>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{showDetail.V3String}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowDetail(null)} className="p-4 hover:bg-slate-200 bg-white shadow-sm ring-1 ring-slate-100 rounded-3xl transition-all active:scale-90">
                                <XCircle className="w-7 h-7 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-10">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Cliente Final</span>
                                    <p className="text-lg font-black text-slate-800">{showDetail.Cliente}</p>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-2 text-right">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha de Ingreso</span>
                                    <p className="text-lg font-black text-slate-800">{showDetail.FechaIngreso ? new Date(showDetail.FechaIngreso).toLocaleDateString() : 'N/A'}</p>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-900 rounded-[2.5rem] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Package className="w-32 h-32 text-indigo-100 rotate-12" />
                                </div>
                                <div className="relative z-10 space-y-4">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] block">Descripción del Trabajo</span>
                                    <p className="text-base font-bold text-indigo-50/80 leading-relaxed italic">
                                        "{showDetail.Descripcion || 'Sin detalle técnico'}"
                                    </p>
                                </div>
                            </div>

                            {showDetail.LogFacturacion && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <DollarSign className="w-5 h-5 text-emerald-500" />
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Logs de Facturación Aplicados</h3>
                                    </div>
                                    <pre className="p-6 bg-amber-50 rounded-3xl text-[10px] font-mono font-black text-amber-900 border border-amber-200 whitespace-pre-wrap leading-loose shadow-inner">
                                        {showDetail.LogFacturacion}
                                    </pre>
                                </div>
                            )}

                            <div className="flex items-center justify-center p-16 border-4 border-dashed border-slate-100 rounded-[3rem] group/files hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 group-hover/files:scale-110 transition-transform">
                                        <FileText className="w-10 h-10 text-indigo-200 group-hover/files:text-indigo-400 transition-colors" />
                                    </div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">
                                        Acceso a Repositorio Drive<br />
                                        <span className="text-indigo-600 font-black decoration-2 underline-offset-4 hover:underline">Abrir Visor de Archivos</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button onClick={() => setShowDetail(null)} className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-200">
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FLOATING SYSTEM TERMINAL */}
            <div className={`fixed bottom-0 right-0 w-full md:w-[450px] bg-slate-900 shadow-2xl transition-all duration-500 z-[9999] border-t border-slate-700 ${showTerminal ? 'translate-y-0 h-[350px]' : 'translate-y-[calc(100%-40px)] h-[350px]'}`}>
                {/* Header */}
                <div 
                    onClick={() => setShowTerminal(!showTerminal)}
                    className="flex items-center justify-between px-6 py-2 bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">System Monitor - API logs</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={(e) => { e.stopPropagation(); setLogs([]); }} className="text-[8px] text-slate-400 hover:text-white uppercase font-bold tracking-tighter">Limpiar</button>
                        <ChevronUp className={`w-4 h-4 text-slate-400 transition-transform duration-500 ${showTerminal && 'rotate-180'}`} />
                    </div>
                </div>

                {/* Log List */}
                <div className="p-4 overflow-y-auto h-[calc(100%-40px)] space-y-2 font-mono text-[10px]">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-20">
                            <Activity className="w-8 h-8 text-white mb-2 animate-pulse" />
                            <p className="text-white font-bold uppercase tracking-widest">Awaiting interaction...</p>
                        </div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className={`p-2 rounded border-l-4 ${
                                log.type === 'error' ? 'bg-rose-500/10 border-rose-500 text-rose-200' :
                                log.type === 'success' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-200' :
                                log.type === 'request' ? 'bg-amber-500/10 border-amber-500 text-amber-200' :
                                'bg-slate-800 border-indigo-500 text-slate-300'
                            }`}>
                                <div className="flex items-center justify-between mb-1 opacity-50">
                                    <span className="font-bold text-[8px] uppercase tracking-tighter">[{log.type}]</span>
                                    <span>{log.time}</span>
                                </div>
                                <p className="font-bold leading-tight">{log.message}</p>
                                {log.data && (
                                    <pre className="mt-2 p-2 bg-black/40 rounded text-[9px] overflow-x-hidden whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {log.data}
                                    </pre>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default DepositStockPage;

import React, { useState, useEffect, useRef } from 'react';
import { PackageSearch, Send, Trash2, CheckCircle2, AlertCircle, Info, Loader2, Package, User, Activity, ShoppingBag, Tag, Phone, XCircle } from 'lucide-react';
import api from '../../services/api';
import { socket } from '../../services/socketService';

const CargaDepositoPage = () => {
    // Clave única por sesión de carga (por máquina/usuario), soporta trabajo concurrente
    const SESSION_KEY = `carga_deposito_draft_${window.location.hostname}_${Date.now().toString(36).slice(-5)}`;
    const STORAGE_KEY = React.useMemo(() => {
        // Si ya hay una clave guardada para esta pestaña (en sessionStorage), la reutilizamos
        const existing = sessionStorage.getItem('carga_session_key');
        if (existing) return existing;
        const newKey = `carga_deposito_draft_${window.location.hostname}_${Date.now().toString(36)}`;
        sessionStorage.setItem('carga_session_key', newKey);
        return newKey;
    }, []);

    const EMPTY_CODE = { value: '', id: 0, status: 'idle', message: '', parsed: null };

    // Intentar recuperar estado previo del localStorage al iniciar
    const getInitialCodes = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Solo recuperar los que tienen valor real (no la fila vacía en blanco)
                const recovered = parsed.filter(c => c.value && c.value.trim() !== '');
                if (recovered.length > 0) {
                    // Añadir una fila vacía al final para seguir escaneando
                    return [...recovered, { ...EMPTY_CODE, id: Date.now() }];
                }
            }
        } catch (e) { /* silenciar errores de localStorage */ }
        return [EMPTY_CODE];
    };

    const [codes, setCodes] = useState(getInitialCodes);
    const [hasRecovered, setHasRecovered] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.filter(c => c.value && c.value.trim() !== '').length > 0;
            }
        } catch (e) { }
        return false;
    });
    const [loading, setLoading] = useState(false);
    const [modosMap, setModosMap] = useState({});
    const inputRefs = useRef({});

    // ─── PERSISTENCIA AUTOMÁTICA ────────────────────────────────────────────────
    // Guardar en localStorage cada vez que cambian los códigos
    useEffect(() => {
        try {
            // Solo guardar los que tienen valor real
            // Excluir wsp_waiting, wsp_success, wsp_error e info: los primeros los gestiona el API, los demás no son borradores
            const toSave = codes.filter(c => c.value && c.value.trim() !== '' && !['wsp_waiting', 'wsp_success', 'wsp_error', 'info'].includes(c.status));
            if (toSave.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) { /* silenciar errores de localStorage */ }
    }, [codes, STORAGE_KEY]);
    // ───────────────────────────────────────────────────────────────────────────

    // Cargar los Modos de Orden y ordenes pendientes de WSP al montar
    useEffect(() => {
        api.get('/apiordenes/modos').then(res => {
            if (res.data) {
                const map = {};
                res.data.forEach(m => { map[m.MOrIdModoOrden] = m.MOrNombreModo; });
                setModosMap(map);
            }
        }).catch(() => console.error("No se pudieron cargar los modos correspondientes."));

        // Cargar pendientes de avisar
        api.get('/apiordenes/pending-wsp').then(res => {
            if (res.data && res.data.length > 0) {
                const pendingCodes = res.data.map((ord, i) => {
                    const isError = ord.hasPhoneError;
                    return {
                        id: `pending-${ord.idOrden}-${i}`,
                        idOrden: ord.idOrden,
                        value: ord.CodigoOrden,
                        status: isError ? 'wsp_error' : 'wsp_waiting',
                        message: isError ? 'Número de teléfono inválido o vacío' : 'Orden guardada. Esperando WhatsApp...',
                        wspError: isError,
                        parsed: ord
                    };
                });
                setCodes(prev => {
                    // Deduplicar: no agregar los que ya están cargados (por idOrden o por código de orden)
                    const existingIds = new Set(prev.map(c => c.idOrden).filter(Boolean));
                    const existingValues = new Set(prev.map(c => c.value).filter(Boolean));
                    const nuevos = pendingCodes.filter(p =>
                        !existingIds.has(p.idOrden) && !existingValues.has(p.value)
                    );
                    return nuevos.length > 0 ? [...nuevos, ...prev] : prev;
                });
            }
        }).catch(() => console.error("No se pudieron cargar las órdenes pendientes de aviso."));
    }, []);

    // Autoenfocar el último campo
    useEffect(() => {
        const visibleCodes = codes.filter(c => !['wsp_waiting', 'wsp_success', 'info', 'wsp_error'].includes(c.status));
        const lastCode = visibleCodes[visibleCodes.length - 1];
        if (lastCode && inputRefs.current[lastCode.id]) {
            inputRefs.current[lastCode.id].focus();
        }
    }, [codes.length]);

    // Socket.io para escuchar actualizaciones de WS
    useEffect(() => {
        const handleWspUpdate = (data) => {
            if (data && data.ordId) {
                setCodes(prev => {
                    const idx = prev.findIndex(c => c.idOrden === data.ordId);
                    if (idx < 0) return prev;

                    const newCodes = [...prev];
                    const target = { ...newCodes[idx] };

                    if (data.status === 'success') {
                        target.status = 'wsp_success';
                        target.message = 'Aviso de WhatsApp enviado correctamente.';
                        // Retirarlo después de 4 segundos para dar tiempo a ver el verde
                        setTimeout(() => removeRow(target.id), 4000);
                    } else if (data.status === 'error') {
                        target.status = 'wsp_error';
                        target.message = data.reason || 'Error conectando con Callbell.';
                        target.wspError = true;
                    }

                    newCodes[idx] = target;
                    return newCodes;
                });
            }
        };

        socket.on('actualizado_wsp', handleWspUpdate);
        return () => socket.off('actualizado_wsp', handleWspUpdate);
    }, []);

    // Lógica asíncrona validando contra DB
    const validateQRCode = async (id, value) => {
        try {
            const res = await api.post('/apiordenes/parse-qr', { ordenString: value });
            const p = res.data;
            if (p.valid) {
                setCodes(prev => prev.map(c => c.id === id ? { ...c, status: 'idle', message: '', parsed: p.data } : c));
            } else {
                setCodes(prev => prev.map(c => c.id === id ? { ...c, status: 'error', message: p.error, parsed: null } : c));
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Error de conexión o validación.';
            setCodes(prev => prev.map(c => c.id === id ? { ...c, status: 'error', message: msg, parsed: null } : c));
        }
    };

    const handleInput = (id, value) => {
        const trimmedValue = value.trim();

        setCodes(prev => {
            const isDuplicate = prev.some(c => c.value === trimmedValue && c.id !== id && trimmedValue !== '');

            const newCodes = prev.map(c => {
                if (c.id === id) {
                    if (isDuplicate) {
                        return { ...c, value: trimmedValue, status: 'error', message: 'Este código ya fue escaneado en esta tanda.', parsed: null };
                    } else if (trimmedValue !== '' && c.value !== trimmedValue) {
                        // Iniciar validacion asíncrona
                        setTimeout(() => validateQRCode(id, trimmedValue), 50);
                        return { ...c, value: trimmedValue, status: 'validating', message: 'Verificando orden...', parsed: null };
                    }
                    return { ...c, value: trimmedValue };
                }
                return c;
            });

            // Si es válido y no duplicado, generamos una linea nueva
            if (trimmedValue !== '' && !isDuplicate) {
                setTimeout(() => {
                    setCodes(curr => {
                        const last = curr[curr.length - 1];
                        if (last && last.value !== '') {
                            const newId = Date.now();
                            return [...curr, { value: '', id: newId, status: 'idle', message: '', parsed: null }];
                        }
                        return curr;
                    });
                }, 100);
            }

            return newCodes;
        });
    };

    const handlePaste = (e, id) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        handleInput(id, pastedText);
    };

    const handleKeyDown = (e, codeId) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            const visibleCodes = codes.filter(c => !['wsp_waiting', 'wsp_success', 'info', 'wsp_error'].includes(c.status));
            const currentIndex = visibleCodes.findIndex(c => c.id === codeId);
            if (currentIndex < visibleCodes.length - 1) {
                const nextC = visibleCodes[currentIndex + 1].id;
                inputRefs.current[nextC]?.focus();
            } else {
                const currentCode = visibleCodes[currentIndex];
                if (currentCode && currentCode.value !== '') {
                    setCodes(curr => {
                        const newId = Date.now();
                        return [...curr, { value: '', id: newId, status: 'idle', message: '', parsed: null }];
                    });
                }
            }
        }
    };

    const processCodes = async () => {
        const toProcess = codes.filter(c => c.value.trim() !== '' && c.status !== 'success' && c.status !== 'info' && c.status !== 'error' && c.status !== 'wsp_error' && c.status !== 'validating');

        if (toProcess.length === 0) return;

        setLoading(true);

        // Marcamos como cargando
        setCodes(prev => prev.map(c =>
            toProcess.some(p => p.id === c.id) ? { ...c, status: 'loading', message: 'Guardando...' } : c
        ));

        // Procesamiento en paralelo
        const promises = toProcess.map(async (codeObj) => {
            try {
                const res = await api.post('/apiordenes/data', {
                    ordenString: codeObj.value,
                    estado: 'Ingresado'
                });
                return {
                    id: codeObj.id,
                    idOrden: res.data.idOrden,
                    status: res.status === 202 ? 'info' : 'wsp_waiting',
                    message: res.status === 202 ? 'La orden se reingresó exitosamente al depósito.' : 'Orden guardada. Esperando WhatsApp...'
                };
            } catch (err) {
                const status = err.response?.status;
                let message = 'Error inesperado al cargar.';
                if (status === 400) message = 'La orden ya fue ingresada previamente en depósito.';
                if (status === 403) message = 'El campo cliente se encuentra vacío en la etiqueta.';
                if (status === 404) message = 'Cliente no encontrado en el sistema.';
                if (status === 405) message = 'Producto no encontrado en el sistema.';
                if (status === 500) message = 'Falla interna del servidor. Carga rechazada.';
                return { id: codeObj.id, status: 'error', message };
            }
        });

        const results = await Promise.all(promises);

        setCodes(prev => prev.map(c => {
            const r = results.find(res => res.id === c.id);
            if (r) return { ...c, status: r.status, message: r.message, idOrden: r.idOrden };
            return c;
        }));

        setLoading(false);
        localStorage.removeItem(STORAGE_KEY); // Limpiar el storage al confirmar la carga
        setHasRecovered(false); // Resetear el estado de recuperación

        // Limpieza de inputs SOLO para los que no tienen status error o info.
        // Wait, normally we keep them in the UI. Actually, the user wants them staying in the list:
        // "VA A TENER TODAS LAS ORDENES... LAS INGRESADAS PARA AVISAR QUE SE MANTENGAN AHI... "
        setCodes(curr => {
            const last = curr[curr.length - 1];
            if (last && last.value !== '') {
                return [...curr, { value: '', id: Date.now(), status: 'idle', message: '', parsed: null }];
            }
            return curr;
        });

        // Enfocar el último
        setTimeout(() => {
            setCodes(curr => {
                const visibleCodes = curr.filter(c => !['wsp_waiting', 'wsp_success', 'info', 'wsp_error'].includes(c.status));
                const lastCodeObj = inputRefs.current[visibleCodes[visibleCodes.length - 1]?.id];
                if (lastCodeObj) lastCodeObj.focus();
                return curr;
            });
        }, 100);
    };

    const removeRow = (id) => {
        setCodes(prev => {
            const arr = prev.filter(c => c.id !== id);
            if (arr.length === 0) {
                return [{ value: '', id: Date.now(), status: 'idle', message: '', parsed: null }];
            }
            return arr;
        });
    };

    const handleUpdatePhone = async (idOrden, nuevoTelefono) => {
        if (!nuevoTelefono || nuevoTelefono.trim() === '') return;

        try {
            await api.post('/apiordenes/update-phone', { ordId: idOrden, nuevoTelefono });

            // Si el backend responde ok (status 200), seteamos en 'wsp_waiting' de nuevo
            setCodes(prev => prev.map(c => {
                if (c.idOrden === idOrden) {
                    return { ...c, status: 'wsp_waiting', message: 'Número corregido. Intentando enviar aviso...', wspError: false };
                }
                return c;
            }));

        } catch (error) {
            console.error(error);
            alert("No se pudo redespachar la orden.");
        }
    };

    return (
        <div className="p-4 lg:p-8 max-w-[1600px] w-full mx-auto min-h-[85vh] flex gap-8 flex-col xl:flex-row bg-[#f6f8fb]">

            {/* PANEL IZQUIERDO: Inputs */}
            <div className="w-full xl:w-[45%] flex flex-col pt-8 bg-white rounded-2xl shadow-sm border border-slate-200">
                <h1 className="text-3xl font-black text-slate-800 mb-6 text-center tracking-tight">Carga de Códigos</h1>

                {hasRecovered && (
                    <div className="mx-6 lg:mx-12 mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg flex items-center gap-2 text-sm">
                        <Info size={18} className="shrink-0" />
                        <p>Se recuperaron códigos de una sesión anterior. Confirme la carga para procesarlos.</p>
                    </div>
                )}

                <div className="w-full px-6 lg:px-12 flex flex-col gap-3 min-h-[40vh] max-h-[60vh] overflow-y-auto pb-6 scrollbar-thin scrollbar-thumb-slate-200">
                    {codes.filter(c => !['wsp_waiting', 'wsp_success', 'info', 'wsp_error'].includes(c.status)).map((code, index, visibleArr) => (
                        <div key={code.id} className="w-full relative group flex items-center">
                            <input
                                ref={el => inputRefs.current[code.id] = el}
                                type="text"
                                className={`w-full text-center font-bold text-slate-700 py-3 rounded-lg border-2 outline-none transition-all 
                                ${code.status === 'error' || code.status === 'wsp_error' ? 'border-rose-400 bg-rose-50' :
                                        code.status === 'wsp_success' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' :
                                            code.status === 'wsp_waiting' ? 'border-violet-300 bg-violet-50 text-violet-800' :
                                                code.status === 'info' ? 'border-blue-300 bg-blue-50 text-blue-800' :
                                                    code.status === 'validating' ? 'border-amber-300 bg-amber-50 text-amber-800' :
                                                        'border-slate-200 focus:border-[#3b82f6] focus:bg-blue-50/30'}`}
                                value={code.value}
                                placeholder={index === visibleArr.length - 1 ? 'Escanee la etiqueta aquí...' : ''}
                                onInput={(e) => handleInput(code.id, e.target.value)}
                                onPaste={(e) => handlePaste(e, code.id)}
                                onKeyDown={(e) => handleKeyDown(e, code.id)}
                                disabled={code.status === 'loading' || code.status === 'wsp_success' || code.status === 'wsp_waiting' || code.status === 'info' || code.wspError}
                                autoComplete="off"
                            />
                            {/* Loader durante la validacion async */}
                            {code.status === 'validating' && (
                                <div className="absolute right-4 text-amber-500">
                                    <Loader2 className="animate-spin" size={20} />
                                </div>
                            )}

                            {/* Boton flotante derecho para eliminar la fila */}
                            <button
                                tabIndex={-1}
                                onClick={() => removeRow(code.id)}
                                className={`absolute -right-8 text-slate-300 hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity ${code.status === 'loading' ? 'hidden' : ''}`}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="w-full px-6 lg:px-12 pb-10 mt-auto flex flex-col gap-2">
                    <button
                        onClick={processCodes}
                        disabled={loading || codes.every(c => c.value.trim() === '' || c.status === 'error' || c.status === 'wsp_success' || c.status === 'wsp_waiting' || c.status === 'info' || c.status === 'validating' || c.wspError)}
                        className="w-full py-4 bg-[#409cf9] hover:bg-[#2b86ea] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl uppercase tracking-widest shadow-md transition-colors flex justify-center items-center gap-2 text-md"
                    >
                        {loading ? <><Loader2 size={20} className="animate-spin" /> Guardando...</> : 'Confirmar Carga'}
                    </button>
                    <button
                        onClick={() => {
                            if (!window.confirm('¿Limpiar todos los c\u00f3digos escaneados?')) return;
                            setCodes([{ ...EMPTY_CODE, id: Date.now() }]);
                            setHasRecovered(false);
                            localStorage.removeItem(STORAGE_KEY);
                        }}
                        disabled={loading || codes.every(c => c.value.trim() === '')}
                        className="w-full py-2 border border-slate-300 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 text-slate-500 font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <XCircle size={16} /> Limpiar todo
                    </button>
                </div>
            </div>

            {/* PANEL DERECHO: Tarjetas asincrónicas ampliadas */}
            <div className="w-full xl:w-[55%] flex flex-col p-4 bg-transparent">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <PackageSearch className="text-[#409cf9]" /> Resultados y Validaciones
                </h2>

                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3 max-h-[75vh] items-start overflow-y-auto pr-2 pb-10 scrollbar-thin scrollbar-thumb-slate-300 auto-rows-max">
                    {codes.slice().reverse().filter(c => c.value.trim() !== '').map(code => {
                        const isError = code.status === 'error' || code.status === 'wsp_error';
                        const isWspSuccess = code.status === 'wsp_success';
                        const isWspWaiting = code.status === 'wsp_waiting';
                        const isInfo = code.status === 'info';
                        const isLoading = code.status === 'loading' || code.status === 'validating';
                        const isIdle = code.status === 'idle';

                        const rawStringDisplay = code.parsed ? code.parsed.CodigoOrden : (code.value.length > 25 ? code.value.substring(0, 25) + '...' : code.value);

                        return (
                            <div key={`card-${code.id}`} className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start gap-4 transition-all shadow-sm bg-white
                                ${isError ? 'border-rose-300' :
                                    isWspSuccess ? 'border-emerald-300' :
                                        isWspWaiting ? 'border-violet-300 bg-violet-50/20' :
                                            isInfo ? 'border-blue-300' :
                                                isLoading ? 'border-amber-300 opacity-90' : 'border-slate-200'
                                }
                            `}>
                                {/* Icono Lado Izquierdo */}
                                <div className="mt-1 sm:self-center shrink-0">
                                    {isError && <AlertCircle className="text-rose-500 transform scale-100" size={28} />}
                                    {isWspSuccess && <CheckCircle2 className="text-emerald-500 transform scale-100" size={28} />}
                                    {isWspWaiting && <Send className="text-violet-500 transform scale-100 animate-pulse" size={28} />}
                                    {isInfo && <Info className="text-blue-500 transform scale-100" size={28} />}
                                    {isLoading && <Loader2 className="text-amber-500 animate-spin" size={28} />}
                                    {isIdle && <Package className="text-slate-400" size={28} />}
                                </div>

                                <div className="flex-1 flex flex-col w-full overflow-hidden">
                                    <div className="flex justify-between items-start mb-1 text-sm">
                                        <span className={`font-black text-lg truncate pr-2 ${isError ? 'text-rose-800' : isWspSuccess ? 'text-emerald-800' : isWspWaiting ? 'text-violet-800' : 'text-slate-800'}`}>
                                            {rawStringDisplay}
                                        </span>
                                        {/* Status Badge */}
                                        <span className={`px-2 py-0.5 text-[0.65rem] font-bold uppercase rounded-md tracking-wider border shrink-0
                                            ${isError ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                isWspSuccess ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                    isWspWaiting ? 'bg-violet-50 text-violet-600 border-violet-200' :
                                                        isInfo ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                            code.status === 'validating' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                                isLoading ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                                    'bg-slate-100 text-slate-500 border-slate-200'
                                            }
                                        `}>
                                            {isError ? 'RECHAZADO' :
                                                isWspSuccess ? 'ENVIADO' :
                                                    isWspWaiting ? 'AVISO...' :
                                                        isInfo ? 'REINGRESADO' :
                                                            code.status === 'validating' ? 'VALIDANDO...' :
                                                                isLoading ? 'GUARDANDO...' : 'LISTO'}
                                        </span>
                                    </div>

                                    {/* Mostrar Información Completa parseada */}
                                    {code.parsed && (
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-1.5 bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-sm">

                                            {/* Columna 1: Cliente y Tipo */}
                                            <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                    <span className="flex items-center gap-1"><User size={10} /> Cliente</span>
                                                    <span className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded-[4px]">{code.parsed.TipoCliente}</span>
                                                </div>
                                                <span className="text-slate-800 font-semibold truncate" title={code.parsed.CodigoCliente}>
                                                    {code.parsed.CodigoCliente}
                                                    {code.parsed.IDCliente && code.parsed.IDCliente !== 'N/A' && (
                                                        <span className="ml-1 text-[10px] font-normal text-slate-500 bg-slate-200 px-1 py-[1.5px] rounded-[3px]">
                                                            ID: {code.parsed.IDCliente}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Columna 2: Producto */}
                                            <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                    <ShoppingBag size={10} /> Producto
                                                </div>
                                                <span className="text-slate-800 font-semibold truncate" title={code.parsed.ProductoNombre}>
                                                    {code.parsed.ProductoNombre}
                                                </span>
                                            </div>

                                            {/* Columna 4: Trabajo */}
                                            <div className="flex flex-col gap-0.5 col-span-2">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                    <Tag size={10} /> Nombre de Trabajo
                                                </div>
                                                <span className="text-slate-700 italic truncate" title={code.parsed.NombreTrabajo}>
                                                    {code.parsed.NombreTrabajo || 'Sin Descripción'}
                                                </span>
                                            </div>

                                            {/* Columna 5: Cantidad, Modalidad, Importe */}
                                            <div className="flex flex-row items-center justify-between col-span-2 border-t pt-2 border-slate-200 mt-0.5 flex-wrap gap-y-1">
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cant:</span>
                                                    <span className="text-slate-800 font-black text-lg leading-none">{code.parsed.Cantidad}</span>
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1"><Activity size={10} /> Moda:</span>
                                                    <span className="text-slate-800 font-semibold text-xs leading-none">{modosMap[code.parsed.IdModo] || `M-${code.parsed.IdModo}`}</span>
                                                </div>
                                                {code.parsed.CostoFinal != null && (
                                                    <div className="flex gap-1.5 items-center bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5">
                                                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                                                            {code.parsed.Moneda || '$U'}
                                                        </span>
                                                        <span className="text-emerald-800 font-black text-sm leading-none">
                                                            {Number(code.parsed.CostoFinal).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>


                                        </div>
                                    )}

                                    {/* Mostrar el mensaje de status (incluyendo Info o Error de la DB) */}
                                    {code.message && (
                                        <div className={`mt-2 text-[0.8rem] font-semibold px-3 py-2 rounded-lg border flex justify-between items-center text-center
                                            ${isError ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                isWspSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    isWspWaiting ? 'bg-violet-50 text-violet-700 border-violet-200' :
                                                        'bg-blue-50 text-blue-800 border-blue-200'
                                            }
                                        `}>
                                            <span className="w-full">{code.message}</span>
                                        </div>
                                    )}

                                    {/* Componente Adicional de Re-Despacho si falla WhatsApp */}
                                    {code.wspError && code.idOrden && (
                                        <div className="mt-2 bg-white p-2 border border-rose-200 rounded-lg flex items-center gap-2">
                                            <div className="flex bg-rose-50 text-rose-500 p-1.5 border border-rose-100 rounded-md">
                                                <Phone size={14} />
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Celular válido..."
                                                    className="w-full bg-slate-50 border border-slate-200 py-[4px] px-2 rounded-md text-[0.8rem] outline-none focus:border-[#409cf9]"
                                                    id={`phone-input-${code.idOrden}`}
                                                />
                                            </div>
                                            <button
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 flex items-center gap-1.5 px-3 rounded-md text-[0.75rem] transition-colors"
                                                onClick={() => {
                                                    const val = document.getElementById(`phone-input-${code.idOrden}`).value;
                                                    if (val) handleUpdatePhone(code.idOrden, val);
                                                }}
                                            >
                                                <Send size={12} /> Redespachar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {codes.filter(c => c.value.trim() !== '').length === 0 && (
                        <div className="col-span-1 2xl:col-span-2 flex flex-col items-center justify-center p-16 mt-8 mx-4 text-slate-400 bg-white shadow-sm border border-slate-200 rounded-3xl">
                            <PackageSearch size={64} strokeWidth={1.5} className="mb-6 text-blue-400 opacity-60" />
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Panel de Validaciones</h3>
                            <p className="font-medium text-center text-slate-500 max-w-sm">
                                A medida que ingrese los códigos en el panel central, iremos verificando en tiempo real si toda la información está correcta.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CargaDepositoPage;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Printer, Wifi, WifiOff, Volume2, VolumeX, Bell, RotateCcw, Package, AlertTriangle, XCircle, History, ChevronUp, ChevronDown, RefreshCcw, CheckSquare } from 'lucide-react';
import { socket } from '../../services/socketService';
import api from '../../services/api';
import { Logo } from '../Logo';

const PrintStationPage = () => {
    const [connected, setConnected] = useState(socket.connected);
    const [logs, setLogs] = useState(() => {
        try { const s = localStorage.getItem('ps_logs'); return s ? JSON.parse(s) : []; } catch { return []; }
    });
    const [printCount, setPrintCount] = useState(() => {
        try { return parseInt(localStorage.getItem('ps_printCount')) || 0; } catch { return 0; }
    });
    const [soundEnabled, setSoundEnabled] = useState(() => {
        try { const s = localStorage.getItem('ps_soundEnabled'); return s !== null ? s === 'true' : true; } catch { return true; }
    });
    const [copies, setCopies] = useState(() => {
        try { return parseInt(localStorage.getItem('ps_copies')) || 1; } catch { return 1; }
    });

    // Historial
    const [historialHoy, setHistorialHoy] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [showHistorial, setShowHistorial] = useState(false);
    const [selectedHistorial, setSelectedHistorial] = useState(new Set());
    const iframeRef = useRef(null);
    const printedIdsRef = useRef(() => {
        try { const s = localStorage.getItem('ps_printedIds'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
    });
    // Lazy-init the Set (ref initializer returns a function, evaluate it once)
    if (typeof printedIdsRef.current === 'function') printedIdsRef.current = printedIdsRef.current();

    // Persist state to localStorage
    useEffect(() => { try { localStorage.setItem('ps_logs', JSON.stringify(logs)); } catch { } }, [logs]);
    useEffect(() => { try { localStorage.setItem('ps_printCount', String(printCount)); } catch { } }, [printCount]);
    useEffect(() => { try { localStorage.setItem('ps_soundEnabled', String(soundEnabled)); } catch { } }, [soundEnabled]);
    useEffect(() => { try { localStorage.setItem('ps_copies', String(copies)); } catch { } }, [copies]);

    // Cargar historial al montar — filtra por fechaAlta (creación) client-side para que nada desaparezca al cambiar estado
    useEffect(() => {
        const hoy = new Date().toISOString().split('T')[0];
        setLoadingHistorial(true);
        api.get('/apiordenesRetiro/estados?estados=1,2,3,4,5')
            .then(res => {
                const data = (res.data || [])
                    .filter(r => r.fechaAlta && new Date(r.fechaAlta).toISOString().split('T')[0] === hoy)
                    .sort((a, b) => new Date(b.fechaAlta) - new Date(a.fechaAlta));
                setHistorialHoy(data);
            })
            .catch(() => { })
            .finally(() => setLoadingHistorial(false));
    }, []);

    // Síntesis de voz
    const speak = useCallback((retiro) => {
        if (!soundEnabled) return;
        const isEncomienda = (retiro.lugarRetiro || '').toLowerCase().includes('encomienda');
        const numStr = (retiro.ordenDeRetiro || '').replace(/^[A-Za-z]+-?/, '');
        const texto = isEncomienda ? `Encomienda ${numStr}` : `Retiro ${numStr}`;
        window.speechSynthesis.cancel(); // cancelar cualquier voz anterior
        const utt = new SpeechSynthesisUtterance(texto);
        utt.lang = 'es-UY';
        utt.rate = 0.9;
        utt.pitch = 1;
        utt.volume = 1;
        window.speechSynthesis.speak(utt);
    }, [soundEnabled]);

    const addLog = useCallback((message, type = 'info', retiro = null, icon = null) => {
        const time = new Date().toLocaleTimeString('es-UY', { hour12: false });
        setLogs(prev => [{ time, message, type, retiro, icon }, ...prev].slice(0, 50));
    }, []);

    // Socket.io connection status
    useEffect(() => {
        const onConnect = () => { setConnected(true); addLog('Conectado al servidor', 'success'); };
        const onDisconnect = () => { setConnected(false); addLog('Desconectado del servidor', 'error'); };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        if (socket.connected) addLog('ESPERANDO RETIROS...', 'success');

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, [addLog]);

    // Generar HTML para hoja A4 (2 copias por hoja, mitad superior / mitad inferior)
    const generateTicketHTML = useCallback((retiro) => {
        const fecha = new Date().toLocaleDateString('es-UY', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        const ordenes = retiro.orders || [];
        const simbolo = ordenes.length > 0 ? (ordenes[0].simbolo || '$') : '$';

        const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 60" height="36" style="display:block;overflow:visible;">
          <g>
            <path d="M37.32,43.66h-12.99v-3.57c-1.29,1.3-2.87,2.29-4.71,2.99-1.85.7-3.66,1.05-5.43,1.05-4.02,0-7.29-1.24-9.83-3.72-1.69-1.69-2.84-3.53-3.45-5.53-.61-1.99-.91-4.31-.91-6.95V0h13.31v26.15c0,2.19.57,3.74,1.72,4.64,1.15.9,2.36,1.35,3.62,1.35s2.48-.44,3.63-1.33c1.15-.89,1.72-2.44,1.72-4.66V0h13.31v43.66Z"/>
            <path d="M31.39,49.3H5.93c-2.16,0-3.91,1.87-3.91,4.18v.81c0,2.31,1.75,4.18,3.91,4.18h25.45c2.16,0,3.91-1.87,3.91-4.18v-.81c0-2.31-1.75-4.18-3.91-4.18Z"/>
          </g>
        </svg>`;

        const ordenesHTML = ordenes.length > 0
            ? ordenes.map((o, i) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#e8e8e8'}">
                    <td style="padding:5px 8px;font-size:12px;border:none;">
                        <div style="font-weight:700;">${o.orderNumber || o.id || '-'}</div>
                        ${o.articuloDescripcion ? `<div style="font-size:10px;color:#555;margin-top:2px;text-transform:uppercase;">${o.articuloDescripcion}</div>` : ''}
                    </td>
                    <td style="padding:5px 8px;font-size:12px;border:none;text-align:right;font-weight:700;vertical-align:top;">${o.orderCosto || '0.00'}</td>
                </tr>`).join('')
            : `<tr><td colspan="2" style="padding:8px;font-size:12px;color:#888;text-align:center;border:none;">Sin detalle de órdenes</td></tr>`;

        const isEncomienda = (retiro.lugarRetiro || '').toLowerCase().includes('encomienda')
            || retiro.formaEnvioId === 2
            || retiro.LReIdLugarRetiro === 2;

        // Código estético para el ticket: ENC-número en encomiendas
        const numPart = (retiro.ordenDeRetiro || '').replace(/^[A-Za-z]+-?/, '');
        const displayCodigo = isEncomienda ? `ENC-${numPart}` : (retiro.ordenDeRetiro || 'N/A');

        const copiaHTML = (label, showFirma = false, encomiendaData = null) => `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #000;">
            <div style="display:flex;align-items:flex-end;gap:10px;">
                ${LOGO_SVG}
                <div style="font-size:10px;font-weight:600;color:#555;letter-spacing:2px;text-transform:uppercase;">Comprobante de Retiro · ${label}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:28px;font-weight:900;letter-spacing:2px;line-height:1;">${displayCodigo}</div>
                <div style="font-size:10px;color:#555;margin-top:2px;">${fecha}</div>
            </div>
        </div>

        ${!encomiendaData ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div style="border:2px solid #000;overflow:hidden;display:flex;flex-direction:column;">
                <div style="background:#e8e8e8;color:#000;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 8px;border-bottom:2px solid #000;">Cliente</div>
                <div style="flex:1;padding:8px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
                    <div style="font-size:18px;font-weight:900;">${retiro.CliCodigoCliente || '-'}</div>
                    <div style="font-size:14px;font-weight:700;color:#222;margin-top:2px;">${retiro.CliNombre || ''}</div>
                </div>
            </div>
            <div style="border:2px solid #000;overflow:hidden;display:flex;flex-direction:column;">
                <div style="background:#e8e8e8;color:#000;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 8px;border-bottom:2px solid #000;">Forma de Envío</div>
                <div style="flex:1;padding:8px 10px;display:flex;align-items:center;justify-content:center;text-align:center;">
                    <div style="font-size:13px;font-weight:800;text-transform:uppercase;">${retiro.lugarRetiro || '-'}</div>
                </div>
            </div>
        </div>

        <div style="border:2px solid #000;overflow:hidden;margin-bottom:10px;">
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr>
                        <th style="padding:6px 8px;font-size:10px;text-align:left;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:#e8e8e8;border:none;">Pedido</th>
                        <th style="padding:6px 8px;font-size:10px;text-align:right;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:#e8e8e8;border:none;">Importe</th>
                    </tr>
                </thead>
                <tbody>${ordenesHTML}</tbody>
            </table>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#e8e8e8;color:#000;border:2px solid #000;margin-bottom:10px;">
            <span style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Total</span>
            <span style="font-size:18px;font-weight:900;">${simbolo} ${retiro.totalCost || '0.00'}</span>
        </div>

        ${showFirma ? `
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:4px;">
            <div style="display:flex;gap:20px;align-items:center;">
                <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                    Cliente <span style="display:inline-block;width:18px;height:18px;border:2px solid #000;"></span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                    Otro <span style="display:inline-block;width:18px;height:18px;border:2px solid #000;"></span>
                </div>
            </div>
            <div style="flex:1;display:flex;align-items:flex-end;gap:6px;margin-left:16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                <span style="white-space:nowrap;">Firma:</span>
                <span style="flex:1;border-bottom:1.5px solid #000;margin-bottom:2px;"></span>
            </div>
        </div>` : ''}
        ` : ''}

        ${encomiendaData ? `
        <div style="display:grid;grid-template-columns:3fr 1fr;gap:16px;flex:1;">
            <div style="display:flex;flex-direction:column;justify-content:space-between;">
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#555;border-bottom:1px solid #000;padding-bottom:3px;margin-bottom:2px;">Destinatario</div>
                    <div style="font-size:26px;font-weight:900;text-transform:uppercase;line-height:1.15;">${encomiendaData.nombre}</div>
                    ${encomiendaData.telefono ? `<div style="font-size:20px;font-weight:700;color:#222;">&#9742; ${encomiendaData.telefono}</div>` : ''}
                    ${encomiendaData.depto ? `<div style="font-size:30px;font-weight:900;text-transform:uppercase;margin-top:4px;line-height:1;">${encomiendaData.depto}</div>` : ''}
                    ${encomiendaData.localidad ? `<div style="font-size:30px;font-weight:800;text-transform:uppercase;color:#111;line-height:1;">${encomiendaData.localidad}</div>` : ''}
                    ${encomiendaData.direccion ? `<div style="font-size:26px;font-weight:700;text-transform:uppercase;color:#222;line-height:1.1;">${encomiendaData.direccion}</div>` : ''}
                    ${encomiendaData.agencia ? `<div style="margin-top:8px;font-size:16px;font-weight:900;background:#e8e8e8;border:2px solid #000;padding:6px 12px;text-transform:uppercase;display:inline-block;align-self:flex-start;">AGENCIA &#8226; ${encomiendaData.agencia}</div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;padding-top:12px;border-top:2px dashed #000;margin-top:auto;">
                    <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#555;border-bottom:1px solid #000;padding-bottom:3px;margin-bottom:2px;">Remitente</div>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div>${LOGO_SVG}</div>
                        <div style="display:flex;flex-direction:column;gap:2px;">
                            <div style="font-size:13px;font-weight:700;color:#333;">Arenal Grande 2667</div>
                            <div style="font-size:11px;font-weight:600;color:#555;">Montevideo, Uruguay</div>
                            <div style="font-size:12px;font-weight:800;color:#333;">&#9742; 092284262</div>
                        </div>
                    </div>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;border-left:2px dashed #000;padding-left:16px;">
                <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#555;border-bottom:1px solid #000;padding-bottom:3px;margin-bottom:2px;">Órdenes</div>
                <div style="display:flex;flex-direction:column;gap:4px;">
                    ${ordenes.map(o => `<div style="font-size:13px;font-weight:800;background:#e8e8e8;padding:4px 8px;text-align:center;border:1px solid #000;">${o.orderNumber || o.id || '-'}</div>`).join('') || '<div style="font-size:11px;color:#777;">S/D</div>'}
                </div>
            </div>
        </div>` : ''}
        `;

        const encomiendaData = isEncomienda ? {
            nombre: retiro.receptorNombre || retiro.CliNombre || retiro.CliCodigoCliente || '-',
            telefono: (retiro.CliTelefono || '').trim(),
            depto: retiro.departamentoEnvio || '',
            localidad: retiro.localidadEnvio || '',
            direccion: retiro.direccionEnvio || '',
            agencia: retiro.agenciaNombre || ''
        } : null;

        // --- Distribución de la hoja ---
        const topHalfHTML = copiaHTML('Copia Empresa', true);
        const bottomHalfHTML = isEncomienda ? copiaHTML('Etiqueta de Envío', false, encomiendaData) : copiaHTML('Copia Cliente', false);

        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
    @page { margin: 0; size: A4 portrait; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 210mm; font-family: 'Arial', 'Helvetica', sans-serif; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .copy {
        width: 210mm;
        min-height: 147mm;
        padding: 8mm 14mm;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
        break-inside: avoid;
        page-break-inside: avoid;
    }
    .copy:first-child {
        border-bottom: 2px dashed #999;
    }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #bbb; }
    tr { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
</style></head><body>

    <div class="copy">
        ${topHalfHTML}
    </div>

    <div class="copy">
        ${bottomHalfHTML}
    </div>

</body></html>`;
    }, []);

    // Imprimir ticket
    const printTicket = useCallback((retiro) => {
        if (!iframeRef.current) return;
        const html = generateTicketHTML(retiro);

        const printOnce = (copyNum) => {
            return new Promise((resolve) => {
                const iframe = iframeRef.current;
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                doc.open();
                doc.write(html);
                doc.close();
                // Esperar a que renderice
                setTimeout(() => {
                    try {
                        iframe.contentWindow.print();
                        addLog(`Copia ${copyNum} impresa: ${retiro.ordenDeRetiro}`, 'success');
                    } catch (err) {
                        addLog(`Error imprimiendo copia ${copyNum}: ${err.message}`, 'error');
                    }
                    resolve();
                }, 300);
            });
        };

        // Imprimir copias secuencialmente
        (async () => {
            for (let i = 1; i <= copies; i++) {
                await printOnce(i);
                if (i < copies) await new Promise(r => setTimeout(r, 1000)); // delay entre copias
            }
            setPrintCount(prev => prev + 1);
        })();
    }, [copies, generateTicketHTML, addLog]);
    // Escuchar eventos de nuevo retiro (con deduplicación)
    useEffect(() => {
        const handleRetiroUpdate = async (data) => {
            if (data?.type !== 'nuevo_retiro') return;

            addLog('Nuevo retiro detectado — cargando datos...', 'info', null, 'package');


            try {
                const res = await api.get('/apiordenesRetiro/estados?estados=1,2,3,4');
                const retiros = res.data;
                if (retiros && retiros.length > 0) {
                    const sorted = retiros.sort((a, b) => new Date(b.fechaAlta) - new Date(a.fechaAlta));

                    let nuevos;
                    if (data.ordenId && data.formaRetiro) {
                        // El backend nos dice exactamente qué retiro imprimir
                        const targetId = `${data.formaRetiro}-${data.ordenId}`;
                        const target = sorted.find(r => r.ordenDeRetiro === targetId);
                        if (target && !printedIdsRef.current.has(targetId)) {
                            nuevos = [target];
                        } else {
                            nuevos = [];
                        }
                    } else {
                        // Fallback: imprimir el más nuevo no registrado
                        nuevos = sorted.filter(r => !printedIdsRef.current.has(r.ordenDeRetiro));
                    }

                    if (nuevos.length === 0) {
                        addLog('Todos los retiros recientes ya fueron impresos — omitidos', 'info', null, 'package');
                        return;
                    }

                    // Anunciar por voz el primer retiro nuevo
                    speak(nuevos[0]);

                    for (const retiro of nuevos) {
                        const retiroId = retiro.ordenDeRetiro;
                        printedIdsRef.current.add(retiroId);
                        addLog(`Imprimiendo retiro ${retiroId} (${copies} copias)...`, 'info', retiro, 'printer');
                        printTicket(retiro);
                        // Small delay between prints to avoid overlapping
                        if (nuevos.length > 1) await new Promise(r => setTimeout(r, 1500));
                    }

                    // Mantener solo los últimos 200 IDs para no crecer indefinidamente
                    if (printedIdsRef.current.size > 200) {
                        const arr = [...printedIdsRef.current];
                        printedIdsRef.current = new Set(arr.slice(arr.length - 200));
                    }
                    try { localStorage.setItem('ps_printedIds', JSON.stringify([...printedIdsRef.current])); } catch { }

                    // Refrescar historial en tiempo real (filtrando por fechaAlta = hoy)
                    try {
                        const hoy = new Date().toISOString().split('T')[0];
                        const histRes = await api.get('/apiordenesRetiro/estados?estados=1,2,3,4,5');
                        const data = (histRes.data || [])
                            .filter(r => r.fechaAlta && new Date(r.fechaAlta).toISOString().split('T')[0] === hoy)
                            .sort((a, b) => new Date(b.fechaAlta) - new Date(a.fechaAlta));
                        setHistorialHoy(data);
                    } catch { /* silencioso */ }
                } else {
                    addLog('No se encontraron retiros recientes para imprimir', 'error', null, 'warning');
                }
            } catch (err) {
                addLog(`Error al obtener retiro: ${err.message}`, 'error', null, 'error');
            }
        };

        socket.on('retiros:update', handleRetiroUpdate);
        return () => socket.off('retiros:update', handleRetiroUpdate);
    }, [soundEnabled, copies, printTicket, addLog]);

    return (
        <div style={{
            height: '100vh',
            overflowY: 'auto',
            background: '#0a0a0a',
            color: '#e0e0e0',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxSizing: 'border-box',
        }}>

            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 24px',
                background: '#141414',
                borderRadius: '16px',
                border: '1px solid #222'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Printer size={28} color="#ffd700" />
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>Print Station — Retiros</h1>
                        <p style={{ fontSize: '12px', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Impresión automática de tickets de retiro</p>
                    </div>
                </div>

                {/* Logo centrado */}
                <Logo className="h-16 text-white" style={{ marginBottom: '-12px', marginTop: '4px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Copias */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Copias:</span>
                        <select
                            value={copies}
                            onChange={e => setCopies(Number(e.target.value))}
                            style={{
                                background: '#1a1a1a',
                                border: '1px solid #333',
                                color: '#fff',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '13px'
                            }}
                        >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                        </select>
                    </div>

                    {/* Sonido toggle */}
                    <button
                        onClick={() => setSoundEnabled(prev => !prev)}
                        style={{
                            background: 'none',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            color: soundEnabled ? '#00d4ff' : '#555',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px'
                        }}
                    >
                        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        {soundEnabled ? 'ON' : 'OFF'}
                    </button>

                    {/* Estado conexión */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        background: connected ? 'rgba(0, 212, 100, 0.1)' : 'rgba(255, 60, 60, 0.1)',
                        border: `1px solid ${connected ? 'rgba(0, 212, 100, 0.3)' : 'rgba(255, 60, 60, 0.3)'}`,
                    }}>
                        {connected ? <Wifi size={16} color="#00d464" /> : <WifiOff size={16} color="#ff3c3c" />}
                        <span style={{ fontSize: '12px', fontWeight: 600, color: connected ? '#00d464' : '#ff3c3c' }}>
                            {connected ? 'CONECTADO' : 'DESCONECTADO'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1, padding: '10px 16px', background: '#141414', borderRadius: '16px', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#00d4ff' }}>{printCount}</div>
                    <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Hojas impresas</div>
                </div>
                <div style={{ flex: 1, padding: '10px 16px', background: '#141414', borderRadius: '16px', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: connected ? '#00d464' : '#ff3c3c', animation: connected ? 'pulse 2s ease-in-out infinite' : 'none', flexShrink: 0 }}></div>
                    <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
                    <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {connected ? 'Escuchando' : 'Sin conexión'}
                    </div>
                </div>
                <div style={{ flex: 1, padding: '10px 16px', background: '#141414', borderRadius: '16px', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffd700' }}>{copies}</div>
                    <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{copies > 1 ? 'Copias' : 'Copia'} por ticket</div>
                </div>
            </div>

            {/* Log */}
            <div style={{
                flex: 1,
                padding: '16px 20px',
                background: '#141414',
                borderRadius: '16px',
                border: '1px solid #222',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Bell size={16} color="#eb008b" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Actividad</span>
                </div>
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    maxHeight: 'calc(100vh - 350px)'
                }}>
                    {logs.length === 0 ? (
                        <div style={{ color: '#555', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
                            Sin actividad. Los eventos aparecerán aquí cuando lleguen retiros nuevos.
                        </div>
                    ) : logs.map((log, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: log.type === 'error' ? 'rgba(255,60,60,0.08)' : log.type === 'success' ? 'rgba(0,212,255,0.08)' : 'transparent',
                            fontSize: '13px'
                        }}>
                            <span style={{ color: '#555', fontSize: '11px', fontFamily: 'monospace', flexShrink: 0 }}>{log.time}</span>
                            {log.icon === 'package' && <Package size={14} color="#00d4ff" style={{ flexShrink: 0 }} />}
                            {log.icon === 'printer' && <Printer size={14} color="#aaa" style={{ flexShrink: 0 }} />}
                            {log.icon === 'warning' && <AlertTriangle size={14} color="#ffd700" style={{ flexShrink: 0 }} />}
                            {log.icon === 'error' && <XCircle size={14} color="#ff6b6b" style={{ flexShrink: 0 }} />}
                            <span style={{
                                color: log.type === 'error' ? '#ff6b6b' : log.type === 'success' ? '#00d4ff' : '#fff',
                                flex: 1,
                                textTransform: 'uppercase'
                            }}>{log.message}</span>
                            {log.retiro && (
                                <button
                                    onClick={() => { addLog(`Reimprimiendo ${log.retiro.ordenDeRetiro}...`, 'info', log.retiro, 'printer'); printTicket(log.retiro); }}
                                    style={{
                                        background: 'rgba(255,215,0,0.1)',
                                        border: '1px solid rgba(255,215,0,0.3)',
                                        borderRadius: '6px',
                                        padding: '3px 8px',
                                        cursor: 'pointer',
                                        color: '#ffd700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '11px',
                                        flexShrink: 0
                                    }}
                                >
                                    <RotateCcw size={12} /> REIMPRIMIR
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── HISTORIAL DEL DÍA ── */}
            <div style={{
                padding: '16px 20px',
                background: '#141414',
                borderRadius: '16px',
                border: '1px solid #222',
                overflow: 'hidden'
            }}>
                <button
                    onClick={() => {
                        const opening = !showHistorial;
                        setShowHistorial(opening);
                        if (opening && historialHoy.length === 0) {
                            setLoadingHistorial(true);
                            const hoy = new Date().toISOString().split('T')[0];
                            api.get('/apiordenesRetiro/estados?estados=1,2,3,4,5')
                                .then(res => {
                                    const data = (res.data || [])
                                        .filter(r => r.fechaAlta && new Date(r.fechaAlta).toISOString().split('T')[0] === hoy)
                                        .sort((a, b) => new Date(b.fechaAlta) - new Date(a.fechaAlta));
                                    setHistorialHoy(data);
                                })
                                .catch(err => addLog(`Error historial: ${err.message}`, 'error'))
                                .finally(() => setLoadingHistorial(false));
                        }
                    }}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#e0e0e0',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 0
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <History size={18} color="#ffd700" />
                        <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Historial del día</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#888', background: '#1a1a1a', padding: '2px 8px', borderRadius: '10px' }}>{historialHoy.length}</span>
                    </div>
                    {showHistorial ? <ChevronUp size={16} color="#888" /> : <ChevronDown size={16} color="#888" />}
                </button>

                {showHistorial && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid #222', paddingTop: '12px' }}>
                        {/* Bulk reprint bar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <button
                                onClick={() => {
                                    if (selectedHistorial.size === historialHoy.length) setSelectedHistorial(new Set());
                                    else setSelectedHistorial(new Set(historialHoy.map(r => r.ordenDeRetiro)));
                                }}
                                style={{
                                    background: 'none', border: '1px solid #333', borderRadius: '6px',
                                    padding: '4px 10px', cursor: 'pointer', color: '#aaa', fontSize: '11px',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <CheckSquare size={13} /> {selectedHistorial.size === historialHoy.length ? 'Deseleccionar' : 'Seleccionar'} todo
                            </button>
                            <button
                                onClick={() => {
                                    const sel = historialHoy.filter(r => selectedHistorial.has(r.ordenDeRetiro));
                                    if (sel.length === 0) return;
                                    addLog(`Reimprimiendo ${sel.length} hojas...`, 'info', null, 'printer');
                                    (async () => {
                                        for (const retiro of sel) {
                                            printTicket(retiro);
                                            if (sel.length > 1) await new Promise(r => setTimeout(r, 1500));
                                        }
                                    })();
                                }}
                                disabled={selectedHistorial.size === 0}
                                style={{
                                    background: selectedHistorial.size > 0 ? 'rgba(255,215,0,0.15)' : 'transparent',
                                    border: `1px solid ${selectedHistorial.size > 0 ? 'rgba(255,215,0,0.4)' : '#333'}`,
                                    borderRadius: '8px', padding: '5px 14px',
                                    cursor: selectedHistorial.size > 0 ? 'pointer' : 'not-allowed',
                                    color: selectedHistorial.size > 0 ? '#ffd700' : '#555',
                                    fontSize: '12px', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <Printer size={14} /> Reimprimir ({selectedHistorial.size})
                            </button>
                        </div>

                        {loadingHistorial ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#555' }}>
                                <RefreshCcw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                            </div>
                        ) : historialHoy.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#555', fontSize: '13px' }}>
                                Sin retiros hoy
                            </div>
                        ) : (
                            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {historialHoy.map(retiro => {
                                    const isSelected = selectedHistorial.has(retiro.ordenDeRetiro);
                                    const isEnc = (retiro.lugarRetiro || '').toLowerCase().includes('encomienda');
                                    return (
                                        <div
                                            key={retiro.ordenDeRetiro}
                                            onClick={() => {
                                                const s = new Set(selectedHistorial);
                                                s.has(retiro.ordenDeRetiro) ? s.delete(retiro.ordenDeRetiro) : s.add(retiro.ordenDeRetiro);
                                                setSelectedHistorial(s);
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '12px',
                                                padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                                                background: isSelected ? 'rgba(255,215,0,0.08)' : 'transparent',
                                                border: `1px solid ${isSelected ? 'rgba(255,215,0,0.2)' : 'transparent'}`,
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                readOnly
                                                style={{ accentColor: '#ffd700', width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', width: '90px', flexShrink: 0 }}>{retiro.ordenDeRetiro}</span>
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#00d4ff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {retiro.CliNombre || retiro.CliCodigoCliente || '-'}
                                            </span>
                                            <span style={{ fontSize: '11px', color: isEnc ? '#ffd700' : '#666', flexShrink: 0, fontWeight: isEnc ? 700 : 400 }}>
                                                {retiro.lugarRetiro || ''}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); addLog(`Reimprimiendo ${retiro.ordenDeRetiro}...`, 'info', retiro, 'printer'); printTicket(retiro); }}
                                                style={{
                                                    background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
                                                    borderRadius: '6px', padding: '3px 8px', cursor: 'pointer',
                                                    color: '#ffd700', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', flexShrink: 0
                                                }}
                                            >
                                                <RotateCcw size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Iframe oculto para impresión */}
            <iframe
                ref={iframeRef}
                style={{ display: 'none' }}
                title="print-frame"
            />
        </div>
    );
};

export default PrintStationPage;

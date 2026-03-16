import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Printer, Wifi, WifiOff, Volume2, VolumeX, Bell, RotateCcw, Package, AlertTriangle, XCircle } from 'lucide-react';
import { socket } from '../../services/socketService';
import api from '../../services/api';
import { Logo } from '../Logo';

const PrintStationPage = () => {
    const [connected, setConnected] = useState(socket.connected);
    const [logs, setLogs] = useState([]);
    const [printCount, setPrintCount] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [copies, setCopies] = useState(2);
    const iframeRef = useRef(null);
    const audioRef = useRef(null);

    // Sonido de notificación
    useEffect(() => {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1pq6y0r6KYj5+xtbisl4eEkKW0u7OljYWMnK+4t6yYjI2ZqrW1rZqOjpersbOsnpOPlqexsa6glo+VpbCxr6KYkZWjr7GvoZiSlKOusa+impOUoq+xr6KZk5Sjr7CvopmTlKOvsK+imZOUo6+wr6KZk5Sjr7CvopmTlKOvsK+hmJKToa6vr6GYkpOhr6+voZiSk6GvAA==');
    }, []);

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

    // Generar HTML del ticket térmico
    const generateTicketHTML = useCallback((retiro) => {
        const fecha = new Date().toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
        const ordenes = retiro.orders || [];
        const ordenesHTML = ordenes.map(o =>
            `<tr><td style="padding:2px 0;font-size:11px">${o.orderNumber || o.id || '-'}</td><td style="padding:2px 0;font-size:11px;text-align:right">${o.orderCosto || ''}</td></tr>`
        ).join('');
        const simbolo = ordenes.length > 0 ? (ordenes[0].simbolo || '$') : '$';
        return `<!DOCTYPE html>
<html><head><style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; font-weight: bold; }
    body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm; font-size: 14px; font-weight: bold; }
    .center { text-align: center; }
    .line { border-top: 2px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; font-weight: bold; padding: 2px 0; }
    .header { font-size: 18px; font-weight: 900; letter-spacing: 2px; }
    .retiro-id { font-size: 22px; font-weight: 900; margin: 6px 0; }
</style></head><body>
    <div class="center header">USER</div>
    <div class="center" style="font-size:11px;margin-bottom:4px;font-weight:bold;">COMPROBANTE DE RETIRO</div>
    <div class="line"></div>
    <div class="center retiro-id">${retiro.ordenDeRetiro || 'N/A'}</div>
    <div class="line"></div>
    <table>
        <tr><td>Cliente:</td><td>${retiro.CliNombre || retiro.CliCodigoCliente || '-'}</td></tr>
        <tr><td>Lugar:</td><td>${retiro.lugarRetiro || '-'}</td></tr>
        <tr><td>Fecha:</td><td>${fecha}</td></tr>
    </table>
    <div class="line"></div>
    <div style="margin:3px 0;font-size:13px;">ÓRDENES:</div>
    <table>${ordenesHTML || '<tr><td style="font-size:12px;">Sin detalle</td></tr>'}</table>
    <div class="line"></div>
    <table>
        <tr><td style="font-size:16px;">TOTAL:</td><td style="font-size:16px;text-align:right;">${simbolo} ${retiro.totalCost || '0.00'}</td></tr>
    </table>
    <div class="line"></div>

    <div style="height:25mm"></div>
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

    // Escuchar eventos de nuevo retiro
    useEffect(() => {
        const handleRetiroUpdate = async (data) => {
            if (data?.type !== 'nuevo_retiro') return;

            addLog('Nuevo retiro detectado — cargando datos...', 'info', null, 'package');

            if (soundEnabled && audioRef.current) {
                audioRef.current.play().catch(() => { });
            }

            try {
                // Fetch los últimos retiros y tomar el más reciente
                const res = await api.get('/apiordenesRetiro/estados?estados=1,2,3');
                const retiros = res.data;
                if (retiros && retiros.length > 0) {
                    // Ordenar por fecha descendente y tomar el primero
                    const ultimo = retiros.sort((a, b) => new Date(b.fechaAlta) - new Date(a.fechaAlta))[0];
                    addLog(`Imprimiendo retiro ${ultimo.ordenDeRetiro} (${copies} copias)...`, 'info', ultimo, 'printer');
                    printTicket(ultimo);
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
            minHeight: '100vh',
            background: '#0a0a0a',
            color: '#e0e0e0',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
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
                        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>Print Station</h1>
                        <p style={{ fontSize: '12px', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Impresión automática de retiros</p>
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
                    <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Tickets impresos</div>
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
                    <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Copias por ticket</div>
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

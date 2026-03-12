import React, { useState } from 'react';
import { Package, RefreshCw, CheckCircle, Search, ArrowLeft } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const BASE_PREFIXES = ['SB', 'DF', 'UVDF', 'ECOUV', 'TWC', 'EMB', 'EST', 'TP', 'IMD'];
const STANDALONE_PREFIXES = ['PRO', 'VEN'];

// Print ticket (same format as WebRetirosPage)
const printTotemTicket = ({ ordenRetiro, client, orders, totalCost }) => {
    const now = new Date().toLocaleString('es-UY', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
    const ordersRows = orders.map((o, i) => `<tr><td>${i + 1}</td><td><strong>${o.id}</strong></td><td style="text-align:right;">${o.amount ? `$ ${o.amount.toFixed(2)}` : '-'}</td></tr>`).join('');
    const ticketBody = `
  <div class="header">
    <div class="empresa">USER</div>
    <div class="modulo">Logística — Comprobante de Retiro</div>
    <div class="doc-tipo">Retiro Tótem · Local: Retiro Web</div>
  </div>
  <div class="codigo-principal">${ordenRetiro}</div>
  <div style="text-align:center; margin-bottom:8px;">
    <span class="estado-badge">PENDIENTE DE PAGO</span>
  </div>
  <table class="info-table">
    <tr><td>Cliente</td><td><strong>${client.company || client.name}</strong> <span style="color:#888;font-size:9px;">(${client.idCliente})</span></td></tr>
    ${totalCost ? `<tr><td>Monto</td><td>$ ${Number(totalCost).toFixed(2)}</td></tr>` : ''}
    <tr><td>Local Retiro</td><td>Retiro Web</td></tr>
    <tr><td>Fecha Alta</td><td>${now}</td></tr>
  </table>
  <div class="sep"></div>
  <div style="font-size:11px;color:#000;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;font-weight:800;">Órdenes incluidas (${orders.length})</div>
  <table class="orders-table">
    <thead><tr><th>#</th><th>Código de Orden</th><th style="text-align:right;">Importe</th></tr></thead>
    <tbody>${ordersRows}</tbody>
  </table>
  <div class="sep"></div>
  <table style="width:100%;font-size:9px;color:#666;"><tr><td>Impreso:</td><td style="text-align:right;">${now}</td></tr></table>
  <div style="text-align:center; margin:8px 0 14px;">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(ordenRetiro)}&color=000000&bgcolor=ffffff&margin=2" alt="QR" style="width:90px;height:90px;border:1px solid #eee;" />
    <div style="font-size:9px;color:#999;margin-top:2px;letter-spacing:1px;">${ordenRetiro}</div>
  </div>
  <div class="firma-row">
    <div class="firma-box">Firma y Aclaración Cliente</div>
    <div class="firma-box">Firma Responsable Logística</div>
  </div>
  <div class="footer">USER — Documento interno. Conserve este comprobante.</div>`;

    const styles = `
    @page { size: A5; margin: 12mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
    .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 12px; }
    .header .empresa { font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
    .header .modulo { font-size: 12px; color: #555; margin-top: 2px; }
    .header .doc-tipo { font-size: 11px; color: #888; margin-top: 1px; font-style: italic; }
    .codigo-principal { text-align: center; font-size: 26px; font-weight: 900; letter-spacing: 2px; margin: 10px 0 8px; padding: 6px 0; border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; }
    .estado-badge { display: inline-block; padding: 3px 10px; border: 2px solid #dc2626; color: #dc2626; font-weight: 900; font-size: 11px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .info-table td { padding: 5px 2px; border-bottom: 1px solid #eee; vertical-align: top; }
    .info-table td:first-child { color: #000; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; width: 32%; white-space: nowrap; }
    .info-table td:last-child { font-weight: 700; text-align: right; font-size: 13px; }
    .orders-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    .orders-table thead tr { background: #f3f4f6; }
    .orders-table th { padding: 6px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #444; border-bottom: 1px solid #ddd; }
    .orders-table td { padding: 6px; border-bottom: 1px solid #eee; font-weight: 600; }
    .sep { border-top: 1px dashed #bbb; margin: 10px 0; }
    .firma-row { display: flex; justify-content: space-between; margin-top: 60px; }
    .firma-box { width: 44%; border-top: 1px solid #333; padding-top: 4px; text-align: center; font-size: 11px; color: #555; }
    .footer { margin-top: 14px; font-size: 11px; text-align: center; color: #aaa; border-top: 1px solid #eee; padding-top: 6px; }
    .page-break { page-break-before: always; }`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante Retiro ${ordenRetiro}</title>
  <style>${styles}</style>
</head>
<body>
  ${ticketBody}
  <div class="page-break"></div>
  ${ticketBody}
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    // Limpiar iframe después de imprimir
    setTimeout(() => document.body.removeChild(iframe), 3000);
};

export const TotemDashboard = ({ onLogout }) => {
    // Search state
    const [externalMode, setExternalMode] = useState(''); // '' | 'X' | 'R'
    const [prefix, setPrefix] = useState('');
    const [number, setNumber] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    // Results state
    const [client, setClient] = useState(null);
    const [orders, setOrders] = useState([]);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [creating, setCreating] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const fullCode = prefix ? `${externalMode && BASE_PREFIXES.includes(prefix) ? externalMode : ''}${prefix}-${number}` : number;

    const handlePrefix = (p) => {
        if (STANDALONE_PREFIXES.includes(p)) setExternalMode('');
        setPrefix(p);
        setSearchError('');
    };

    const handleKey = (key) => {
        setSearchError('');
        if (key === 'DEL') {
            setNumber(prev => prev.slice(0, -1));
        } else if (key === 'CLEAR') {
            setNumber('');
            setPrefix('');
            setXMode(false);
        } else if (number.length < 10) {
            setNumber(prev => prev + key);
        }
    };

    const handleSearch = async () => {
        if (!prefix || !number) {
            setSearchError('Seleccioná un prefijo e ingresá el número');
            return;
        }
        setSearching(true);
        setSearchError('');
        try {
            const res = await fetch(`${API_BASE}/web-orders/totem-lookup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderCode: fullCode })
            });
            const data = await res.json();
            if (data.success) {
                setClient(data.client);
                setOrders(data.orders || []);
                setSelectedOrders([]);
            } else {
                setSearchError(data.message || 'Orden no encontrada');
            }
        } catch (err) {
            setSearchError('Error de conexión');
        } finally {
            setSearching(false);
        }
    };

    const handleBack = () => {
        setClient(null);
        setOrders([]);
        setSelectedOrders([]);
        setError('');
        setNumber('');
        setPrefix('');
        setExternalMode('');
    };

    const toggleOrder = (id) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedOrders(
            selectedOrders.length === orders.length ? [] : orders.map(o => o.id)
        );
    };

    const createPickup = async () => {
        if (selectedOrders.length === 0) return;
        setCreating(true);
        setError('');
        try {
            const selected = orders.filter(o => selectedOrders.includes(o.id));
            const totalCost = selected.reduce((sum, o) => sum + (o.amount || 0), 0);

            const res = await fetch(`${API_BASE}/web-orders/totem-create-pickup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orders: selectedOrders,
                    totalCost: totalCost.toFixed(2),
                    lugarRetiro: 5,
                    formaRetiro: 'RT',
                    clientId: client.idCliente
                })
            });
            const data = await res.json();
            if (data.success) {
                // Print ticket before showing success
                const selectedOrdObjects = orders.filter(o => selectedOrders.includes(o.id));
                printTotemTicket({
                    ordenRetiro: data.ordIdGenerada || data.ordenRetiro || 'R-' + Date.now(),
                    client,
                    orders: selectedOrdObjects,
                    totalCost
                });
                setSuccess(true);
                setSelectedOrders([]);
                setTimeout(() => { setSuccess(false); onLogout(); }, 8000);
            } else {
                setError(data.error || 'Error al crear retiro');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setCreating(false);
        }
    };

    // Success screen
    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center gap-4">
                <CheckCircle size={80} strokeWidth={1.5} className="text-green-400" />
                <h2 className="text-4xl font-extrabold text-green-400">¡Retiro creado!</h2>
                <p className="text-xl text-white/70">Un operario te atenderá en breve.</p>
                <p className="text-sm text-white/30 mt-3">¡Gracias por tu preferencia!</p>
            </div>
        );
    }

    // Results screen
    if (client) {
        // Sort: searched order first
        const sortedOrders = [...orders].sort((a, b) => {
            if (a.id === fullCode) return -1;
            if (b.id === fullCode) return 1;
            return 0;
        });

        return (
            <div className="min-h-screen flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
                    <h2 className="text-2xl md:text-3xl font-bold">
                        Hola, {client.company || client.name}
                    </h2>
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-auto w-[80%] mt-4 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-center text-[15px]">
                        {error}
                    </div>
                )}

                {/* Orders list */}
                <div className="flex-1 overflow-y-auto py-6">
                    {orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-white/40 text-lg gap-4">
                            <Package size={48} strokeWidth={1} />
                            <p>No hay órdenes listas para retirar</p>
                            <button
                                className="mt-4 px-8 py-3 rounded-xl text-base font-semibold bg-white/[0.08] border border-white/15 text-white/70 transition-all active:bg-white/[0.15]"
                                onClick={handleBack}
                            >
                                <ArrowLeft size={18} className="inline mr-2" /> Buscar otra orden
                            </button>
                        </div>
                    ) : (
                        <div className="w-[80%] mx-auto flex flex-col gap-2">
                            {/* Select all */}
                            <div
                                className="flex items-center gap-3 px-5 py-3 mb-1 rounded-xl cursor-pointer transition-all bg-white/[0.03] border border-white/[0.06] active:bg-white/[0.08]"
                                onClick={selectAll}
                            >
                                <div className="flex-shrink-0 text-blue-400">
                                    {selectedOrders.length === orders.length && orders.length > 0 ? (
                                        <CheckCircle size={22} />
                                    ) : (
                                        <div className="w-[22px] h-[22px] rounded-full border-2 border-white/20" />
                                    )}
                                </div>
                                <span className="text-sm font-bold text-white/50 uppercase tracking-wider">
                                    Seleccionar todas ({orders.length})
                                </span>
                            </div>

                            <div className="max-h-[50vh] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                            {/* Column headers */}
                            <div className="flex items-center gap-4 px-5 py-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
                                <div className="w-[26px] flex-shrink-0" />
                                <div className="w-36 flex-shrink-0">Orden</div>
                                <div className="flex-1">Descripción</div>
                                <div className="w-24 flex-shrink-0 text-right">Cantidad</div>
                                <div className="w-28 flex-shrink-0 text-right">Costo</div>
                            </div>
                            {sortedOrders.map(order => (
                                <div
                                    key={order.id}
                                    className={`flex items-center gap-4 rounded-xl px-5 py-4 cursor-pointer transition-all active:scale-[0.99] border-2 ${selectedOrders.includes(order.id)
                                        ? 'bg-blue-500/10 border-blue-500/40'
                                        : 'bg-white/[0.05] border-white/[0.08]'
                                        }`}
                                    onClick={() => toggleOrder(order.id)}
                                >
                                    {/* Checkbox */}
                                    <div className="flex-shrink-0 text-blue-400">
                                        {selectedOrders.includes(order.id) ? (
                                            <CheckCircle size={26} />
                                        ) : (
                                            <div className="w-[26px] h-[26px] rounded-full border-2 border-white/20" />
                                        )}
                                    </div>

                                    {/* Order number */}
                                    <div className="w-36 flex-shrink-0">
                                        <span className="text-base font-bold">{order.id}</span>
                                    </div>

                                    {/* Description */}
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm text-white/60 truncate block">{order.desc}</span>
                                    </div>

                                    {/* Quantity */}
                                    <div className="w-24 flex-shrink-0 text-right">
                                        <span className="text-sm text-white/50">{order.quantity}</span>
                                    </div>

                                    {/* Cost */}
                                    <div className="w-28 flex-shrink-0 text-right">
                                        <span className="text-base font-bold text-blue-400">
                                            {order.currency} {order.amount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            </div>

                            {/* Search another */}
                            <button
                                className="mt-4 self-start flex items-center gap-2 text-sm text-white/30 hover:text-white/50 transition-colors"
                                onClick={handleBack}
                            >
                                <ArrowLeft size={16} /> Buscar otra orden
                            </button>

                            {/* Retirar button */}
                            <button
                                className="mt-6 w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-xl font-bold bg-gradient-to-r from-blue-500 to-brand-500 text-white transition-all active:scale-[0.97] disabled:opacity-30 uppercase"
                                onClick={createPickup}
                                disabled={creating || selectedOrders.length === 0}
                            >
                                <Package size={24} />
                                {creating
                                    ? 'Creando...'
                                    : selectedOrders.length > 0
                                        ? `Retirar (${selectedOrders.length})`
                                        : 'Seleccioná órdenes para retirar'
                                }
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Search screen (default)
    return (
        <div className="flex items-center justify-center min-h-screen p-3">
            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-7 w-full max-w-[520px] shadow-2xl">

                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white uppercase">Ingresá tu número de orden</h2>
                    <p className="text-white/40 text-xs mt-0.5 uppercase">Seleccioná el prefijo y escribí el número</p>
                </div>

                <div className="border-t border-white/10 my-2" />
                {/* External prefix toggles + standalone prefixes */}
                <div className="flex items-center gap-2 py-3">
                    <button
                        className={`w-10 py-1.5 rounded-lg text-sm font-bold border-2 transition-all text-center ${externalMode === 'X'
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-white/[0.04] border-white/10 text-white/40'
                            }`}
                        onClick={() => setExternalMode(externalMode === 'X' ? '' : 'X')}
                    >
                        X
                    </button>
                    <button
                        className={`w-10 py-1.5 rounded-lg text-sm font-bold border-2 transition-all text-center ${externalMode === 'R'
                            ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                            : 'bg-white/[0.04] border-white/10 text-white/40'
                            }`}
                        onClick={() => setExternalMode(externalMode === 'R' ? '' : 'R')}
                    >
                        R
                    </button>
                    <span className="text-white/30 text-xs uppercase tracking-tight">Prefijo externo</span>
                    <div className="flex-1" />
                    {STANDALONE_PREFIXES.map(p => (
                        <button
                            key={p}
                            className={`w-14 py-1.5 rounded-lg text-sm font-bold border-2 transition-all text-center ${prefix === p
                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                : 'bg-white/[0.04] border-white/10 text-white/40'
                                }`}
                            onClick={() => handlePrefix(p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                <div className="border-t border-white/10 my-2" />

                {/* Base prefixes */}
                <div className="grid grid-cols-5 gap-2 mb-5">
                    {BASE_PREFIXES.map(p => (
                        <button
                            key={p}
                            className={`py-3 rounded-lg text-sm font-bold border transition-all active:scale-95 ${prefix === p
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                : 'bg-custom-dark border-white/10 text-white/70 hover:bg-white/[0.1]'
                                }`}
                            onClick={() => handlePrefix(p)}
                        >
                            {externalMode ? `${externalMode}${p}` : p}
                        </button>
                    ))}
                </div>

                {/* Code display */}
                <div className="mb-5 flex items-center gap-2">
                    {prefix && (
                        <div className="text-xl font-bold text-blue-400 whitespace-nowrap">
                            {externalMode && BASE_PREFIXES.includes(prefix) ? `${externalMode}${prefix}` : prefix}-
                        </div>
                    )}
                    <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-center text-xl font-bold tracking-[4px] min-h-[36px] text-white">
                        {number || <span className="text-white/20 text-lg tracking-tight uppercase">{prefix ? 'Ingresá el número...' : 'Seleccioná un prefijo...'}</span>}
                    </div>
                </div>

                {/* Error */}
                {searchError && (
                    <div className="bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl px-3 py-2 text-center text-sm mb-2">
                        {searchError}
                    </div>
                )}

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'DEL'].map(key => (
                        <button
                            key={key}
                            className={`rounded-xl py-2 text-lg font-semibold border transition-all active:scale-95 ${key === 'CLEAR' || key === 'DEL'
                                ? 'bg-white/[0.04] border-white/10 text-white/60 text-sm'
                                : 'bg-white/[0.08] border-white/10 text-white hover:bg-white/[0.12]'
                                }`}
                            onClick={() => handleKey(key)}
                            disabled={searching}
                        >
                            {key === 'DEL' ? '⌫' : key === 'CLEAR' ? 'C' : key}
                        </button>
                    ))}
                </div>

                {/* Search button */}
                <button
                    className="w-full py-2.5 rounded-xl text-lg font-bold bg-custom-magenta text-white transition-all active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-2 uppercase"
                    onClick={handleSearch}
                    disabled={searching || !prefix || !number}
                >
                    <Search size={22} />
                    {searching ? 'Buscando...' : 'Buscar'}
                </button>

            </div>
        </div>
    );
};

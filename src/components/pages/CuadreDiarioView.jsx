import React, { useState, useMemo, useRef } from 'react';
import api from '../../services/apiClient';
import {
    Calendar, Search, Filter, RefreshCw, ChevronDown, ChevronRight,
    Package, CheckCircle, AlertTriangle, XCircle, Printer, FileText,
    X, CreditCard, DollarSign, TrendingUp
} from 'lucide-react';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (n) => Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const SITUACION = {
    pagado:   { label: 'Pagado',       color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle size={11} /> },
    deuda:    { label: 'Autorizado',   color: 'bg-amber-100 text-amber-800 border-amber-200',        icon: <AlertTriangle size={11} /> },
    sin_pago: { label: 'Sin pago',     color: 'bg-rose-100 text-rose-800 border-rose-200',           icon: <XCircle size={11} /> },
};

// ─── BADGE ────────────────────────────────────────────────────────────────────

const SituacionBadge = ({ s }) => {
    const cfg = SITUACION[s] || SITUACION.sin_pago;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${cfg.color}`}>
            {cfg.icon} {cfg.label}
        </span>
    );
};

// ─── RESUMEN STATS ────────────────────────────────────────────────────────────

const Stats = ({ data }) => {
    const totales = useMemo(() => {
        const r = { pagado: 0, deuda: 0, sin_pago: 0, total: data.length };
        data.forEach(d => { r[d.SituacionPago] = (r[d.SituacionPago] || 0) + 1; });
        return r;
    }, [data]);

    const monedas = useMemo(() => {
        const m = {};
        data.forEach(d => {
            if (d.SituacionPago === 'pagado' && d.MonedaPago) {
                m[d.MonedaPago] = (m[d.MonedaPago] || 0) + Number(d.MontoPago || 0);
            }
        });
        return m;
    }, [data]);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500"><TrendingUp size={18} /></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase">Total entregados</p><p className="text-2xl font-black text-slate-800">{totales.total}</p></div>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle size={18} /></div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Pagados</p>
                    <p className="text-2xl font-black text-emerald-700">{totales.pagado}</p>
                    {Object.entries(monedas).map(([sym, tot]) => (
                        <p key={sym} className="text-xs text-emerald-600 font-bold">{sym} {fmt(tot)}</p>
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><AlertTriangle size={18} /></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase">Autorizados (deuda)</p><p className="text-2xl font-black text-amber-700">{totales.deuda}</p></div>
            </div>
            <div className="bg-white rounded-xl border border-rose-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><XCircle size={18} /></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase">Sin pago</p><p className="text-2xl font-black text-rose-700">{totales.sin_pago}</p></div>
            </div>
        </div>
    );
};

// ─── VISTA PRINCIPAL ──────────────────────────────────────────────────────────

const CuadreDiarioView = () => {
    const hoy = new Date().toISOString().split('T')[0];
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [filters, setFilters] = useState({ startDate: hoy, endDate: hoy, clientFilter: '', estado: '' });
    const printRef = useRef(null);

    const fetchDatos = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
            const res = await api.get(`/web-retiros/cuadre-diario?${params}`);
            setDatos(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const filtered = useMemo(() => {
        if (!busqueda.trim()) return datos;
        const t = busqueda.toLowerCase();
        return datos.filter(r => [
            r.OrdenRetiro, r.NombreCliente, String(r.CodigoCliente || ''),
            r.TipoCliente, r.MetodoPago, r.DeudaEstado,
            ...(r.Ordenes || []).map(o => o.codigo),
            ...(r.Ordenes || []).map(o => o.producto),
        ].some(v => String(v || '').toLowerCase().includes(t)));
    }, [datos, busqueda]);

    const handlePrint = () => {
        const win = window.open('', '_blank');
        const desde = filters.startDate || hoy;
        const hasta = filters.endDate || hoy;
        const rows = filtered.map(r => {
            const ordenes = (r.Ordenes || []).map(o =>
                `<tr style="font-size:10px;color:#555">
                    <td style="padding:3px 8px">${o.codigo || ''}</td>
                    <td style="padding:3px 8px">${o.producto || ''}</td>
                    <td style="padding:3px 8px;text-align:center">${o.cantidad != null ? Number(o.cantidad).toFixed(2) : ''}</td>
                    <td style="padding:3px 8px;text-align:right">${o.moneda || ''} ${fmt(o.monto)}</td>
                </tr>`
            ).join('');
            const situacion = SITUACION[r.SituacionPago] || SITUACION.sin_pago;
            const badgeColor = r.SituacionPago === 'pagado' ? '#065f46' : r.SituacionPago === 'deuda' ? '#92400e' : '#991b1b';
            const badgeBg = r.SituacionPago === 'pagado' ? '#d1fae5' : r.SituacionPago === 'deuda' ? '#fef3c7' : '#fee2e2';
            return `
                <tr style="border-top:1px solid #e2e8f0">
                    <td style="padding:6px 8px;font-weight:bold;color:#1e40af">${r.OrdenRetiro}</td>
                    <td style="padding:6px 8px">
                        <div style="font-weight:bold">${r.NombreCliente || '—'}</div>
                        <div style="font-size:11px;color:#64748b">${r.TipoCliente || ''} · Cód: ${r.CodigoCliente || ''}</div>
                    </td>
                    <td style="padding:6px 8px;font-size:11px;color:#475569">${fmtDate(r.FechaEntrega)}</td>
                    <td style="padding:6px 8px;text-align:center">
                        <span style="background:${badgeBg};color:${badgeColor};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:bold">${situacion.label}</span>
                    </td>
                    <td style="padding:6px 8px;font-size:11px">
                        ${r.MetodoPago ? `<div>${r.MetodoPago}</div>` : ''}
                        ${r.MontoPago ? `<div style="font-weight:bold">${r.MonedaPago} ${fmt(r.MontoPago)}</div>` : ''}
                        ${r.DeudaId ? `<div style="color:#92400e;font-size:10px">${r.DeudaExplicacion || 'Deuda autorizada'}</div>` : ''}
                    </td>
                    <td style="padding:6px 8px;text-align:center">${r.CantOrdenes}</td>
                </tr>
                ${ordenes ? `<tr><td colspan="6" style="padding:0 8px 8px 32px;background:#f8fafc">
                    <table style="width:100%;border-collapse:collapse;font-size:10px">
                        <thead><tr style="background:#e2e8f0;color:#475569">
                            <th style="padding:3px 8px;text-align:left">Código</th>
                            <th style="padding:3px 8px;text-align:left">Producto</th>
                            <th style="padding:3px 8px;text-align:center">Cantidad</th>
                            <th style="padding:3px 8px;text-align:right">Monto</th>
                        </tr></thead>
                        <tbody>${ordenes}</tbody>
                    </table>
                </td></tr>` : ''}
            `;
        }).join('');

        const totPagados = filtered.filter(r => r.SituacionPago === 'pagado').length;
        const totDeuda   = filtered.filter(r => r.SituacionPago === 'deuda').length;
        const totSinPago = filtered.filter(r => r.SituacionPago === 'sin_pago').length;
        const monedas = {};
        filtered.forEach(d => { if (d.SituacionPago === 'pagado' && d.MonedaPago) monedas[d.MonedaPago] = (monedas[d.MonedaPago] || 0) + Number(d.MontoPago || 0); });

        win.document.write(`<!DOCTYPE html><html lang="es"><head>
            <meta charset="UTF-8" />
            <title>Cuadre Diario ${desde} al ${hasta}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 0; padding: 20px; }
                h1 { font-size: 20px; font-weight: 900; margin: 0; color: #1e293b; }
                .subtitle { color: #64748b; font-size: 12px; margin-bottom: 16px; }
                .stats { display: flex; gap: 20px; margin-bottom: 16px; flex-wrap: wrap; }
                .stat { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 18px; }
                .stat-n { font-size: 22px; font-weight: 900; }
                .stat-l { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; }
                thead tr { background: #f1f5f9; }
                th { padding: 8px; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase; }
                @media print { body { padding: 0; } .no-print { display: none; } }
            </style>
        </head><body>
            <h1>🧾 Cuadre Diario — USER</h1>
            <p class="subtitle">Período: ${desde === hasta ? desde : `${desde} al ${hasta}`} · Generado: ${new Date().toLocaleString('es-UY')}</p>
            <div class="stats">
                <div class="stat"><div class="stat-l">Total entregados</div><div class="stat-n">${filtered.length}</div></div>
                <div class="stat" style="border-color:#a7f3d0"><div class="stat-l">Pagados</div><div class="stat-n" style="color:#065f46">${totPagados}</div>${Object.entries(monedas).map(([s, t]) => `<div style="font-size:11px;color:#065f46;font-weight:bold">${s} ${fmt(t)}</div>`).join('')}</div>
                <div class="stat" style="border-color:#fde68a"><div class="stat-l">Autorizados</div><div class="stat-n" style="color:#92400e">${totDeuda}</div></div>
                <div class="stat" style="border-color:#fecaca"><div class="stat-l">Sin pago</div><div class="stat-n" style="color:#991b1b">${totSinPago}</div></div>
            </div>
            <table>
                <thead><tr>
                    <th>Retiro</th><th>Cliente</th><th>Entrega</th>
                    <th style="text-align:center">Situación</th><th>Pago / Detalle</th>
                    <th style="text-align:center">Órdenes</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <p style="margin-top:24px;font-size:10px;color:#94a3b8;text-align:center">
                Reporte generado por USER — Sistema de Gestión
            </p>
        </body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 400);
    };

    return (
        <div className="min-h-full flex flex-col p-4 lg:p-8 gap-4 font-sans bg-[#f6f8fb]">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <FileText size={24} className="text-indigo-600" /> Cuadre Diario
                    </h2>
                    <p className="text-sm text-slate-400 mt-0.5">Retiros entregados y su situación de pago</p>
                </div>
                <button onClick={handlePrint} disabled={filtered.length === 0}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md disabled:opacity-40 transition-all text-sm">
                    <Printer size={15} /> Exportar PDF
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-3 shadow-sm">
                <div className="flex flex-col gap-1 min-w-[140px]">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={11} /> Desde</label>
                    <input type="date" value={filters.startDate}
                        onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex flex-col gap-1 min-w-[140px]">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={11} /> Hasta</label>
                    <input type="date" value={filters.endDate}
                        onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                    <label className="text-xs font-bold text-slate-500 uppercase">Cliente</label>
                    <div className="relative">
                        <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Nombre o código..." value={filters.clientFilter}
                            onChange={e => setFilters(f => ({ ...f, clientFilter: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && fetchDatos()}
                            className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                </div>
                <div className="flex flex-col gap-1 min-w-[160px]">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Filter size={11} /> Situación</label>
                    <select value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500">
                        <option value="">Todos</option>
                        <option value="pagado">✅ Pagados</option>
                        <option value="deuda">⚠️ Autorizados (deuda)</option>
                        <option value="sin_pago">❌ Sin pago</option>
                    </select>
                </div>
                <button onClick={fetchDatos} disabled={loading}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50">
                    {loading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />} Buscar
                </button>
            </div>

            {/* Buscador local */}
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Buscar en resultados: retiro, cliente, orden, producto..."
                    value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 bg-white shadow-sm" />
                {busqueda && (
                    <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Stats */}
            {filtered.length > 0 && <Stats data={filtered} />}

            {/* Tabla */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-auto shadow-sm">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wide z-10">
                        <tr>
                            <th className="px-4 py-3 text-left">Retiro</th>
                            <th className="px-4 py-3 text-left">Cliente</th>
                            <th className="px-4 py-3 text-left">Tipo</th>
                            <th className="px-4 py-3 text-left">Entrega</th>
                            <th className="px-4 py-3 text-center">Situación</th>
                            <th className="px-4 py-3 text-left">Pago / Deuda</th>
                            <th className="px-4 py-3 text-center">Órdenes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                                <RefreshCw className="inline animate-spin mr-2" size={16} />Cargando cuadre...
                            </td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                                {datos.length === 0
                                    ? <><FileText size={32} className="mx-auto mb-2 opacity-30" /><p>Seleccioná un período y presioná Buscar</p></>
                                    : 'No hay resultados con ese filtro de búsqueda.'}
                            </td></tr>
                        ) : filtered.map(r => {
                            const isExp = expandedId === r.OReIdOrdenRetiro;
                            const hasOrd = r.Ordenes?.length > 0;
                            const rowBg = r.SituacionPago === 'pagado' ? '' : r.SituacionPago === 'deuda' ? 'bg-amber-50/30' : 'bg-rose-50/20';
                            return (
                                <React.Fragment key={r.OReIdOrdenRetiro}>
                                    <tr className={`hover:bg-slate-50 transition-colors ${isExp ? 'bg-indigo-50/30' : rowBg}`}>
                                        <td className="px-4 py-3 font-mono font-black text-indigo-700 text-sm">{r.OrdenRetiro}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-800">{r.NombreCliente || '—'}</div>
                                            <div className="text-xs text-slate-400">Cód: {r.CodigoCliente || '—'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.TipoCliente
                                                ? <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold">{r.TipoCliente}</span>
                                                : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(r.FechaEntrega)}</td>
                                        <td className="px-4 py-3 text-center"><SituacionBadge s={r.SituacionPago} /></td>
                                        <td className="px-4 py-3">
                                            {r.SituacionPago === 'pagado' ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold border border-slate-200">
                                                        <CreditCard size={10} /> {r.MetodoPago}
                                                    </span>
                                                    <span className="text-emerald-700 font-black text-sm">{r.MonedaPago} {fmt(r.MontoPago)}</span>
                                                    <span className="text-xs text-slate-400">{fmtDate(r.FechaPago)}</span>
                                                </div>
                                            ) : r.SituacionPago === 'deuda' ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-amber-700 font-bold text-xs">{r.DeudaEstado || 'Pendiente'}</span>
                                                    {r.MontoDeuda > 0 && <span className="text-amber-800 font-black text-sm">$ {fmt(r.MontoDeuda)}</span>}
                                                    {r.DeudaExplicacion && <span className="text-xs text-slate-500 italic max-w-[180px] truncate">{r.DeudaExplicacion}</span>}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Sin registro</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {hasOrd ? (
                                                <button onClick={() => setExpandedId(isExp ? null : r.OReIdOrdenRetiro)}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${isExp ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}>
                                                    {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                    {r.Ordenes.length}
                                                </button>
                                            ) : <span className="text-slate-300 text-xs">0</span>}
                                        </td>
                                    </tr>
                                    {isExp && hasOrd && (
                                        <tr>
                                            <td colSpan={7} className="px-8 pb-4 pt-0 bg-indigo-50/50 border-b border-indigo-100">
                                                <div className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
                                                    <div className="px-4 py-2 bg-indigo-600 text-white text-xs font-black flex items-center gap-2">
                                                        <Package size={13} /> Detalle de órdenes · {r.OrdenRetiro}
                                                    </div>
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="bg-indigo-50 text-indigo-800 text-xs font-black uppercase">
                                                                <th className="px-4 py-2 text-left">Código</th>
                                                                <th className="px-4 py-2 text-left">Material / Producto</th>
                                                                <th className="px-4 py-2 text-left">Modo</th>
                                                                <th className="px-4 py-2 text-center">Cantidad</th>
                                                                <th className="px-4 py-2 text-right">Monto</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-indigo-50">
                                                            {r.Ordenes.map((o, i) => (
                                                                <tr key={i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                                                                    <td className="px-4 py-2 font-mono font-black text-blue-700">{o.codigo}</td>
                                                                    <td className="px-4 py-2 text-slate-700">{o.producto || '—'}</td>
                                                                    <td className="px-4 py-2">
                                                                        {o.modo ? <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-bold">{o.modo}</span> : <span className="text-slate-300">—</span>}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-center font-bold text-slate-600">
                                                                        {o.cantidad != null ? Number(o.cantidad).toFixed(2) : '—'}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right font-bold text-slate-800">
                                                                        {o.moneda || '$'} {fmt(o.monto)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="text-xs text-slate-400 text-right">{filtered.length} retiro{filtered.length !== 1 ? 's' : ''} en el período</div>
        </div>
    );
};

export default CuadreDiarioView;

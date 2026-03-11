import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
    Package, RefreshCcw, TrendingUp, Clock, CheckCircle2,
    ShoppingBag, AlertTriangle, Users, DollarSign, ArrowDown, ArrowUp,
    Boxes, Loader2
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ESTADO_COLORS = {
    1: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', bar: '#3b82f6', label: 'Ingresado' },
    2: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', bar: '#6366f1', label: 'En proceso' },
    3: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', bar: '#f59e0b', label: 'Para avisar' },
    4: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', bar: '#f97316', label: 'Avisado' },
    7: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', bar: '#10b981', label: 'Pronto' },
};
const RETIRO_ESTADO_COLORS = {
    1: { bg: 'bg-blue-100', text: 'text-blue-700', bar: '#3b82f6', label: 'Ingresado' },
    2: { bg: 'bg-violet-100', text: 'text-violet-700', bar: '#8b5cf6', label: 'Abonado' },
    3: { bg: 'bg-amber-100', text: 'text-amber-700', bar: '#f59e0b', label: 'Pendiente emp.' },
    4: { bg: 'bg-orange-100', text: 'text-orange-700', bar: '#f97316', label: 'Por levantar' },
    7: { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: '#10b981', label: 'Pronto / Emp.' },
};
const TIPO_PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

const MetricCard = ({ icon: Icon, label, value, sub, color = 'blue', loading }) => {
    const colors = {
        blue: { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50', text: 'text-blue-600' },
        indigo: { bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-600' },
        emerald: { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600' },
        amber: { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-50', text: 'text-amber-600' },
        rose: { bg: 'from-rose-500 to-rose-600', light: 'bg-rose-50', text: 'text-rose-600' },
        violet: { bg: 'from-violet-500 to-violet-600', light: 'bg-violet-50', text: 'text-violet-600' },
    };
    const c = colors[color] || colors.blue;
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.bg} flex items-center justify-center shadow-sm`}>
                    <Icon size={18} className="text-white" />
                </div>
            </div>
            {loading
                ? <div className="h-9 bg-slate-100 rounded-lg animate-pulse w-20" />
                : <div className={`text-4xl font-black ${c.text} leading-none`}>{value}</div>
            }
            {sub && <div className="text-xs text-slate-400 font-medium">{sub}</div>}
        </div>
    );
};

const BarChart = ({ data, labelKey = 'nombre', valueKey = 'total', colorMap, title, loading }) => {
    const max = Math.max(1, ...data.map(d => d[valueKey] || 0));
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4">{title}</h3>
            {loading
                ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />)}</div>
                : data.length === 0
                    ? <p className="text-slate-400 text-sm text-center py-6">Sin datos</p>
                    : <div className="space-y-2.5">
                        {data.map((item, i) => {
                            const estadoKey = item.estado;
                            const cfg = colorMap?.[estadoKey];
                            const barColor = cfg?.bar || TIPO_PALETTE[i % TIPO_PALETTE.length];
                            const pct = Math.max(2, Math.round((item[valueKey] / max) * 100));
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-600 w-32 truncate shrink-0">
                                        {cfg?.label || item[labelKey] || '–'}
                                    </span>
                                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                                        >
                                            <span className="text-[10px] font-black text-white">{item[valueKey]}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
            }
        </div>
    );
};

const DonutChart = ({ parts, loading }) => {
    // parts: [{label, value, color}]
    const total = parts.reduce((s, p) => s + (p.value || 0), 0);
    if (loading) return <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />;
    return (
        <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    {(() => {
                        let offset = 0;
                        return parts.map((p, i) => {
                            const pct = total > 0 ? (p.value / total) * 100 : 0;
                            const el = (
                                <circle key={i} cx="18" cy="18" r="15.9155"
                                    fill="none" stroke={p.color} strokeWidth="3.8"
                                    strokeDasharray={`${pct} ${100 - pct}`}
                                    strokeDashoffset={-offset}
                                />
                            );
                            offset += pct;
                            return el;
                        });
                    })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-800">{total}</span>
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
                {parts.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-xs text-slate-600 font-medium">{p.label}</span>
                        <span className="text-xs font-black text-slate-800 ml-auto pl-3">{p.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────
const DepositoDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/dashboard/deposito');
            setData(res.data);
            setLastUpdate(new Date());
        } catch (e) {
            console.error('[DepositoDashboard]', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(load, 60000); // auto-refresh cada 1 min
        return () => clearInterval(timer);
    }, [load]);

    const d = data || {};

    const tiposData = (d.porTipoCliente || []).map((t, i) => ({
        ...t,
        estado: t.tipo,
        nombre: t.tipo,
        total: t.total,
        bar: TIPO_PALETTE[i % TIPO_PALETTE.length]
    }));

    const pagoParts = [
        { label: 'Pagadas', value: +(d.pagas || 0), color: '#10b981' },
        { label: 'Pend. de pago', value: +(d.pendientesPago || 0), color: '#f43f5e' },
    ];

    const retirosParts = [
        { label: 'Por empaquetar', value: +(d.retirosPorEmpaquetar || 0), color: '#f59e0b' },
        { label: 'Por levantar', value: +(d.retirosPorLevantar || 0), color: '#10b981' },
    ];

    return (
        <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6 animate-in fade-in duration-300">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard · Depósito</h2>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {lastUpdate ? `Actualizado: ${lastUpdate.toLocaleTimeString('es-UY')}` : 'Cargando...'}
                        <span className="ml-2 text-slate-300">· Auto-refresca cada 60 s</span>
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold text-sm transition-colors disabled:opacity-50"
                >
                    <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
                    Actualizar
                </button>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <MetricCard icon={Boxes} label="Activas en depósito" value={d.totalActivas ?? '–'} color="blue" loading={loading} sub="órdenes activas" />
                <MetricCard icon={ArrowDown} label="Entraron hoy" value={d.entraronHoy ?? '–'} color="indigo" loading={loading} sub="nuevas hoy" />
                <MetricCard icon={ArrowUp} label="Despachadas hoy" value={d.despachadasHoy ?? '–'} color="emerald" loading={loading} sub="estado Entregado hoy" />
                <MetricCard icon={Package} label="Retiros activos" value={d.retirosActivos ?? '–'} color="violet" loading={loading} sub="órdenes de retiro" />
                <MetricCard icon={AlertTriangle} label="Sin pago" value={d.pendientesPago ?? '–'} color="rose" loading={loading} sub="pendientes de cobro" />
            </div>

            {/* ── Fila 2: Bar charts ──────────────────────────────────────── */}
            <div className="grid lg:grid-cols-2 gap-4">
                <BarChart
                    title="Órdenes de Depósito por Estado"
                    data={d.ordenesPorEstado || []}
                    labelKey="nombre"
                    valueKey="total"
                    colorMap={ESTADO_COLORS}
                    loading={loading}
                />
                <BarChart
                    title="Órdenes de Retiro por Estado"
                    data={d.retirosPorEstado || []}
                    labelKey="nombre"
                    valueKey="total"
                    colorMap={RETIRO_ESTADO_COLORS}
                    loading={loading}
                />
            </div>

            {/* ── Fila 3: Donuts + tipo cliente ───────────────────────────── */}
            <div className="grid lg:grid-cols-3 gap-4">
                {/* Pago */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <DollarSign size={14} className="text-emerald-500" /> Estado de Pago
                    </h3>
                    <DonutChart parts={pagoParts} loading={loading} />
                </div>

                {/* Retiros empaquetar/levantar */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <ShoppingBag size={14} className="text-amber-500" /> Retiros Pendientes
                    </h3>
                    <DonutChart parts={retirosParts} loading={loading} />
                    {/* Mini summary */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="bg-amber-50 rounded-xl p-3 text-center">
                            <div className="text-2xl font-black text-amber-600">{d.retirosPorEmpaquetar ?? '–'}</div>
                            <div className="text-[10px] font-bold text-amber-500 uppercase">Por empaquetar</div>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                            <div className="text-2xl font-black text-emerald-600">{d.retirosPorLevantar ?? '–'}</div>
                            <div className="text-[10px] font-bold text-emerald-500 uppercase">Por levantar</div>
                        </div>
                    </div>
                </div>

                {/* Tipo cliente bar */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Users size={14} className="text-indigo-500" /> Por Tipo de Cliente
                    </h3>
                    {loading
                        ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-7 bg-slate-100 rounded-lg animate-pulse" />)}</div>
                        : (d.porTipoCliente || []).length === 0
                            ? <p className="text-slate-400 text-sm text-center py-4">Sin datos</p>
                            : (() => {
                                const maxT = Math.max(1, ...(d.porTipoCliente || []).map(t => t.total));
                                return (
                                    <div className="space-y-2.5">
                                        {(d.porTipoCliente || []).map((t, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TIPO_PALETTE[i % TIPO_PALETTE.length] }} />
                                                <span className="text-xs text-slate-600 font-medium w-24 truncate shrink-0">{t.tipo || '–'}</span>
                                                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700"
                                                        style={{ width: `${Math.max(2, Math.round((t.total / maxT) * 100))}%`, backgroundColor: TIPO_PALETTE[i % TIPO_PALETTE.length] }}
                                                    />
                                                </div>
                                                <span className="text-xs font-black text-slate-700 w-7 text-right">{t.total}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()
                    }
                </div>
            </div>

            {/* ── Fila 4: Tabla detalle por estado ─────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-black text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
                        <TrendingUp size={14} className="text-blue-500" /> Detalle de Órdenes Activas por Estado
                    </h3>
                    {!loading && <span className="text-xs font-bold text-slate-400">{d.totalActivas} total</span>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Cantidad</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">% del total</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Distribución</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading
                                ? [...Array(4)].map((_, i) => (
                                    <tr key={i}><td colSpan={4} className="px-6 py-3"><div className="h-5 bg-slate-100 rounded animate-pulse" /></td></tr>
                                ))
                                : (d.ordenesPorEstado || []).map((row) => {
                                    const cfg = ESTADO_COLORS[row.estado] || { bg: 'bg-slate-100', text: 'text-slate-700', bar: '#94a3b8', label: row.nombre };
                                    const pct = d.totalActivas > 0 ? Math.round((row.total / d.totalActivas) * 100) : 0;
                                    return (
                                        <tr key={row.estado} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                                                    {cfg.label || row.nombre || `Estado ${row.estado}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right font-black text-slate-800 text-lg">{row.total}</td>
                                            <td className="px-6 py-3 text-right font-bold text-slate-500">{pct}%</td>
                                            <td className="px-6 py-3 w-48">
                                                <div className="bg-slate-100 rounded-full h-2 w-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.bar }} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            }
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default DepositoDashboard;

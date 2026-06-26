import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/apiClient';

// ─── Paleta de colores ────────────────────────────────────────────────────────
const COLORS = {
    indigo:  '#6366f1', emerald: '#10b981', amber:  '#f59e0b',
    red:     '#ef4444', sky:     '#0ea5e9', violet: '#8b5cf6',
    pink:    '#ec4899', cyan:    '#06b6d4', lime:   '#84cc16',
    orange:  '#f97316',
};
const AREA_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#0ea5e9','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316'];
const ESTADO_COLORS = {
    'Pendiente':         '#94a3b8', 'En Máquina':    '#3b82f6',
    'En Proceso':        '#6366f1', 'Finalizado':    '#10b981',
    'Entregado':         '#10b981', 'Con Falla':     '#ef4444',
    'Urgente':           '#f59e0b', 'Cancelado':     '#6b7280',
    'Pronto':            '#10b981', 'En Maquina':    '#3b82f6',
    'Listo para retiro': '#0ea5e9',
};
const PRIORIDAD_COLORS = {
    'Falla': '#ef4444', 'Urgente': '#f59e0b',
    'Reposición': '#8b5cf6', 'Reposicion': '#8b5cf6',
    'Normal': '#3b82f6',
};

const colorFor = (label, map) => map[label] || COLORS.indigo;
const fmt = n => (n == null ? '—' : Number(n).toLocaleString('es-UY'));
const fmtM = n => (n == null ? '—' : `${Number(n).toLocaleString('es-UY', { maximumFractionDigits: 1 })} m`);

// ─── SVG: Donut Chart ─────────────────────────────────────────────────────────
function DonutChart({ data = [], size = 100, stroke = 18, label }) {
    const r  = (size - stroke) / 2;
    const cx = size / 2, cy = size / 2;
    const C  = 2 * Math.PI * r;
    const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
    let cum = 0;
    const segs = data.map(d => {
        const v   = Number(d.value) || 0;
        const len = total > 0 ? (v / total) * C : 0;
        const seg = { ...d, len, offset: cum };
        cum += len;
        return seg;
    });
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
            {total === 0
                ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
                : segs.map((seg, i) => (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                        stroke={seg.color || COLORS.indigo}
                        strokeWidth={stroke}
                        strokeDasharray={`${seg.len} ${C - seg.len}`}
                        strokeDashoffset={-seg.offset}
                        transform={`rotate(-90 ${cx} ${cy})`}
                    />
                ))
            }
            <text x={cx} y={cy - (label ? 6 : 0)} textAnchor="middle" dy="0.35em"
                  fill="#1e293b" fontSize={size * 0.18} fontWeight="700">
                {fmt(total)}
            </text>
            {label && (
                <text x={cx} y={cy + size * 0.12} textAnchor="middle"
                      fill="#94a3b8" fontSize={size * 0.1}>
                    {label}
                </text>
            )}
        </svg>
    );
}

// ─── SVG: Barra horizontal mini ───────────────────────────────────────────────
function HBar({ value, max, color, height = 8 }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="w-full rounded-full overflow-hidden" style={{ height, background: '#f1f5f9' }}>
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${pct}%`, background: color || COLORS.indigo }} />
        </div>
    );
}

// ─── SVG: Line Chart con área ─────────────────────────────────────────────────
function LineChart({ data = [] }) {
    if (!data.length) return (
        <div className="flex items-center justify-center h-28 text-slate-400 text-sm">Sin datos en el rango</div>
    );
    const W = 520, H = 130;
    const pad = { t: 12, r: 12, b: 28, l: 36 };
    const cW  = W - pad.l - pad.r;
    const cH  = H - pad.t - pad.b;
    const n   = data.length;
    const maxV = Math.max(...data.map(d => Math.max(d.insertadas || 0, d.completadas || 0)), 1);
    const X = i  => pad.l + (n === 1 ? cW / 2 : (i / (n - 1)) * cW);
    const Y = v  => pad.t + (1 - v / maxV) * cH;
    const pathStr = (key) => data.map((d, i) =>
        `${i === 0 ? 'M' : 'L'} ${X(i).toFixed(1)} ${Y(d[key] || 0).toFixed(1)}`).join(' ');
    const fillStr = (key) =>
        `${pathStr(key)} L ${X(n - 1).toFixed(1)} ${(pad.t + cH).toFixed(1)} L ${X(0).toFixed(1)} ${(pad.t + cH).toFixed(1)} Z`;
    const ticks = [0, 0.5, 1].map(v => maxV * v);
    const skipLabel = Math.max(1, Math.ceil(n / 7));
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
            {ticks.map((v, i) => (
                <g key={i}>
                    <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} stroke="#f1f5f9" strokeWidth={1} />
                    <text x={pad.l - 4} y={Y(v)} textAnchor="end" fontSize={9} fill="#94a3b8" dy="0.35em">
                        {Math.round(v)}
                    </text>
                </g>
            ))}
            <path d={fillStr('insertadas')} fill="rgba(99,102,241,0.07)" />
            <path d={fillStr('completadas')} fill="rgba(16,185,129,0.07)" />
            {n > 1 && <>
                <path d={pathStr('insertadas')} fill="none" stroke={COLORS.indigo} strokeWidth={2} strokeLinejoin="round" />
                <path d={pathStr('completadas')} fill="none" stroke={COLORS.emerald} strokeWidth={2} strokeLinejoin="round" strokeDasharray="5 3" />
            </>}
            {data.map((d, i) => (
                <g key={i}>
                    <circle cx={X(i)} cy={Y(d.insertadas || 0)} r={2.5} fill={COLORS.indigo} />
                    <circle cx={X(i)} cy={Y(d.completadas || 0)} r={2.5} fill={COLORS.emerald} />
                    {i % skipLabel === 0 && (
                        <text x={X(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#94a3b8">
                            {d.fecha?.slice(5)}
                        </text>
                    )}
                </g>
            ))}
        </svg>
    );
}

// ─── Línea acumulada: prontas por hora del día ────────────────────────────────
function ProntasHoraChart({ data = [] }) {
    // Construye array de 0-23 con acumulado
    const byHora = {};
    data.forEach(d => { byHora[d.hora] = d.total; });
    const horas = Array.from({ length: 24 }, (_, h) => h);
    let cum = 0;
    const pts = horas.map(h => { cum += byHora[h] || 0; return { h, cum }; });
    const maxVal = Math.max(...pts.map(p => p.cum), 1);
    const W = 520, H = 130;
    const pad = { t: 12, r: 12, b: 26, l: 34 };
    const cW = W - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    const X = h => pad.l + (h / 23) * cW;
    const Y = v => pad.t + (1 - v / maxVal) * cH;
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${X(p.h).toFixed(1)} ${Y(p.cum).toFixed(1)}`).join(' ');
    const fillPath = `${linePath} L ${X(23)} ${pad.t + cH} L ${X(0)} ${pad.t + cH} Z`;
    const tickHoras = [0, 6, 12, 14, 18, 23];
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
            {[0, 0.5, 1].map((v, i) => (
                <g key={i}>
                    <line x1={pad.l} x2={W - pad.r} y1={Y(maxVal * v)} y2={Y(maxVal * v)} stroke="#f1f5f9" strokeWidth={1} />
                    <text x={pad.l - 4} y={Y(maxVal * v)} textAnchor="end" fontSize={9} fill="#94a3b8" dy="0.35em">{Math.round(maxVal * v)}</text>
                </g>
            ))}
            {/* Marca de corte de turno a las 14 h */}
            <line x1={X(14)} x2={X(14)} y1={pad.t} y2={pad.t + cH} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2" />
            <text x={X(14) + 2} y={pad.t + 8} fontSize={8} fill="#f59e0b">T2</text>
            <path d={fillPath} fill="rgba(16,185,129,0.10)" />
            <path d={linePath} fill="none" stroke={COLORS.emerald} strokeWidth={2.5} strokeLinejoin="round" />
            {pts.filter(p => p.cum > 0).map(p => (
                <circle key={p.h} cx={X(p.h)} cy={Y(p.cum)} r={3} fill={COLORS.emerald} />
            ))}
            {tickHoras.map(h => (
                <text key={h} x={X(h)} y={H - 4} textAnchor="middle" fontSize={8} fill="#94a3b8">{h}h</text>
            ))}
        </svg>
    );
}

// ─── Heatmap de horas ─────────────────────────────────────────────────────────
function HourLineChart({ data = [] }) {
    const W = 420, H = 90, PL = 24, PR = 8, PT = 8, PB = 18;
    const map = {};
    data.forEach(d => { map[d.hora] = d.total; });
    const hours = Array.from({ length: 24 }, (_, h) => ({ h, v: map[h] || 0 }));
    const maxV = Math.max(...hours.map(p => p.v), 1);
    const cx = h => PL + (h / 23) * (W - PL - PR);
    const cy = v => PT + (1 - v / maxV) * (H - PT - PB);

    const t1pts = hours.filter(p => p.h < 14);
    const t2pts = hours.filter(p => p.h >= 14);
    const mkPath = pts => pts.length < 2 ? '' :
        pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(p.h).toFixed(1)},${cy(p.v).toFixed(1)}`).join(' ');
    const mkArea = (pts, color) => {
        if (pts.length < 2) return null;
        const line = mkPath(pts);
        const area = `${line} L${cx(pts[pts.length-1].h).toFixed(1)},${(H-PB).toFixed(1)} L${cx(pts[0].h).toFixed(1)},${(H-PB).toFixed(1)} Z`;
        return (
            <>
                <path d={area} fill={color} fillOpacity="0.12" />
                <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {pts.map(p => p.v > 0 && (
                    <circle key={p.h} cx={cx(p.h)} cy={cy(p.v)} r="2.5" fill={color}>
                        <title>{String(p.h).padStart(2,'0')}:00 — {p.v} órd.</title>
                    </circle>
                ))}
            </>
        );
    };
    const ticks = [0, 4, 8, 12, 14, 18, 22];
    return (
        <div className="w-full">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
                {/* grid lines */}
                {[0.25, 0.5, 0.75, 1].map(f => (
                    <line key={f} x1={PL} x2={W-PR}
                          y1={PT + (1-f)*(H-PT-PB)} y2={PT + (1-f)*(H-PT-PB)}
                          stroke="#f1f5f9" strokeWidth="1" />
                ))}
                {/* T1/T2 divider */}
                <line x1={cx(14)} x2={cx(14)} y1={PT} y2={H-PB}
                      stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" />
                {mkArea(t1pts, '#6366f1')}
                {mkArea(t2pts, '#10b981')}
                {/* x-axis ticks */}
                {ticks.map(h => (
                    <text key={h} x={cx(h)} y={H-2} textAnchor="middle"
                          fontSize="7" fill="#94a3b8">{String(h).padStart(2,'0')}</text>
                ))}
            </svg>
            <div className="flex gap-4 mt-1 text-[10px] text-slate-500">
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 inline-block rounded" style={{background:'#6366f1'}} /> Turno 1 (00-14h)
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 inline-block rounded" style={{background:'#10b981'}} /> Turno 2 (14-24h)
                </span>
            </div>
        </div>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, metros, sub, icon, accent, trend }) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{label}</span>
                <span className="text-lg" style={{ color: accent }}>{icon}</span>
            </div>
            <div className="text-3xl font-black text-slate-900 tabular-nums leading-none">{value}</div>
            {metros != null && (
                <div className="text-sm font-bold tabular-nums mt-0.5" style={{ color: accent }}>{metros}</div>
            )}
            {sub && <div className="text-xs font-semibold text-slate-800 mt-0.5">{sub}</div>}
            {trend != null && (
                <div className={`text-xs font-semibold mt-1 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
                </div>
            )}
        </div>
    );
}

// ─── Badge de estado ──────────────────────────────────────────────────────────
function StateBadge({ estado }) {
    const col = ESTADO_COLORS[estado] || '#94a3b8';
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-semibold"
              style={{ background: col }}>
            {estado}
        </span>
    );
}

// ─── Medal icon ───────────────────────────────────────────────────────────────
const MEDALS = ['🥇','🥈','🥉'];

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
    return (
        <div className="flex items-center justify-center p-8">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
    );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub, accent = '#6366f1', children }) {
    return (
        <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
            <div>
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 rounded-full" style={{ background: accent }} />
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
                </div>
                {sub && <p className="text-xs text-slate-500 mt-0.5 ml-3">{sub}</p>}
            </div>
            {children}
        </div>
    );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function Chip({ label, active, onClick, color }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                active
                    ? 'text-white shadow-sm border-transparent'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
            style={active ? { background: color || COLORS.indigo, borderColor: color || COLORS.indigo } : {}}
        >
            {label}
        </button>
    );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
export default function ProductionDashboard() {
    // ── Estado actual (overview) ──────────────────────────────────────────────
    const [ov, setOv]         = useState(null);
    const [ovLoading, setOvL] = useState(true);
    const [lastRefresh, setLR] = useState(null);
    const [areaOv, setAreaOv] = useState('');   // selector de área para Sección 1
    const timerRef = useRef(null);

    // ── Filtros ───────────────────────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    const [areas, setAreas]        = useState([]);
    const [materiales, setMat]     = useState([]);
    const [clientes, setClientes]  = useState([]);

    const [selArea, setSelArea]        = useState('');
    const [selMat, setSelMat]          = useState('');
    const [selCli, setSelCli]          = useState('');
    const [selTurno, setSelTurno]      = useState('');
    const [preset, setPreset]          = useState('30d');
    const [customDesde, setCustomD]    = useState('');
    const [customHasta, setCustomH]    = useState('');

    // ── Analytics ─────────────────────────────────────────────────────────────
    const [an, setAn]          = useState(null);
    const [anLoading, setAnL]  = useState(true);
    const [tendenciaDetalle, setTendenciaDetalle] = useState(false);
    const [generandoPDF, setGenerandoPDF]         = useState(false);

    // ── Presets de fecha ──────────────────────────────────────────────────────
    const presetsMap = {
        hoy:   { label: 'Hoy',       days: 0  },
        ayer:  { label: 'Ayer',      days: 1  },
        '7d':  { label: '7 días',    days: 7  },
        '30d': { label: '30 días',   days: 30 },
        '90d': { label: '90 días',   days: 90 },
        custom:{ label: 'Personalizado', days: null },
    };

    const getRange = useCallback(() => {
        if (preset === 'custom') return { desde: customDesde, hasta: customHasta };
        const d = new Date();
        const p = presetsMap[preset];
        if (p.days === 0) return { desde: today, hasta: today };
        if (p.days === 1) {
            const y = new Date(d); y.setDate(y.getDate() - 1);
            const s = y.toISOString().slice(0, 10);
            return { desde: s, hasta: s };
        }
        const from = new Date(d); from.setDate(from.getDate() - p.days);
        return { desde: from.toISOString().slice(0, 10), hasta: today };
    }, [preset, customDesde, customHasta, today]);

    // ── Fetch overview ─────────────────────────────────────────────────────────
    const fetchOverview = useCallback(async () => {
        setOvL(true);
        try {
            const params = areaOv ? { area: areaOv } : {};
            const { data } = await api.get('/dashboard/produccion/overview', { params });
            setOv(data);
            setLR(new Date());
        } catch (e) {
            console.error('[Overview]', e);
        } finally {
            setOvL(false);
        }
    }, [areaOv]);

    // ── Fetch analytics ────────────────────────────────────────────────────────
    const fetchAnalytics = useCallback(async () => {
        setAnL(true);
        const { desde, hasta } = getRange();
        try {
            const params = {};
            if (selArea)  params.area       = selArea;
            if (selMat)   params.material   = selMat;
            if (selCli)   params.idCliente  = selCli;
            if (selTurno) params.turno      = selTurno;
            if (desde)    params.fechaDesde = desde;
            if (hasta)    params.fechaHasta = hasta;
            const { data } = await api.get('/dashboard/produccion/analytics', { params });
            setAn(data);
        } catch (e) {
            console.error('[Analytics]', e);
        } finally {
            setAnL(false);
        }
    }, [selArea, selMat, selCli, selTurno, getRange]);

    // ── Fetch filtros ──────────────────────────────────────────────────────────
    useEffect(() => {
        api.get('/dashboard/produccion/filtros')
            .then(({ data }) => {
                setAreas(data.areas || []);
                setMat(data.materiales || []);
                setClientes(data.clientes || []);
            })
            .catch(console.error);
    }, []);

    // ── Auto-refresh overview (60 seg) ────────────────────────────────────────
    useEffect(() => {
        fetchOverview();
        timerRef.current = setInterval(fetchOverview, 60000);
        return () => clearInterval(timerRef.current);
    }, [fetchOverview]);

    // ── Re-fetch analytics on filter change ───────────────────────────────────
    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const estadoAreaData = ov ? (ov.porEstadoArea || []).map((e, i) => ({
        label: e.estadoArea, value: e.total, metros: e.metros,
        color: ESTADO_COLORS[e.estadoArea] || AREA_COLORS[i % AREA_COLORS.length],
    })) : [];
    const priorityData = ov ? (ov.porPrioridad || []).map((p, i) => ({
        label: p.prioridad, value: p.total,
        color: PRIORIDAD_COLORS[p.prioridad] || AREA_COLORS[i % AREA_COLORS.length],
    })) : [];
    const maxAntiguedad = ov ? Math.max(...(ov.antiguedad?.map(a => a.total) || [1]), 1) : 1;
    const maxMaquina    = ov ? Math.max(...(ov.porMaquina?.map(m => m.totalOrdenes) || [1]), 1) : 1;
    const anEstadosData = an ? (an.porEstado || []).map((e, i) => ({
        label: e.estado, value: e.total,
        color: ESTADO_COLORS[e.estado] || AREA_COLORS[i % AREA_COLORS.length],
    })) : [];
    const turnoData = an?.distribucionTurno || [];
    const turnoMax = Math.max(...turnoData.map(t => t.totalOrdenes || 0), 1);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white px-6 py-5">
                <div className="max-w-screen-2xl mx-auto flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight uppercase">
                            Panel de Producción Avanzado
                        </h1>
                        <p className="text-slate-400 text-xs mt-0.5">
                            Producción inteligente · Análisis por área, operador, material y turno
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {lastRefresh && (
                            <span className="text-xs text-slate-400">
                                Actualizado: {lastRefresh.toLocaleTimeString('es-UY')}
                            </span>
                        )}
                        <button
                            onClick={() => { fetchOverview(); fetchAnalytics(); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-medium transition-all"
                        >
                            <i className="fa-solid fa-rotate-right text-xs" /> Actualizar
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-10">

                {/* ══════════════════════════════════════════════════════════════
                    SECCIÓN 1: ESTADO ACTUAL (tiempo real)
                ══════════════════════════════════════════════════════════════ */}
                <section>

                    {/* ── Selector de área ─────────────────────────────────────── */}
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                        <span className="text-xs text-slate-500 font-semibold shrink-0">Filtrar área:</span>
                        <Chip label="Todas" active={areaOv === ''} onClick={() => setAreaOv('')} color={COLORS.indigo} />
                        {areas.map(a => (
                            <Chip key={a.area}
                                  label={a.nombre || a.area}
                                  active={areaOv === a.area}
                                  onClick={() => setAreaOv(prev => prev === a.area ? '' : a.area)}
                                  color={COLORS.indigo} />
                        ))}
                    </div>

                    {ovLoading && !ov ? <Spinner /> : ov && (<>

                        {/* ── KPIs strip — 6 tarjetas ───────────────────────────── */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                            <KpiCard label="Activas"
                                     value={fmt(ov.kpis.totalActivas)}
                                     metros={fmtM(ov.kpis.metrosTotales)}
                                     icon="📋" accent={COLORS.indigo} />
                            <KpiCard label="Ingresadas hoy"
                                     value={fmt(ov.kpis.entraronHoy)}
                                     metros={fmtM(ov.kpis.metrosHoy)}
                                     sub={`Días anteriores: ${fmt(ov.kpis.entraronAnteriores)}`}
                                     icon="📥" accent={COLORS.sky} />
                            <KpiCard label="Urgentes"
                                     value={fmt(ov.kpis.urgentes)}
                                     metros={fmtM(ov.kpis.metrosUrgentes)}
                                     icon="🔥" accent={COLORS.amber} />
                            <KpiCard label="Falla"
                                     value={fmt(ov.kpis.conFalla)}
                                     metros={fmtM(ov.kpis.metrosFalla)}
                                     icon="⚠️" accent={COLORS.red} />
                            <KpiCard label="Reposiciones"
                                     value={fmt(ov.kpis.reposiciones)}
                                     metros={fmtM(ov.kpis.metrosReposiciones)}
                                     icon="🔄" accent={COLORS.violet} />
                            <KpiCard label="Prontas hoy"
                                     value={fmt(ov.kpis.prontasHoy)}
                                     metros={fmtM(ov.kpis.metrosProntas)}
                                     icon="✅" accent={COLORS.emerald} />
                        </div>

                        {/* ── Fila 1: Estado en Área (Pendiente) + Pendientes por Prioridad ──── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">
                                    Estado en Área — Pendiente
                                </h3>
                                <div className="flex gap-6 items-start">
                                    {/* Donut */}
                                    <div className="flex flex-col items-center shrink-0">
                                        <DonutChart data={estadoAreaData} size={160} stroke={26} label="activas" />
                                    </div>
                                    {/* Tabla 2 columnas — ordenada desc, %n y %m */}
                                    {(() => {
                                        const sorted = [...estadoAreaData].sort((a, b) => b.value - a.value);
                                        const half   = Math.ceil(sorted.length / 2);
                                        const left   = sorted.slice(0, half);
                                        const right  = sorted.slice(half);
                                        const totalA = ov.kpis.totalActivas  || 1;
                                        const totalM = ov.kpis.metrosTotales || 1;
                                        const ROW_CLS = 'grid grid-cols-[1fr_42px_62px_30px_34px] gap-x-1.5 items-center py-1.5 border-b border-slate-50 hover:bg-slate-50 transition-colors';
                                        const HDR_CLS = 'grid grid-cols-[1fr_42px_62px_30px_34px] gap-x-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-200 pb-1.5 mb-1';
                                        const StateRow = ({ e }) => {
                                            const pctN = Math.round((e.value  / totalA) * 100);
                                            const pctM = Math.round((e.metros / totalM) * 100);
                                            return (
                                                <div className={ROW_CLS}>
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-semibold text-slate-800 truncate">{e.label}</div>
                                                            <div className="w-full h-1 rounded-full mt-0.5 overflow-hidden bg-slate-100">
                                                                <div className="h-full rounded-full" style={{ width: `${pctN}%`, background: e.color }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-black text-slate-900 tabular-nums">{fmt(e.value)}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs font-semibold text-slate-600 tabular-nums">{fmtM(e.metros)}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs font-bold tabular-nums" style={{ color: e.color }}>{pctN}%</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs font-bold tabular-nums text-slate-500">{pctM}%</span>
                                                    </div>
                                                </div>
                                            );
                                        };
                                        return (
                                            <div className="flex-1 min-w-0 flex gap-5">
                                                {/* Columna izquierda */}
                                                <div className="flex-1 min-w-0">
                                                    <div className={HDR_CLS}>
                                                        <span>Estado</span>
                                                        <span className="text-right">Órd.</span>
                                                        <span className="text-right">Metros</span>
                                                        <span className="text-right">%n</span>
                                                        <span className="text-right">%m</span>
                                                    </div>
                                                    {left.map(e => <StateRow key={e.label} e={e} />)}
                                                </div>
                                                {/* Columna derecha */}
                                                <div className="flex-1 min-w-0">
                                                    <div className={HDR_CLS}>
                                                        <span>Estado</span>
                                                        <span className="text-right">Órd.</span>
                                                        <span className="text-right">Metros</span>
                                                        <span className="text-right">%n</span>
                                                        <span className="text-right">%m</span>
                                                    </div>
                                                    {right.map(e => <StateRow key={e.label} e={e} />)}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Fila 1 — col 3: Pendientes por Prioridad */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                                    Pendientes por Prioridad
                                </h3>
                                <div className="flex justify-center mb-3">
                                    <DonutChart data={priorityData} size={100} stroke={18} />
                                </div>
                                <div className="space-y-2">
                                    {priorityData.map(p => {
                                        const maxP = Math.max(...priorityData.map(x => x.value), 1);
                                        return (
                                            <div key={p.label} className="flex items-center gap-2 text-xs">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                                                <span className="flex-1 truncate text-slate-700 font-medium">{p.label}</span>
                                                <div className="w-16">
                                                    <HBar value={p.value} max={maxP} color={p.color} height={6} />
                                                </div>
                                                <span className="w-8 text-right font-black text-slate-900 tabular-nums">{fmt(p.value)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ── Fila 2: Metros por Material (Pendiente) | Finalizadas Hoy | Por Máquina ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

                            {/* Metros por Material — pendiente */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                                    Metros por Material
                                </h3>
                                {(() => {
                                    const mats   = ov.metrosPorMaterial || [];
                                    const totalA = ov.kpis.totalActivas  || 1;
                                    const totalM = ov.kpis.metrosTotales || 1;
                                    const maxM   = Math.max(...mats.map(x => x.totalMetros), 1);
                                    return (
                                        <>
                                            <div className="grid grid-cols-[1fr_40px_60px_30px_34px] gap-x-2 text-[9px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-200 pb-1.5 mb-1">
                                                <span>Material</span>
                                                <span className="text-right">Órd.</span>
                                                <span className="text-right">Metros</span>
                                                <span className="text-right">%n</span>
                                                <span className="text-right">%m</span>
                                            </div>
                                            <div className="space-y-1">
                                                {mats.map((m, i) => {
                                                    const pctN  = Math.round((m.totalOrdenes / totalA) * 100);
                                                    const pctM  = Math.round((m.totalMetros  / totalM) * 100);
                                                    const color = AREA_COLORS[i % AREA_COLORS.length];
                                                    return (
                                                        <div key={m.material}>
                                                            <div className="grid grid-cols-[1fr_40px_60px_30px_34px] gap-x-2 items-center py-1 hover:bg-slate-50 rounded transition-colors">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                                                    <span className="text-xs font-semibold text-slate-800 truncate">{m.material}</span>
                                                                </div>
                                                                <div className="text-right"><span className="text-xs font-black text-slate-900 tabular-nums">{fmt(m.totalOrdenes)}</span></div>
                                                                <div className="text-right"><span className="text-xs font-bold tabular-nums" style={{ color }}>{fmtM(m.totalMetros)}</span></div>
                                                                <div className="text-right"><span className="text-[11px] font-bold tabular-nums text-slate-700">{pctN}%</span></div>
                                                                <div className="text-right"><span className="text-[11px] font-bold tabular-nums" style={{ color }}>{pctM}%</span></div>
                                                            </div>
                                                            <HBar value={m.totalMetros} max={maxM} color={color} height={4} />
                                                        </div>
                                                    );
                                                })}
                                                {!mats.length && <p className="text-sm text-slate-400 text-center py-4">Sin datos</p>}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Finalizadas Hoy */}
                            <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5 border-l-4" style={{ borderLeftColor: COLORS.emerald }}>
                                <h3 className="text-sm font-bold text-emerald-700 mb-3 uppercase tracking-wide">
                                    Finalizadas Hoy
                                </h3>
                                <div className="space-y-3">
                                    {(ov.metrosMaterialProntas || []).map((m, i) => {
                                        const maxP = Math.max(...(ov.metrosMaterialProntas || []).map(x => x.totalMetros), 1);
                                        return (
                                            <div key={m.material}>
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="font-semibold text-slate-700 truncate max-w-[120px]">{m.material}</span>
                                                    <div className="flex gap-2 shrink-0">
                                                        <span className="text-slate-500">{fmt(m.totalOrdenes)} órd.</span>
                                                        <span className="font-black text-emerald-700">{fmtM(m.totalMetros)}</span>
                                                    </div>
                                                </div>
                                                <HBar value={m.totalMetros} max={maxP} color={COLORS.emerald} height={6} />
                                            </div>
                                        );
                                    })}
                                    {!(ov.metrosMaterialProntas?.length) && <p className="text-sm text-slate-400 text-center py-4">Sin prontas hoy aún</p>}
                                </div>
                            </div>

                            {/* Por Máquina — prontas hoy */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                                    Por Máquina — Prontas Hoy
                                </h3>
                                <div className="space-y-3">
                                    {(ov.porMaquina || []).map((m, i) => (
                                        <div key={m.maquina}>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="text-base shrink-0">{MEDALS[i] || '🔩'}</span>
                                                    <span className="font-semibold text-slate-700 truncate">{m.maquina}</span>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <span className="text-slate-400">{fmtM(m.totalMetros)}</span>
                                                    <span className="font-black text-slate-900">{fmt(m.totalOrdenes)}</span>
                                                </div>
                                            </div>
                                            <HBar value={m.totalOrdenes} max={maxMaquina}
                                                  color={AREA_COLORS[i % AREA_COLORS.length]} height={7} />
                                        </div>
                                    ))}
                                    {!(ov.porMaquina?.length) && <p className="text-sm text-slate-400 text-center py-4">Sin prontas hoy aún</p>}
                                </div>
                            </div>
                        </div>

                        {/* ── Fila 3: Antigüedad de Cola + Prontas por hora ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                            {/* Antigüedad de Cola */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-1 uppercase tracking-wide">
                                    Antigüedad de Cola
                                </h3>
                                <p className="text-[10px] text-slate-400 mb-3">Cuánto tiempo llevan esperando las activas</p>
                                <div className="flex gap-2 mb-4">
                                    <div className="flex-1 rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-center">
                                        <div className="text-2xl font-black text-indigo-700">{fmt(ov.kpis.entraronHoy)}</div>
                                        <div className="text-[10px] text-indigo-500 font-semibold mt-0.5">Entraron HOY</div>
                                    </div>
                                    <div className="flex-1 rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
                                        <div className="text-2xl font-black text-amber-700">{fmt(ov.kpis.entraronAnteriores)}</div>
                                        <div className="text-[10px] text-amber-500 font-semibold mt-0.5">Días anteriores</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {(ov.antiguedad || []).map((b) => {
                                        const isHoy = b.ord <= 3;
                                        return (
                                            <div key={b.bucket}>
                                                <div className="flex items-center justify-between text-xs mb-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isHoy ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                                                        <span className="text-slate-600">{b.bucket}</span>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <span className="text-slate-400">{fmtM(b.metros)}</span>
                                                        <span className="font-bold text-slate-900">{fmt(b.total)}</span>
                                                    </div>
                                                </div>
                                                <HBar value={b.total} max={maxAntiguedad}
                                                      color={isHoy ? COLORS.indigo : COLORS.amber} height={5} />
                                            </div>
                                        );
                                    })}
                                    {!(ov.antiguedad?.length) && <p className="text-sm text-slate-400 text-center py-2">Sin activas</p>}
                                </div>
                            </div>

                            {/* Prontas por Hora del Día — acumulado */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-1 uppercase tracking-wide">
                                    Prontas por Hora del Día
                                </h3>
                                <p className="text-[10px] text-slate-400 mb-3">
                                    Acumulado de órdenes finalizadas · línea naranja = corte turno 14 h
                                </p>
                                <ProntasHoraChart data={ov.prontasPorHora || []} />
                                <div className="flex gap-4 mt-2 text-[10px] text-slate-500 justify-center">
                                    <div className="flex items-center gap-1">
                                        <span className="inline-block w-5 h-0.5 rounded" style={{ background: COLORS.emerald }} />
                                        Acumulado prontas
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="inline-block w-5 h-0" style={{ borderTop: '1px dashed #f59e0b' }} />
                                        Corte T1/T2 (14 h)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>)}
                </section>

                {/* ══════════════════════════════════════════════════════════════
                    SECCIÓN 2: ANÁLISIS FILTRADO
                ══════════════════════════════════════════════════════════════ */}
                <section>
                    <div className="flex items-center justify-between mb-1">
                        <SectionHeader
                            title="Análisis de Producción Filtrado"
                            sub="Métricas por período, área, turno, material y cliente"
                            accent={COLORS.emerald}
                        />
                        <button
                            disabled={!an || generandoPDF}
                            onClick={async () => {
                                if (!an) return;
                                setGenerandoPDF(true);
                                try {
                                    const periodo = presetsMap[preset]?.label || `${customDesde} al ${customHasta}`;
                                    const resp = await api.post('/dashboard/produccion/informe',
                                        { ...an, periodo },
                                        { responseType: 'blob' }
                                    );
                                    const url  = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
                                    const a    = document.createElement('a');
                                    a.href     = url;
                                    a.download = `informe-produccion-${new Date().toISOString().slice(0,10)}.pdf`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                } catch (e) {
                                    alert('Error generando el informe: ' + (e?.message || e));
                                } finally {
                                    setGenerandoPDF(false);
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm"
                            style={{
                                background: generandoPDF ? '#e2e8f0' : '#6366f1',
                                color:      generandoPDF ? '#94a3b8' : '#fff',
                                cursor:     generandoPDF ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {generandoPDF
                                ? <><span className="animate-spin inline-block">⏳</span> Generando...</>
                                : <>📄 Generar Informe PDF</>
                            }
                        </button>
                    </div>

                    {/* ── BARRA DE FILTROS ────────────────────────────────────── */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-5 space-y-3">

                        {/* Fila 1: Áreas */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 w-14 shrink-0">ÁREA</span>
                            <Chip label="Todas" active={!selArea} onClick={() => setSelArea('')} color={COLORS.indigo} />
                            {areas.map((a, i) => (
                                <Chip key={a.area}
                                      label={a.nombre || a.area}
                                      active={selArea === a.area}
                                      onClick={() => setSelArea(selArea === a.area ? '' : a.area)}
                                      color={AREA_COLORS[i % AREA_COLORS.length]} />
                            ))}
                        </div>

                        {/* Fila 2: Fechas */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 w-14 shrink-0">FECHA</span>
                            {Object.entries(presetsMap).filter(([k]) => k !== 'custom').map(([k, v]) => (
                                <Chip key={k} label={v.label} active={preset === k}
                                      onClick={() => setPreset(k)} color={COLORS.sky} />
                            ))}
                            <Chip label="Personalizado" active={preset === 'custom'}
                                  onClick={() => setPreset('custom')} color={COLORS.violet} />
                            {preset === 'custom' && (
                                <div className="flex gap-2 items-center ml-2">
                                    <input type="date" value={customDesde} onChange={e => setCustomD(e.target.value)}
                                           className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400" />
                                    <span className="text-slate-400 text-xs">→</span>
                                    <input type="date" value={customHasta} onChange={e => setCustomH(e.target.value)}
                                           className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400" />
                                </div>
                            )}
                        </div>

                        {/* Fila 3: Turno + Material + Cliente */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 w-14 shrink-0">TURNO</span>
                            <Chip label="Ambos"         active={!selTurno}      onClick={() => setSelTurno('')}  color={COLORS.indigo} />
                            <Chip label="T1 · 00-14 h"  active={selTurno==='1'} onClick={() => setSelTurno(selTurno==='1' ? '' : '1')} color={COLORS.indigo} />
                            <Chip label="T2 · 14-24 h"  active={selTurno==='2'} onClick={() => setSelTurno(selTurno==='2' ? '' : '2')} color={COLORS.emerald} />

                            <span className="text-xs font-bold text-slate-500 w-16 shrink-0 ml-2">MATERIAL</span>
                            <select value={selMat} onChange={e => setSelMat(e.target.value)}
                                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-400 max-w-[180px]">
                                <option value="">Todos los materiales</option>
                                {materiales.map(m => (
                                    <option key={m.material} value={m.material}>{m.material} ({m.total})</option>
                                ))}
                            </select>

                            <span className="text-xs font-bold text-slate-500 w-14 shrink-0">CLIENTE</span>
                            <input
                                type="text" placeholder="Buscar cliente..."
                                value={selCli} onChange={e => setSelCli(e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-400 w-44"
                            />
                            {(selArea || selMat || selCli || selTurno || preset !== '30d') && (
                                <button
                                    onClick={() => { setSelArea(''); setSelMat(''); setSelCli(''); setSelTurno(''); setPreset('30d'); }}
                                    className="ml-2 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-full hover:bg-red-50 transition-all font-semibold"
                                >
                                    ✕ Limpiar filtros
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── ANALÍTICA ───────────────────────────────────────────── */}
                    {anLoading && !an ? <Spinner /> : an && (<>

                        {/* Aviso cuando no hay datos en el período */}
                        {an.kpis.insertadas === 0 && (
                            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-5 py-3 flex items-center gap-3">
                                <span className="text-xl">ℹ️</span>
                                <div>
                                    <p className="text-sm font-bold text-amber-800">Sin órdenes ingresadas en el período seleccionado</p>
                                    <p className="text-xs text-amber-600 mt-0.5">
                                        Este análisis mide órdenes <strong>ingresadas</strong> en la fecha elegida, no el estado actual.
                                        Las {fmt(ov?.kpis?.totalActivas || 0)} órdenes activas entraron en días anteriores.
                                        Prueba con <strong>30 días</strong> o <strong>90 días</strong> para ver actividad.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* KPIs de análisis */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                            <KpiCard
                                label="Órdenes Ingresadas" value={fmt(an.kpis.insertadas)}
                                icon="📥" accent={COLORS.indigo}
                                sub={`Período seleccionado`}
                            />
                            <KpiCard
                                label="Órdenes Completadas" value={fmt(an.kpis.completadas)}
                                icon="✅" accent={COLORS.emerald}
                                sub={`Finalizadas / Entregadas`}
                            />
                            <KpiCard
                                label="Eficiencia" value={`${an.kpis.eficiencia}%`}
                                icon="⚡" accent={an.kpis.eficiencia >= 80 ? COLORS.emerald : an.kpis.eficiencia >= 50 ? COLORS.amber : COLORS.red}
                                sub={`Completadas / Ingresadas`}
                            />
                            <KpiCard
                                label="Metros Procesados" value={fmtM(an.kpis.metros)}
                                icon="📐" accent={COLORS.sky}
                                sub={`Total en período`}
                            />
                            {(() => {
                                const fr     = an.fallaReposicion || { ordenes: 0, metros: 0 };
                                const pctM   = an.kpis.metros > 0
                                    ? Math.round((fr.metros / an.kpis.metros) * 100)
                                    : 0;
                                const pctN   = an.kpis.insertadas > 0
                                    ? Math.round((fr.ordenes / an.kpis.insertadas) * 100)
                                    : 0;
                                const accent = pctM >= 15 ? COLORS.red : pctM >= 8 ? COLORS.amber : '#94a3b8';
                                return (
                                    <KpiCard
                                        label="Falla + Reposición" value={fmtM(fr.metros)}
                                        icon="⚠️" accent={accent}
                                        sub={`${pctM}% metros · ${pctN}% órdenes`}
                                    />
                                );
                            })()}
                        </div>

                        {/* ── Fila A: Comportamiento en el Tiempo + Estados ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

                            {/* Comportamiento en el tiempo — entradas vs salidas */}
                            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                                            Comportamiento en el Tiempo
                                        </h3>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Entradas vs salidas en el período — no necesariamente las mismas órdenes</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {!tendenciaDetalle && (
                                            <div className="flex gap-3 text-[10px]">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-5 h-0.5 inline-block rounded" style={{ background: COLORS.indigo }} />
                                                    <span className="text-slate-600 font-medium">Entradas</span>
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-5 h-0.5 inline-block rounded" style={{ background: COLORS.emerald }} />
                                                    <span className="text-slate-600 font-medium">Salidas</span>
                                                </span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setTendenciaDetalle(v => !v)}
                                            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors"
                                            style={tendenciaDetalle
                                                ? { background: COLORS.indigo, color: '#fff', borderColor: COLORS.indigo }
                                                : { background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }}
                                        >
                                            {tendenciaDetalle ? '📈 Ver gráfico' : '📋 Ver detalle'}
                                        </button>
                                    </div>
                                </div>

                                {tendenciaDetalle ? (
                                    /* ── Tabla de detalle diario ── */
                                    <div className="overflow-auto max-h-64">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-200">
                                                    <th className="text-left py-1.5 pr-3 font-bold text-slate-500 uppercase tracking-wide text-[10px]">Fecha</th>
                                                    <th className="text-right py-1.5 px-3 font-bold text-indigo-500 uppercase tracking-wide text-[10px]">Entradas</th>
                                                    <th className="text-right py-1.5 px-3 font-bold text-emerald-500 uppercase tracking-wide text-[10px]">Salidas</th>
                                                    <th className="text-right py-1.5 pl-3 font-bold text-amber-500 uppercase tracking-wide text-[10px]">Flujo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(an.tendencia || []).slice().reverse().map(d => {
                                                    const flujo = (d.insertadas || 0) - (d.completadas || 0);
                                                    const fecha = new Date(d.fecha + 'T12:00:00');
                                                    const label = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', weekday: 'short' });
                                                    return (
                                                        <tr key={d.fecha} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                            <td className="py-1.5 pr-3 text-slate-600 font-medium capitalize">{label}</td>
                                                            <td className="py-1.5 px-3 text-right font-black text-indigo-700 tabular-nums">{fmt(d.insertadas || 0)}</td>
                                                            <td className="py-1.5 px-3 text-right font-black text-emerald-700 tabular-nums">{fmt(d.completadas || 0)}</td>
                                                            <td className={`py-1.5 pl-3 text-right font-black tabular-nums ${flujo > 0 ? 'text-amber-600' : flujo < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                {flujo > 0 ? '+' : ''}{fmt(flujo)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t-2 border-slate-200 bg-slate-50">
                                                    <td className="py-2 pr-3 font-bold text-slate-600 text-[10px] uppercase tracking-wide">Total</td>
                                                    <td className="py-2 px-3 text-right font-black text-indigo-700 tabular-nums">{fmt(an.kpis.insertadas)}</td>
                                                    <td className="py-2 px-3 text-right font-black text-emerald-700 tabular-nums">{fmt(an.kpis.completadas)}</td>
                                                    <td className={`py-2 pl-3 text-right font-black tabular-nums ${an.kpis.insertadas - an.kpis.completadas > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                        {an.kpis.insertadas - an.kpis.completadas > 0 ? '+' : ''}{fmt(an.kpis.insertadas - an.kpis.completadas)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : (
                                    <LineChart data={an.tendencia || []} />
                                )}

                                {(() => {
                                    const ent = an.kpis.insertadas  || 0;
                                    const sal = an.kpis.completadas || 0;
                                    const dif = ent - sal;
                                    return (
                                        <div className="flex gap-3 mt-3 text-[11px]">
                                            <div className="flex-1 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-center">
                                                <div className="text-lg font-black text-indigo-700 tabular-nums">{fmt(ent)}</div>
                                                <div className="text-indigo-500 font-semibold">Órd. Ingresadas</div>
                                                <div className="text-[9px] text-indigo-300 mt-0.5">por FechaIngreso</div>
                                            </div>
                                            <div className="flex-1 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-center">
                                                <div className="text-lg font-black text-emerald-700 tabular-nums">{fmt(sal)}</div>
                                                <div className="text-emerald-500 font-semibold">Cerradas</div>
                                                <div className="text-[9px] text-emerald-300 mt-0.5">por fecha de cierre</div>
                                            </div>
                                            <div className={`flex-1 rounded-lg px-3 py-2 text-center border ${dif > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className={`text-lg font-black tabular-nums ${dif > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                    {dif > 0 ? '+' : ''}{fmt(dif)}
                                                </div>
                                                <div className={`font-semibold ${dif > 0 ? 'text-amber-500' : 'text-slate-400'}`}>Flujo neto</div>
                                                <div className="text-[9px] text-slate-300 mt-0.5">entradas − salidas</div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Donut estados en período */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">
                                    Estados en Período
                                </h3>
                                <div className="flex flex-col items-center gap-3">
                                    <DonutChart data={anEstadosData} size={120} stroke={20} label="órdenes" />
                                    <div className="w-full space-y-1.5 mt-1">
                                        {anEstadosData.map(e => (
                                            <div key={e.label} className="flex items-center gap-2 text-xs">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                                                <span className="flex-1 truncate text-slate-600">{e.label}</span>
                                                <span className="font-bold text-slate-800">{fmt(e.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Fila C: Top Operadores + Top Clientes + Top Materiales ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

                            {/* Top Operadores */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                                    Top Operadores
                                </h3>
                                {(() => {
                                    const ops  = an.topOperadores || [];
                                    return (
                                        <>
                                            {/* Header */}
                                            <div className="grid grid-cols-[20px_1fr_44px_44px_44px_50px] gap-x-2 text-[9px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-200 pb-1.5 mb-1">
                                                <span>#</span>
                                                <span>Operador</span>
                                                <span className="text-right">Prep.</span>
                                                <span className="text-right">Impr.</span>
                                                <span className="text-right">Ctrl.</span>
                                                <span className="text-right">Metros</span>
                                            </div>
                                            <div className="space-y-2">
                                                {ops.map((op, i) => {
                                                    const medal = i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : COLORS.indigo;
                                                    const prep  = op.preparacion || 0;
                                                    const impr  = op.impresion   || 0;
                                                    const ctrl  = op.controlado  || 0;
                                                    return (
                                                        <div key={op.Usuario + i} className="grid grid-cols-[20px_1fr_44px_44px_44px_50px] gap-x-2 items-center py-1.5 hover:bg-slate-50 rounded px-1 transition-colors">
                                                            <span className="text-[11px] font-black text-center" style={{ color: medal }}>
                                                                {i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}`}
                                                            </span>
                                                            <span className="text-xs font-semibold text-slate-800 truncate">{op.Usuario}</span>
                                                            <div className="text-right">
                                                                <span className="text-xs font-black tabular-nums" style={{ color: prep > 0 ? COLORS.sky : '#cbd5e1' }}>{fmt(prep)}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-xs font-black tabular-nums" style={{ color: impr > 0 ? COLORS.violet : '#cbd5e1' }}>{fmt(impr)}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-xs font-black tabular-nums" style={{ color: ctrl > 0 ? COLORS.emerald : '#cbd5e1' }}>{fmt(ctrl)}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-xs font-bold tabular-nums" style={{ color: medal }}>{fmtM(op.totalMetros)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {!ops.length && <p className="text-sm text-slate-400 text-center py-4">Sin historial en el período</p>}
                                            </div>
                                            {/* Leyenda */}
                                            <div className="flex gap-3 mt-3 text-[9px] text-slate-400 justify-end">
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background: COLORS.sky}} />Preparación</span>
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background: COLORS.violet}} />Impresión</span>
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background: COLORS.emerald}} />Controlado</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Top Clientes */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                                    Top Clientes
                                </h3>
                                {(() => {
                                    const clis   = an.topClientes || [];
                                    const totalN = an.kpis.insertadas || 1;
                                    const totalM = an.kpis.metros     || 1;
                                    return (
                                        <>
                                            <div className="grid grid-cols-[20px_1fr_40px_58px_30px_34px] gap-x-2 text-[9px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-200 pb-1.5 mb-1">
                                                <span>#</span>
                                                <span>Cliente</span>
                                                <span className="text-right">Órd.</span>
                                                <span className="text-right">Metros</span>
                                                <span className="text-right">%n</span>
                                                <span className="text-right">%m</span>
                                            </div>
                                            <div className="space-y-0.5">
                                                {clis.map((c, i) => {
                                                    const maxC  = clis[0]?.totalOrdenes || 1;
                                                    const pctN  = Math.round((c.totalOrdenes / totalN) * 100);
                                                    const pctM  = Math.round((c.totalMetros  / totalM) * 100);
                                                    const color = AREA_COLORS[i % AREA_COLORS.length];
                                                    return (
                                                        <div key={c.cliente}>
                                                            <div className="grid grid-cols-[20px_1fr_40px_58px_30px_34px] gap-x-2 items-center py-1 hover:bg-slate-50 rounded transition-colors">
                                                                <span className="text-[10px] font-black text-slate-400 text-center tabular-nums">{i + 1}</span>
                                                                <span className="text-xs font-semibold text-slate-800 truncate">{c.cliente}</span>
                                                                <div className="text-right"><span className="text-xs font-black text-slate-900 tabular-nums">{fmt(c.totalOrdenes)}</span></div>
                                                                <div className="text-right"><span className="text-xs font-bold tabular-nums" style={{ color }}>{fmtM(c.totalMetros)}</span></div>
                                                                <div className="text-right"><span className="text-[11px] font-bold tabular-nums text-slate-700">{pctN}%</span></div>
                                                                <div className="text-right"><span className="text-[11px] font-bold tabular-nums" style={{ color }}>{pctM}%</span></div>
                                                            </div>
                                                            <HBar value={c.totalOrdenes} max={maxC} color={color} height={3} />
                                                        </div>
                                                    );
                                                })}
                                                {!clis.length && <p className="text-sm text-slate-400 text-center py-4">Sin datos en el período</p>}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Top Materiales */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                                    Top Materiales
                                </h3>
                                {(() => {
                                    const mats   = an.topMateriales || [];
                                    const totalN = an.kpis.insertadas || 1;
                                    const totalM = an.kpis.metros     || 1;
                                    return (
                                        <>
                                            <div className="grid grid-cols-[1fr_40px_58px_30px_34px] gap-x-2 text-[9px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-200 pb-1.5 mb-1">
                                                <span>Material</span>
                                                <span className="text-right">Órd.</span>
                                                <span className="text-right">Metros</span>
                                                <span className="text-right">%n</span>
                                                <span className="text-right">%m</span>
                                            </div>
                                            <div className="space-y-0.5">
                                                {mats.map((m, i) => {
                                                    const maxM  = mats[0]?.totalOrdenes || 1;
                                                    const pctN  = Math.round((m.totalOrdenes / totalN) * 100);
                                                    const pctM  = Math.round((m.totalMetros  / totalM) * 100);
                                                    const color = AREA_COLORS[i % AREA_COLORS.length];
                                                    return (
                                                        <div key={m.material}>
                                                            <div className="grid grid-cols-[1fr_40px_58px_30px_34px] gap-x-2 items-center py-1 hover:bg-slate-50 rounded transition-colors">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                                                    <span className="text-xs font-semibold text-slate-800 truncate">{m.material}</span>
                                                                </div>
                                                                <div className="text-right"><span className="text-xs font-black text-slate-900 tabular-nums">{fmt(m.totalOrdenes)}</span></div>
                                                                <div className="text-right"><span className="text-xs font-bold tabular-nums" style={{ color }}>{fmtM(m.totalMetros)}</span></div>
                                                                <div className="text-right"><span className="text-[11px] font-bold tabular-nums text-slate-700">{pctN}%</span></div>
                                                                <div className="text-right"><span className="text-[11px] font-bold tabular-nums" style={{ color }}>{pctM}%</span></div>
                                                            </div>
                                                            <HBar value={m.totalOrdenes} max={maxM} color={color} height={3} />
                                                        </div>
                                                    );
                                                })}
                                                {!mats.length && <p className="text-sm text-slate-400 text-center py-4">Sin datos</p>}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* ── Fila D: Demora por Prioridad + Distribución Turno + Actividad por Hora ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                            {/* Demora por Prioridad */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-1 uppercase tracking-wide">
                                    Demora Promedio por Prioridad
                                </h3>
                                <p className="text-[10px] text-slate-400 mb-4">Tiempo efectivo — descuenta 12h no trabajadas por día</p>
                                {(() => {
                                    const rows = an.demoraPorPrioridad || [];
                                    const maxH = rows.reduce((m, r) => Math.max(m, parseFloat(r.promedioHoras) || 0), 0) || 1;
                                    const PRIO_COLOR = {
                                        'Falla':      '#ef4444',
                                        'Urgente':    '#f97316',
                                        'Reposición': '#8b5cf6',
                                        'Normal':     '#64748b',
                                    };
                                    const ORDER = ['Falla', 'Urgente', 'Reposición', 'Normal'];
                                    const sorted = [...rows].sort((a, b) =>
                                        ORDER.indexOf(a.prioridad) - ORDER.indexOf(b.prioridad));
                                    const fmtH = h => {
                                        const v = parseFloat(h) || 0;
                                        if (v < 1) return `${Math.round(v * 60)}m`;
                                        if (v < 24) return `${v.toFixed(1)}h`;
                                        return `${(v / 24).toFixed(1)}d`;
                                    };
                                    if (!sorted.length) return (
                                        <p className="text-sm text-slate-400 text-center py-4">Sin órdenes completadas en el período</p>
                                    );
                                    return (
                                        <div className="space-y-4">
                                            {sorted.map(r => {
                                                const color = PRIO_COLOR[r.prioridad] || '#64748b';
                                                const pct   = Math.round((parseFloat(r.promedioHoras) / maxH) * 100);
                                                return (
                                                    <div key={r.prioridad}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                                                                <span className="text-xs font-semibold text-slate-700">{r.prioridad}</span>
                                                                <span className="text-[10px] text-slate-400">{fmt(r.totalOrdenes)} órd.</span>
                                                            </div>
                                                            <div className="flex items-baseline gap-3">
                                                                <div className="text-right">
                                                                    <div className="text-[9px] text-slate-400 leading-none mb-0.5">prom.</div>
                                                                    <span className="text-sm font-black tabular-nums" style={{ color }}>{fmtH(r.promedioHoras)}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-[9px] text-slate-400 leading-none mb-0.5">media</div>
                                                                    <span className="text-sm font-bold tabular-nums text-slate-500">{fmtH(r.medianaHoras)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                                                            <div className="h-2.5 rounded-full transition-all"
                                                                 style={{ width: `${pct}%`, background: color }} />
                                                        </div>
                                                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                                            <span>min {fmtH(r.minHoras)}</span>
                                                            <span>máx {fmtH(r.maxHoras)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Distribución por Turno */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">
                                    Distribución por Turno
                                </h3>
                                <div className="space-y-4">
                                    {turnoData.map(t => (
                                        <div key={t.turno}>
                                            <div className="flex items-center justify-between text-xs mb-1.5">
                                                <span className="font-semibold text-slate-700">{t.turno}</span>
                                                <div className="flex gap-4">
                                                    <span className="text-slate-500">{fmtM(t.totalMetros)}</span>
                                                    <span className="font-black text-slate-900">{fmt(t.totalOrdenes)} órd.</span>
                                                </div>
                                            </div>
                                            <HBar value={t.totalOrdenes} max={turnoMax}
                                                  color={t.turnoNum === 1 ? COLORS.indigo : COLORS.emerald} height={14} />
                                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                                <span>{turnoMax > 0 ? Math.round((t.totalOrdenes / turnoMax) * 100) : 0}% del total</span>
                                                <span className="font-semibold" style={{ color: t.turnoNum === 1 ? COLORS.indigo : COLORS.emerald }}>
                                                    {t.totalOrdenes > 0 ? fmtM(t.totalMetros / t.totalOrdenes) : '—'} / órd.
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {!turnoData.length && <p className="text-sm text-slate-400 text-center py-4">Sin datos en el período</p>}
                                </div>
                                {turnoData.length === 2 && (() => {
                                    const sorted = [...turnoData].sort((a, b) => a.turnoNum - b.turnoNum);
                                    const [t1, t2] = sorted;
                                    const total = (t1.totalOrdenes || 0) + (t2.totalOrdenes || 0);
                                    const pct1 = total > 0 ? Math.round((t1.totalOrdenes / total) * 100) : 50;
                                    return (
                                        <div className="mt-5">
                                            <div className="text-[10px] text-slate-500 mb-1 text-center">Comparativa T1 vs T2</div>
                                            <div className="flex rounded-full overflow-hidden h-5">
                                                <div className="flex items-center justify-center text-white text-[10px] font-bold"
                                                     style={{ width: `${pct1}%`, background: COLORS.indigo, minWidth: 20 }}>{pct1}%</div>
                                                <div className="flex items-center justify-center text-white text-[10px] font-bold"
                                                     style={{ width: `${100 - pct1}%`, background: COLORS.emerald, minWidth: 20 }}>{100 - pct1}%</div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Actividad por Hora */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">
                                    Actividad por Hora del Día
                                </h3>
                                <HourLineChart data={an.distribucionHora || []} />
                            </div>
                        </div>
                    </>)}
                </section>

            </div>

            {/* Footer indicator */}
            <div className="text-center py-4 text-[10px] text-slate-400">
                Panel de Producción · Datos de SecureAppDB · Área activa: {selArea || 'Todas'} · Turno: {selTurno === '1' ? 'T1 (00-14h)' : selTurno === '2' ? 'T2 (14-24h)' : 'Ambos'}
            </div>
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, Download, Save, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../../../services/apiClient';
import { CHART_PATCHES } from './chartData';
import { generateChartPDF } from './chartPdf';

const emptyLab = () => CHART_PATCHES.map(() => ({ L: '', a: '', b: '' }));

// Fase 1 — Chart de referencia: generar el PDF + cargar/guardar los LAB medidos (por tirada, en la BD).
export default function ChartSetupTab() {
    const [batchId, setBatchId] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [lab, setLab] = useState(emptyLab);
    const [activar, setActivar] = useState(true);
    const [charts, setCharts] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [msg, setMsg] = useState(null);

    const loadCharts = useCallback(() => {
        api.get('/color/charts')
            .then(r => { if (r.data.success) setCharts(r.data.charts); })
            .catch(() => {});
    }, []);

    useEffect(() => { loadCharts(); }, [loadCharts]);

    const setCell = (i, key, val) => {
        setLab(prev => prev.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));
    };

    const loadChart = async (id) => {
        setError(null); setMsg(null);
        try {
            const r = await api.get(`/color/charts/${id}`);
            if (!r.data.success) return;
            setBatchId(r.data.chart.BatchCode || '');
            setDescripcion(r.data.chart.Descripcion || '');
            const next = emptyLab();
            r.data.patches.forEach(p => {
                const idx = p.PatchId - 1;
                if (idx >= 0 && idx < next.length) next[idx] = { L: String(p.L), a: String(p.A), b: String(p.B) };
            });
            setLab(next);
            setMsg(`Tirada "${r.data.chart.BatchCode}" cargada.`);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        }
    };

    const handleSave = async () => {
        setError(null); setMsg(null);
        if (!batchId.trim()) { setError('Poné un ID de tirada.'); return; }
        const patches = [];
        for (let i = 0; i < lab.length; i++) {
            const { L, a, b } = lab[i];
            if (L === '' || a === '' || b === '') { setError(`Faltan valores en el parche ${i + 1} (${CHART_PATCHES[i].name}).`); return; }
            const nl = Number(L), na = Number(a), nb = Number(b);
            if ([nl, na, nb].some(Number.isNaN)) { setError(`Valores no numéricos en el parche ${i + 1}.`); return; }
            patches.push({ patchId: i + 1, L: nl, a: na, b: nb });
        }
        setSaving(true);
        try {
            const r = await api.post('/color/charts', {
                batchCode: batchId.trim(),
                descripcion: descripcion.trim(),
                patches,
                activa: activar,
            });
            if (r.data.success) { setMsg('Mediciones guardadas.'); loadCharts(); }
            else setError(r.data.error || 'Error guardando.');
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setSaving(false);
        }
    };

    const activate = async (id) => {
        try { await api.post(`/color/charts/${id}/activate`); loadCharts(); } catch (e) { /* noop */ }
    };

    return (
        <div className="space-y-5">
            {/* Generar PDF + datos de la tirada */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
                <div className="flex items-center gap-2 mb-1">
                    <LayoutGrid size={18} className="text-brand-cyan" />
                    <h2 className="text-sm font-bold text-zinc-700">Chart de referencia · 24 parches</h2>
                </div>
                <p className="text-xs text-zinc-500 mb-4 max-w-2xl">
                    Generá e imprimí el PDF, medí cada parche con el espectrofotómetro y cargá los LAB abajo. La tirada
                    marcada como activa es la que va a usar la calibración por foto.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">ID de tirada</label>
                        <input
                            value={batchId}
                            onChange={e => setBatchId(e.target.value)}
                            placeholder="ej. 2026-06-A"
                            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/30"
                        />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">Descripción (opcional)</label>
                        <input
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value)}
                            placeholder="ej. papel mate, Fedar"
                            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/30"
                        />
                    </div>
                    <button
                        onClick={() => generateChartPDF(batchId.trim())}
                        className="flex items-center gap-2 border border-zinc-200 text-zinc-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-zinc-50 transition-colors"
                    >
                        <Download size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* Tiradas guardadas */}
            {charts.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-3">Tiradas guardadas</h3>
                    <div className="space-y-1.5">
                        {charts.map(c => (
                            <div key={c.Id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-zinc-100">
                                <span className="text-sm font-semibold text-zinc-700">{c.BatchCode}</span>
                                {c.Activa ? (
                                    <span className="text-[10px] font-bold text-green-700 bg-green-100 rounded-full px-2 py-0.5">ACTIVA</span>
                                ) : (
                                    <button
                                        onClick={() => activate(c.Id)}
                                        className="text-[10px] font-semibold text-zinc-400 hover:text-brand-cyan border border-zinc-200 rounded-full px-2 py-0.5"
                                    >
                                        Activar
                                    </button>
                                )}
                                <span className="text-xs text-zinc-400 flex-1 truncate">{c.Descripcion || ''}</span>
                                <span className="text-[11px] text-zinc-400">{c.NumParches}/24</span>
                                <button onClick={() => loadChart(c.Id)} className="text-xs text-brand-cyan hover:underline font-semibold">
                                    Cargar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabla de mediciones */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Mediciones del espectro (LAB)</h3>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                        <input type="checkbox" checked={activar} onChange={e => setActivar(e.target.checked)} className="accent-brand-cyan" />
                        Marcar como activa al guardar
                    </label>
                </div>

                <div>
                    {/* Encabezado de columnas (misma estructura flex que las filas → alinean exacto) */}
                    <div className="flex items-center gap-2 px-1 pb-2 text-[11px] text-zinc-400 uppercase font-semibold">
                        <div className="flex-1">Parche</div>
                        <div className="w-16 text-center">L*</div>
                        <div className="w-16 text-center">a*</div>
                        <div className="w-16 text-center">b*</div>
                    </div>
                    <div className="space-y-1">
                        {CHART_PATCHES.map((p, i) => (
                            <div key={p.id} className="flex items-center gap-2 border-t border-zinc-100 pt-1">
                                <div className="flex-1 flex items-center gap-2 min-w-0">
                                    <span className="text-xs text-zinc-400 w-5 text-right flex-shrink-0">{p.id}</span>
                                    <span className="w-4 h-4 rounded border border-zinc-200 flex-shrink-0" style={{ backgroundColor: p.hex }} />
                                    <span className="text-xs text-zinc-600 truncate">{p.name}</span>
                                </div>
                                {['L', 'a', 'b'].map(k => (
                                    <input
                                        key={k}
                                        type="number" step="0.01" value={lab[i][k]}
                                        onChange={e => setCell(i, k, e.target.value)}
                                        className="w-16 flex-shrink-0 border border-zinc-200 rounded px-1.5 py-1 text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-brand-cyan/30"
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {error && <div className="mt-3 flex items-center gap-2 text-sm text-red-600"><AlertTriangle size={15} /> {error}</div>}
                {msg && <div className="mt-3 flex items-center gap-2 text-sm text-green-600"><CheckCircle2 size={15} /> {msg}</div>}

                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex gap-2 text-xs text-zinc-400">
                        <Info size={14} className="flex-shrink-0 mt-0.5" />
                        <span>El número de cada fila coincide con el número impreso en el parche del PDF.</span>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-brand-cyan text-white font-bold text-sm px-5 py-2 rounded-xl hover:bg-brand-cyan/90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-brand-cyan/20"
                    >
                        {saving ? 'Guardando...' : <><Save size={16} /> Guardar mediciones</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

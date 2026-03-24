/**
 * ContabilidadAntiguedadView.jsx
 * Reporte de antigüedad de deuda — tabla resumen de todos los clientes con saldo.
 * Tramos: Al día / 1-30d / 31-60d / 61-90d / +90d
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download, AlertTriangle, TrendingDown, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || '';
const tok = () => { try { return JSON.parse(localStorage.getItem('user'))?.token || ''; } catch { return ''; } };

const fetchAPI = async (url) => {
  const res = await fetch(`${API}${url}`, {
    headers: { 'Authorization': `Bearer ${tok()}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || `Error ${res.status}`);
  return res.json();
};

const fmt = (n) => new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2 }).format(Number(n ?? 0));

// ── BARRA DE ANTIGÜEDAD ───────────────────────────────────────────────────────
const BarraAntiguedad = ({ alDia, d30, d60, d90, mas90 }) => {
  const total = alDia + d30 + d60 + d90 + mas90;
  if (total === 0) return null;
  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
      {alDia > 0 && <div title={`Al día: $U ${fmt(alDia)}`} style={{ width: pct(alDia) }} className="bg-emerald-400 rounded-full" />}
      {d30 > 0 && <div title={`1-30d: $U ${fmt(d30)}`} style={{ width: pct(d30) }} className="bg-amber-300 rounded-full" />}
      {d60 > 0 && <div title={`31-60d: $U ${fmt(d60)}`} style={{ width: pct(d60) }} className="bg-orange-400 rounded-full" />}
      {d90 > 0 && <div title={`61-90d: $U ${fmt(d90)}`} style={{ width: pct(d90) }} className="bg-red-500 rounded-full" />}
      {mas90 > 0 && <div title={`+90d: $U ${fmt(mas90)}`} style={{ width: pct(mas90) }} className="bg-red-800 rounded-full" />}
    </div>
  );
};

export default function ContabilidadAntiguedadView() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [ordenCol, setOrdenCol] = useState('TotalDeuda');
  const [ordenDir, setOrdenDir] = useState('desc');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/contabilidad/reportes/antiguedad-deuda');
      setDatos(data.data || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleOrden = (col) => {
    if (ordenCol === col) setOrdenDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setOrdenCol(col); setOrdenDir('desc'); }
  };

  const filtrados = datos
    .filter(d => !filtro || d.NombreCliente?.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => {
      const va = Number(a[ordenCol] ?? 0);
      const vb = Number(b[ordenCol] ?? 0);
      return ordenDir === 'asc' ? va - vb : vb - va;
    });

  // Totales
  const totales = filtrados.reduce((acc, d) => ({
    AlDia:     acc.AlDia     + Number(d.AlDia ?? 0),
    Dias1_30:  acc.Dias1_30  + Number(d.Dias1_30 ?? 0),
    Dias31_60: acc.Dias31_60 + Number(d.Dias31_60 ?? 0),
    Dias61_90: acc.Dias61_90 + Number(d.Dias61_90 ?? 0),
    Mas90:     acc.Mas90     + Number(d.Mas90 ?? 0),
    TotalDeuda:acc.TotalDeuda+ Number(d.TotalDeuda ?? 0),
  }), { AlDia: 0, Dias1_30: 0, Dias31_60: 0, Dias61_90: 0, Mas90: 0, TotalDeuda: 0 });

  const exportarCSV = () => {
    const cols = ['Cliente', 'Al Día', '1-30d', '31-60d', '61-90d', '+90d', 'Total'];
    const rows = filtrados.map(d =>
      [d.NombreCliente, d.AlDia, d.Dias1_30, d.Dias31_60, d.Dias61_90, d.Mas90, d.TotalDeuda].join(',')
    );
    const csv = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `antiguedad_deuda_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const ColHeader = ({ col, label, className = '' }) => (
    <th className={`px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none hover:text-blue-600 transition-colors ${className}`}
      onClick={() => toggleOrden(col)}>
      {label}
      {ordenCol === col && <span className="ml-1">{ordenDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Antigüedad de Deuda</h1>
          <p className="text-sm text-slate-400 mt-0.5">Distribución de deuda pendiente por tramo de vencimiento</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarCSV} className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600">
            <Download size={14} /> Exportar CSV
          </button>
          <button onClick={cargar} disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Al Día',   val: totales.AlDia,     color: 'emerald', icon: '✓' },
          { label: '1 – 30d',  val: totales.Dias1_30,  color: 'amber',   icon: '!' },
          { label: '31 – 60d', val: totales.Dias31_60, color: 'orange',  icon: '!!' },
          { label: '61 – 90d', val: totales.Dias61_90, color: 'red',     icon: '!!!' },
          { label: '+90 días', val: totales.Mas90,     color: 'rose',    icon: '✕' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
            <p className="text-xs text-slate-400 font-medium">{k.label}</p>
            <p className={`text-lg font-bold text-${k.color}-600 mt-0.5`}>${fmt(k.val)}</p>
            <div className={`mt-1.5 h-1 rounded-full bg-${k.color}-100`}>
              <div className={`h-1 rounded-full bg-${k.color}-400`}
                style={{ width: totales.TotalDeuda ? `${(k.val / totales.TotalDeuda * 100).toFixed(0)}%` : '0%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Filtro + tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
          <Users size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por nombre de cliente..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="flex-1 text-sm outline-none text-slate-700 placeholder-slate-300"
          />
          <span className="text-xs text-slate-400">{filtrados.length} cliente(s)</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Cliente</th>
                  <ColHeader col="AlDia"      label="Al Día"    className="text-emerald-700" />
                  <ColHeader col="Dias1_30"   label="1-30d"     className="text-amber-700" />
                  <ColHeader col="Dias31_60"  label="31-60d"    className="text-orange-700" />
                  <ColHeader col="Dias61_90"  label="61-90d"    className="text-red-700" />
                  <ColHeader col="Mas90"      label="+90d"      className="text-red-900" />
                  <ColHeader col="TotalDeuda" label="Total"     className="text-slate-700" />
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map(d => (
                  <tr key={d.CliIdCliente} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-700">{d.NombreCliente}</p>
                      {d.Moneda && <p className="text-[11px] text-slate-400">{d.Moneda}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-700">{d.AlDia > 0 ? fmt(d.AlDia) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-amber-700">{d.Dias1_30 > 0 ? fmt(d.Dias1_30) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-orange-700">{d.Dias31_60 > 0 ? fmt(d.Dias31_60) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-red-700">{d.Dias61_90 > 0 ? fmt(d.Dias61_90) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-900">{d.Mas90 > 0 ? fmt(d.Mas90) : <span className="text-slate-300 font-normal">—</span>}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-800">${fmt(d.TotalDeuda)}</td>
                    <td className="px-4 py-3">
                      <BarraAntiguedad alDia={d.AlDia} d30={d.Dias1_30} d60={d.Dias31_60} d90={d.Dias61_90} mas90={d.Mas90} />
                    </td>
                  </tr>
                ))}

                {/* Fila de totales */}
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <td className="px-4 py-3 text-sm text-slate-600 uppercase tracking-wide">TOTALES</td>
                  <td className="px-4 py-3 text-sm text-emerald-700">${fmt(totales.AlDia)}</td>
                  <td className="px-4 py-3 text-sm text-amber-700">${fmt(totales.Dias1_30)}</td>
                  <td className="px-4 py-3 text-sm text-orange-700">${fmt(totales.Dias31_60)}</td>
                  <td className="px-4 py-3 text-sm text-red-700">${fmt(totales.Dias61_90)}</td>
                  <td className="px-4 py-3 text-sm text-red-900">${fmt(totales.Mas90)}</td>
                  <td className="px-4 py-3 text-sm text-slate-800">${fmt(totales.TotalDeuda)}</td>
                  <td />
                </tr>

                {filtrados.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <TrendingDown size={28} className="mx-auto mb-2 opacity-40" />
                      <p>Sin deudas pendientes registradas</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

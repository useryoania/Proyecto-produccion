/**
 * ContabilidadAntiguedadView.jsx
 * Reporte de antigüedad de deuda — tabla resumen de todos los clientes con saldo.
 * Tramos: Al día / 1-30d / 31-60d / 61-90d / +90d
 */

import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { RefreshCw, Download, AlertTriangle, TrendingDown, Calendar, Users, Briefcase, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../services/api';

const fetchAPI = async (url) => {
  try {
    const cleanUrl = url.startsWith('/api') ? url.replace('/api', '') : url;
    const res = await api.get(cleanUrl);
    return res.data;
  } catch (error) {
    if (error.response?.data) throw new Error(error.response.data.error || 'Error en la solicitud');
    throw error;
  }
};

const fmt = (n) => new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2 }).format(Number(n ?? 0));

// ── BARRA DE ANTIGÜEDAD ───────────────────────────────────────────────────────
const BarraAntiguedad = ({ alDia, d30, d60, d90, mas90 }) => {
  const total = alDia + d30 + d60 + d90 + mas90;
  if (total === 0) return null;
  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5 w-full bg-slate-50">
      {alDia > 0 && <div title={`Al día: $U ${fmt(alDia)}`} style={{ width: pct(alDia) }} className="bg-emerald-500 rounded-full" />}
      {d30 > 0 && <div title={`1-30d: $U ${fmt(d30)}`} style={{ width: pct(d30) }} className="bg-amber-400 rounded-full" />}
      {d60 > 0 && <div title={`31-60d: $U ${fmt(d60)}`} style={{ width: pct(d60) }} className="bg-orange-500 rounded-full" />}
      {d90 > 0 && <div title={`61-90d: $U ${fmt(d90)}`} style={{ width: pct(d90) }} className="bg-rose-500 rounded-full" />}
      {mas90 > 0 && <div title={`+90d: $U ${fmt(mas90)}`} style={{ width: pct(mas90) }} className="bg-rose-700 rounded-full" />}
    </div>
  );
};

export default function ContabilidadAntiguedadView() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [ordenCol, setOrdenCol] = useState('TotalDeuda');
  const [ordenDir, setOrdenDir] = useState('desc');
  const [expanded, setExpanded] = useState({}); // { 'CliIdCliente-CueTipo': boolean }
  const [detallesDeuda, setDetallesDeuda] = useState({}); // { 'CliIdCliente': [documents] }
  const [loadingDetalles, setLoadingDetalles] = useState({});

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

  const toggleExpand = async (d) => {
    const key = `${d.CliIdCliente}-${d.CueTipo}`;
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

    if (!detallesDeuda[d.CliIdCliente] && !loadingDetalles[d.CliIdCliente]) {
      setLoadingDetalles(prev => ({ ...prev, [d.CliIdCliente]: true }));
      try {
        const res = await fetchAPI(`/api/contabilidad/clientes/${d.CliIdCliente}/deudas-vivas`);
        setDetallesDeuda(prev => ({ ...prev, [d.CliIdCliente]: res.data || [] }));
      } catch (e) {
        toast.error('Error cargando detalles');
      } finally {
        setLoadingDetalles(prev => ({ ...prev, [d.CliIdCliente]: false }));
      }
    }
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
    <th className={`px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none border-b border-slate-100 hover:text-indigo-400 transition-colors ${className}`}
      onClick={() => toggleOrden(col)}>
      <div className="flex items-center gap-1">
          {label}
          {ordenCol === col && <span className="text-indigo-500">{ordenDir === 'asc' ? '↑' : '↓'}</span>}
      </div>
    </th>
  );

  return (
    <div className="h-full bg-[#f1f5f9] p-4 sm:p-8 overflow-y-auto text-slate-700 font-sans custom-scrollbar">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-800 flex items-center gap-3">
             <Calendar className="text-indigo-400" size={36} /> Antigüedad de Deuda
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-2xl">
              Distribución interactiva de deuda pendiente segregada por tramos de vencimiento y clientes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportarCSV} className="flex items-center gap-2 px-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-700 border border-slate-100 rounded-xl font-bold transition-all shadow-lg text-slate-600 w-fit">
            <Download size={16} className="text-emerald-600" /> Exportar a CSV
          </button>
          <button onClick={cargar} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 text-slate-800 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Recargar Datos
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Deuda Al Día',   val: totales.AlDia,     color: 'emerald' },
          { label: 'Vencido 1–30d',  val: totales.Dias1_30,  color: 'amber' },
          { label: 'Vencido 31–60d', val: totales.Dias31_60, color: 'orange' },
          { label: 'Vencido 61–90d', val: totales.Dias61_90, color: 'rose' },
          { label: 'Crítico +90 días', val: totales.Mas90,     color: 'rose' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 shadow-xl px-5 py-4 flex flex-col justify-between">
            <p className="text-xs text-slate-400 font-black uppercase tracking-wider">{k.label}</p>
            <p className={`text-2xl font-black text-${k.color}-400 mt-2`}>${fmt(k.val)}</p>
            <div className={`mt-3 h-1.5 rounded-full bg-slate-50 overflow-hidden`}>
              <div className={`h-full rounded-full bg-${k.color}-500 shadow-[0_0_10px_currentColor]`}
                style={{ width: totales.TotalDeuda ? `${(k.val / totales.TotalDeuda * 100).toFixed(0)}%` : '0%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Filtro + tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden mt-4">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-4 bg-white">
          <div className="flex bg-slate-50/80 border border-slate-100 px-4 py-2 text-slate-600 rounded-xl items-center gap-3 w-full sm:w-80 shadow-inner focus-within:border-indigo-500 transition-colors">
              <Users size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nombre de cliente..."
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
                className="w-full bg-transparent border-none outline-none placeholder-slate-500 text-sm"
              />
          </div>
          <span className="text-xs font-bold font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{filtrados.length} RESULTADOS</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full shadow-lg" />
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">Cliente / Cuenta</th>
                  <ColHeader col="AlDia"      label="Al Día"    className="text-emerald-600" />
                  <ColHeader col="Dias1_30"   label="1-30 Días"     className="text-amber-600" />
                  <ColHeader col="Dias31_60"  label="31-60 Días"    className="text-orange-600" />
                  <ColHeader col="Dias61_90"  label="61-90 Días"    className="text-rose-600" />
                  <ColHeader col="Mas90"      label="+90 Días"      className="text-rose-600" />
                  <ColHeader col="TotalDeuda" label="Deuda Total"   className="text-indigo-600" />
                  <th className="px-6 py-4 border-b border-slate-100 w-24">Acciones</th>
                  <th className="px-6 py-4 border-b border-slate-100 w-32" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filtrados.map((d, index) => {
                  const key = `${d.CliIdCliente}-${d.CueTipo}`;
                  const isExpanded = !!expanded[key];
                  const docs = (detallesDeuda[d.CliIdCliente] || []).filter(doc => doc.CueTipo === d.CueTipo);
                  
                  return (
                    <React.Fragment key={`${key}-${index}`}>
                      <tr className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/80' : ''}`} onClick={() => toggleExpand(d)}>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            {isExpanded ? <ChevronUp size={16} className="text-indigo-500" /> : <ChevronDown size={16} className="text-slate-400" />}
                            {d.NombreCliente}
                          </p>
                          <p className="text-[10px] font-mono font-bold text-slate-400 mt-1 uppercase bg-slate-100 inline-block px-1.5 rounded ml-6">{d.Moneda}</p>
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-emerald-600/90">{d.AlDia > 0 ? `$${fmt(d.AlDia)}` : <span className="text-slate-700">—</span>}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-amber-600/90">{d.Dias1_30 > 0 ? `$${fmt(d.Dias1_30)}` : <span className="text-slate-700">—</span>}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-orange-600/90">{d.Dias31_60 > 0 ? `$${fmt(d.Dias31_60)}` : <span className="text-slate-700">—</span>}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-rose-600/90">{d.Dias61_90 > 0 ? `$${fmt(d.Dias61_90)}` : <span className="text-slate-700">—</span>}</td>
                        <td className="px-4 py-4 text-sm font-black text-rose-500">{d.Mas90 > 0 ? `$${fmt(d.Mas90)}` : <span className="text-slate-700 font-normal">—</span>}</td>
                        <td className="px-4 py-4 text-sm font-black text-indigo-600 bg-indigo-50">${fmt(d.TotalDeuda)}</td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={(e) => { e.stopPropagation(); toggleExpand(d); }} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors">
                            {isExpanded ? 'Ocultar' : 'Detalles'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <BarraAntiguedad alDia={d.AlDia} d30={d.Dias1_30} d60={d.Dias31_60} d90={d.Dias61_90} mas90={d.Mas90} />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-0 bg-slate-50/50 border-b-2 border-slate-200">
                            <div className="px-12 py-6 bg-slate-100/50 shadow-inner">
                                {loadingDetalles[d.CliIdCliente] ? (
                                  <div className="flex items-center gap-3 text-sm text-slate-500 font-bold">
                                    <RefreshCw size={16} className="animate-spin text-indigo-500" /> Cargando documentos...
                                  </div>
                                ) : docs.length > 0 ? (
                                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-left whitespace-nowrap text-sm">
                                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                        <tr>
                                          <th className="px-4 py-3">Documento</th>
                                          <th className="px-4 py-3">Detalle / Orden</th>
                                          <th className="px-4 py-3">Emisión</th>
                                          <th className="px-4 py-3">Vencimiento</th>
                                          <th className="px-4 py-3">Estado</th>
                                          <th className="px-4 py-3 text-right">Saldo Pendiente</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {docs.map(doc => (
                                          <tr key={doc.DDeIdDocumento} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-mono font-bold text-slate-700 flex items-center gap-2">
                                              <FileText size={14} className="text-indigo-400" />
                                              {doc.CodigoOrden || `DOC #${doc.DDeIdDocumento}`}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={doc.NombreTrabajo}>
                                              {doc.NombreTrabajo || 'Sin descripción'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">
                                              {new Date(doc.DDeFechaEmision).toLocaleDateString('es-UY')}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 font-medium">
                                              {new Date(doc.DDeFechaVencimiento).toLocaleDateString('es-UY')}
                                            </td>
                                            <td className="px-4 py-3">
                                              {doc.DiasVencido > 0 ? (
                                                <span className="text-[10px] font-bold uppercase px-2 py-1 bg-rose-100 text-rose-700 rounded-md">Vencido ({doc.DiasVencido} d)</span>
                                              ) : (
                                                <span className="text-[10px] font-bold uppercase px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md">Al día</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-slate-800">
                                              <span className="text-slate-400 text-xs font-normal mr-1">{doc.MonSimbolo}</span>
                                              {fmt(doc.DDeImportePendiente)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-sm text-amber-600 font-bold bg-amber-50 px-4 py-3 rounded-xl border border-amber-100 w-fit">
                                    <AlertTriangle size={18} /> No hay documentos pendientes para esta cuenta.
                                  </div>
                                )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Fila de totales */}
                {filtrados.length > 0 && (
                  <tr className="bg-slate-50/80 font-black relative shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-10">
                    <td className="px-6 py-5 text-sm text-slate-500 uppercase tracking-widest border-t-2 border-slate-100">Gran Total</td>
                    <td className="px-4 py-5 text-sm text-emerald-600 border-t-2 border-slate-100">${fmt(totales.AlDia)}</td>
                    <td className="px-4 py-5 text-sm text-amber-600 border-t-2 border-slate-100">${fmt(totales.Dias1_30)}</td>
                    <td className="px-4 py-5 text-sm text-orange-600 border-t-2 border-slate-100">${fmt(totales.Dias31_60)}</td>
                    <td className="px-4 py-5 text-sm text-rose-600 border-t-2 border-slate-100">${fmt(totales.Dias61_90)}</td>
                    <td className="px-4 py-5 text-sm text-rose-500 border-t-2 border-slate-100 shadow-rose-500/10 drop-shadow-lg">${fmt(totales.Mas90)}</td>
                    <td className="px-4 py-5 text-sm text-indigo-600 border-t-2 border-slate-100 bg-indigo-900/20">${fmt(totales.TotalDeuda)}</td>
                    <td className="px-4 py-5 border-t-2 border-slate-100" />
                    <td className="px-6 py-5 border-t-2 border-slate-100" />
                  </tr>
                )}

                {filtrados.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-slate-400">
                      <TrendingDown size={48} className="mx-auto mb-4 text-slate-700" />
                      <p className="text-lg">No hay cuentas por cobrar detectadas con los filtros actuales</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

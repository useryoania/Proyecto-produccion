import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownCircle, ArrowUpCircle, Search, RefreshCw,
  FileText, ChevronLeft, ChevronRight, Receipt, TrendingDown, TrendingUp, Printer
} from 'lucide-react';
import api from '../../services/apiClient';
import { toast } from 'sonner';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const fmtTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
};
const numSinCeros = (n) => n ? String(parseInt(n, 10) || n) : '';
const nroDoc = (serie, numero) => {
  const s = serie || '';
  const n = numSinCeros(numero);
  if (!s && !n) return '—';
  if (!n) return s;
  return `${s}-${n}`;
};

const TIPO_LABELS = {
  '05': 'Recibo Caja',
  '40': 'Recibo Cobro',
  'Recibo': 'Recibo',
  'RECIBO': 'Recibo',
  'RECIBO_ANTICIPO': 'Recibo Anticipo',
  'EGRESO': 'Egreso',
  'GASTO': 'Gasto',
  'NINGUNO': 'Sin Doc.',
};
const getTipoLabel = (tipo) => TIPO_LABELS[String(tipo||'').trim()] || String(tipo||'').trim() || '—';

// ──────────────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────────────
export default function BandejaDocumentosInternos() {
  // Filtros
  const hoy = new Date().toISOString().split('T')[0];
  const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [filtros, setFiltros] = useState({
    desde: hace30,
    hasta: hoy,
    tipo: 'TODOS',
    cliente: '',
  });
  const [page, setPage]         = useState(1);
  const LIMIT = 50;

  // Data
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [hasMore, setHasMore]   = useState(false);

  // Totales calculados localmente sobre la página actual
  const totales = docs.reduce((acc, d) => {
    const t = Number(d.Total) || 0;
    if (d.TipoOperacion === 'INGRESO') {
      if (d.Moneda === 'USD') acc.ingUSD += t; else acc.ingUYU += t;
    } else {
      if (d.Moneda === 'USD') acc.egrUSD += t; else acc.egrUYU += t;
    }
    return acc;
  }, { ingUYU: 0, ingUSD: 0, egrUYU: 0, egrUSD: 0 });

  const fetchDocs = useCallback(async (p = 1, f = filtros) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        desde: f.desde,
        hasta: f.hasta,
        tipo:  f.tipo,
        page:  p,
        limit: LIMIT,
      });
      if (f.cliente.trim()) params.set('cliente', f.cliente.trim());
      const res = await api.get(`/contabilidad/caja/documentos?${params}`);
      const data = res.data?.data || [];
      setDocs(data);
      setHasMore(data.length === LIMIT);
    } catch (err) {
      toast.error('Error al cargar documentos: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { fetchDocs(1, filtros); }, []);

  const handleBuscar = () => { setPage(1); fetchDocs(1, filtros); };
  const handlePrev   = () => { const p = Math.max(1, page - 1); setPage(p); fetchDocs(p, filtros); };
  const handleNext   = () => { const p = page + 1; setPage(p); fetchDocs(p, filtros); };

  const handleImprimir = (doc) => {
    const isIngreso = doc.TipoOperacion === 'INGRESO';
    const simb = doc.Moneda === 'USD' ? 'U$S' : '$';
    const nro  = nroDoc(doc.Serie, doc.Numero);
    const tipo = getTipoLabel(doc.TipoDoc || doc.CodTipoDoc);
    const win = window.open('', '_blank', 'width=360,height=520');
    if (!win) return toast.error('El navegador bloqueó la ventana emergente');
    win.document.write(`
      <html><head><title>${tipo} ${nro}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.4;padding:8mm;width:80mm;background:#fff;color:#000}
        h2{font-size:15px;font-weight:bold;text-align:center;margin-bottom:4px}
        .sub{text-align:center;font-size:10px;color:#555;margin-bottom:8px}
        .sep{border-bottom:1px dashed #000;margin:8px 0}
        .row{display:flex;justify-content:space-between;font-size:11px;margin:3px 0}
        .lbl{color:#555}
        .total{font-size:14px;font-weight:bold;display:flex;justify-content:space-between;margin:6px 0}
        .dir{text-align:center;font-size:10px;padding:6px 0;font-weight:bold;color:${isIngreso?'#059669':'#e11d48'}}
        .pie{text-align:center;font-size:9px;color:#999;margin-top:16px}
        @media print{@page{size:80mm auto;margin:0}}
      </style></head><body>
      <h2>USER ERP</h2>
      <div class="sub">${tipo}</div>
      <div class="sep"></div>
      <div class="row"><span class="lbl">Fecha:</span><span>${fmtDate(doc.Fecha)} ${fmtTime(doc.Fecha)}</span></div>
      <div class="row"><span class="lbl">N° Doc:</span><span><b>${nro}</b></span></div>
      <div class="row"><span class="lbl">${isIngreso?'Cliente':'Proveedor'}:</span><span>${doc.ClienteNombre||'—'}</span></div>
      <div class="row"><span class="lbl">Medio Pago:</span><span>${doc.MetodoPago||'—'}</span></div>
      ${doc.Observaciones ? `<div class="row"><span class="lbl">Concepto:</span><span style="max-width:160px;word-break:break-word">${doc.Observaciones}</span></div>` : ''}
      <div class="sep"></div>
      <div class="total"><span>TOTAL:</span><span>${simb} ${fmt(doc.Total)}</span></div>
      <div class="sep"></div>
      <div class="dir">${isIngreso ? '↓ INGRESO' : '↑ EGRESO'}</div>
      <div class="row"><span class="lbl">Usuario:</span><span>${doc.Usuario||'—'}</span></div>
      <div class="pie"><p>Comprobante interno — USER ERP</p></div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.addEventListener('afterprint', () => win.close()); }, 600);
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Receipt size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-zinc-900">Bandeja de Documentos Internos</h1>
              <p className="text-xs text-zinc-500">Recibos de cobro, egresos y comprobantes no-CFE</p>
            </div>
          </div>
          <button
            onClick={() => fetchDocs(page, filtros)}
            className="flex items-center gap-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard label="Ingresos UYU" value={`$ ${fmt(totales.ingUYU)}`} icon={<TrendingUp size={18}/>} color="emerald" />
          <SummaryCard label="Ingresos USD" value={`U$S ${fmt(totales.ingUSD)}`} icon={<TrendingUp size={18}/>} color="blue" />
          <SummaryCard label="Egresos UYU" value={`$ ${fmt(totales.egrUYU)}`} icon={<TrendingDown size={18}/>} color="rose" />
          <SummaryCard label="Egresos USD" value={`U$S ${fmt(totales.egrUSD)}`} icon={<TrendingDown size={18}/>} color="orange" />
        </div>

        {/* Filtros */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm mb-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fecha Desde</label>
              <input type="date" value={filtros.desde}
                onChange={e => setFiltros(f => ({...f, desde: e.target.value}))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm font-bold text-zinc-800 outline-none focus:border-indigo-500 bg-white" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fecha Hasta</label>
              <input type="date" value={filtros.hasta}
                onChange={e => setFiltros(f => ({...f, hasta: e.target.value}))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm font-bold text-zinc-800 outline-none focus:border-indigo-500 bg-white" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tipo</label>
              <select value={filtros.tipo}
                onChange={e => setFiltros(f => ({...f, tipo: e.target.value}))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm font-bold text-zinc-800 outline-none focus:border-indigo-500 bg-white cursor-pointer min-w-[140px]">
                <option value="TODOS">Todos</option>
                <option value="INGRESO">Ingresos / Recibos</option>
                <option value="EGRESO">Egresos / Gastos</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cliente / Proveedor</label>
              <input type="text" value={filtros.cliente}
                placeholder="Buscar por nombre..."
                onChange={e => setFiltros(f => ({...f, cliente: e.target.value}))}
                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm font-bold text-zinc-800 outline-none focus:border-indigo-500 bg-white" />
            </div>
            <button onClick={handleBuscar}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm px-5 py-2 rounded-xl shadow-md transition-all">
              <Search size={15} />
              Buscar
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fecha</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tipo</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">N° Documento</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cliente / Proveedor</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Concepto</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Medio Pago</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Usuario</th>
                  <th className="px-4 py-3 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading && (
                  <tr><td colSpan={8} className="text-center py-16 text-zinc-400 font-bold text-sm">
                    <RefreshCw size={24} className="animate-spin inline mr-2" />Cargando...
                  </td></tr>
                )}
                {!loading && docs.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-16 text-zinc-400">
                    <FileText size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold">Sin documentos para el período seleccionado</p>
                  </td></tr>
                )}
                {!loading && docs.map((doc, i) => {
                  const isIngreso = doc.TipoOperacion === 'INGRESO';
                  const simb = doc.Moneda === 'USD' ? 'U$S' : '$';
                  return (
                    <tr key={`${doc.TipoOperacion}-${doc.DocId}-${i}`}
                      className="hover:bg-zinc-50/50 transition-colors group">
                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-zinc-800 text-xs">{fmtDate(doc.Fecha)}</div>
                        <div className="text-[10px] text-zinc-400">{fmtTime(doc.Fecha)}</div>
                      </td>
                      {/* Tipo */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                          isIngreso
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {isIngreso
                            ? <ArrowDownCircle size={11}/>
                            : <ArrowUpCircle size={11}/>}
                          {getTipoLabel(doc.TipoDoc || doc.CodTipoDoc)}
                        </span>
                      </td>
                      {/* Nro */}
                      <td className="px-4 py-3 whitespace-nowrap font-black text-xs text-zinc-800">
                        {nroDoc(doc.Serie, doc.Numero)}
                      </td>
                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-800 text-xs max-w-[160px] truncate">{doc.ClienteNombre || '—'}</div>
                      </td>
                      {/* Concepto */}
                      <td className="px-4 py-3">
                        <div className="text-xs text-zinc-500 max-w-[200px] truncate" title={doc.Observaciones}>
                          {doc.Observaciones || '—'}
                        </div>
                      </td>
                      {/* Medio pago */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-zinc-500 font-bold">{doc.MetodoPago || '—'}</span>
                      </td>
                      {/* Total */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className={`font-black text-sm ${isIngreso ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {simb} {fmt(doc.Total)}
                        </span>
                      </td>
                      {/* Usuario */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[10px] text-zinc-400 font-bold">{doc.Usuario || '—'}</span>
                      </td>
                      {/* Acciones */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleImprimir(doc)}
                          title="Imprimir / Ver documento"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 bg-white hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 text-zinc-400 transition-all shadow-sm"
                        >
                          <Printer size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
            <span className="text-xs text-zinc-400 font-bold">
              Página {page} · {docs.length} registro{docs.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button onClick={handlePrev} disabled={page === 1}
                className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={14}/> Anterior
              </button>
              <button onClick={handleNext} disabled={!hasMore}
                className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Siguiente <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de resumen ────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon, color }) {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue:    'bg-blue-50 border-blue-200 text-blue-700',
    rose:    'bg-rose-50 border-rose-200 text-rose-700',
    orange:  'bg-orange-50 border-orange-200 text-orange-700',
  };
  return (
    <div className={`border rounded-2xl p-4 shadow-sm flex items-center gap-3 ${colors[color]}`}>
      <div className="shrink-0 opacity-80">{icon}</div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</div>
        <div className="font-black text-sm">{value}</div>
      </div>
    </div>
  );
}

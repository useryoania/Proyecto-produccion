/**
 * ContabilidadColaEstadosView.jsx
 * Cola de estados de cuenta — revisión, previsualización y envío de emails.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Send, CheckCircle2, XCircle, Clock, AlertTriangle,
  Mail, ChevronDown, Filter, Eye, Zap, X, Printer,
} from 'lucide-react';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || '';
const tok = () => { try { return JSON.parse(localStorage.getItem('user'))?.token || ''; } catch { return ''; } };

const req = async (url, opts = {}) => {
  const r = await fetch(`${API}${url}`, {
    headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || `Error ${r.status}`);
  return json;
};

const fmtFecha = (f) =>
  f ? new Date(f).toLocaleString('es-UY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Montevideo',
  }) : '—';

// ── Badge de estado ───────────────────────────────────────────────────────────
const BADGE = {
  PENDIENTE: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',  icon: <Clock size={12} />,       label: 'Pendiente' },
  APROBADO:  { cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     icon: <CheckCircle2 size={12} />, label: 'Aprobado' },
  ENVIADO:   { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',  icon: <CheckCircle2 size={12} />, label: 'Enviado' },
  ERROR:     { cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',        icon: <XCircle size={12} />,      label: 'Error' },
  RECHAZADO: { cls: 'bg-slate-800 text-slate-400 border-slate-700',  icon: <XCircle size={12} />,      label: 'Rechazado' },
};

const EstadoBadge = ({ estado }) => {
  const b = BADGE[estado] || BADGE.PENDIENTE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider ${b.cls}`}>
      {b.icon} {b.label}
    </span>
  );
};

// ── Modal de previsualización ─────────────────────────────────────────────────
const PreviewModal = ({ item, onClose }) => {
  const [html, setHtml]       = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await req(`/api/contabilidad/cola/${item.ColIdCola}/preview`);
        setHtml(data.html || '');
      } catch (e) { toast.error(e.message); onClose(); }
      finally { setLoading(false); }
    };
    cargar();
  }, [item.ColIdCola]);

  const imprimir = () => {
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 text-white shrink-0 shadow-xl z-10">
        <div>
          <p className="text-lg font-black text-indigo-100">{item.ColAsunto || 'Estado de Cuenta — Preview'}</p>
          <p className="text-sm font-mono text-slate-400 mt-1">{item.ColEmailDestino}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={imprimir}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl transition-colors shadow-lg">
            <Printer size={16} className="text-indigo-400" /> Imprimir
          </button>
          <button onClick={onClose}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl transition-colors shadow-lg">
            <X size={16} /> Cerrar
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto bg-[#0a0c10] flex justify-center py-8 px-4 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 text-slate-500 mt-20">
            <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            <p className="text-sm font-bold tracking-widest uppercase text-indigo-400">Generando previsualización ERP...</p>
          </div>
        ) : (
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden ring-1 ring-slate-800">
            <iframe
              srcDoc={html}
              title="Vista previa Estado de Cuenta"
              className="w-full border-0"
              style={{ minHeight: '850px' }}
              sandbox="allow-same-origin"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ── Fila de la cola ───────────────────────────────────────────────────────────
const FilaCola = ({ item, seleccionado, onToggle, onCambiarEstado, onEnviar, onPreview, loadingId }) => {
  const [expandido, setExpandido] = useState(false);
  const loading = loadingId === item.ColIdCola;

  return (
    <>
      <tr className={`border-b border-slate-800/80 transition-colors ${seleccionado ? 'bg-indigo-900/10' : 'hover:bg-slate-800/40'} ${item.ColEstado === 'ERROR' ? 'bg-rose-900/5' : ''}`}>
        <td className="px-5 py-4">
          <input type="checkbox" checked={seleccionado} onChange={() => onToggle(item.ColIdCola)}
            className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-slate-900 w-4 h-4 cursor-pointer" />
        </td>
        <td className="px-5 py-4">
          <p className="text-sm font-bold text-slate-200">{item.NombreCliente}</p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{item.ColEmailDestino}</p>
        </td>
        <td className="px-5 py-4 text-xs font-medium text-slate-400">{fmtFecha(item.ColFechaGeneracion)}</td>
        <td className="px-5 py-4"><EstadoBadge estado={item.ColEstado} /></td>
        <td className="px-5 py-4 text-xs font-medium text-slate-500">
          {item.ColEstado === 'ENVIADO' && <span className="text-emerald-500/80">{fmtFecha(item.ColFechaEnvio)}</span>}
          {item.ColEstado === 'ERROR' && (
            <span className="text-rose-400 flex items-center gap-1.5 font-bold">
              <AlertTriangle size={14} /> {item.ColErrorEnvio?.substring(0, 45) || 'Error general en envío'}...
            </span>
          )}
          {['PENDIENTE','APROBADO','RECHAZADO'].includes(item.ColEstado) && '—'}
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            {['PENDIENTE','RECHAZADO','ERROR'].includes(item.ColEstado) && (
              <button onClick={() => onCambiarEstado(item.ColIdCola, 'APROBADO')} title="Aprobar para envío"
                className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20 shadow-sm">
                <CheckCircle2 size={16} />
              </button>
            )}
            {['PENDIENTE','APROBADO'].includes(item.ColEstado) && (
              <button onClick={() => onCambiarEstado(item.ColIdCola, 'RECHAZADO')} title="Rechazar y archivar"
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-slate-700 shadow-sm">
                <XCircle size={16} />
              </button>
            )}
            {['APROBADO','ERROR','PENDIENTE'].includes(item.ColEstado) && (
              <button onClick={() => onEnviar(item.ColIdCola)} disabled={loading} title="Forzar envío individual ahora"
                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 shadow-sm disabled:opacity-50">
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            )}
            {/* Vista previa del documento */}
            <button onClick={() => onPreview(item)} title="Ver Preview HTML"
              className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20 shadow-sm">
              <Eye size={16} />
            </button>
            {/* Expandir detalle técnico */}
            <button onClick={() => setExpandido(e => !e)} title="Ver info técnica extendida"
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors border border-slate-700 shadow-sm ml-2">
              <ChevronDown size={16} className={`transition-transform duration-300 ${expandido ? 'rotate-180 text-white' : ''}`} />
            </button>
          </div>
        </td>
      </tr>
      {expandido && (
        <tr className="bg-slate-900/50 border-b border-slate-800 shadow-inner">
          <td colSpan={6} className="px-8 py-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Asunto Generado</span>
                  <span className="text-indigo-200 font-semibold">{item.ColAsunto}</span>
              </div>
              <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Período de Corte</span>
                  <span className="text-slate-300 font-mono text-xs">{fmtFecha(item.ColFechaDesde)} → {fmtFecha(item.ColFechaHasta)}</span>
              </div>
              <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo Disparo</span>
                  <span className="text-slate-300"><span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-xs">{item.ColTipoDisparo}</span></span>
              </div>
              {item.ColErrorEnvio && (
                  <div className="flex flex-col gap-1 col-span-2 lg:col-span-1 border-l-2 border-rose-500/30 pl-3">
                      <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Traceback de Error</span>
                      <span className="text-rose-300 text-xs font-mono bg-rose-950/20 p-2 rounded">{item.ColErrorEnvio}</span>
                  </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ── VISTA PRINCIPAL ────────────────────────────────────────────────────────────
export default function ContabilidadColaEstadosView() {
  const [items, setItems]               = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(false);
  const [loadingId, setLoadingId]       = useState(null);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [page, setPage]                 = useState(1);
  const [previewItem, setPreviewItem]   = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (filtroEstado) params.append('estado', filtroEstado);
      const data = await req(`/api/contabilidad/cola?${params}`);
      setItems(data.data || []);
      setTotal(data.total || 0);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filtroEstado, page]);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleSeleccion = (id) => setSeleccionados(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleTodos = () => {
    if (seleccionados.size === items.length) setSeleccionados(new Set());
    else setSeleccionados(new Set(items.map(i => i.ColIdCola)));
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await req(`/api/contabilidad/cola/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) });
      toast.success(`Marcado como ${estado}`);
      cargar();
    } catch (e) { toast.error(e.message); }
  };

  const enviarUno = async (id) => {
    setLoadingId(id);
    try {
      const result = await req(`/api/contabilidad/cola/${id}/enviar`, { method: 'POST' });
      toast.success(result.success ? '✉️ Despacho SMTP exitoso' : `Error: ${result.data?.error}`);
      cargar();
    } catch (e) { toast.error(e.message); }
    finally { setLoadingId(null); }
  };

  const enviarSeleccionados = async () => {
    if (!seleccionados.size) return toast.warning('Seleccioná al menos un registro en la grilla.');
    for (const id of seleccionados) {
      await req(`/api/contabilidad/cola/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: 'APROBADO' }) });
    }
    setLoadingBatch(true);
    try {
      const result = await req('/api/contabilidad/cola/enviar-aprobados', { method: 'POST', body: JSON.stringify({ ids: [...seleccionados] }) });
      toast.success(`✅ Despachados: ${result.data?.enviados ?? 0} | Rebotados: ${result.data?.errores ?? 0}`);
      setSeleccionados(new Set());
      cargar();
    } catch (e) { toast.error(e.message); }
    finally { setLoadingBatch(false); }
  };

  const generarManual = async () => {
    setLoadingBatch(true);
    try {
      const r = await req('/api/contabilidad/cola/generar', { method: 'POST' });
      toast.success(r.message);
      setTimeout(cargar, 3000);
    } catch (e) { toast.error(e.message); }
    finally { setLoadingBatch(false); }
  };

  const ESTADOS = ['', 'PENDIENTE', 'APROBADO', 'ENVIADO', 'ERROR', 'RECHAZADO'];
  const contadores = ESTADOS.slice(1).reduce((acc, e) => {
    acc[e] = items.filter(i => i.ColEstado === e).length;
    return acc;
  }, {});

  return (
    <>
      {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}

      <div className="h-full bg-[#0f1117] p-4 sm:p-8 overflow-y-auto text-slate-200 font-sans custom-scrollbar">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
        
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3">
              <Mail className="text-indigo-400" size={36} /> Cola de Mailing Contable
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl">
              Auditoría, validación y disparo de notificaciones automáticas de Estado de Cuenta a deudores.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={generarManual} disabled={loadingBatch}
              className="flex items-center gap-2 px-5 py-2.5 text-sm border border-slate-700 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all shadow-lg text-slate-300 disabled:opacity-50 font-bold">
              <Zap size={16} className={loadingBatch ? 'animate-pulse text-yellow-400' : 'text-yellow-500'} />
              Ejecutar CRON
            </button>
            <button onClick={cargar} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refrescar Spool
            </button>
          </div>
        </div>

        {/* KPIs Visuales Re-estilizados */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'En Cola (Pendiente)', key: 'PENDIENTE', color: 'amber' },
            { label: 'Listos (Aprobados)',  key: 'APROBADO',  color: 'blue' },
            { label: 'Despachados OK',   key: 'ENVIADO',    color: 'emerald' },
            { label: 'Fallos Críticos',  key: 'ERROR',      color: 'rose' },
            { label: 'Archivados', key: 'RECHAZADO',  color: 'slate' },
          ].map(k => (
            <button key={k.key}
              onClick={() => { setFiltroEstado(filtroEstado === k.key ? '' : k.key); setPage(1); }}
              className={`flex flex-col justify-between text-left px-5 py-4 rounded-2xl border transition-all ${
                filtroEstado === k.key 
                ? `bg-slate-800 border-${k.color}-500 shadow-[0_0_15px_rgba(var(--tw-colors-${k.color}-500),0.2)]` 
                : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              }`}>
              <p className={`text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2`}>{k.label}</p>
              <div className="flex items-baseline gap-2">
                 <p className={`text-3xl font-black text-${k.color}-400 drop-shadow-md`}>{contadores[k.key] || 0}</p>
                 <span className="text-xs text-slate-600 font-bold">/ {total}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Bulk action bar */}
        <div className={`transition-all duration-300 ease-in-out ${seleccionados.size > 0 ? 'opacity-100 max-h-20 scale-100' : 'opacity-0 max-h-0 scale-95 overflow-hidden'}`}>
          <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-2xl px-6 py-4 flex items-center justify-between shadow-lg backdrop-blur-sm">
            <span className="text-sm text-indigo-200 font-bold flex items-center gap-3">
                <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg shadow-sm text-xs">{seleccionados.size}</span>
                registros marcados para acción masiva
            </span>
            <div className="flex items-center gap-4">
              <button onClick={() => setSeleccionados(new Set())}
                className="text-xs px-4 py-2 font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                Anular Selección
              </button>
              <button onClick={enviarSeleccionados} disabled={loadingBatch}
                className="flex items-center gap-2 text-sm px-6 py-2.5 bg-indigo-600 text-white rounded-xl border border-indigo-500 hover:bg-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all font-black shadow-xl disabled:opacity-50">
                {loadingBatch ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                Disparar Emails Masivamente
              </button>
            </div>
          </div>
        </div>

        {/* Tabla principal */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col mt-2">
          {/* Barra de Filtros Internos */}
          <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row items-center gap-4 bg-slate-900/80">
            <div className="flex items-center gap-3 text-slate-400 font-bold text-xs uppercase tracking-widest mr-2">
                 <Filter size={16} className="text-indigo-500" />
                 Filtrar Vista
            </div>
            <div className="flex gap-2 flex-wrap flex-1">
              {ESTADOS.map(e => (
                <button key={e || 'todos'}
                  onClick={() => { setFiltroEstado(e); setPage(1); }}
                  className={`text-xs px-4 py-1.5 rounded-full border transition-all font-bold ${
                    filtroEstado === e
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.4)]'
                      : 'text-slate-400 bg-slate-800/80 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                  }`}>
                  {e || 'Mostrar Todos'}
                </button>
              ))}
            </div>
            <span className="text-xs font-mono font-bold tracking-wider text-slate-500 bg-slate-800 px-4 py-1.5 rounded-lg border border-slate-700 shadow-inner">
               {total} LÍNEAS
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-32 bg-slate-900 flex-1">
              <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full shadow-lg" />
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar flex-1 bg-slate-900/50">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-800/80 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                    <th className="px-6 py-4 w-12 border-b border-slate-700">
                      <input type="checkbox"
                        checked={items.length > 0 && seleccionados.size === items.length}
                        onChange={toggleTodos}
                        className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900 w-4 h-4 cursor-pointer" />
                    </th>
                    <th className="px-5 py-4 border-b border-slate-700">Identidad del Cliente</th>
                    <th className="px-5 py-4 border-b border-slate-700">Corte Generado</th>
                    <th className="px-5 py-4 border-b border-slate-700 text-center">Status</th>
                    <th className="px-5 py-4 border-b border-slate-700">Bitácora / Log</th>
                    <th className="px-5 py-4 border-b border-slate-700 text-center">Operaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {items.map(item => (
                    <FilaCola
                      key={item.ColIdCola}
                      item={item}
                      seleccionado={seleccionados.has(item.ColIdCola)}
                      onToggle={toggleSeleccion}
                      onCambiarEstado={cambiarEstado}
                      onEnviar={enviarUno}
                      onPreview={setPreviewItem}
                      loadingId={loadingId}
                    />
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-24 text-slate-500">
                        <Mail size={48} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-lg font-bold text-slate-400">La cola de spool está vacía</p>
                        <p className="text-sm mt-2 text-slate-500">El proceso CRON de consolidación despierta todos los domingos o manualmente usando el Rayo Amarillo.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 50 && (
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="text-xs px-5 py-2 font-bold bg-slate-800 border border-slate-700 text-slate-300 rounded-xl disabled:opacity-30 hover:bg-slate-700 hover:text-white transition-colors">
                ← Bloque Anterior
              </button>
              <div className="flex gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded shadow-inner">PÁGINA {page}</span>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-800 border border-slate-700 px-3 py-1 rounded shadow-inner">DE {Math.ceil(total / 50)}</span>
              </div>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)}
                className="text-xs px-5 py-2 font-bold bg-slate-800 border border-slate-700 text-slate-300 rounded-xl disabled:opacity-30 hover:bg-slate-700 hover:text-white transition-colors">
                Próximo Bloque →
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}

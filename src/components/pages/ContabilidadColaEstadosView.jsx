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
  PENDIENTE: { cls: 'bg-amber-100 text-amber-800 border-amber-200',  icon: <Clock size={11} />,       label: 'Pendiente' },
  APROBADO:  { cls: 'bg-blue-100 text-blue-800 border-blue-200',     icon: <CheckCircle2 size={11} />, label: 'Aprobado' },
  ENVIADO:   { cls: 'bg-green-100 text-green-800 border-green-200',  icon: <CheckCircle2 size={11} />, label: 'Enviado' },
  ERROR:     { cls: 'bg-red-100 text-red-800 border-red-200',        icon: <XCircle size={11} />,      label: 'Error' },
  RECHAZADO: { cls: 'bg-slate-100 text-slate-600 border-slate-200',  icon: <XCircle size={11} />,      label: 'Rechazado' },
};

const EstadoBadge = ({ estado }) => {
  const b = BADGE[estado] || BADGE.PENDIENTE;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${b.cls}`}>
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
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 text-white shrink-0">
        <div>
          <p className="text-sm font-semibold">{item.ColAsunto || 'Estado de Cuenta — Preview'}</p>
          <p className="text-xs text-slate-400">{item.ColEmailDestino}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={imprimir}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
            <Printer size={13} /> Imprimir
          </button>
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-red-700 rounded-lg transition-colors">
            <X size={13} /> Cerrar
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto bg-slate-200 flex justify-center py-6 px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-500 mt-20">
            <div className="animate-spin h-10 w-10 border-2 border-blue-500 border-t-transparent rounded-full" />
            <p className="text-sm">Generando previsualización...</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
            <iframe
              srcDoc={html}
              title="Vista previa Estado de Cuenta"
              className="w-full border-0"
              style={{ minHeight: '750px' }}
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
      <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${seleccionado ? 'bg-blue-50' : ''}`}>
        <td className="px-4 py-3">
          <input type="checkbox" checked={seleccionado} onChange={() => onToggle(item.ColIdCola)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-semibold text-slate-700">{item.NombreCliente}</p>
          <p className="text-xs text-slate-400">{item.ColEmailDestino}</p>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500">{fmtFecha(item.ColFechaGeneracion)}</td>
        <td className="px-4 py-3"><EstadoBadge estado={item.ColEstado} /></td>
        <td className="px-4 py-3 text-xs text-slate-400">
          {item.ColEstado === 'ENVIADO' && fmtFecha(item.ColFechaEnvio)}
          {item.ColEstado === 'ERROR' && (
            <span className="text-red-500 flex items-center gap-1">
              <AlertTriangle size={11} /> {item.ColErrorEnvio?.substring(0, 40) || 'Error desconocido'}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {['PENDIENTE','RECHAZADO','ERROR'].includes(item.ColEstado) && (
              <button onClick={() => onCambiarEstado(item.ColIdCola, 'APROBADO')} title="Aprobar"
                className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200">
                <CheckCircle2 size={13} />
              </button>
            )}
            {['PENDIENTE','APROBADO'].includes(item.ColEstado) && (
              <button onClick={() => onCambiarEstado(item.ColIdCola, 'RECHAZADO')} title="Rechazar"
                className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200">
                <XCircle size={13} />
              </button>
            )}
            {['APROBADO','ERROR','PENDIENTE'].includes(item.ColEstado) && (
              <button onClick={() => onEnviar(item.ColIdCola)} disabled={loading} title="Enviar ahora"
                className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-200 disabled:opacity-50">
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            )}
            {/* Vista previa del documento */}
            <button onClick={() => onPreview(item)} title="Ver documento"
              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200">
              <Eye size={13} />
            </button>
            {/* Expandir detalle técnico */}
            <button onClick={() => setExpandido(e => !e)} title="Detalle"
              className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors border border-slate-200">
              <ChevronDown size={13} className={`transition-transform ${expandido ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </td>
      </tr>
      {expandido && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={6} className="px-6 py-3">
            <div className="text-xs text-slate-600 space-y-1">
              <p><span className="font-semibold">Asunto:</span> {item.ColAsunto}</p>
              <p><span className="font-semibold">Período:</span> {fmtFecha(item.ColFechaDesde)} → {fmtFecha(item.ColFechaHasta)}</p>
              <p><span className="font-semibold">Disparo:</span> {item.ColTipoDisparo}</p>
              {item.ColErrorEnvio && <p className="text-red-500"><span className="font-semibold">Error:</span> {item.ColErrorEnvio}</p>}
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
      toast.success(`Estado cambiado a ${estado}`);
      cargar();
    } catch (e) { toast.error(e.message); }
  };

  const enviarUno = async (id) => {
    setLoadingId(id);
    try {
      const result = await req(`/api/contabilidad/cola/${id}/enviar`, { method: 'POST' });
      toast.success(result.success ? '✉️ Email enviado correctamente' : `Error: ${result.data?.error}`);
      cargar();
    } catch (e) { toast.error(e.message); }
    finally { setLoadingId(null); }
  };

  const enviarSeleccionados = async () => {
    if (!seleccionados.size) return toast.warning('Seleccioná al menos un registro.');
    for (const id of seleccionados) {
      await req(`/api/contabilidad/cola/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: 'APROBADO' }) });
    }
    setLoadingBatch(true);
    try {
      const result = await req('/api/contabilidad/cola/enviar-aprobados', { method: 'POST', body: JSON.stringify({ ids: [...seleccionados] }) });
      toast.success(`✅ Enviados: ${result.data?.enviados ?? 0} | Errores: ${result.data?.errores ?? 0}`);
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
      {/* Modal de preview */}
      {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}

      <div className="max-w-6xl mx-auto space-y-5">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cola de Estados de Cuenta</h1>
            <p className="text-sm text-slate-400 mt-0.5">Revisión y envío de estados de cuenta a clientes</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={generarManual} disabled={loadingBatch}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 disabled:opacity-50">
              <Zap size={14} className={loadingBatch ? 'animate-pulse text-yellow-500' : ''} />
              Generar ahora
            </button>
            <button onClick={cargar} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Pendientes', key: 'PENDIENTE', color: 'amber' },
            { label: 'Aprobados',  key: 'APROBADO',  color: 'blue' },
            { label: 'Enviados',   key: 'ENVIADO',    color: 'green' },
            { label: 'Con Error',  key: 'ERROR',      color: 'red' },
            { label: 'Rechazados', key: 'RECHAZADO',  color: 'slate' },
          ].map(k => (
            <button key={k.key}
              onClick={() => { setFiltroEstado(filtroEstado === k.key ? '' : k.key); setPage(1); }}
              className={`text-left px-4 py-3 rounded-xl border transition-all ${
                filtroEstado === k.key ? 'shadow-sm bg-white border-slate-300' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}>
              <p className={`text-2xl font-bold text-${k.color}-600`}>{contadores[k.key] || 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
            </button>
          ))}
        </div>

        {/* Bulk action bar */}
        {seleccionados.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">{seleccionados.size} seleccionado(s)</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSeleccionados(new Set())}
                className="text-xs px-3 py-1.5 text-slate-600 hover:text-slate-800 transition-colors">
                Deseleccionar
              </button>
              <button onClick={enviarSeleccionados} disabled={loadingBatch}
                className="flex items-center gap-1.5 text-xs px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50">
                {loadingBatch ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                Aprobar y enviar seleccionados
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filtros */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <Filter size={14} className="text-slate-400" />
            <div className="flex gap-1.5">
              {ESTADOS.map(e => (
                <button key={e || 'todos'}
                  onClick={() => { setFiltroEstado(e); setPage(1); }}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    filtroEstado === e
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                  {e || 'Todos'}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-slate-400">{total} registros</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="text-xs text-slate-500 text-left">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox"
                        checked={items.length > 0 && seleccionados.size === items.length}
                        onChange={toggleTodos}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Generado</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Detalle</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
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
                      <td colSpan={6} className="text-center py-16 text-slate-400">
                        <Mail size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">La cola está vacía.</p>
                        <p className="text-xs mt-1">El CRON genera estados automáticamente a las 20:00 hs.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {total > 50 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                ← Anterior
              </button>
              <span className="text-xs text-slate-500">Página {page} de {Math.ceil(total / 50)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

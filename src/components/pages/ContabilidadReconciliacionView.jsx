/**
 * ContabilidadReconciliacionView.jsx
 * Auditoría y reparación de órdenes en depósito sin contabilizar.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2,
  Wrench, Clock, PackageSearch, Zap, Activity,
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

const fmtMonto = (m) =>
  m != null ? `$${parseFloat(m).toLocaleString('es-UY', { minimumFractionDigits: 2 })}` : '—';

// ── Fila de inconsistencia ─────────────────────────────────────────────────────
const FilaInconsistencia = ({ item }) => (
  <tr className="border-b border-slate-800/80 hover:bg-amber-900/5 transition-colors">
    <td className="px-5 py-4">
      <span className="font-mono font-bold text-amber-300 text-sm tracking-wide">
        {item.CodigoOrden}
      </span>
    </td>
    <td className="px-5 py-4">
      <span className="text-slate-400 text-xs font-mono">#{item.PCId}</span>
    </td>
    <td className="px-5 py-4">
      <span className="text-slate-200 text-sm font-semibold">{fmtMonto(item.MontoTotal)}</span>
    </td>
    <td className="px-5 py-4">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider ${
        item.MontoContabilizado != null
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      }`}>
        {item.MontoContabilizado != null
          ? <><CheckCircle2 size={11} /> Contabilizado</>
          : <><AlertTriangle size={11} /> Pendiente</>}
      </span>
    </td>
    <td className="px-5 py-4">
      <span className="text-slate-400 text-xs">{fmtFecha(item.FechaDeposito)}</span>
    </td>
  </tr>
);

// ── Vista Principal ────────────────────────────────────────────────────────────
export default function ContabilidadReconciliacionView() {
  const [datos, setDatos]             = useState({ inconsistencias: 0, detalle: [] });
  const [loading, setLoading]         = useState(false);
  const [ejecutando, setEjecutando]   = useState(false);
  const [ultimaRevision, setUltimaRevision] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await req('/api/contabilidad/reconciliacion/audit');
      setDatos(data);
      setUltimaRevision(new Date());
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const ejecutarReconciliacion = async () => {
    setEjecutando(true);
    try {
      await req('/api/contabilidad/reconciliacion/ejecutar', { method: 'POST' });
      toast.success('✅ Reconciliación iniciada. Revisá los logs o refrescá en unos segundos.');
      // Refrescar después de 4 segundos para dar tiempo al job
      setTimeout(() => { cargar(); setEjecutando(false); }, 4000);
    } catch (e) {
      toast.error(e.message);
      setEjecutando(false);
    }
  };

  const hayInconsistencias = datos.inconsistencias > 0;

  return (
    <div className="h-full bg-[#0f1117] p-4 sm:p-8 overflow-y-auto text-slate-200 font-sans custom-scrollbar">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-6">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3">
              <ShieldCheck className="text-emerald-400" size={36} />
              Reconciliación Contable WMS
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl">
              Detecta órdenes que ingresaron al depósito sin que el motor contable haya ejecutado correctamente.
              El sistema ejecuta esto automáticamente a las <strong className="text-slate-300">09:00</strong> y <strong className="text-slate-300">21:00</strong> cada día.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={cargar}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm border border-slate-700 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all shadow-lg text-slate-300 disabled:opacity-50 font-bold"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Auditar ahora
            </button>
            <button
              onClick={ejecutarReconciliacion}
              disabled={ejecutando || loading}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm rounded-xl font-black transition-all shadow-xl disabled:opacity-50 ${
                hayInconsistencias
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
            >
              {ejecutando
                ? <><Activity size={15} className="animate-pulse" /> Ejecutando...</>
                : <><Wrench size={15} /> Ejecutar reparación</>}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Estado general */}
          <div className={`rounded-2xl border p-6 flex items-center gap-5 transition-all ${
            hayInconsistencias
              ? 'bg-amber-900/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
              : 'bg-emerald-900/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
          }`}>
            <div className={`p-3 rounded-xl ${hayInconsistencias ? 'bg-amber-500/15' : 'bg-emerald-500/15'}`}>
              {hayInconsistencias
                ? <AlertTriangle size={28} className="text-amber-400" />
                : <CheckCircle2 size={28} className="text-emerald-400" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estado del sistema</p>
              <p className={`text-2xl font-black mt-0.5 ${hayInconsistencias ? 'text-amber-300' : 'text-emerald-300'}`}>
                {hayInconsistencias ? 'Requiere atención' : 'Todo en orden'}
              </p>
            </div>
          </div>

          {/* Inconsistencias detectadas */}
          <div className="rounded-2xl border bg-slate-900 border-slate-800 p-6 flex items-center gap-5">
            <div className="p-3 rounded-xl bg-rose-500/10">
              <PackageSearch size={28} className="text-rose-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sin contabilizar</p>
              <p className="text-4xl font-black mt-0.5 text-rose-300">{datos.inconsistencias}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {datos.inconsistencias === 0 ? 'órdenes en depósito' : datos.inconsistencias === 1 ? 'orden en depósito' : 'órdenes en depósito'}
              </p>
            </div>
          </div>

          {/* Última revisión */}
          <div className="rounded-2xl border bg-slate-900 border-slate-800 p-6 flex items-center gap-5">
            <div className="p-3 rounded-xl bg-indigo-500/10">
              <Clock size={28} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Última revisión manual</p>
              <p className="text-sm font-bold text-slate-300 mt-1">
                {ultimaRevision ? fmtFecha(ultimaRevision.toISOString()) : '—'}
              </p>
              <p className="text-xs text-slate-600 mt-1">Auto: 09:00 y 21:00 hs</p>
            </div>
          </div>
        </div>

        {/* Banner de todo OK */}
        {!loading && !hayInconsistencias && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-900/5">
            <CheckCircle2 size={52} className="text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            <p className="text-xl font-black text-emerald-300">Sistema contable íntegro</p>
            <p className="text-sm text-slate-400">
              Todas las órdenes en depósito tienen su contabilidad registrada correctamente.
            </p>
          </div>
        )}

        {/* Tabla de inconsistencias */}
        {(loading || hayInconsistencias) && (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">

            {/* Header tabla */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-amber-900/10">
              <div className="flex items-center gap-3">
                <Zap size={16} className="text-amber-400" />
                <span className="text-sm font-black text-amber-300 uppercase tracking-widest">
                  Órdenes pendientes de contabilización
                </span>
                {!loading && (
                  <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-black px-3 py-0.5 rounded-full">
                    {datos.inconsistencias} registro{datos.inconsistencias !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-24">
                <div className="animate-spin h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full shadow-lg" />
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-800/80 sticky top-0 z-10 backdrop-blur-md">
                    <tr className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                      <th className="px-5 py-4 border-b border-slate-700">Código Orden</th>
                      <th className="px-5 py-4 border-b border-slate-700">PC#</th>
                      <th className="px-5 py-4 border-b border-slate-700">Monto Total</th>
                      <th className="px-5 py-4 border-b border-slate-700">Estado Contable</th>
                      <th className="px-5 py-4 border-b border-slate-700">Ingreso a Depósito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.detalle.map((item) => (
                      <FilaInconsistencia key={item.PCId} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer con acción */}
            {!loading && hayInconsistencias && (
              <div className="px-6 py-5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Al ejecutar la reparación, el sistema procesará cada orden listada{' '}
                  <span className="text-amber-400 font-bold">aplicando la lógica de prepago si corresponde</span>.
                </p>
                <button
                  onClick={ejecutarReconciliacion}
                  disabled={ejecutando}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-black text-sm transition-all shadow-xl shadow-amber-500/20 disabled:opacity-60"
                >
                  {ejecutando
                    ? <><Activity size={15} className="animate-pulse" /> Procesando...</>
                    : <><Wrench size={15} /> Reparar {datos.inconsistencias} orden{datos.inconsistencias !== 1 ? 'es' : ''}</>}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

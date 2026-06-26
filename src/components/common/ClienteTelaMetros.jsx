import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/apiClient';
import { Loader2, Package, TrendingDown, AlertTriangle } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─────────────────────────────────────────────────────────────────────
// ClienteTelaMetros
// Widget análogo a ClienteBilletera pero para metros de tela física.
// Muestra el saldo disponible por tipo de tela con barra de progreso.
//
// Props:
//   clienteId    — ID/nombre del cliente (string, como viene del form)
//   clienteNombre — (opcional) nombre para display
//   compact      — (bool) modo compacto para embeber en formularios
// ─────────────────────────────────────────────────────────────────────
const ClienteTelaMetros = ({ clienteId, clienteNombre, compact = false }) => {
  const [loading, setLoading] = useState(false);
  const [saldos, setSaldos]   = useState([]);
  const [error, setError]     = useState(null);

  const loadSaldo = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/tela-cliente/${encodeURIComponent(clienteId)}/saldo`);
      if (res.data.success) setSaldos(res.data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => { loadSaldo(); }, [loadSaldo]);

  if (!clienteId) return null;

  // Colores según porcentaje consumido (igual que ClienteBilletera → planes)
  const getColor = (pct) => {
    if (pct >= 80) return { pill: 'bg-rose-50 border-rose-200 text-rose-700',   bar: 'bg-rose-500',   icon: 'text-rose-400' };
    if (pct >= 50) return { pill: 'bg-amber-50 border-amber-200 text-amber-700', bar: 'bg-amber-500',  icon: 'text-amber-400' };
    return                { pill: 'bg-indigo-50 border-indigo-200 text-indigo-700', bar: 'bg-indigo-500', icon: 'text-indigo-400' };
  };

  if (compact) {
    // ── Modo compacto: badges oscuros estilo dashboard ──
    return (
      <div className="space-y-1 animate-in fade-in duration-300">
        {loading && (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="animate-spin text-indigo-400" size={13} />
            <span className="text-[10px] text-slate-400 font-semibold">Cargando stock...</span>
          </div>
        )}

        {!loading && saldos.length === 0 && (
          <div className="flex items-center gap-2 py-2 px-3 bg-slate-100 rounded-xl border border-slate-200">
            <Package size={13} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 italic">Sin tela registrada para este cliente</span>
          </div>
        )}

        {saldos.map(s => {
          const libre     = parseFloat(s.MetrosLibres    || 0);
          const enProceso = parseFloat(s.MetrosEnProceso || 0);
          const total     = parseFloat(s.MetrosDisponibles || 0);
          const pct       = parseFloat(s.PorcentajeConsumido || 0);

          // Colores de barra según consumo
          const barColor = pct >= 80 ? 'bg-rose-400' : pct >= 50 ? 'bg-amber-400' : 'bg-cyan-400';

          return (
            <div key={s.InsumoID}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 shadow-md">

              {/* Ícono */}
              <div className="shrink-0 text-cyan-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.09 12.97 12 12 11 22l8.91-10.97L12 12l1-10z"/></svg>
              </div>

              {/* Nombre */}
              <span className="text-slate-300 font-black text-[11px] uppercase tracking-tight truncate flex-1">
                {s.TipoTela}
              </span>

              {/* Metros */}
              <div className="flex flex-col items-end shrink-0">
                <span className="text-white font-black font-mono text-sm leading-tight tracking-tighter">
                  {fmt(libre)}
                  <span className="text-cyan-400 text-[9px] ml-1 font-black uppercase">mts</span>
                </span>
                {enProceso > 0 && (
                  <span className="text-amber-400 text-[9px] font-bold">{fmt(enProceso)} en proceso</span>
                )}
              </div>

              {/* Barra de consumo */}
              <div className="w-14 shrink-0">
                <div className="w-full h-1 bg-slate-600 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} transition-all duration-700`}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <span className="text-[8px] text-slate-500 font-bold">{pct}% usado</span>
              </div>
            </div>
          );
        })}

        {error && (
          <span className="text-[9px] text-rose-400 font-bold flex items-center gap-1">
            <AlertTriangle size={10} /> Error cargando metros
          </span>
        )}
      </div>
    );
  }

  // ── Modo completo: cards con más detalle ────────────────────────────
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-indigo-100">
            <Package size={14} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-700 uppercase tracking-tight">
              Tela en Stock
            </p>
            {clienteNombre && (
              <p className="text-[9px] text-slate-400 font-semibold">{clienteNombre}</p>
            )}
          </div>
        </div>
        {loading && <Loader2 className="animate-spin text-indigo-400" size={14} />}
      </div>

      {/* Cards por tipo de tela */}
      {saldos.length === 0 && !loading ? (
        <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest italic text-center py-3">
          — Sin tela registrada para este cliente —
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {saldos.map(s => {
            const pct    = parseFloat(s.PorcentajeConsumido || 0);
            const libre  = parseFloat(s.MetrosLibres || 0);
            const enProc = parseFloat(s.MetrosEnProceso || 0);
            const total  = parseFloat(s.MetrosIngresados || 0);
            const consumido = parseFloat(s.MetrosConsumidos || 0);
            const c      = getColor(pct);

            return (
              <div key={s.InsumoID}
                className={`p-3 rounded-2xl border shadow-sm ${c.pill}`}>

                {/* Fila principal */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package size={13} className={`${c.icon} shrink-0`} />
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">
                      {s.TipoTela}
                    </span>
                    <span className="text-[9px] bg-white/60 px-1.5 py-0.5 rounded-full font-bold text-slate-500">
                      {s.CantidadBultos} bulto{s.CantidadBultos !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-sm font-black font-mono">
                    {fmt(libre)}
                    <span className="text-[9px] ml-1 opacity-60 font-bold uppercase">m libres</span>
                  </span>
                </div>

                {/* Barra progreso */}
                <div className="w-full h-1.5 bg-white/50 rounded-full overflow-hidden shadow-inner mb-2">
                  <div className={`h-full ${c.bar} transition-all duration-700`}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>

                {/* Métricas secundarias */}
                <div className="flex items-center justify-between text-[9px] font-bold opacity-70">
                  <span>Total: {fmt(total)} m</span>
                  {enProc > 0 && (
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {fmt(enProc)} m en proceso
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <TrendingDown size={9} />
                    <span>{fmt(consumido)} m consumidos ({pct}%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClienteTelaMetros;

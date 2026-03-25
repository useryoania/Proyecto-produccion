/**
 * ContabilidadCuentasView.jsx
 * Cuentas de clientes — lista activos, búsqueda, ciclos de crédito y registro de pagos.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Search, RefreshCw, TrendingDown, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, CreditCard, BarChart3, FileText,
  Calendar, PlayCircle, StopCircle, X,
  ArrowUpCircle, ArrowDownCircle, Info, Users, Zap,
  DollarSign, PlusCircle, Package, RotateCcw, Layers,
} from 'lucide-react';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || '';
const tok = () => { try { return JSON.parse(localStorage.getItem('user'))?.token || ''; } catch { return ''; } };

const fetchAPI = async (url, opts = {}) => {
  const res = await fetch(`${API}${url}`, {
    headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json()).error || `Error ${res.status}`);
  return res.json();
};

const fmt      = (n, sym) => `${sym || '$U'} ${new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2 }).format(Number(n ?? 0))}`;
const fmtNum   = (n) => new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2 }).format(Number(n ?? 0));
const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-UY') : '—';
const diasRestantes = (fc) => fc ? Math.ceil((new Date(fc) - new Date()) / 86400000) : null;

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ children, color = 'slate' }) => {
  const c = {
    slate:  'bg-slate-100 text-slate-600 border-slate-200',
    amber:  'bg-amber-100 text-amber-700 border-amber-200',
    red:    'bg-red-100 text-red-700 border-red-200',
    green:  'bg-green-100 text-green-700 border-green-200',
    blue:   'bg-blue-100 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  }[color] || 'bg-slate-100 text-slate-600 border-slate-200';
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${c}`}>{children}</span>;
};

// ── Fila de cliente activo ────────────────────────────────────────────────────
const FilaCliente = ({ c, seleccionado, onClick }) => {
  const saldo    = Number(c.SaldoTotal);
  const deuda    = Number(c.DeudaTotal);
  const negativo = saldo < 0;

  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100
        ${seleccionado ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
          ${negativo ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {c.Nombre?.[0]?.toUpperCase()}
        </div>
        <span className="text-sm font-semibold text-slate-800 truncate flex-1">{c.Nombre}</span>
        <span className="text-[10px] font-mono text-slate-400 shrink-0">#{c.CodCliente || c.CliIdCliente}</span>
      </div>
      <div className="flex items-center gap-1 pl-9">
        {c.EsSemanal      == 1 && <Badge color="indigo"><Calendar size={9} /> Sem.</Badge>}
        {c.TieneCicloAbierto == 1 && <Badge color="green"><span className="animate-pulse">●</span> Ciclo</Badge>}
        {c.DocsVencidos    > 0 && <Badge color="red"><AlertTriangle size={9} /> {c.DocsVencidos}</Badge>}
        <span className="ml-auto text-xs font-bold shrink-0" style={{ color: negativo ? '#dc2626' : '#059669' }}>
          {fmt(saldo)}
        </span>
      </div>
      {deuda > 0 && <p className="text-[10px] text-amber-600 pl-9 mt-0.5">Deuda: {fmt(deuda)}</p>}
    </button>
  );
};

// ── Modal pago / ajuste ───────────────────────────────────────────────────────
// Las formas de pago se cargan desde MetodosPagos (tabla ya existente)

const ModalPago = ({ cuenta, onClose, onSuccess }) => {
  // Moneda de la cuenta (la de la deuda)
  const monedaCuenta   = cuenta.MonIdMoneda === 2 ? 'USD' : 'UYU';
  const simboloCuenta  = cuenta.MonSimbolo || (monedaCuenta === 'USD' ? 'U$S' : '$U');

  const [form, setForm] = useState({
    MovTipo:      'ANTICIPO',
    MovImporte:   '',
    MovConcepto:  '',
    Referencia:   '',
    MetodoPagoId:   '',
    MonedaPagoId:   String(cuenta.MonIdMoneda || ''),  // ID de la moneda con que paga
    TipoCambio:     '',
  });
  const [saving, setSaving]             = useState(false);
  const [cotizacion, setCotizacion]     = useState(null);
  const [metodosPago, setMetodosPago]   = useState([]);
  const [monedas, setMonedas]           = useState([]);
  const [loadingMeta, setLoadingMeta]   = useState(false);

  const tipo      = form.MovTipo;
  const esAjuste  = tipo === 'AJUSTE_POS' || tipo === 'AJUSTE_NEG';

  // Moneda seleccionada para el pago
  const monedaPagoObj  = monedas.find(m => String(m.MonIdMoneda) === String(form.MonedaPagoId));
  const monedaCuentaId = String(cuenta.MonIdMoneda || '');
  const esCruzado      = !esAjuste && form.MonedaPagoId && form.MonedaPagoId !== monedaCuentaId;
  const simboloPago    = monedaPagoObj?.MonSimbolo || simboloCuenta;

  const tiposInfo = {
    ANTICIPO:      { label: 'Pago Anticipado',  color: 'green',  desc: 'El cliente paga antes de que se genere la deuda. Se imputa contra deudas pendientes y el excedente queda como crédito a favor.' },
    SALDO_INICIAL: { label: 'Saldo Inicial',    color: 'blue',   desc: 'Carga del saldo inicial al abrir la cuenta. Equivale a un ajuste de apertura.' },
    PAGO:          { label: 'Pago de Deuda',    color: 'amber',  desc: 'Pago normal del cliente. Se imputa automáticamente de la deuda más antigua a la más nueva.' },
    AJUSTE_POS:    { label: 'Ajuste Positivo',  color: 'indigo', desc: 'Corrección manual que aumenta el saldo (devolución, descuento, error de carga).' },
    AJUSTE_NEG:    { label: 'Ajuste Negativo',  color: 'red',    desc: 'Corrección manual que reduce el saldo (cargo extra, recargo, diferencia de precio).' },
  };

  const info       = tiposInfo[tipo];
  const colorHeader = { green: 'from-green-500 to-emerald-500', blue: 'from-blue-500 to-cyan-500', amber: 'from-amber-500 to-orange-500', indigo: 'from-indigo-500 to-violet-500', red: 'from-red-500 to-rose-500' }[info.color];
  const colorBtn   = { green: 'bg-green-600 hover:bg-green-700', blue: 'bg-blue-600 hover:bg-blue-700', amber: 'bg-amber-500 hover:bg-amber-600', indigo: 'bg-indigo-600 hover:bg-indigo-700', red: 'bg-red-600 hover:bg-red-700' }[info.color];

  // Cargar métodos de pago y monedas desde la BD al montar
  useEffect(() => {
    setLoadingMeta(true);
    Promise.all([
      fetchAPI('/api/apipagos/metodos')
        .then(d => Array.isArray(d) ? d : (d.data || []))
        .catch(() => []),
      fetchAPI('/api/contabilidad/monedas')
        .then(d => d.data || [])
        .catch(() => []),
    ]).then(([metodos, mons]) => {
      setMetodosPago(metodos);
      setMonedas(mons);
      if (metodos.length > 0) setForm(f => ({ ...f, MetodoPagoId: String(metodos[0].MPaIdMetodoPago) }));
      // Si la cuenta tiene MonIdMoneda ya está en el form; si no hay match dejamos el default
    }).finally(() => setLoadingMeta(false));
  }, []);

  // Cuando hay conversión cruzada → cargar cotización automáticamente
  useEffect(() => {
    if (esCruzado && !cotizacion) {
      fetchAPI('/api/contabilidad/cotizacion-hoy')
        .then(r => { setCotizacion(r.data); setForm(f => ({ ...f, TipoCambio: String(r.data.promedio) })); })
        .catch(() => {});
    }
    if (!esCruzado) {
      setForm(f => ({ ...f, TipoCambio: '' }));
      setCotizacion(null);
    }
  }, [esCruzado]);

  // Preview importe convertido
  const tc          = parseFloat(form.TipoCambio) || 0;
  const importeNum  = parseFloat(form.MovImporte) || 0;
  let importeConvertido = null;
  if (esCruzado && tc > 0 && importeNum > 0) {
    // Simplificado: si la moneda de pago es distinta a la cuenta, multiplicamos o dividimos
    // La lógica exacta depende de cuál es la moneda base; el backend maneja la lógica real
    importeConvertido = importeNum * tc;  // aproximación visual
  }

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.MovImporte || Number(form.MovImporte) <= 0) { toast.error('El importe debe ser mayor a 0'); return; }
    if (esCruzado && !form.TipoCambio) { toast.error('Ingresá el tipo de cambio'); return; }
    setSaving(true);
    try {
      let endpoint, body;
      const metodoDes = metodosPago.find(m => String(m.MPaIdMetodoPago) === String(form.MetodoPagoId))?.MPaDescripcionMetodo || '';
      const monedaDesc = monedaPagoObj?.MonNombre || monedaPagoObj?.MonSimbolo || '';
      const concepto   = form.MovConcepto || `${info.label}${metodoDes ? ' — ' + metodoDes : ''}`;
      const referencia = form.Referencia || null;

      if (esAjuste) {
        endpoint = '/api/contabilidad/movimientos/ajuste';
        body = { CueIdCuenta: cuenta.CueIdCuenta, MovTipo: tipo, MovConcepto: concepto, MovImporte: Number(form.MovImporte) };
      } else if (esCruzado) {
        endpoint = '/api/contabilidad/movimientos/pago-cruzado';
        body = {
          CueIdCuenta:     cuenta.CueIdCuenta,
          ImporteOriginal: Number(form.MovImporte),
          MonedaPago:      monedaPagoObj?.MonNombre?.includes('Dólar') || monedaPagoObj?.MonSimbolo?.includes('$') && monedaPagoObj?.MonIdMoneda !== 1 ? 'USD' : 'UYU',
          TipoCambio:      Number(form.TipoCambio),
          MovConcepto:     concepto,
          Referencia:      referencia,
        };
      } else {
        endpoint = '/api/contabilidad/movimientos/pago-anticipado';
        body = {
          CueIdCuenta:  cuenta.CueIdCuenta,
          MovTipo:      tipo,
          MovConcepto:  concepto,
          MovImporte:   Number(form.MovImporte),
          Referencia:   referencia,
        };
      }

      body.MovObservaciones = `Método: [${form.MetodoPagoId}] ${metodoDes}. Moneda pago: ${monedaDesc}. Moneda cuenta: ${simboloCuenta}.`;

      const res = await fetchAPI(endpoint, { method: 'POST', body: JSON.stringify(body) });
      toast.success(res.message || '✅ Registrado correctamente');
      onSuccess?.();
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className={`px-6 py-4 flex items-center justify-between bg-gradient-to-r ${colorHeader} text-white sticky top-0`}>
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Cuenta #{cuenta.CueIdCuenta} · {cuenta.UnidadLabel || cuenta.CueTipo} · {simboloCuenta}</p>
            <h2 className="text-lg font-bold mt-0.5">Registrar Movimiento</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={16} /></button>
        </div>

        <form onSubmit={guardar} className="px-6 py-5 space-y-4">

          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Tipo de movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(tiposInfo).map(([key, val]) => (
                <button type="button" key={key}
                  onClick={() => setForm(f => ({ ...f, MovTipo: key, MovConcepto: '' }))}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left
                    ${form.MovTipo === key ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                  {val.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{info.desc}</p>
          </div>

          {/* Moneda y Forma de pago en la misma fila */}
          {!esAjuste && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Moneda del pago</label>
                {loadingMeta ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-slate-400"><RefreshCw size={11} className="animate-spin" /> Cargando...</div>
                ) : (
                  <select value={form.MonedaPagoId}
                    onChange={e => setForm(f => ({ ...f, MonedaPagoId: e.target.value, TipoCambio: '' }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white">
                    {monedas.map(m => (
                      <option key={m.MonIdMoneda} value={m.MonIdMoneda}>
                        {m.MonSimbolo} — {m.MonNombre}
                      </option>
                    ))}
                    {monedas.length === 0 && <option value="">Sin monedas disponibles</option>}
                  </select>
                )}
                {/* Aviso conversión cruzada */}
                {esCruzado && (
                  <p className="text-[10px] text-amber-600 font-semibold mt-1 bg-amber-50 px-2 py-1 rounded">
                    ⚡ Pago en {monedaPagoObj?.MonSimbolo} → imputa en {simboloCuenta}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Forma de pago</label>
                {loadingMeta ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-slate-400"><RefreshCw size={11} className="animate-spin" /> Cargando...</div>
                ) : (
                  <select value={form.MetodoPagoId}
                    onChange={e => setForm(f => ({ ...f, MetodoPagoId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white">
                    {metodosPago.map(mp => (
                      <option key={mp.MPaIdMetodoPago} value={mp.MPaIdMetodoPago}>
                        {mp.MPaDescripcionMetodo}
                      </option>
                    ))}
                    {metodosPago.length === 0 && <option value="">Sin métodos disponibles</option>}
                  </select>
                )}
              </div>
            </div>
          )}


          {/* Tipo de cambio (solo si es cruzado) */}
          {esCruzado && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-amber-800">Tipo de cambio</p>
                {cotizacion && (
                  <div className="flex gap-3 text-[10px] text-amber-600">
                    <span>Compra: {cotizacion.compra}</span>
                    <span>Venta: {cotizacion.venta}</span>
                    <span className="font-bold">Prom: {cotizacion.promedio}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">1 {form.Moneda} =</span>
                <input type="number" min="0.01" step="0.0001" required
                  value={form.TipoCambio}
                  onChange={e => setForm(f => ({ ...f, TipoCambio: e.target.value }))}
                  placeholder="Ej: 43.50"
                  className="flex-1 px-3 py-2 border border-amber-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 font-mono" />
                <span className="text-xs text-slate-500">{monedaCuenta}</span>
              </div>
              {/* Preview conversión */}
              {importeConvertido !== null && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-slate-500">{importeNum} {form.Moneda}</span>
                  <span className="text-amber-500">→</span>
                  <span className="font-bold text-slate-700">{fmtNum(importeConvertido)} {monedaCuenta}</span>
                  <span className="text-[10px] text-slate-400">(se imputa en la cuenta)</span>
                </div>
              )}
            </div>
          )}

          {/* Importe */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Importe ({simboloPago})
            </label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="number" min="0.01" step="0.01" required
                value={form.MovImporte}
                onChange={e => setForm(f => ({ ...f, MovImporte: e.target.value }))}
                placeholder="0,00"
                className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 font-mono" />
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Concepto (opcional)</label>
            <input type="text"
              value={form.MovConcepto}
              onChange={e => setForm(f => ({ ...f, MovConcepto: e.target.value }))}
              placeholder={info.label}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
          </div>

          {/* Referencia */}
          {!esAjuste && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">N° Recibo / Referencia (opcional)</label>
              <input type="text"
                value={form.Referencia}
                onChange={e => setForm(f => ({ ...f, Referencia: e.target.value }))}
                placeholder="Ej: REC-001, N° cheque, transferencia..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className={`flex-1 py-2.5 rounded-lg text-sm text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${colorBtn}`}>
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <PlusCircle size={14} />}
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Panel movimientos ─────────────────────────────────────────────────────────
const MovimientosPanel = ({ CueIdCuenta, onClose }) => {
  const [movs, setMovs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [desde, setDesde]     = useState('');
  const [hasta, setHasta]     = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ top: 100 });
      if (desde) p.append('desde', desde);
      if (hasta) p.append('hasta', hasta);
      const data = await fetchAPI(`/api/contabilidad/cuentas/${CueIdCuenta}/movimientos?${p}`);
      setMovs(data.data || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [CueIdCuenta, desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const esCredito = (t) => ['PAGO','ANTICIPO','NOTA_CREDITO','AJUSTE_POS','DEVOLUCION','SALDO_INICIAL'].includes(t);

  return (
    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
        <div className="flex items-center gap-2"><BarChart3 size={14} /><span className="text-sm font-semibold">Libro Mayor</span></div>
        <div className="flex items-center gap-2">
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white" />
          <span className="text-white/50 text-xs">→</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white" />
          <button onClick={cargar} className="text-xs px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg">Filtrar</button>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg"><X size={14} /></button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-6 bg-white"><div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="overflow-x-auto max-h-64 bg-white">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-slate-400">
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Concepto</th>
                <th className="px-4 py-2 text-right">Importe</th>
                <th className="px-4 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {movs.map(m => (
                <tr key={m.MovIdMovimiento} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{fmtFecha(m.MovFecha)}</td>
                  <td className="px-4 py-2"><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{m.MovTipo}</span></td>
                  <td className="px-4 py-2 text-slate-600 max-w-[200px] truncate">{m.MovConcepto}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${esCredito(m.MovTipo) ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="flex items-center justify-end gap-0.5">
                      {esCredito(m.MovTipo) ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                      {fmtNum(Math.abs(Number(m.MovImporte)))}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700 font-medium">{fmtNum(Number(m.MovSaldoPosterior))}</td>
                </tr>
              ))}
              {movs.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-slate-400">Sin movimientos</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Panel deudas ──────────────────────────────────────────────────────────────
const DeudasPanel = ({ CueIdCuenta, simbolo, onClose }) => {
  const [deudas, setDeudas]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const data = await fetchAPI(`/api/contabilidad/cuentas/${CueIdCuenta}/deudas`);
        setDeudas(data.data || []);
      } catch (e) { toast.error(e.message); }
      finally { setLoading(false); }
    };
    cargar();
  }, [CueIdCuenta]);

  return (
    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-amber-500 text-white">
        <div className="flex items-center gap-2"><FileText size={14} /><span className="text-sm font-semibold">Documentos Pendientes</span></div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg"><X size={14} /></button>
      </div>
      {loading ? (
        <div className="flex justify-center py-6 bg-white"><div className="animate-spin h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto bg-white">
          {deudas.map(d => (
            <div key={d.DDeIdDocumento}
              className={`flex items-center justify-between px-4 py-3 hover:bg-amber-50/30 ${d.DiasVencido > 0 ? 'bg-red-50/30' : ''}`}>
              <div className="flex items-center gap-3">
                <Clock size={13} className={d.DiasVencido > 0 ? 'text-red-500' : 'text-slate-400'} />
                <div>
                  <p className="text-xs font-semibold text-slate-700">Orden #{d.OrdIdOrden}</p>
                  <p className="text-[11px] text-slate-400">Vence: {fmtFecha(d.DDeFechaVencimiento)}</p>
                </div>
                <Badge color={d.DiasVencido > 0 ? 'red' : d.DDeEstado === 'COBRADO' ? 'green' : 'amber'}>
                  {d.DiasVencido > 0 ? `${d.DiasVencido}d vencido` : d.DDeEstado}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400">Total: {fmt(d.DDeImporteOriginal, simbolo)}</p>
                <p className="text-sm font-bold text-slate-800">Pend: {fmt(d.DDeImportePendiente, simbolo)}</p>
              </div>
            </div>
          ))}
          {deudas.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-sm">
              <CheckCircle2 size={24} className="mx-auto mb-2 text-green-400" />Sin deudas
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Panel ciclos ──────────────────────────────────────────────────────────────
const CiclosPanel = ({ cuenta, CliIdCliente, onClose, onCicloChanged }) => {
  const [ciclos, setCiclos]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAPI(`/api/contabilidad/ciclos/${CliIdCliente}`);
      setCiclos(data.data || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [CliIdCliente]);

  useEffect(() => { cargar(); }, [cargar]);

  const cicloAbierto = ciclos.find(c => c.CicEstado === 'ABIERTO');
  const estadoColor  = e => ({ ABIERTO:'green', VENCIDO:'red', CERRADO:'slate', COBRADO:'indigo' }[e] || 'slate');

  const abrirCiclo = async () => {
    setWorking(true);
    try {
      await fetchAPI('/api/contabilidad/ciclos', { method: 'POST', body: JSON.stringify({ CueIdCuenta: cuenta.CueIdCuenta, CliIdCliente }) });
      toast.success('✅ Ciclo abierto');
      await cargar(); onCicloChanged?.();
    } catch (e) { toast.error(e.message); }
    finally { setWorking(false); }
  };

  const cerrarCiclo = async (id) => {
    if (!confirm('¿Cerrar este ciclo? Se generará la factura y se abrirá el siguiente.')) return;
    setWorking(true);
    try {
      const res = await fetchAPI(`/api/contabilidad/ciclos/${id}/cerrar`, { method: 'POST' });
      toast.success(`✅ ${res.message}`);
      await cargar(); onCicloChanged?.();
    } catch (e) { toast.error(e.message); }
    finally { setWorking(false); }
  };

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
        <div className="flex items-center gap-2">
          <Calendar size={14} /><span className="text-sm font-semibold">Ciclos de Crédito</span>
          {cicloAbierto && <Badge color="green"><span className="animate-pulse">●</span> ACTIVO</Badge>}
        </div>
        <div className="flex gap-2">
          {!cicloAbierto && (
            <button onClick={abrirCiclo} disabled={working}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium disabled:opacity-50">
              {working ? <RefreshCw size={11} className="animate-spin" /> : <PlayCircle size={11} />}Abrir ciclo
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg"><X size={14} /></button>
        </div>
      </div>

      {cicloAbierto && (
        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-200">
          <div className="flex items-start justify-between gap-4">
            <div className="grid grid-cols-3 gap-4 flex-1">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Período</p>
                <p className="text-xs font-bold text-slate-700">{fmtFecha(cicloAbierto.CicFechaInicio)} → {fmtFecha(cicloAbierto.CicFechaCierre)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Órdenes</p>
                <p className="text-sm font-bold text-red-600">{fmt(cicloAbierto.CicTotalOrdenes, cuenta.MonSimbolo)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Pagos</p>
                <p className="text-sm font-bold text-green-600">{fmt(cicloAbierto.CicTotalPagos, cuenta.MonSimbolo)}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              {(() => {
                const d = diasRestantes(cicloAbierto.CicFechaCierre);
                return <div className={`px-3 py-1.5 rounded-lg text-xs font-bold mb-2
                  ${d !== null && d <= 1 ? 'bg-red-100 text-red-700' : d !== null && d <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {d !== null ? (d > 0 ? `${d}d restantes` : 'Vence hoy') : '—'}
                </div>;
              })()}
              <button onClick={() => cerrarCiclo(cicloAbierto.CicIdCiclo)} disabled={working}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium disabled:opacity-50">
                {working ? <RefreshCw size={11} className="animate-spin" /> : <StopCircle size={11} />}Cerrar ciclo
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-5 bg-white"><div className="animate-spin h-5 w-5 border-2 border-indigo-400 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto bg-white">
          {ciclos.filter(c => c.CicEstado !== 'ABIERTO').map(c => (
            <div key={c.CicIdCiclo} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <Badge color={estadoColor(c.CicEstado)}>{c.CicEstado}</Badge>
                <span className="text-slate-500">{fmtFecha(c.CicFechaInicio)} → {fmtFecha(c.CicFechaCierre)}</span>
                {c.CicNumeroFactura && <span className="font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px]">{c.CicNumeroFactura}</span>}
              </div>
              <span className="font-semibold text-slate-700">{fmt(c.CicSaldoFacturar, cuenta.MonSimbolo)}</span>
            </div>
          ))}
          {ciclos.length === 0 && (
            <div className="text-center py-5 text-slate-400 text-xs"><Info size={18} className="mx-auto mb-1 opacity-40" />Sin ciclos</div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Panel planes de recursos (Metros / KG) ─────────────────────────────
const PlanesPanel = ({ cuenta, CliIdCliente, onClose, onChanged }) => {
  const [planes, setPlanes]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [working, setWorking]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [monedas,  setMonedas]  = useState([]);
  const [metodos,  setMetodos]  = useState([]);

  const formVacio = { PlaCantidadTotal: '', PlaImportePagado: '', MonedaPagoId: '', MetodoPagoId: '', PlaFechaVencimiento: '', PlaDescripcion: '' };
  const [form, setForm] = useState(formVacio);
  const [formRecarga, setFormRecarga] = useState({});

  // Unidad de la cuenta — fija, no editable
  const unidadLabel = cuenta.UnidadLabel || cuenta.CueTipo || '';
  const uniSimbolo  = cuenta.UniSimbolo  || unidadLabel;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAPI(`/api/contabilidad/planes/${CliIdCliente}`);
      setPlanes(data.data || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [CliIdCliente]);

  // Cargar catálogos al abrir el panel
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    fetchAPI('/api/contabilidad/monedas').then(d => {
      const list = d.data || [];
      setMonedas(list);
      if (list.length > 0) setForm(f => ({ ...f, MonedaPagoId: String(list[0].MonIdMoneda) }));
    }).catch(() => {});
    fetchAPI('/api/contabilidad/metodos-pago').then(d => {
      const list = d.data || [];
      setMetodos(list);
      if (list.length > 0) setForm(f => ({ ...f, MetodoPagoId: String(list[0].MetodoPagoId) }));
    }).catch(() => {});
  }, []);

  const crearPlan = async (e) => {
    e.preventDefault();
    if (!form.PlaCantidadTotal || Number(form.PlaCantidadTotal) <= 0) { toast.error('Cantidad obligatoria'); return; }
    setWorking(true);
    try {
      const res = await fetchAPI('/api/contabilidad/planes', {
        method: 'POST',
        body: JSON.stringify({
          CueIdCuenta:         cuenta.CueIdCuenta,
          ProIdProducto:       cuenta.ProIdProducto,
          PlaCantidadTotal:    Number(form.PlaCantidadTotal),
          PlaImportePagado:    form.PlaImportePagado ? Number(form.PlaImportePagado) : null,
          MonedaPagoId:        form.MonedaPagoId  || null,
          MetodoPagoId:        form.MetodoPagoId  || null,
          PlaFechaVencimiento: form.PlaFechaVencimiento || null,
          PlaDescripcion:      form.PlaDescripcion || null,
        }),
      });
      toast.success(res.message);
      setShowForm(false);
      setForm(formVacio);
      await cargar(); onChanged?.();
    } catch (e) { toast.error(e.message); }
    finally { setWorking(false); }
  };

  const recargar = async (planId) => {
    const extra = formRecarga[planId];
    if (!extra?.cantidad || Number(extra.cantidad) <= 0) { toast.error('Ingresá la cantidad adicional'); return; }
    setWorking(true);
    try {
      const res = await fetchAPI(`/api/contabilidad/planes/${planId}/recargar`, {
        method: 'POST',
        body: JSON.stringify({ CantidadAdicional: Number(extra.cantidad), ImportePagado: extra.importe ? Number(extra.importe) : null }),
      });
      toast.success(res.message);
      setFormRecarga(prev => ({ ...prev, [planId]: undefined }));
      await cargar(); onChanged?.();
    } catch (e) { toast.error(e.message); }
    finally { setWorking(false); }
  };

  const desactivar = async (planId) => {
    if (!confirm('¿Desactivar este plan?')) return;
    setWorking(true);
    try {
      await fetchAPI(`/api/contabilidad/planes/${planId}/desactivar`, { method: 'PATCH' });
      toast.success('Plan desactivado');
      await cargar(); onChanged?.();
    } catch (e) { toast.error(e.message); }
    finally { setWorking(false); }
  };

  const planActivo = planes.find(p => p.PlaActivo);

  return (
    <div className="mt-3 rounded-xl border border-violet-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-violet-600 text-white">
        <div className="flex items-center gap-2">
          <Layers size={14} /><span className="text-sm font-semibold">Planes de Recursos</span>
          {planActivo && <Badge color="green"><span className="animate-pulse">●</span> ACTIVO</Badge>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium">
            <PlusCircle size={11} /> Nuevo plan
          </button>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg"><X size={14} /></button>
        </div>
      </div>

      {/* Formulario nuevo plan */}
      {showForm && (
        <form onSubmit={crearPlan} className="px-4 py-3 bg-violet-50 border-b border-violet-200 space-y-3">
          <p className="text-xs font-semibold text-violet-800">Nuevo plan de recursos</p>

          {/* Fila 1: Cantidad + Unidad (fija) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Cantidad</label>
              <input type="number" required min="0.01" step="0.01"
                value={form.PlaCantidadTotal} onChange={e => setForm(f => ({ ...f, PlaCantidadTotal: e.target.value }))}
                className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Unidad</label>
              <div className="w-full mt-0.5 px-2 py-1.5 border border-violet-200 rounded text-sm bg-violet-100 text-violet-800 font-semibold">
                {unidadLabel}
              </div>
            </div>
          </div>

          {/* Fila 2: Importe + Moneda + Forma de pago */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Importe pagado</label>
              <input type="number" min="0" step="0.01"
                value={form.PlaImportePagado} onChange={e => setForm(f => ({ ...f, PlaImportePagado: e.target.value }))}
                className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Moneda</label>
              <select value={form.MonedaPagoId} onChange={e => setForm(f => ({ ...f, MonedaPagoId: e.target.value }))}
                className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none">
                {monedas.map(m => <option key={m.MonIdMoneda} value={m.MonIdMoneda}>{m.MonSimbolo} — {m.MonNombre}</option>)}
                {monedas.length === 0 && <option value="">Cargando...</option>}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Forma de pago</label>
              <select value={form.MetodoPagoId} onChange={e => setForm(f => ({ ...f, MetodoPagoId: e.target.value }))}
                className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none">
                {metodos.map(m => <option key={m.MetodoPagoId} value={m.MetodoPagoId}>{m.MetNombre}</option>)}
                {metodos.length === 0 && <option value="">Cargando...</option>}
              </select>
            </div>
          </div>

          {/* Fila 3: Vencimiento + Descripción */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Vencimiento (opcional)</label>
              <input type="date" value={form.PlaFechaVencimiento} onChange={e => setForm(f => ({ ...f, PlaFechaVencimiento: e.target.value }))}
                className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Descripción / Referencia</label>
              <input type="text" value={form.PlaDescripcion} onChange={e => setForm(f => ({ ...f, PlaDescripcion: e.target.value }))}
                placeholder="Ej: Rollo Nov-2026"
                className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none" />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={working} className="px-4 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">
              {working ? <RefreshCw size={11} className="animate-spin inline" /> : null} Crear plan
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-5 bg-white"><div className="animate-spin h-5 w-5 border-2 border-violet-400 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="divide-y divide-slate-100 bg-white">
          {planes.map(p => {
            const pct     = Number(p.PorcentajeUsado);
            const agotado = pct >= 100;
            const alerta  = pct >= 80 && !agotado;
            const rec     = formRecarga[p.PlaIdPlan];

            return (
              <div key={p.PlaIdPlan} className="px-4 py-3">
                {/* Cabecera del plan */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge color={p.PlaActivo ? (agotado ? 'red' : alerta ? 'amber' : 'green') : 'slate'}>
                        {p.PlaActivo ? (agotado ? 'AGOTADO' : 'ACTIVO') : 'CERRADO'}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-700">{p.NombreArticulo || `Producto #${p.ProIdProducto}`}</span>
                      <span className="text-[10px] text-slate-400">Plan #{p.PlaIdPlan}</span>
                    </div>
                    {p.PlaObservacion && <p className="text-[11px] text-slate-500 mt-0.5">{p.PlaObservacion}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{fmtNum(p.PlaCantidadRestante)} / {fmtNum(p.PlaCantidadTotal)} {p.PlaUnidad}</p>
                    {p.PlaImportePagado && <p className="text-[11px] text-slate-400">Pagó: {fmt(p.PlaImportePagado, cuenta.MonSimbolo)}</p>}
                    {p.DiasParaVencer !== null && <p className={`text-[11px] font-semibold ${p.DiasParaVencer <= 7 ? 'text-red-600' : 'text-slate-400'}`}>Vence en {p.DiasParaVencer}d</p>}
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full transition-all ${
                    agotado ? 'bg-red-500' : alerta ? 'bg-amber-400' : 'bg-emerald-500'
                  }`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Usado: {fmtNum(p.PlaCantidadUsada)} {p.PlaUnidad} ({pct}%)</span>
                  <span>Inicio: {fmtFecha(p.PlaFechaInicio)}</span>
                </div>

                {/* Acciones */}
                {p.PlaActivo && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {/* Recarga quick */}
                    {rec ? (
                      <div className="flex gap-1 flex-1">
                        <input type="number" min="0.01" step="0.01" placeholder={`Cantidad (${p.PlaUnidad})`}
                          value={rec.cantidad || ''} onChange={e => setFormRecarga(prev => ({ ...prev, [p.PlaIdPlan]: { ...prev[p.PlaIdPlan], cantidad: e.target.value } }))}
                          className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none" />
                        <input type="number" min="0" step="0.01" placeholder={`$ (opcional)`}
                          value={rec.importe || ''} onChange={e => setFormRecarga(prev => ({ ...prev, [p.PlaIdPlan]: { ...prev[p.PlaIdPlan], importe: e.target.value } }))}
                          className="w-24 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none" />
                        <button onClick={() => recargar(p.PlaIdPlan)} disabled={working}
                          className="px-2 py-1 bg-violet-600 text-white text-xs rounded hover:bg-violet-700 disabled:opacity-50">
                          <CheckCircle2 size={11} />
                        </button>
                        <button onClick={() => setFormRecarga(prev => ({ ...prev, [p.PlaIdPlan]: undefined }))}
                          className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded hover:bg-slate-200">
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setFormRecarga(prev => ({ ...prev, [p.PlaIdPlan]: {} }))}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded hover:bg-violet-100">
                        <RotateCcw size={10} /> Recargar
                      </button>
                    )}
                    <button onClick={() => desactivar(p.PlaIdPlan)} disabled={working}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 ml-auto">
                      <X size={10} /> Cerrar plan
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {planes.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-xs"><Package size={22} className="mx-auto mb-1 opacity-30" />Sin planes de recursos</div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Card de cuenta ──────────────────────────────────────────
const CuentaCard = ({ cuenta, CliIdCliente, panelActivo, onToggle, onCicloChanged, onRegistrarPago }) => {
  const saldo      = Number(cuenta.CueSaldoActual);
  const deuda      = Number(cuenta.DeudaPendienteTotal ?? 0);
  const negativo   = saldo < 0;
  const esSemanal  = (cuenta.CueDiasCiclo ?? 0) > 0;
  // Detectar cuenta de recursos: tiene UnidadLabel o su CueTipo no es monetario
  const TIPOS_MONETARIOS = ['USD','UYU','ARS','EUR','PYG','BRL','CORRIENTE','CREDITO','DEBITO','CAJA','DINERO_USD','DINERO_UYU'];
  const esRecursos = !TIPOS_MONETARIOS.includes(cuenta.CueTipo?.toUpperCase()) && !cuenta.MonSimbolo;
  const unidadLabel = cuenta.UnidadLabel || cuenta.CueTipo;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-5 py-4 flex items-center justify-between
        ${esRecursos
          ? 'bg-gradient-to-r from-violet-500 to-purple-500'
          : negativo
            ? 'bg-gradient-to-r from-red-500 to-rose-500'
            : 'bg-gradient-to-r from-emerald-500 to-teal-500'} text-white`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest uppercase opacity-80">{unidadLabel}</span>
            {cuenta.NombreArticulo && <span className="text-xs opacity-60">· {cuenta.NombreArticulo}</span>}
            {esSemanal   && <Badge color="blue"><Calendar size={9} /> Semanal</Badge>}
            {esRecursos  && <Badge color="indigo"><Layers size={9} /> Recursos</Badge>}
          </div>
          <p className="text-2xl font-black mt-1">
            {esRecursos ? `${fmtNum(saldo)} ${cuenta.UniSimbolo || unidadLabel}` : fmt(saldo, cuenta.MonSimbolo)}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          esRecursos ? 'bg-violet-400/30' : negativo ? 'bg-red-400/30' : 'bg-emerald-400/30'}`}>
          {esRecursos ? <Layers size={22} /> : negativo ? <TrendingDown size={22} /> : <TrendingUp size={22} />}
        </div>
      </div>

      {!esRecursos && (
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <div className="px-4 py-2.5 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Deuda</p>
            <p className={`text-sm font-bold ${deuda > 0 ? 'text-red-600' : 'text-slate-400'}`}>{fmt(deuda, cuenta.MonSimbolo)}</p>
          </div>
          <div className="px-4 py-2.5 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Cond. Pago</p>
            <p className="text-sm font-semibold text-slate-700 truncate">{cuenta.CondicionPago || '—'}</p>
          </div>
          <div className="px-4 py-2.5 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Docs Venc.</p>
            <p className={`text-sm font-bold ${cuenta.DocumentosVencidos > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {cuenta.DocumentosVencidos > 0
                ? <><AlertTriangle size={11} className="inline mr-0.5" />{cuenta.DocumentosVencidos}</>
                : <><CheckCircle2 size={11} className="inline mr-0.5" />0</>}
            </p>
          </div>
        </div>
      )}

      <div className="px-4 py-3 flex gap-2 flex-wrap items-center">
        {!esRecursos && (
          <>
            <button onClick={() => onToggle('mov')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors
                ${panelActivo === 'mov' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'}`}>
              <BarChart3 size={12} /> Movimientos
            </button>
            <button onClick={() => onToggle('deuda')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors
                ${panelActivo === 'deuda' ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'}`}>
              <FileText size={12} /> Deudas
              {deuda > 0 && <span className="bg-amber-200 text-amber-800 px-1 rounded-full text-[10px]">{cuenta.DocumentosVencidos}</span>}
            </button>
          </>
        )}
        {esSemanal && (
          <button onClick={() => onToggle('ciclo')}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors
              ${panelActivo === 'ciclo' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'}`}>
            <Calendar size={12} /> Ciclos
          </button>
        )}
        {esRecursos && (
          <button onClick={() => onToggle('planes')}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors
              ${panelActivo === 'planes' ? 'bg-violet-600 text-white border-violet-600' : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200'}`}>
            <Layers size={12} /> Planes
          </button>
        )}
        <button onClick={() => onRegistrarPago(cuenta)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
          <DollarSign size={12} /> Pago / Ajuste
        </button>
        <span className="ml-auto text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
          #{cuenta.CueIdCuenta}{cuenta.CueDiasCiclo > 0 ? ` · ${cuenta.CueDiasCiclo}d` : ''}
        </span>
      </div>
    </div>
  );
};

// ── VISTA PRINCIPAL ───────────────────────────────────────────────────────────
export default function ContabilidadCuentasView() {
  const [busqueda, setBusqueda]               = useState('');
  const [clientesActivos, setClientesActivos] = useState([]);
  const [clienteSel, setClienteSel]           = useState(null);
  const [cuentas, setCuentas]                 = useState([]);
  const [loadingLista, setLoadingLista]       = useState(false);
  const [loadingCuentas, setLoadingCuentas]   = useState(false);
  const [paneles, setPaneles]                 = useState({});
  const [modalPago, setModalPago]             = useState(null);

  const cargarClientesActivos = useCallback(async (q = '') => {
    setLoadingLista(true);
    try {
      const params = q.trim() ? `?q=${encodeURIComponent(q)}` : '';
      const data = await fetchAPI(`/api/contabilidad/clientes-activos${params}`);
      setClientesActivos(data.data || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoadingLista(false); }
  }, []);

  useEffect(() => { cargarClientesActivos(); }, [cargarClientesActivos]);

  const seleccionarCliente = async (cli) => {
    if (clienteSel?.CliIdCliente === cli.CliIdCliente) { setClienteSel(null); return; }
    setClienteSel(cli);
    setPaneles({});
    setLoadingCuentas(true);
    try {
      const data = await fetchAPI(`/api/contabilidad/cuentas/${cli.CliIdCliente}`);
      setCuentas(data.data || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoadingCuentas(false); }
  };

  const recargarCuentas = async () => {
    if (!clienteSel) return;
    setLoadingCuentas(true);
    try {
      const data = await fetchAPI(`/api/contabilidad/cuentas/${clienteSel.CliIdCliente}`);
      setCuentas(data.data || []);
      await cargarClientesActivos(busqueda);
    } catch (e) { toast.error(e.message); }
    finally { setLoadingCuentas(false); }
  };

  const togglePanel = (cueId, tipo) =>
    setPaneles(prev => ({ ...prev, [cueId]: prev[cueId] === tipo ? null : tipo }));

  const saldoTotal   = cuentas.reduce((s, c) => s + Number(c.CueSaldoActual ?? 0), 0);
  const deudaTotal   = cuentas.reduce((s, c) => s + Number(c.DeudaPendienteTotal ?? 0), 0);
  const docsVencidos = cuentas.reduce((s, c) => s + Number(c.DocumentosVencidos ?? 0), 0);

  return (
    <>
      {/* Modal */}
      {modalPago && (
        <ModalPago
          cuenta={modalPago}
          onClose={() => setModalPago(null)}
          onSuccess={recargarCuentas}
        />
      )}

      <div className="flex gap-6 h-full min-h-0" style={{ maxHeight: 'calc(100vh - 120px)' }}>

        {/* ── Columna izquierda: lista ────────────────────────────────────── */}
        <div className="w-96 shrink-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users size={16} className="text-blue-500" />Clientes con Saldo
              </h1>
              <button onClick={() => cargarClientesActivos(busqueda)} title="Actualizar"
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                <RefreshCw size={13} className={loadingLista ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Buscar..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && cargarClientesActivos(busqueda)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
              <button onClick={() => cargarClientesActivos(busqueda)}
                className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">
                <Search size={12} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingLista ? (
              <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
            ) : clientesActivos.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Zap size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Sin clientes con saldo activo</p>
              </div>
            ) : (
              clientesActivos.map(c => (
                <FilaCliente key={c.CliIdCliente} c={c}
                  seleccionado={clienteSel?.CliIdCliente === c.CliIdCliente}
                  onClick={() => seleccionarCliente(c)} />
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            {clientesActivos.length} clientes con saldo o deuda pendiente
          </div>
        </div>

        {/* ── Columna derecha: detalle ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-4 min-w-0">
          {!clienteSel ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <CreditCard size={48} className="mb-4 opacity-20" />
              <p className="text-base font-medium">Seleccioná un cliente</p>
              <p className="text-sm mt-1">para ver sus cuentas, movimientos y ciclos</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                      {clienteSel.Nombre?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-800">{clienteSel.Nombre}</h2>
                      {clienteSel.NombreFantasia && <p className="text-xs text-slate-400">{clienteSel.NombreFantasia}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Saldo</p>
                      <p className={`text-base font-black ${saldoTotal < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(saldoTotal)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Deuda</p>
                      <p className={`text-base font-black ${deudaTotal > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{fmt(deudaTotal)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Vencidos</p>
                      <p className={`text-base font-black ${docsVencidos > 0 ? 'text-red-600' : 'text-slate-400'}`}>{docsVencidos}</p>
                    </div>
                    <button onClick={recargarCuentas} disabled={loadingCuentas}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                      <RefreshCw size={15} className={loadingCuentas ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
              </div>

              {loadingCuentas ? (
                <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
              ) : cuentas.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                  <CreditCard size={32} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">Sin cuentas contables registradas</p>
                </div>
              ) : (
                cuentas.map(cuenta => (
                  <div key={cuenta.CueIdCuenta}>
                    <CuentaCard
                      cuenta={cuenta}
                      CliIdCliente={clienteSel.CliIdCliente}
                      panelActivo={paneles[cuenta.CueIdCuenta]}
                      onToggle={(tipo) => togglePanel(cuenta.CueIdCuenta, tipo)}
                      onCicloChanged={recargarCuentas}
                      onRegistrarPago={setModalPago}
                    />
                    {paneles[cuenta.CueIdCuenta] === 'mov' && (
                      <MovimientosPanel CueIdCuenta={cuenta.CueIdCuenta} onClose={() => togglePanel(cuenta.CueIdCuenta, 'mov')} />
                    )}
                    {paneles[cuenta.CueIdCuenta] === 'deuda' && (
                      <DeudasPanel CueIdCuenta={cuenta.CueIdCuenta} simbolo={cuenta.MonSimbolo} onClose={() => togglePanel(cuenta.CueIdCuenta, 'deuda')} />
                    )}
                    {paneles[cuenta.CueIdCuenta] === 'ciclo' && (
                      <CiclosPanel
                        cuenta={cuenta}
                        CliIdCliente={clienteSel.CliIdCliente}
                        onClose={() => togglePanel(cuenta.CueIdCuenta, 'ciclo')}
                        onCicloChanged={recargarCuentas}
                      />
                    )}
                    {paneles[cuenta.CueIdCuenta] === 'planes' && (
                      <PlanesPanel
                        cuenta={cuenta}
                        CliIdCliente={clienteSel.CliIdCliente}
                        onClose={() => togglePanel(cuenta.CueIdCuenta, 'planes')}
                        onChanged={recargarCuentas}
                      />
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

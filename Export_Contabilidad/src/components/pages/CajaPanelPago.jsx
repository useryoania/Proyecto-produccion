import React, { useMemo } from 'react';
import { Plus, X, CheckCircle, Loader2, FileText } from 'lucide-react';

const TIPOS_DOC = [
  { value: 'ETICKET',      label: 'E-Ticket → 101' },
  { value: 'FACTURA',      label: 'E-Factura → 111' },
  { value: 'CREDITO',      label: 'Nota de Crédito → 112' },
  { value: 'NOTA_CONSUMO', label: 'Consumo Interno' },
  { value: 'NINGUNO',      label: 'Sin documento' },
];

const TIPOS_DOC_EGRESO = [
  { value: 'RECIBO',     label: 'Recibo' },
  { value: 'ORDEN_PAGO', label: 'Orden de Pago' },
  { value: 'NINGUNO',    label: 'Sin documento' },
];

const fmt = (n) =>
  Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * PanelPago — columna izquierda fija para COBRO / VENTA / MOTOR / EGRESO
 *
 * Props:
 *   mode          'COBRO' | 'VENTA' | 'MOTOR' | 'EGRESO'
 *   totalACubrir  number   — Total calculado por el contenedor padre
 *   moneda        'UYU' | 'USD'
 *   cotizacion    number
 *   metodosPago   Array
 *
 *   // Líneas de pago (carrito)
 *   pagos         Array<{ id, metodoPagoId, moneda, monto }>
 *   onPagosChange fn(newPagos)
 *
 *   // Documento
 *   tipoDoc       string
 *   onTipoDoc     fn(val)
 *   serieDoc      string
 *   onSerieDoc    fn(val)
 *   numDoc        string | null  (preview)
 *   notas         string
 *   onNotas       fn(val)
 *
 *   // Acción principal
 *   onConfirmar   fn()
 *   procesando    bool
 *   labelBoton    string   (default según mode)
 *   disabledExtra bool     (condición extra para deshabilitar)
 */
export default function CajaPanelPago({
  mode = 'COBRO',
  totalACubrir = 0,
  moneda = 'UYU',
  cotizacion = 1,
  metodosPago = [],
  pagos = [],
  onPagosChange,
  tipoDoc,
  onTipoDoc,
  serieDoc,
  onSerieDoc,
  numDoc,
  notas = '',
  onNotas,
  onConfirmar,
  procesando = false,
  labelBoton,
  disabledExtra = false,
}) {
  const esEgreso = mode === 'EGRESO';
  const tiposDoc = esEgreso ? TIPOS_DOC_EGRESO : TIPOS_DOC;

  // ── Totales ──────────────────────────────────────────────────────
  const totalIngresado = useMemo(() => {
    return pagos.reduce((acc, p) => {
      const m = parseFloat(p.monto) || 0;
      if (moneda === 'UYU') return acc + (p.moneda === 'USD' ? m * (cotizacion || 1) : m);
      return acc + (p.moneda === 'UYU' ? m / (cotizacion || 1) : m);
    }, 0);
  }, [pagos, moneda, cotizacion]);

  const diferencia  = totalACubrir - totalIngresado;
  const tolerancia  = moneda === 'USD' ? 0.05 : 1.0;
  const balanceOK   = Math.abs(diferencia) <= tolerancia || totalIngresado === 0; // 0 = 100% crédito/deuda
  const simbMoneda  = moneda === 'USD' ? 'US$' : '$';

  // ── Helpers carrito ───────────────────────────────────────────────
  const addPago = () =>
    onPagosChange([...pagos, { id: Date.now(), metodoPagoId: '', moneda, monto: '' }]);

  const removePago = (id) => onPagosChange(pagos.filter((p) => p.id !== id));

  const updatePago = (id, field, value) =>
    onPagosChange(pagos.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const autoRellenar = () => {
    if (diferencia <= 0) return;
    const last = pagos[pagos.length - 1];
    if (!last) {
      addPago();
      return;
    }
    let fill = diferencia;
    if (moneda === 'UYU' && last.moneda === 'USD') fill = diferencia / (cotizacion || 1);
    if (moneda === 'USD' && last.moneda === 'UYU') fill = diferencia * (cotizacion || 1);
    onPagosChange(
      pagos.map((p, i) =>
        i === pagos.length - 1
          ? { ...p, monto: ((parseFloat(p.monto) || 0) + fill).toFixed(2) }
          : p
      )
    );
  };

  // ── Label botón por defecto ────────────────────────────────────────
  const defaultLabel = {
    COBRO:  'REALIZAR COBRO',
    VENTA:  'PROCESAR VENTA',
    MOTOR:  'REGISTRAR OPERACIÓN',
    EGRESO: 'REGISTRAR SALIDA',
  }[mode] || 'CONFIRMAR';

  const colorBoton = {
    COBRO:  'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30',
    VENTA:  'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30',
    MOTOR:  'bg-violet-600 hover:bg-violet-500 shadow-violet-900/30',
    EGRESO: 'bg-rose-600   hover:bg-rose-500   shadow-rose-900/30',
  }[mode] || 'bg-indigo-600 hover:bg-indigo-500';

  const canConfirm = !procesando && !disabledExtra;

  return (
    <div className="w-[400px] shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col h-full overflow-y-auto shadow-[0_0_40px_rgba(0,0,0,0.02)]">

      {/* ── Encabezado ── */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white sticky top-0 z-10">
        <h3 className="font-black text-slate-800 text-base flex items-center gap-2.5">
          <div className="bg-indigo-100 p-1.5 rounded-lg">
             <FileText size={16} className="text-indigo-600" />
          </div>
          Pago y Documento
        </h3>
        <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest px-1">
          {totalACubrir > 0
            ? `Total a cubrir: ${simbMoneda} ${fmt(totalACubrir)}`
            : 'Esperando cálculo de monto...'}
        </p>
      </div>

      <div className="flex flex-col gap-6 p-6 flex-1">

        {/* ── LÍNEAS DE PAGO ────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-1">
            Formas de pago recibidas
          </label>

          {pagos.length === 0 && (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
              <p className="text-xs text-slate-400 font-bold italic">
                {mode === 'VENTA'
                  ? 'Sin pago hoy = Factura 100% a Crédito'
                  : 'Debe agregar al menos un medio de pago'}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {pagos.map((p) => (
              <div
                key={p.id}
                className="flex gap-2 items-center bg-white border border-slate-200 p-2 rounded-2xl shadow-sm animate-in slide-in-from-right-4 duration-200"
              >
                {/* Método */}
                <select
                  value={p.metodoPagoId}
                  onChange={(e) => updatePago(p.id, 'metodoPagoId', e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                >
                  <option value="">Medio de pago...</option>
                  {metodosPago.map((m) => (
                    <option key={m.MPaIdMetodoPago} value={m.MPaIdMetodoPago}>
                      {m.MPaDescripcionMetodo}
                    </option>
                  ))}
                </select>

                {/* Moneda */}
                <select
                  value={p.moneda}
                  onChange={(e) => updatePago(p.id, 'moneda', e.target.value)}
                  className="w-16 bg-slate-50 border border-slate-100 rounded-xl px-2 py-2 text-xs font-black text-slate-600 outline-none text-center"
                >
                  <option value="UYU">$</option>
                  <option value="USD">U$</option>
                </select>

                {/* Monto */}
                <input
                  type="number"
                  placeholder="0.0"
                  value={p.monto}
                  onChange={(e) => updatePago(p.id, 'monto', e.target.value)}
                  className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-900 text-right outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 shadow-inner"
                />

                {/* Eliminar */}
                <button
                  onClick={() => removePago(p.id)}
                  className="text-slate-300 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={addPago}
              className="flex-1 bg-white text-indigo-600 text-xs font-black border-2 border-dashed border-indigo-100 rounded-2xl py-3 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Agregar Medio
            </button>
            {totalACubrir > 0 && diferencia > 0.01 && (
              <button
                onClick={autoRellenar}
                className="flex-1 bg-white text-slate-600 text-xs font-black border border-slate-200 rounded-2xl py-3 hover:border-slate-400 hover:bg-slate-50 shadow-sm transition-all"
              >
                Completar Saldo
              </button>
            )}
          </div>
        </div>

        {/* ── RESUMEN BALANCE ───────────────────────────────────────── */}
        {totalACubrir > 0 && (
          <div className="flex flex-col gap-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between text-xs font-black px-1">
              <span className="text-slate-400 uppercase tracking-widest">A Cobrar</span>
              <span className="text-slate-800 font-mono italic">{simbMoneda} {fmt(totalACubrir)}</span>
            </div>
            <div className="flex justify-between text-xs font-black px-1">
              <span className="text-slate-400 uppercase tracking-widest">Recibido</span>
              <span className="text-emerald-600 font-mono italic">- {simbMoneda} {fmt(totalIngresado)}</span>
            </div>
            <div
              className={`flex justify-between items-center px-4 py-3 rounded-2xl border text-xs font-black mt-1
                ${balanceOK && totalIngresado > 0
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  : diferencia > 0
                    ? 'bg-rose-50 border-rose-100 text-rose-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
            >
              <span className="flex items-center gap-2">
                {totalIngresado === 0
                  ? mode === 'VENTA' ? '💳 Factura a Crédito' : '⏳ Sin pago inicial'
                  : balanceOK
                    ? '✅ Caja Balanceada'
                    : diferencia > 0
                      ? `❌ Falta ${simbMoneda} ${fmt(Math.abs(diferencia))}`
                      : `⚡ Excede ${simbMoneda} ${fmt(Math.abs(diferencia))}`}
              </span>
              {!balanceOK && totalIngresado > 0 && cotizacion && moneda === 'USD' && (
                <span className="text-slate-400 font-bold bg-white px-2 py-0.5 rounded-md text-[10px]">
                  ($ {fmt(Math.abs(diferencia) * cotizacion)})
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── DOCUMENTO A EMITIR ────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-1">
            Tipo de Comprobante
          </label>
          <select
            value={tipoDoc}
            onChange={(e) => onTipoDoc(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
          >
            {tiposDoc.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {tipoDoc !== 'NINGUNO' && (
            <div className="flex gap-2.5">
              <input
                type="text"
                value={serieDoc}
                onChange={(e) => onSerieDoc(e.target.value)}
                placeholder="Serie"
                className="w-20 text-center bg-white border-2 border-slate-200 rounded-2xl px-3 py-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-sm"
              />
              <div className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-500 font-mono font-bold flex items-center justify-center italic">
                {numDoc || 'Número Automático'}
              </div>
            </div>
          )}
        </div>

        {/* ── NOTAS INTERNAS ────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-1">
            Observaciones Internas
          </label>
          <textarea
            value={notas}
            onChange={(e) => onNotas(e.target.value)}
            placeholder="Añada notas para el arqueo de caja..."
            rows={3}
            className="bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none resize-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
          />
        </div>

        {/* ── BOTÓN CONFIRMAR ───────────────────────────────────────── */}
        <button
          onClick={onConfirmar}
          disabled={!canConfirm}
          className={`w-full mt-auto ${colorBoton} disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-black py-5 rounded-[2rem] flex justify-center gap-3 items-center text-base shadow-2xl transition-all active:scale-[0.98] ring-offset-4 ring-offset-slate-50`}
        >
          {procesando ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <><CheckCircle size={22} /> {labelBoton || defaultLabel}</>
          )}
        </button>

      </div>
    </div>
  );
}

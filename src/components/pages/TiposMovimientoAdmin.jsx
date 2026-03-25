import React, { useEffect, useState, useCallback } from 'react';
import { Settings, RefreshCw, Save, CheckCircle, XCircle, Info } from 'lucide-react';
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

// ── Etiqueta del efecto en saldo ─────────────────────────────────────────────
const EfectoBadge = ({ value, onChange }) => {
  const opts = [
    { v:  1, label: '+1 Suma',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' },
    { v:  0, label: '0 Neutro',  cls: 'bg-slate-100  text-slate-600   border-slate-300  hover:bg-slate-200'  },
    { v: -1, label: '-1 Resta',  cls: 'bg-rose-100   text-rose-700    border-rose-300   hover:bg-rose-200'    },
  ];
  return (
    <div className="flex gap-1">
      {opts.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-2 py-0.5 text-xs font-semibold rounded border transition-all ${
            value === o.v
              ? o.cls + ' ring-2 ring-offset-1 ring-current'
              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

// ── Toggle booleano ───────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
      value ? 'bg-violet-600' : 'bg-slate-200'
    }`}
  >
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
      value ? 'translate-x-5' : 'translate-x-1'
    }`} />
  </button>
);

// ── Componente principal ──────────────────────────────────────────────────────
const TiposMovimientoAdmin = () => {
  const [tipos, setTipos]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState({});   // { [TmoId]: bool }
  const [edits, setEdits]       = useState({});   // { [TmoId]: { campo: valor } }

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAPI('/api/contabilidad/tipos-movimiento');
      setTipos(res.data || []);
      setEdits({});
    } catch (e) { toast.error('Error cargando tipos: ' + e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Aplica un cambio local al estado de edición
  const setField = (TmoId, campo, valor) => {
    setEdits(prev => ({
      ...prev,
      [TmoId]: { ...(prev[TmoId] || {}), [campo]: valor },
    }));
  };

  // Guarda los cambios de un tipo específico
  const guardar = async (tipo) => {
    const cambios = edits[tipo.TmoId];
    if (!cambios || Object.keys(cambios).length === 0) {
      toast('Sin cambios para guardar.', { icon: 'ℹ️' });
      return;
    }
    setSaving(s => ({ ...s, [tipo.TmoId]: true }));
    try {
      await fetchAPI(`/api/contabilidad/tipos-movimiento/${tipo.TmoId}`, {
        method: 'PATCH',
        body: JSON.stringify(cambios),
      });
      toast.success(`'${tipo.TmoId}' actualizado.`);
      await cargar();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(s => ({ ...s, [tipo.TmoId]: false })); }
  };

  // Devuelve el valor actual (editado o el original)
  const val = (tipo, campo) =>
    edits[tipo.TmoId]?.[campo] !== undefined
      ? edits[tipo.TmoId][campo]
      : tipo[campo];

  const sucioPor = (tipo) =>
    edits[tipo.TmoId] && Object.keys(edits[tipo.TmoId]).length > 0;

  // Agrupar en dos secciones: movimientos internos y documentos
  const internos   = tipos.filter(t => !['FACTURA','FACTURA_CICLO','RECIBO','TICKET'].includes(t.TmoId));
  const documentos = tipos.filter(t =>  ['FACTURA','FACTURA_CICLO','RECIBO','TICKET'].includes(t.TmoId));

  const TipoRow = ({ tipo }) => {
    const sucio    = sucioPor(tipo);
    const guardando = saving[tipo.TmoId];
    return (
      <tr className={`border-b border-slate-100 text-sm transition-colors ${
        sucio ? 'bg-amber-50' : 'hover:bg-slate-50'
      }`}>
        {/* ID */}
        <td className="px-3 py-2.5 font-mono text-xs font-bold text-slate-500 whitespace-nowrap">
          {tipo.TmoId}
        </td>

        {/* Nombre */}
        <td className="px-3 py-2.5">
          <input
            value={val(tipo, 'TmoNombre')}
            onChange={e => setField(tipo.TmoId, 'TmoNombre', e.target.value)}
            className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
          />
        </td>

        {/* Descripción */}
        <td className="px-3 py-2.5 hidden lg:table-cell">
          <input
            value={val(tipo, 'TmoDescripcion') || ''}
            onChange={e => setField(tipo.TmoId, 'TmoDescripcion', e.target.value)}
            className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-slate-500"
            placeholder="Descripción..."
          />
        </td>

        {/* Prefijo */}
        <td className="px-3 py-2.5 text-center">
          <input
            value={val(tipo, 'TmoPrefijo') || ''}
            onChange={e => setField(tipo.TmoId, 'TmoPrefijo', e.target.value.toUpperCase().slice(0,5))}
            className="w-14 px-2 py-1 border border-slate-200 rounded text-xs text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-violet-300 uppercase"
            placeholder="FC"
          />
        </td>

        {/* Efecto en saldo */}
        <td className="px-3 py-2.5">
          <EfectoBadge
            value={val(tipo, 'TmoAfectaSaldo')}
            onChange={v => setField(tipo.TmoId, 'TmoAfectaSaldo', v)}
          />
        </td>

        {/* Genera Deuda */}
        <td className="px-3 py-2.5 text-center">
          <Toggle
            value={!!val(tipo, 'TmoGeneraDeuda')}
            onChange={v => setField(tipo.TmoId, 'TmoGeneraDeuda', v)}
          />
        </td>

        {/* Aplica Recurso */}
        <td className="px-3 py-2.5 text-center">
          <Toggle
            value={!!val(tipo, 'TmoAplicaRecurso')}
            onChange={v => setField(tipo.TmoId, 'TmoAplicaRecurso', v)}
          />
        </td>

        {/* Activo */}
        <td className="px-3 py-2.5 text-center">
          <Toggle
            value={!!val(tipo, 'TmoActivo')}
            onChange={v => setField(tipo.TmoId, 'TmoActivo', v)}
          />
        </td>

        {/* Orden */}
        <td className="px-3 py-2.5 text-center">
          <input
            type="number"
            value={val(tipo, 'TmoOrden')}
            onChange={e => setField(tipo.TmoId, 'TmoOrden', parseInt(e.target.value))}
            className="w-14 px-2 py-1 border border-slate-200 rounded text-xs text-center focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </td>

        {/* Guardar */}
        <td className="px-3 py-2.5 text-center">
          {sucio && (
            <button
              onClick={() => guardar(tipo)}
              disabled={guardando}
              className="flex items-center gap-1 px-3 py-1 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors mx-auto"
            >
              {guardando
                ? <RefreshCw size={11} className="animate-spin" />
                : <Save size={11} />}
              Guardar
            </button>
          )}
          {!sucio && (
            <span className="text-slate-300 text-xs">—</span>
          )}
        </td>
      </tr>
    );
  };

  const Tabla = ({ titulo, items, color }) => (
    <div className="mb-8">
      <div className={`flex items-center gap-2 mb-3 px-1`}>
        <span className={`w-2 h-6 rounded-full ${color}`} />
        <h2 className="text-sm font-bold text-slate-700">{titulo}</h2>
        <span className="text-xs text-slate-400">({items.length} tipos)</span>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-3 py-2.5 text-left">ID</th>
              <th className="px-3 py-2.5 text-left">Nombre</th>
              <th className="px-3 py-2.5 text-left hidden lg:table-cell">Descripción</th>
              <th className="px-3 py-2.5 text-center">Prefijo</th>
              <th className="px-3 py-2.5 text-left">Efecto saldo</th>
              <th className="px-3 py-2.5 text-center" title="Genera DeudaDocumento">Deuda</th>
              <th className="px-3 py-2.5 text-center" title="Afecta inventario de recursos">Recurso</th>
              <th className="px-3 py-2.5 text-center">Activo</th>
              <th className="px-3 py-2.5 text-center">Orden</th>
              <th className="px-3 py-2.5 text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => <TipoRow key={t.TmoId} tipo={t} />)}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-xl">
              <Settings size={20} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Catálogo de Tipos de Movimiento</h1>
              <p className="text-xs text-slate-500">
                Define cómo cada tipo afecta el saldo de las cuentas (Mayor y Submayor)
              </p>
            </div>
          </div>
          <button
            onClick={cargar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-600 font-medium"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Recargar
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Leyenda */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex gap-3 items-start">
          <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Efecto saldo:</strong> +1 suma al saldo (crédito), -1 resta del saldo (débito), 0 es neutro (solo trazabilidad).</p>
            <p><strong>Deuda:</strong> si al registrar este tipo se debe crear un documento de obligación de pago (DeudaDocumento).</p>
            <p><strong>Recurso:</strong> si este tipo afecta el inventario de metros/unidades (PlanesMetros) en vez de dinero.</p>
            <p><strong>Prefijo:</strong> letras que preceden al número correlativo (FC=Factura, RC=Recibo, TK=Ticket).</p>
          </div>
        </div>

        {/* Referencia visual de efectos */}
        <div className="mb-6 flex gap-4 flex-wrap">
          {[
            { cls: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: '+1 Suma — acredita (pago, anticipo, entrada)', icon: <CheckCircle size={12}/> },
            { cls: 'bg-slate-100  text-slate-600   border-slate-300',  label: '0 Neutro — solo trazabilidad, no modifica saldo', icon: <Info size={12}/> },
            { cls: 'bg-rose-100   text-rose-700    border-rose-300',   label: '-1 Resta — debita (orden, factura, entrega)', icon: <XCircle size={12}/> },
          ].map(i => (
            <span key={i.label} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border ${i.cls}`}>
              {i.icon}{i.label}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-violet-400 border-t-transparent" />
          </div>
        ) : (
          <>
            <Tabla
              titulo="Movimientos Internos (Libro Mayor / Submayor)"
              items={internos}
              color="bg-violet-500"
            />
            <Tabla
              titulo="Documentos Contables (Facturas, Recibos, Tickets)"
              items={documentos}
              color="bg-amber-500"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default TiposMovimientoAdmin;

import React, { useState } from 'react';
import api from '../../services/apiClient';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  Search, Loader2, CheckCircle, FileText, User, Phone, Bell, RefreshCw, Package
} from 'lucide-react';

const ESTADOS = {
  5:  'Listo (Pendiente)',
  6:  'Avisado',
  7:  'Pronto',
  8:  'Listo (Pagado)',
  9:  'Entregado',
  10: 'Cancelado',
  12: 'Avisar de nuevo',
};

const fmt = (n) => (Number(n) || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Arma las filas editables a partir de una orden devuelta por /mostrador/buscar
function filaDesdeOrden(o) {
  const cantidad = parseFloat(o.OrdCantidad) || 1;
  const total = parseFloat(o.OrdCostoFinal) || 0;
  const precio = cantidad > 0 ? total / cantidad : total;
  const monedaId = o.MonIdMoneda || 1;
  const exonerada = o.PagTipoMovimiento === 'EXONERACION';
  const bloqueado = o.Pagada === 1 && !exonerada;
  return {
    orderId: o.OrdIdOrden,
    orderNumber: o.OrdCodigoOrden,
    nombreTrabajo: o.OrdNombreTrabajo || '',
    simbolo: o.MonSimbolo || (monedaId === 2 ? 'US$' : '$'),
    monedaId,
    origMonedaId: monedaId,
    origCantidad: cantidad,
    origTotal: Number(total.toFixed(2)),
    cantidad: String(cantidad),
    precio: precio.toFixed(2),
    total: total.toFixed(2),
    bloqueado,
    exonerada,
    estado: o.OrdEstadoActual,
    estadoNuevo: o.OrdEstadoActual,
    oReId: o.OReIdOrdenRetiro || null,
  };
}

function GrupoRetiro({ retiro, ordenes, cliente, onGuardado }) {
  const [rows, setRows] = useState(() => ordenes.map(filaDesdeOrden));
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(null);

  const actualizarFila = (idx, campo, valor) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const next = { ...row, [campo]: valor };
      const cant = parseFloat(next.cantidad) || 0;
      const precio = parseFloat(next.precio) || 0;
      const total = parseFloat(next.total) || 0;
      if (campo === 'cantidad' || campo === 'precio') {
        next.total = (cant * precio).toFixed(2);
      } else if (campo === 'total') {
        next.precio = cant > 0 ? (total / cant).toFixed(2) : next.precio;
      } else if (campo === 'monedaId') {
        next.monedaId = parseInt(valor, 10) || 1;
        next.simbolo = next.monedaId === 2 ? 'US$' : '$';
      }
      return next;
    }));
  };

  const guardarCambios = async () => {
    const cambiadas = rows.filter(r => {
      if (r.bloqueado) return false;
      const cant = parseFloat(r.cantidad) || 0;
      const total = parseFloat(r.total) || 0;
      return Math.abs(cant - r.origCantidad) > 0.0001
          || Math.abs(total - r.origTotal) > 0.001
          || Number(r.monedaId) !== Number(r.origMonedaId);
    });
    if (cambiadas.length === 0) {
      toast.info('No hay cambios para guardar.');
      return;
    }
    setSaving(true);
    try {
      for (const r of cambiadas) {
        const cant = parseFloat(r.cantidad) || 0;
        const total = parseFloat(r.total) || 0;
        if (cant <= 0) { toast.warning(`Cantidad inválida en ${r.orderNumber}.`); continue; }
        if (total < 0) { toast.warning(`Total inválido en ${r.orderNumber}.`); continue; }
        const payload = {
          orderId: r.orderId,
          nuevoCosto: total,
          nuevaCantidad: cant,
          OReIdOrdenRetiro: retiro?.OReIdOrdenRetiro || r.oReId,
        };
        if (Number(r.monedaId) !== Number(r.origMonedaId)) payload.nuevaMoneda = Number(r.monedaId);
        await api.post('/apiordenesRetiro/caja/orden/editar', payload);
      }
      toast.success(`${cambiadas.length} orden(es) actualizada(s) correctamente.`);
      onGuardado();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al actualizar las órdenes.');
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (idx) => {
    const row = rows[idx];
    const nuevoEstado = row.estadoNuevo;
    if (Number(nuevoEstado) === Number(row.estado)) {
      toast.info('Elegí un estado distinto al actual.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/apiordenesRetiro/caja/orden/estado', { orderId: row.orderId, nuevoEstado });
      toast.success(`Estado de ${row.orderNumber} actualizado a "${ESTADOS[nuevoEstado]}".`);
      onGuardado();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al cambiar el estado.');
    } finally {
      setSaving(false);
    }
  };

  const volverAAvisar = async (row) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Volver a avisar por ${row.orderNumber}?`,
      html: `<p style="font-size:13px;color:#64748b">Se reenviará el aviso de WhatsApp al cliente.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, avisar de nuevo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0891b2',
    });
    if (!isConfirmed) return;
    setNotifying(row.orderId);
    try {
      await api.post('/apiordenesRetiro/caja/orden/estado', { orderId: row.orderId, nuevoEstado: 12 });
      toast.success(`${row.orderNumber} marcada para reenvío de aviso.`);
      onGuardado();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al marcar el reaviso.');
    } finally {
      setNotifying(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/60">
        <div>
          <h3 className="font-black text-zinc-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-brand-cyan" />
            {retiro ? `Retiro ${retiro.OReIdOrdenRetiro} · ${retiro.lugarRetiro || retiro.FormaRetiro || ''}` : 'Orden sin retiro'}
          </h3>
          {cliente && (
            <p className="text-[11px] text-zinc-500 font-semibold mt-0.5 flex items-center gap-3">
              <span className="flex items-center gap-1"><User size={11} />{cliente.CliNombre}</span>
              {cliente.CliTelefono && <span className="flex items-center gap-1"><Phone size={11} />{cliente.CliTelefono}</span>}
            </p>
          )}
        </div>
        {retiro && <span className="text-[10px] font-black uppercase text-zinc-400">{retiro.estadoRetiro}</span>}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {rows.map((row, idx) => (
          <div key={row.orderId} className={`grid grid-cols-1 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.8fr_0.8fr_1fr_auto] gap-2 items-center bg-slate-50 border rounded-xl p-3 ${row.bloqueado ? 'border-slate-200 opacity-70' : 'border-slate-200'}`}>
            <div className="min-w-0">
              <p className="font-black text-slate-800 text-sm leading-none truncate">{row.orderNumber}</p>
              <p className="text-[10px] text-slate-400 italic font-semibold uppercase tracking-wider mt-1 truncate">{row.nombreTrabajo}</p>
              <span
                className="inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded mt-1 border"
                title="OrdenesDeposito.OReIdOrdenRetiro"
                style={row.oReId
                  ? { color: '#0e7490', background: '#ecfeff', borderColor: '#a5f3fc' }
                  : { color: '#71717a', background: '#f4f4f5', borderColor: '#e4e4e7' }}
              >
                {row.oReId ? `📦 Retiro ${row.oReId}` : 'Sin retiro'}
              </span>
              {row.exonerada && <span className="inline-block text-[9px] text-violet-600 bg-violet-50 border border-violet-200 font-black uppercase px-1.5 py-0.5 rounded mt-1 ml-1">★ Exonerada</span>}
              {row.bloqueado && <p className="text-[9px] text-emerald-600 font-black uppercase mt-1">✓ Pagada — no editable</p>}
            </div>
            <select
              disabled={row.bloqueado}
              value={row.monedaId}
              onChange={e => actualizarFila(idx, 'monedaId', e.target.value)}
              className={`w-full px-1 py-1.5 text-center font-black text-xs bg-white border rounded-lg outline-none focus:border-brand-cyan disabled:bg-slate-100 disabled:text-slate-400 ${Number(row.monedaId) !== Number(row.origMonedaId) ? 'border-brand-cyan text-brand-cyan' : 'border-slate-200 text-slate-800'}`}
            >
              <option value={1}>$ UYU</option>
              <option value={2}>US$ USD</option>
            </select>
            <input
              type="number" min="0" step="any" disabled={row.bloqueado}
              value={row.cantidad}
              onChange={e => actualizarFila(idx, 'cantidad', e.target.value)}
              className="w-full px-2 py-1.5 text-center text-slate-800 font-black text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-brand-cyan disabled:bg-slate-100 disabled:text-slate-400"
            />
            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:border-brand-cyan">
              <span className="pl-2 text-[10px] text-slate-400 font-bold shrink-0">{row.simbolo}</span>
              <input
                type="number" min="0" step="any" disabled={row.bloqueado}
                value={row.precio}
                onChange={e => actualizarFila(idx, 'precio', e.target.value)}
                className="w-full px-1 py-1.5 text-center text-slate-800 font-black text-xs bg-transparent outline-none disabled:text-slate-400"
              />
            </div>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:border-brand-cyan">
              <span className="pl-2 text-[10px] text-slate-400 font-bold shrink-0">{row.simbolo}</span>
              <input
                type="number" min="0" step="any" disabled={row.bloqueado}
                value={row.total}
                onChange={e => actualizarFila(idx, 'total', e.target.value)}
                className="w-full px-1 py-1.5 text-center text-brand-cyan font-black text-xs bg-transparent outline-none disabled:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-1">
              <select
                value={row.estadoNuevo}
                onChange={e => setRows(prev => prev.map((r, i) => i === idx ? { ...r, estadoNuevo: parseInt(e.target.value, 10) } : r))}
                className="w-full px-1 py-1.5 text-center font-black text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-brand-cyan"
              >
                {Object.entries(ESTADOS).map(([id, nombre]) => (
                  <option key={id} value={id}>{nombre}</option>
                ))}
              </select>
              <button
                onClick={() => cambiarEstado(idx)}
                disabled={saving}
                title="Aplicar cambio de estado"
                className="shrink-0 bg-zinc-700 hover:bg-zinc-800 disabled:opacity-40 text-white p-1.5 rounded-lg transition-all"
              >
                <RefreshCw size={12} />
              </button>
            </div>
            <button
              onClick={() => volverAAvisar(row)}
              disabled={notifying === row.orderId}
              title="Reenviar aviso de WhatsApp"
              className="shrink-0 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-black text-[10px] uppercase px-2 py-1.5 rounded-lg transition-all disabled:opacity-40"
            >
              {notifying === row.orderId ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
              Avisar
            </button>
          </div>
        ))}

        <div className="flex justify-end pt-1">
          <button
            onClick={guardarCambios}
            disabled={saving}
            className="bg-brand-cyan hover:bg-brand-cyan/90 disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-black py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-brand-cyan/20 flex justify-center items-center gap-2 uppercase tracking-widest text-[11px]"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle size={14} /> Guardar cotización/cantidad</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminEditarOrdenView() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState(null);

  const buscar = async (term) => {
    const value = (term ?? q).trim();
    if (value.length < 2) {
      toast.warning('Ingresá al menos 2 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/apiordenesRetiro/mostrador/buscar', { params: { q: value } });
      setResultados(data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al buscar.');
      setResultados(null);
    } finally {
      setLoading(false);
    }
  };

  // Agrupa por OReIdOrdenRetiro leído directamente de cada fila (columna real de
  // OrdenesDeposito), sin confiar en si el backend la puso en retiroRows o en sinRetiro.
  // Esto evita que una orden con retiro termine mostrada como "sin retiro" por un
  // filtro lateral de la búsqueda (ej. estado del retiro, cliente, etc.).
  const grupos = React.useMemo(() => {
    if (!resultados) return [];
    const todasLasFilas = [...(resultados.retiroRows || []), ...(resultados.sinRetiro || [])];
    const porRetiro = new Map();
    const sueltas = [];

    for (const row of todasLasFilas) {
      if (!row.OrdIdOrden) continue;
      const reId = row.OReIdOrdenRetiro || null;
      if (!reId) {
        sueltas.push(row);
        continue;
      }
      if (!porRetiro.has(reId)) {
        porRetiro.set(reId, {
          retiro: { OReIdOrdenRetiro: reId, FormaRetiro: row.FormaRetiro, lugarRetiro: row.lugarRetiro, estadoRetiro: row.estadoRetiro },
          cliente: { CliNombre: row.CliNombre, CliTelefono: row.CliTelefono },
          ordenes: [],
        });
      }
      const grupo = porRetiro.get(reId);
      // Si la fila vino de sinRetiro no trae metadata del retiro (FormaRetiro/lugar/estado) —
      // la completamos apenas aparezca una fila que sí la traiga.
      if (!grupo.retiro.lugarRetiro && row.lugarRetiro) grupo.retiro.lugarRetiro = row.lugarRetiro;
      if (!grupo.retiro.estadoRetiro && row.estadoRetiro) grupo.retiro.estadoRetiro = row.estadoRetiro;
      grupo.ordenes.push(row);
    }

    const gruposArr = Array.from(porRetiro.values());
    for (const row of sueltas) {
      gruposArr.push({ retiro: null, cliente: { CliNombre: row.CliNombre, CliTelefono: row.CliTelefono }, ordenes: [row] });
    }
    return gruposArr;
  }, [resultados]);

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-5">
      <div>
        <h1 className="font-black text-zinc-800 text-xl uppercase tracking-wider flex items-center gap-2">
          <Package className="text-brand-cyan" size={22} />
          Administración de Órdenes
        </h1>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Buscá por código de orden, código de retiro o cliente para editar cotización, cambiar estado o reenviar el aviso.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 flex items-center bg-white border border-zinc-200 rounded-xl px-3 focus-within:border-brand-cyan">
          <Search size={16} className="text-zinc-400 shrink-0" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            placeholder="Código de orden, código de retiro o cliente..."
            className="w-full px-2 py-3 text-sm font-bold text-zinc-800 outline-none bg-transparent"
          />
        </div>
        <button
          onClick={() => buscar()}
          disabled={loading}
          className="bg-brand-cyan hover:bg-brand-cyan/90 disabled:opacity-50 text-white font-black px-5 rounded-xl transition-all uppercase tracking-widest text-xs flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Buscar
        </button>
      </div>

      {resultados && grupos.length === 0 && (
        <p className="text-sm text-zinc-400 font-semibold text-center py-10">Sin resultados para "{q}".</p>
      )}

      <div className="flex flex-col gap-4">
        {grupos.map((g, i) => (
          <GrupoRetiro
            key={g.retiro?.OReIdOrdenRetiro || g.ordenes[0]?.OrdIdOrden || i}
            retiro={g.retiro}
            cliente={g.cliente}
            ordenes={g.ordenes}
            onGuardado={() => buscar(q)}
          />
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { toast } from 'sonner';
import { PlusCircle, Save, X, Edit, Trash2, BookOpen, Info } from 'lucide-react';

const fetchAPI = async (url, method = 'GET', body = undefined) => {
  try {
    const cleanUrl = url.startsWith('/api') ? url.replace('/api', '') : url;
    const config = { method, url: cleanUrl };
    if (body !== undefined) { config.data = body; config.headers = { 'Content-Type': 'application/json' }; }
    const res = await api.request(config);
    return res.data;
  } catch (error) {
    if (error.response?.data) throw new Error(error.response.data.error || error.response.data.message || 'Error');
    throw error;
  }
};

const FORMULAS = ['TOTAL', 'NETO', 'IVA', 'DESCUENTO'];

const EFECTO_LABELS = {
  '-1': { label: 'RESTA saldo', color: 'text-red-400 bg-red-900/20 border-red-800/40' },
  '0':  { label: 'NEUTRO',      color: 'text-slate-500 bg-slate-50/50 border-slate-100' },
  '1':  { label: 'SUMA saldo',  color: 'text-emerald-600 bg-emerald-900/20 border-emerald-800/40' },
};

const EMPTY_FORM = {
  EvtCodigo: '', EvtNombre: '', EvtDescripcion: '', EvtPrefijo: '', EvtSubtipo: '',
  EvtAfectaSaldo: 0, EvtGeneraDeuda: false, EvtAplicaRecurso: false,
  EvtUsaEntidad: false, EvtRequiereDoc: false, EvtActivo: true, EvtOrden: 100,
  lineas: []
};

export default function ContabilidadMotorReglasAdmin() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState('comportamiento'); // 'comportamiento' | 'asiento'

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchAPI('/api/contabilidad/motor/transacciones');
      setEventos(resp.data || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openForm = async (codigo) => {
    if (!codigo) {
      setForm({ ...EMPTY_FORM });
      setTab('comportamiento');
      setModalVisible(true);
      return;
    }
    try {
      const t = eventos.find(x => x.EvtCodigo === codigo);
      const linRes = await fetchAPI('/api/contabilidad/motor/transacciones/' + codigo + '/reglas');
      setForm({ ...t, lineas: (linRes.data || []).map(r => ({ ...r, CueCodigo: r.CueCodigo, RasNaturaleza: r.RasNaturaleza, RasFormula: r.RasFormula, RasOrden: r.RasOrden })) });
      setTab('comportamiento');
      setModalVisible(true);
    } catch (e) {
      toast.error('Error al cargar: ' + e.message);
    }
  };

  const handleSave = async () => {
    if (!form.EvtCodigo || !form.EvtNombre) return toast.error('Codigo y Nombre son obligatorios');
    try {
      await fetchAPI('/api/contabilidad/motor/transacciones', 'POST', form);
      toast.success('Evento guardado correctamente');
      setModalVisible(false);
      loadData();
    } catch (e) {
      toast.error('Error: ' + e.message);
    }
  };

  const handleDelete = async (codigo) => {
    if (!window.confirm('Eliminar este tipo de evento y sus reglas de asiento?')) return;
    try {
      await fetchAPI('/api/contabilidad/motor/transacciones/' + codigo, 'DELETE');
      toast.success('Eliminado');
      loadData();
    } catch (e) {
      toast.error('Error: ' + e.message);
    }
  };

  const addLinea = () => setForm(f => ({
    ...f, lineas: [...f.lineas, { CueCodigo: '', RasNaturaleza: 'DEBE', RasFormula: 'TOTAL', RasOrden: (f.lineas.length + 1) * 10 }]
  }));

  const removeLinea = (idx) => setForm(f => { const nl = [...f.lineas]; nl.splice(idx, 1); return { ...f, lineas: nl }; });
  const updateLinea = (idx, campo, valor) => setForm(f => { const nl = [...f.lineas]; nl[idx] = { ...nl[idx], [campo]: valor }; return { ...f, lineas: nl }; });
  const setField = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  const isExisting = form && eventos.some(x => x.EvtCodigo === form.EvtCodigo);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-3">
            <BookOpen className="text-blue-500" size={22} />
            Motor de Eventos Contables
          </h1>
          <p className="text-xs text-slate-500 mt-1 ml-9 max-w-3xl">
            Tabla unificada: define cómo cada tipo de evento afecta el saldo del cliente (Submayor)
            y qué asiento genera en el Libro Mayor. Reemplaza toda la lógica hardcodeada del sistema.
          </p>
        </div>
        <button onClick={() => openForm(null)} className="bg-blue-600 hover:bg-blue-500 text-slate-800 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all">
          <PlusCircle size={15} /> Nuevo Evento
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-white border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-3">Codigo</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Efecto Saldo</th>
                <th className="px-4 py-3">Genera Deuda</th>
                <th className="px-4 py-3">Usa Recursos</th>
                <th className="px-4 py-3">Reglas Asiento</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                  Cargando eventos...
                </td></tr>
              ) : eventos.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Sin eventos configurados</td></tr>
              ) : eventos.map(t => {
                const ef = EFECTO_LABELS[String(t.EvtAfectaSaldo)] || EFECTO_LABELS['0'];
                return (
                  <tr key={t.EvtCodigo} className="hover:bg-white/60 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-50 py-1 px-2 rounded-md text-blue-300 border border-slate-200">{t.EvtCodigo}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {t.EvtNombre}
                      {t.EvtDescripcion && <div className="text-[10px] text-slate-400 mt-0.5">{t.EvtDescripcion.substring(0,60)}{t.EvtDescripcion.length > 60 ? '...' : ''}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded border ${ef.color}`}>{ef.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {t.EvtGeneraDeuda ? <span className="text-amber-600 text-xs">Si</span> : <span className="text-slate-600 text-xs">No</span>}
                    </td>
                    <td className="px-4 py-3">
                      {t.EvtAplicaRecurso ? <span className="text-purple-400 text-xs">Si (metros/kg)</span> : <span className="text-slate-600 text-xs">No</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openForm(t.EvtCodigo)} className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2">Ver reglas</button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openForm(t.EvtCodigo)} className="p-1.5 bg-slate-50 hover:bg-blue-600 rounded text-slate-600 hover:text-slate-800 transition-colors"><Edit size={13} /></button>
                      <button onClick={() => handleDelete(t.EvtCodigo)} className="p-1.5 bg-slate-50 hover:bg-red-600 rounded text-slate-600 hover:text-slate-800 transition-colors"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-blue-900/10 border border-blue-800/30 rounded-xl text-xs text-slate-500 flex gap-3">
          <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <span>
            <b className="text-blue-300">META_CLIENTE</b> en las reglas de asiento se resuelve automaticamente a la cuenta contable del cliente involucrado en la transaccion.
            <b className="text-blue-300 ml-2">META_CAJA</b> se resuelve a la cuenta de caja activa en la sesion.
          </span>
        </div>
      </div>

      {/* Modal */}
      {modalVisible && form && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Configuracion del Evento Contable</h2>
                <p className="text-xs text-slate-400 mt-0.5">Codigo: <span className="font-mono text-blue-300">{form.EvtCodigo || '(nuevo)'}</span></p>
              </div>
              <button onClick={() => setModalVisible(false)} className="text-slate-500 hover:text-slate-800 p-1"><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-white">
              {['comportamiento', 'asiento'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                  {t === 'comportamiento' ? 'Comportamiento en Submayor' : 'Reglas de Asiento (Libro Mayor)'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50">
              {/* Tab: Comportamiento */}
              {tab === 'comportamiento' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Codigo (ID unico) *</label>
                      <input type="text" value={form.EvtCodigo} readOnly={isExisting}
                        onChange={e => setField('EvtCodigo', e.target.value.toUpperCase())}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono focus:border-blue-500 focus:outline-none"
                        placeholder="Ej: ORDEN" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre visible *</label>
                      <input type="text" value={form.EvtNombre} onChange={e => setField('EvtNombre', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Descripcion</label>
                      <input type="text" value={form.EvtDescripcion || ''} onChange={e => setField('EvtDescripcion', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Prefijo comprobante</label>
                      <input type="text" maxLength={5} value={form.EvtPrefijo || ''} onChange={e => setField('EvtPrefijo', e.target.value.toUpperCase())}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono focus:border-blue-500 focus:outline-none"
                        placeholder="FC, TK, NC..." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Subtipo / Secuencia</label>
                      <input type="text" value={form.EvtSubtipo || ''} onChange={e => setField('EvtSubtipo', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono focus:border-blue-500 focus:outline-none"
                        placeholder="FACTURA_PLAN..." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Orden de aparicion</label>
                      <input type="number" value={form.EvtOrden} onChange={e => setField('EvtOrden', parseInt(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none" />
                    </div>
                  </div>

                  {/* Comportamiento */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Comportamiento en Cuenta Corriente del Cliente (Submayor)</h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-2">Efecto en saldo del cliente</label>
                      <div className="flex gap-3">
                        {[{ val: -1, label: '-1 RESTA (genera deuda)' }, { val: 0, label: '0 NEUTRO' }, { val: 1, label: '+1 SUMA (acredita)' }].map(op => (
                          <label key={op.val} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${form.EvtAfectaSaldo === op.val ? 'border-blue-500 bg-blue-900/20 text-blue-300' : 'border-slate-200 text-slate-500 hover:border-slate-500'}`}>
                            <input type="radio" name="efecto" value={op.val} checked={form.EvtAfectaSaldo === op.val} onChange={() => setField('EvtAfectaSaldo', op.val)} className="sr-only" />
                            <span className="text-xs font-medium">{op.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'EvtGeneraDeuda', label: 'Genera documento de deuda a cobrar', desc: 'Aparecera en "Antiguedad de Deuda" y "Estados de Cuenta"' },
                        { key: 'EvtAplicaRecurso', label: 'Aplica a recursos (metros/kg)', desc: 'Descuenta del plan fisico del cliente en vez de dinero' },
                        { key: 'EvtUsaEntidad', label: 'Requiere Cliente/Proveedor', desc: 'El asiento necesita un ID de entidad asociada' },
                        { key: 'EvtRequiereDoc', label: 'Requiere comprobante fiscal', desc: 'Se debe emitir E-Factura, Ticket o Nota de Credito' },
                      ].map(opt => (
                        <label key={opt.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form[opt.key] ? 'border-blue-500/40 bg-blue-900/10' : 'border-slate-200 hover:border-slate-500'}`}>
                          <input type="checkbox" checked={!!form[opt.key]} onChange={e => setField(opt.key, e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-blue-600 bg-gray-700 border-gray-600 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-medium text-slate-700">{opt.label}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Asiento */}
              {tab === 'asiento' && (
                <div className="space-y-4">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-500">
                    Cada fila es una linea del asiento contable que se genera automaticamente.
                    Use <span className="font-mono text-emerald-300">META_CLIENTE</span> para la cuenta del cliente o <span className="font-mono text-emerald-300">META_CAJA</span> para la caja activa.
                  </div>

                  <div className="space-y-2">
                    {form.lineas.map((lin, idx) => (
                      <div key={idx} className="flex gap-2 bg-white border border-slate-200 p-3 rounded-lg items-center">
                        <div className="w-10 text-center text-[10px] font-mono text-slate-400 bg-white rounded py-1.5 border border-slate-200">#{lin.RasOrden}</div>
                        <select value={lin.RasNaturaleza} onChange={e => updateLinea(idx, 'RasNaturaleza', e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded px-2 py-2 text-sm text-slate-800 focus:outline-none cursor-pointer">
                          <option value="DEBE">DEBE</option>
                          <option value="HABER">HABER</option>
                        </select>
                        <input type="text" placeholder="Cuenta (ej: 1.1.1.01 o META_CLIENTE)"
                          value={lin.CueCodigo} onChange={e => updateLinea(idx, 'CueCodigo', e.target.value)}
                          className="flex-[2] bg-white border border-slate-200 rounded px-2 py-2 text-sm font-mono text-emerald-300 focus:outline-none" />
                        <select value={lin.RasFormula} onChange={e => updateLinea(idx, 'RasFormula', e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded px-2 py-2 text-sm text-blue-200 focus:outline-none cursor-pointer">
                          {FORMULAS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <button onClick={() => removeLinea(idx)} className="text-red-500/60 hover:text-red-400 p-1.5"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button onClick={addLinea}
                      className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-500/50 hover:bg-white rounded-lg text-slate-400 text-sm flex justify-center items-center gap-2 transition-all">
                      <PlusCircle size={14} /> Agregar linea de asiento
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                  <input type="checkbox" checked={!!form.EvtActivo} onChange={e => setField('EvtActivo', e.target.checked)} className="w-3.5 h-3.5 rounded" />
                  Activo
                </label>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalVisible(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium">Cancelar</button>
                <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-slate-800 rounded-lg flex items-center gap-2 text-sm font-semibold">
                  <Save size={14} /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

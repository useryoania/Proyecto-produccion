import React, { useState, useEffect } from 'react';
import api from '../../services/apiClient';
import { Network, FolderTree, AlertCircle, FileText, CheckCircle, Plus, X, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PlanCuentasView() {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({
    codigo: '', nombre: '', nivel: 1, tipoBase: 'ACTIVO', moneda: 'AMBAS', imputable: false, activa: true
  });

  const fetchData = () => {
    setLoading(true);
    api.get('/contabilidad/erp/cuentas').then(res => {
      if (res.data.success) setCuentas(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openForm = (cuenta = null) => {
    if (cuenta) {
      setEditingId(cuenta.CueId);
      setForm({
        codigo: cuenta.CueCodigo,
        nombre: cuenta.CueNombre,
        nivel: cuenta.CueNivel,
        tipoBase: cuenta.CueTipoBase,
        moneda: cuenta.CueMoneda,
        imputable: cuenta.CueImputable,
        activa: cuenta.CueActiva
      });
    } else {
      setEditingId(null);
      setForm({ codigo: '', nombre: '', nivel: 1, tipoBase: 'ACTIVO', moneda: 'AMBAS', imputable: false, activa: true });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/contabilidad/erp/cuentas/${editingId}`, form);
        toast.success("Cuenta actualizada con éxito");
      } else {
        await api.post('/contabilidad/erp/cuentas', form);
        toast.success("Cuenta agregada con éxito");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error al guardar");
    }
  };

  return (
    <div className="h-full bg-[#f1f5f9] p-8 overflow-y-auto font-sans">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
              <Network className="text-indigo-600" size={32} /> Plan de Cuentas Bimonetario
            </h1>
            <p className="text-slate-500 font-bold text-xs mt-2 uppercase tracking-widest">Estructura jerárquica del motor ERP.</p>
          </div>
          <button 
            onClick={() => openForm()}
            className="bg-indigo-600 hover:bg-black text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <Plus size={20} /> NUEVA CUENTA
          </button>
        </div>

        {loading ? <div className="animate-pulse flex flex-col items-center justify-center gap-4 py-20 bg-white rounded-[2.5rem] border border-slate-200"><AlertCircle className="text-indigo-400" size={48}/> <span className="text-slate-400 font-bold uppercase tracking-widest text-sm">Cargando estructura...</span></div> : (
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden pb-4">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-[0.15em] border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4 w-full">Nombre de la Cuenta</th>
                  <th className="px-6 py-4">Tipo Base</th>
                  <th className="px-6 py-4 text-center">Imputable</th>
                  <th className="px-6 py-4">Moneda</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cuentas.map(c => {
                  const padding = (c.CueNivel - 1) * 24;
                  const isParent = !c.CueImputable;
                  return (
                    <tr key={c.CueId} className={`hover:bg-slate-50 transition-colors ${!c.CueActiva ? 'opacity-40 grayscale' : ''}`}>
                      <td className="px-6 py-3 font-black text-slate-400 text-xs">{c.CueCodigo}</td>
                      <td className="px-6 py-3 flex items-center gap-3" style={{ paddingLeft: `${padding + 24}px` }}>
                        {isParent ? <FolderTree size={18} className="text-indigo-500/80" /> : <FileText size={18} className="text-slate-300" />}
                        <span className={`${isParent ? 'font-black text-slate-800' : 'font-bold text-slate-600'} text-sm`}>
                           {c.CueNombre} {!c.CueActiva && <span className="text-[10px] uppercase font-black text-rose-500 ml-2 tracking-widest">(Inactiva)</span>}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                         <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase border ${c.CueTipoBase==='ACTIVO'?'bg-emerald-50 border-emerald-200 text-emerald-600':c.CueTipoBase==='PASIVO'?'bg-rose-50 border-rose-200 text-rose-600':c.CueTipoBase==='GANANCIA'?'bg-indigo-50 border-indigo-200 text-indigo-600':c.CueTipoBase==='PERDIDA'?'bg-amber-50 border-amber-200 text-amber-600':'bg-slate-100 border-slate-200 text-slate-600'}`}>
                           {c.CueTipoBase}
                         </span>
                      </td>
                      <td className="px-6 py-3 text-center">{c.CueImputable ? <CheckCircle size={18} className="mx-auto text-emerald-500"/> : <span className="text-slate-300 font-bold">-</span>}</td>
                      <td className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">{c.CueMoneda}</td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => openForm(c)} className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors rounded-xl border border-slate-200 hover:border-indigo-200 shadow-sm"><Edit size={16}/></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {cuentas.length === 0 && (
                <div className="p-16 text-center">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No hay cuentas contables registradas.</p>
                </div>
            )}
          </div>
        )}

        {/* MODAL MANTENIMIENTO CUENTAS */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center p-8 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingId ? 'Editar Cuenta' : 'Nueva Cuenta Contable'}</h2>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 p-2 rounded-xl transition-all border border-slate-200 shadow-sm"><X size={20}/></button>
              </div>
              <form onSubmit={handleSave} className="p-8 flex flex-col gap-6">
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Código Contable</label>
                    <input autoFocus required type="text" value={form.codigo} onChange={e=>setForm({...form, codigo: e.target.value})} placeholder="Ej: 1.1.1" className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-indigo-500 transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nivel en Árbol</label>
                    <input required type="number" min="1" value={form.nivel} onChange={e=>setForm({...form, nivel: Number(e.target.value)})} className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-indigo-500 transition-all shadow-inner" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nombre de Cuenta</label>
                  <input required type="text" value={form.nombre} onChange={e=>setForm({...form, nombre: e.target.value})} placeholder="Ej: Caja Moneda Nacional" className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-indigo-500 transition-all shadow-inner" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Naturaleza (Base)</label>
                    <select value={form.tipoBase} onChange={e=>setForm({...form, tipoBase: e.target.value})} className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-inner">
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="PASIVO">PASIVO</option>
                      <option value="PATRIMONIO">PATRIMONIO NETO</option>
                      <option value="GANANCIA">INGRESOS / GANANCIAS</option>
                      <option value="PERDIDA">EGRESOS / PERDIDAS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Moneda Base</label>
                    <select value={form.moneda} onChange={e=>setForm({...form, moneda: e.target.value})} className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-inner">
                      <option value="UYU">Pesos Uruguayos (UYU)</option>
                      <option value="USD">Dólares (USD)</option>
                      <option value="AMBAS">Bimonetaria (AMBAS)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-8 mt-4 bg-slate-50 py-4 px-6 rounded-2xl border border-slate-100 shadow-inner">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.imputable} onChange={e=>setForm({...form, imputable: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                    <span className="text-xs font-black text-slate-600 tracking-tight">CUENTA IMPUTABLE</span>
                  </label>
                  
                  {editingId && (
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={form.activa} onChange={e=>setForm({...form, activa: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-indigo-600" />
                        <span className="text-xs font-black text-slate-600 tracking-tight">ACTIVA</span>
                    </label>
                  )}
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-4 rounded-[1.5rem] font-black text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors uppercase tracking-widest text-xs">Cancelar</button>
                  <button type="submit" className="bg-indigo-600 hover:bg-black text-white px-8 py-4 rounded-[1.5rem] font-black transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs">Guardar Cuenta</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

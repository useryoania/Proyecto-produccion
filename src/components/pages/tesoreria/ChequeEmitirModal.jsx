import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Landmark, Calendar, Building2, Hash, DollarSign } from 'lucide-react';
import api from '../../../services/apiClient';
import { toast } from 'sonner';

export default function ChequeEmitirModal({ onClose, onSuccess }) {
  const [bancos, setBancos] = useState([]);
  const [loadingBancos, setLoadingBancos] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [formData, setFormData] = useState({
    NumeroCheque: '',
    IdBanco: '',
    Monto: '',
    FechaEmision: new Date().toISOString().split('T')[0],
    FechaVencimiento: new Date().toISOString().split('T')[0],
    IdProveedorDestino: ''
  });

  useEffect(() => {
    fetchBancos();
  }, []);

  const fetchBancos = async () => {
    try {
      const res = await api.get('/tesoreria/bancos');
      setBancos(res.data.data || []);
    } catch (e) {
      toast.error('Error cargando bancos');
    } finally {
      setLoadingBancos(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.NumeroCheque || !formData.IdBanco || !formData.Monto) {
      return toast.error('Completar campos obligatorios');
    }
    setProcesando(true);
    try {
      const res = await api.post('/tesoreria/cheques/emitir', {
        ...formData,
        Monto: parseFloat(formData.Monto),
        IdProveedorDestino: formData.IdProveedorDestino ? parseInt(formData.IdProveedorDestino) : null
      });
      toast.success(res.data.message || 'Cheque emitido correctamente');
      onSuccess(res.data.data.IdCheque);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al emitir el cheque');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Emitir Cheque Propio</h2>
              <p className="text-sm font-medium text-slate-500">Pago diferido a Proveedores</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          {/* Fila 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <Hash size={16} className="text-slate-400" /> N° de Cheque *
              </label>
              <input
                type="text"
                name="NumeroCheque"
                value={formData.NumeroCheque}
                onChange={handleChange}
                required
                placeholder="Ej. 99887766"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <DollarSign size={16} className="text-slate-400" /> Importe *
              </label>
              <input
                type="number"
                step="0.01"
                name="Monto"
                value={formData.Monto}
                onChange={handleChange}
                required
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Fila 2 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <Landmark size={16} className="text-slate-400" /> Mi Banco (Chequera) *
            </label>
            <select
              name="IdBanco"
              value={formData.IdBanco}
              onChange={handleChange}
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            >
              <option value="">Seleccione mi banco...</option>
              {bancos.map(b => (
                <option key={b.IdBanco} value={b.IdBanco}>{b.NombreBanco}</option>
              ))}
            </select>
          </div>

          {/* Fila 3 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <Calendar size={16} className="text-slate-400" /> Fecha Emisión *
              </label>
              <input
                type="date"
                name="FechaEmision"
                value={formData.FechaEmision}
                onChange={handleChange}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <Calendar size={16} className="text-amber-400" /> Fecha Vencimiento *
              </label>
              <input
                type="date"
                name="FechaVencimiento"
                value={formData.FechaVencimiento}
                onChange={handleChange}
                required
                className="w-full border border-amber-200 rounded-xl px-4 py-2.5 font-medium text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Fila 4 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <Building2 size={16} className="text-slate-400" /> ID Proveedor Destino
            </label>
            <input
              type="number"
              name="IdProveedorDestino"
              value={formData.IdProveedorDestino}
              onChange={handleChange}
              placeholder="ID del proveedor en el sistema (opcional)"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={procesando}
            className="px-5 py-2.5 rounded-xl font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {procesando ? 'Procesando...' : <><CheckCircle size={18} /> Emitir Cheque</>}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Landmark, ArrowDownRight, ArrowUpRight, Search, Plus, Send, XCircle, CheckCircle2, ChevronRight, Clock } from 'lucide-react';
import api from '../../services/apiClient';
import { toast } from 'sonner';
import ChequeRecibirModal from './tesoreria/ChequeRecibirModal';
import ChequeEmitirModal from './tesoreria/ChequeEmitirModal';

export default function ContabilidadTesoreriaView() {
  const [bancos, setBancos] = useState([]);
  const [cheques, setCheques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('CARTERA'); // CARTERA, PROPIOS, HISTORIAL
  
  const [showRecibirModal, setShowRecibirModal] = useState(false);
  const [showEmitirModal, setShowEmitirModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resBancos, resCheques] = await Promise.all([
        api.get('/tesoreria/bancos'),
        api.get('/tesoreria/cheques')
      ]);
      setBancos(resBancos.data.data);
      setCheques(resCheques.data.data);
    } catch (error) {
      toast.error('Error cargando datos de Tesorería');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCheques = () => {
    if (tab === 'CARTERA') return cheques.filter(c => c.Tipo === 'TERCERO' && c.Estado === 'EN_CARTERA');
    if (tab === 'PROPIOS') return cheques.filter(c => c.Tipo === 'PROPIO' && c.Estado === 'EMITIDO');
    return cheques;
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(val);

  const getStateColor = (estado) => {
    const colors = {
      'EN_CARTERA': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'DEPOSITADO': 'bg-blue-100 text-blue-800 border-blue-200',
      'ENDOSADO': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'EMITIDO': 'bg-amber-100 text-amber-800 border-amber-200',
      'RECHAZADO': 'bg-red-100 text-red-800 border-red-200',
      'COBRADO': 'bg-slate-100 text-slate-800 border-slate-200',
    };
    return colors[estado] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 z-10 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
              <Landmark size={28} />
            </div>
            Tesorería & Cartera
          </h1>
          <p className="text-slate-500 font-medium mt-1">Gestión de cheques propios y de terceros</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowRecibirModal(true)}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-100 transition-colors border border-emerald-200">
            <ArrowDownRight size={20} /> Recibir Cheque
          </button>
          <button 
            onClick={() => setShowEmitirModal(true)}
            className="flex items-center gap-2 bg-amber-50 text-amber-700 px-5 py-2.5 rounded-xl font-bold hover:bg-amber-100 transition-colors border border-amber-200">
            <ArrowUpRight size={20} /> Emitir Cheque
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="px-8 pt-6">
        <div className="flex gap-4 border-b border-slate-200">
          <TabButton active={tab === 'CARTERA'} onClick={() => setTab('CARTERA')} label="Cartera (Terceros)" count={cheques.filter(c => c.Tipo === 'TERCERO' && c.Estado === 'EN_CARTERA').length} />
          <TabButton active={tab === 'PROPIOS'} onClick={() => setTab('PROPIOS')} label="Cheques Emitidos" count={cheques.filter(c => c.Tipo === 'PROPIO' && c.Estado === 'EMITIDO').length} />
          <TabButton active={tab === 'HISTORIAL'} onClick={() => setTab('HISTORIAL')} label="Historial Completo" />
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Nº Cheque / Banco</th>
                <th className="p-4">Importe</th>
                <th className="p-4">Fechas</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : getFilteredCheques().length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-medium">No hay cheques en esta vista</td></tr>
              ) : (
                getFilteredCheques().map(cheque => (
                  <tr key={cheque.IdCheque} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-slate-800 text-base">{cheque.NumeroCheque}</div>
                      <div className="text-sm text-slate-500">{cheque.NombreBanco}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-black text-slate-800 text-lg">{formatCurrency(cheque.Monto)}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        <span className="text-slate-400 w-8">Emi:</span> {new Date(cheque.FechaEmision).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-bold text-indigo-700 flex items-center gap-1">
                        <span className="text-slate-400 w-8 font-medium">Vto:</span> {new Date(cheque.FechaVencimiento).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${getStateColor(cheque.Estado)}`}>
                        {cheque.Estado.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      {cheque.Estado === 'EN_CARTERA' && (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="bg-blue-50 text-blue-700 p-2 rounded-lg hover:bg-blue-100 font-bold text-sm" title="Depositar">
                            Depositar
                          </button>
                          <button className="bg-indigo-50 text-indigo-700 p-2 rounded-lg hover:bg-indigo-100 font-bold text-sm" title="Endosar">
                            Endosar
                          </button>
                          <button className="bg-red-50 text-red-700 p-2 rounded-lg hover:bg-red-100 font-bold text-sm" title="Rebotar">
                            Rechazar
                          </button>
                        </div>
                      )}
                      {cheque.Estado === 'EMITIDO' && (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="bg-emerald-50 text-emerald-700 p-2 rounded-lg hover:bg-emerald-100 font-bold text-sm" title="Marcar Cobrado">
                            Cobrado (Débito)
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {showRecibirModal && (
        <ChequeRecibirModal 
          onClose={() => setShowRecibirModal(false)} 
          onSuccess={() => {
            setShowRecibirModal(false);
            fetchData();
          }} 
        />
      )}
      {showEmitirModal && (
        <ChequeEmitirModal 
          onClose={() => setShowEmitirModal(false)} 
          onSuccess={() => {
            setShowEmitirModal(false);
            fetchData();
          }} 
        />
      )}
    </div>
  );
}

const TabButton = ({ active, onClick, label, count }) => (
  <button
    onClick={onClick}
    className={`pb-4 px-2 font-bold text-base transition-colors relative ${
      active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    {label}
    {count !== undefined && (
      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
    )}
    {active && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />}
  </button>
);

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowDownCircle, CreditCard, Edit3 } from 'lucide-react';
import api from '../../services/apiClient';
import CajaPanelPago from './CajaPanelPago';

const TIPOS_DOC_PAGO = [
  { value: '05', label: 'Recibo' },
  { value: 'NINGUNO', label: 'Sin documento' },
];

export default function CajaOtrosIngresosTab({ sesion, metodosPago = [], cotizacion = 1, tiposDocDisponibles = TIPOS_DOC_PAGO, onCobroCompletado, isAdminCaja }) {
  
  const [concepto, setConcepto] = useState('');
  const [montoIngreso, setMontoIngreso] = useState('');
  const [moneda, setMoneda] = useState('UYU');
  
  const [pagos, setPagos]         = useState([{ id: Date.now(), metodoPagoId: '', moneda: 'UYU', monedaId: 1, monto: '' }]);
  const [tipoDoc, setTipoDoc]     = useState('05');
  const [serieDoc, setSerieDoc]   = useState('A');
  const [observaciones, setObservaciones] = useState('');
  const [procesando, setProcesando] = useState(false);

  // Auto-seleccionar primer método de pago y tipo doc
  useEffect(() => {
    if (metodosPago.length > 0 && !pagos[0].metodoPagoId) {
      const contado = metodosPago.find(m => /contado|efectivo/i.test(m.MPaDescripcionMetodo));
      const def = contado || metodosPago[0];
      setPagos([{ id: Date.now(), metodoPagoId: def.MPaIdMetodoPago, moneda: 'UYU', monedaId: 1, monto: '' }]);
    }
  }, [metodosPago]);

  useEffect(() => {
    if (tiposDocDisponibles.length > 0 && !tipoDoc) {
      setTipoDoc(tiposDocDisponibles[0].value);
    }
  }, [tiposDocDisponibles]);

  // Actualizar monto de pago cuando cambia montoIngreso (para UX rápida)
  useEffect(() => {
    if (pagos.length === 1 && montoIngreso) {
      setPagos(prev => [{...prev[0], monto: montoIngreso}]);
    }
  }, [montoIngreso]);

  const handleProcesar = async () => {
    if (!concepto.trim()) return toast.warning('Debe ingresar un concepto para el ingreso.');
    const m = parseFloat(montoIngreso);
    if (isNaN(m) || m <= 0) return toast.warning('El monto debe ser mayor a 0.');

    const pagosValidos = pagos.filter(p => parseFloat(p.monto) > 0 && p.metodoPagoId);
    if (!pagosValidos.length) return toast.warning('Ingrese al menos un método de pago.');

    const totalPagado = pagosValidos.reduce((a, p) => {
      const pM = parseFloat(p.monto) || 0;
      if (moneda === 'UYU') return a + (p.moneda === 'USD' ? pM * cotizacion : pM);
      return a + (p.moneda === 'UYU' ? pM / cotizacion : pM);
    }, 0);

    if (Math.abs(m - totalPagado) > 0.5) {
      return toast.warning(`Falta cubrir el monto declarado (Declarado: ${m}, Pagado: ${totalPagado.toFixed(2)}).`);
    }

    setProcesando(true);
    try {
      const res = await api.post('/contabilidad/caja/ingreso-generico', {
        stuIdSesion: isAdminCaja ? null : sesion?.StuIdSesion,
        concepto: concepto.trim(),
        monto: m,
        moneda: moneda,
        monedaId: moneda === 'USD' ? 2 : 1,
        cotizacion: moneda === 'USD' ? cotizacion : null,
        metodoPagoId: parseInt(pagosValidos[0].metodoPagoId, 10), // Asumimos 1 solo medio de pago para simplificar el asiento
        tipoDocumento: tipoDoc,
        serieDoc: serieDoc,
        observaciones: observaciones,
        admin: isAdminCaja
      });

      toast.success(`Ingreso registrado exitosamente.`);
      setConcepto('');
      setMontoIngreso('');
      setObservaciones('');
      setPagos([{ id: Date.now(), metodoPagoId: metodosPago[0]?.MPaIdMetodoPago || '', moneda: 'UYU', monedaId: 1, monto: '' }]);
      
      if (onCobroCompletado) onCobroCompletado(res.data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al registrar el ingreso.');
    } finally { setProcesando(false); }
  };

  return (
    <div className="flex flex-1 overflow-hidden min-w-0 h-full">

      {/* ─── 1. COLUMNA IZQUIERDA: Formulario de Ingreso ───────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
        <div className="p-10 max-w-2xl mx-auto w-full flex flex-col gap-8">
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
              <ArrowDownCircle size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Otros Ingresos a Caja</h2>
              <p className="text-slate-500 font-bold mt-1">Registrá entradas de dinero genéricas que no estén asociadas a clientes ni facturación.</p>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col gap-6">
            
            <div className="flex flex-col gap-3">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                 Concepto / Descripción del Ingreso
               </label>
               <div className="relative group">
                 <Edit3 size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                 <input 
                   type="text" 
                   value={concepto}
                   onChange={e => setConcepto(e.target.value)}
                   placeholder="Ej: Aporte de socio, Ingreso extraordinario..." 
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl pl-16 pr-6 py-4 text-slate-800 font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all"
                 />
               </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                 Importe y Moneda
               </label>
               <div className="flex border-2 border-slate-100 rounded-3xl bg-slate-50 focus-within:border-emerald-500 focus-within:bg-white transition-all overflow-hidden items-stretch">
                 <select 
                   value={moneda}
                   onChange={e => setMoneda(e.target.value)}
                   className="bg-transparent px-6 font-black text-slate-700 outline-none text-lg cursor-pointer hover:bg-slate-100 border-r-2 border-slate-100"
                 >
                   <option value="UYU">UYU</option>
                   <option value="USD">USD</option>
                 </select>
                 <input 
                   type="number" 
                   value={montoIngreso}
                   onChange={e => setMontoIngreso(e.target.value)}
                   placeholder="0.00" 
                   className="flex-1 bg-transparent px-6 py-4 text-3xl font-black text-emerald-600 outline-none text-right placeholder-emerald-200"
                 />
               </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                 Observaciones Adicionales (Opcional)
               </label>
               <textarea 
                 value={observaciones}
                 onChange={e => setObservaciones(e.target.value)}
                 placeholder="Detalles adicionales si son necesarios..." 
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-slate-800 font-bold focus:border-emerald-500 focus:bg-white outline-none h-24 resize-none transition-all"
               />
            </div>

          </div>
        </div>
      </div>

      {/* ─── 2. COLUMNA DERECHA: PANEL FIJO DE PAGO ───────────────────────────── */}
      <div className="w-[420px] shrink-0 border-l border-slate-200 bg-white relative shadow-xl z-20 flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600 z-30"></div>
        
        <div className="p-6 border-b border-slate-100 bg-slate-50/80">
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-widest">
              <CreditCard size={16} className="text-emerald-600"/> Confirmar Ingreso
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-black">CÓMO ENTRÓ EL DINERO</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <CajaPanelPago
            mode="MOTOR"
            labelBoton="REGISTRAR INGRESO"
            metodosPago={metodosPago}
            pagos={pagos}
            onPagosChange={setPagos}
            totalACubrir={parseFloat(montoIngreso) || 0}
            moneda={moneda}
            cotizacion={cotizacion}
            procesando={procesando}
            onConfirmar={handleProcesar}
            tipoDoc={tipoDoc}
            onTipoDoc={setTipoDoc}
            serieDoc={serieDoc}
            onSerieDoc={setSerieDoc}
            numDoc=""
            tiposDocDisponibles={tiposDocDisponibles.length > 0 ? tiposDocDisponibles : TIPOS_DOC_PAGO}
            disabledExtra={!concepto || !montoIngreso}
          />
        </div>
      </div>

    </div>
  );
}

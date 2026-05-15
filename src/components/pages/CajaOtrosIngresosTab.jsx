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
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-w-0 h-full gap-0 bg-zinc-50">

      {/* ─── 1. COLUMNA IZQUIERDA: Formulario de Ingreso ───────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-200 overflow-y-auto p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-brand-cyan/10 rounded-2xl flex items-center justify-center text-brand-cyan shadow-sm border border-brand-cyan/20">
            <ArrowDownCircle size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-800 tracking-tight">Otros Ingresos a Caja</h2>
            <p className="text-zinc-500 font-bold mt-1 text-sm">Registrá entradas de dinero genéricas que no estén asociadas a clientes ni facturación.</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 flex-1">
          <div className="flex flex-col gap-3">
             <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1 font-archivo">
               Concepto / Descripción del Ingreso
             </label>
             <div className="relative group">
               <Edit3 size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-brand-cyan transition-colors" />
               <input 
                 type="text" 
                 value={concepto}
                 onChange={e => setConcepto(e.target.value)}
                 placeholder="Ej: Aporte de socio, Ingreso extraordinario..." 
                 className="w-full bg-white border-2 border-zinc-200 rounded-2xl pl-16 pr-6 py-4 text-zinc-800 font-bold focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 outline-none transition-all placeholder-zinc-400"
               />
             </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
             <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1 font-archivo">
               Importe y Moneda
             </label>
             <div className="flex border-2 border-zinc-200 rounded-2xl bg-white focus-within:border-brand-cyan focus-within:ring-4 focus-within:ring-brand-cyan/5 transition-all overflow-hidden items-stretch">
               <select 
                 value={moneda}
                 onChange={e => setMoneda(e.target.value)}
                 className="bg-zinc-50 px-6 font-black text-zinc-700 outline-none text-lg cursor-pointer border-r-2 border-zinc-200"
               >
                 <option value="UYU">UYU</option>
                 <option value="USD">USD</option>
               </select>
               <input 
                 type="number" 
                 value={montoIngreso}
                 onChange={e => setMontoIngreso(e.target.value)}
                 placeholder="0.00" 
                 className="flex-1 bg-transparent px-6 py-4 text-3xl font-black text-zinc-800 outline-none text-right placeholder-zinc-300"
               />
             </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
             <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1 font-archivo">
               Observaciones Adicionales (Opcional)
             </label>
             <textarea 
               value={observaciones}
               onChange={e => setObservaciones(e.target.value)}
               placeholder="Detalles adicionales si son necesarios..." 
               className="w-full bg-white border-2 border-zinc-200 rounded-2xl px-6 py-4 text-zinc-800 font-bold focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 outline-none h-24 resize-none transition-all placeholder-zinc-400"
             />
          </div>

        </div>
      </div>

      {/* ─── 2. COLUMNA DERECHA: PANEL FIJO DE PAGO ───────────────────────────── */}
      <div className="flex-1 relative bg-white z-20 flex flex-col h-full overflow-hidden shadow-sm">
        <div className="flex-1 flex flex-col h-full bg-transparent overflow-y-auto">
          <CajaPanelPago
            containerClassName="w-full flex flex-col h-full bg-transparent overflow-y-auto"
            mode="VENTA"
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

import React, { useState, useRef, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Search, Loader2, ArrowRight, User, Trash2, Wallet, Plus, AlertCircle, DollarSign } from 'lucide-react';
import api from '../../services/apiClient';
import { toast } from 'sonner';
import ClienteBilletera from '../common/ClienteBilletera';
import CajaPanelPago from './CajaPanelPago';
import { CustomSelect } from '../../client-portal/pautas/CustomSelect';

export default function CajaCobroLibreTab({ sesion, onCobroCompletado, metodosPago, cotizacion, tiposDocDisponibles = [] }) {
  const [qCliente, setQCliente] = useState('');
  const [buscandoCli, setBuscandoCli] = useState(false);
  const [clientesRes, setClientesRes] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);

  const [concepto, setConcepto] = useState('');
  const [importe, setImporte] = useState('');
  const [moneda, setMoneda] = useState('UYU');
  
  const [pagos, setPagos] = useState([{ id: Date.now(), metodoPagoId: '', moneda: 'UYU', monedaId: 1, monto: '' }]);
  const [observaciones, setObservaciones] = useState('');
  const [tipoDoc, setTipoDoc] = useState('');
  const [serieDoc, setSerieDoc] = useState('A');
  const [procesando, setProcesando] = useState(false);
  const [numDocPredict, setNumDocPredict] = useState('');

  // Focus and search variables
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (metodosPago && metodosPago.length > 0 && !pagos[0].metodoPagoId) {
      const contado = metodosPago.find(m => /contado/i.test(m.MPaDescripcionMetodo));
      if (contado) {
        setPagos([{ id: Date.now(), metodoPagoId: contado.MPaIdMetodoPago, moneda: 'UYU', monedaId: 1, monto: '' }]);
      } else {
        setPagos([{ id: Date.now(), metodoPagoId: metodosPago[0].MPaIdMetodoPago, moneda: 'UYU', monedaId: 1, monto: '' }]);
      }
    }
  }, [metodosPago]);

  // Auto-seleccionar el primer tipo de documento disponible
  useEffect(() => {
    if (tiposDocDisponibles.length > 0 && !tipoDoc) {
      setTipoDoc(tiposDocDisponibles[0].value);
    }
  }, [tiposDocDisponibles]);

  useEffect(() => {
    if (!qCliente.trim()) { setClientesRes([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setBuscandoCli(true);
      try {
        const res = await api.get(`/contabilidad/clientes-activos?q=${encodeURIComponent(qCliente)}&tipo=TODOS`);
        setClientesRes(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) { toast.error('Error buscando clientes'); }
      finally { setBuscandoCli(false); }
    }, 400);
  }, [qCliente]);
  
  useEffect(() => {
    if (tipoDoc && tipoDoc !== 'NINGUNO') {
      setNumDocPredict('...');
      api.get(`/contabilidad/caja/siguiente-numero?tipoDoc=${tipoDoc}&serie=${serieDoc}`)
        .then(r => { if(r.data.success) setNumDocPredict(r.data.NumeroFormato); })
        .catch(() => setNumDocPredict('?'));
    } else {
      setNumDocPredict('Sin Número');
    }
  }, [tipoDoc, serieDoc]);

  const importeTotal = parseFloat(importe) || 0;

  // Detectar si el tipo de documento seleccionado es a crédito (AfectaCtaCte)
  const esCredito = tiposDocDisponibles.find(t => t.value === tipoDoc)?.AfectaCtaCte === true;

  const handleProcesar = async () => {
    if (!clienteSel) return toast.warning('Debe seleccionar un cliente.');
    if (!concepto.trim()) return toast.warning('Debe ingresar un concepto o detalle.');
    if (importeTotal <= 0) return toast.warning('El importe debe ser mayor a 0.');
    
    const pagosValidos = pagos.filter(p => parseFloat(p.monto) > 0 && p.metodoPagoId);

    // Si NO es crédito, se exige pago
    if (!esCredito) {
      if (pagosValidos.length === 0) return toast.warning('Debe ingresar al menos un método de pago.');
      const totalIngresado = pagosValidos.reduce((acc, p) => {
        const m = parseFloat(p.monto) || 0;
        if (moneda === 'UYU') return acc + (p.moneda === 'USD' ? m * (cotizacion || 1) : m);
        return acc + (p.moneda === 'UYU' ? m / (cotizacion || 1) : m);
      }, 0);
      const diferencia = importeTotal - totalIngresado;
      const tolerancia = moneda === 'USD' ? 0.05 : 1.0;
      if (diferencia > tolerancia) {
        return toast.warning(`Falta cubrir el saldo total (${moneda === 'USD' ? 'U$' : '$'} ${diferencia.toFixed(2)}). Puede presionar 'Completar Saldo'.`);
      }
    }

    setProcesando(true);
    try {
      const payload = {
        header: {
          clienteId: clienteSel.CliIdCliente,
          tipoDocumento: tipoDoc,
          serieDoc: serieDoc,
          observaciones: observaciones || concepto,
          esCredito,
          moneda: moneda,
        },
        aplicaciones: [
          {
            tipo: 'VENTA_LIBRE',
            codigoRef: 'LIBRE',
            descripcion: concepto,
            montoOriginal: moneda === 'UYU' ? importeTotal : (importeTotal * cotizacion),
            ajuste: 0
          }
        ],
        pagos: esCredito ? [] : pagosValidos.map(p => ({
          metodoPagoId: parseInt(p.metodoPagoId, 10),
          moneda: p.moneda,
          monedaId: p.moneda === 'USD' ? 2 : 1,
          montoOriginal: parseFloat(p.monto),
          cotizacion: p.moneda === 'USD' ? cotizacion : 1
        }))
      };

      const res = await api.post('/contabilidad/caja/transaccion', payload);
      const msg = esCredito
        ? `Factura a crédito registrada. Deuda generada en cuenta corriente.`
        : `Cobro registrado exitosamente.`;
      toast.success(msg);
      
      setConcepto('');
      setImporte('');
      setObservaciones('');
      if (pagosValidos.length > 0) {
        setPagos([{ id: Date.now(), metodoPagoId: pagosValidos[0].metodoPagoId, moneda: 'UYU', monedaId: 1, monto: '' }]);
      } else {
        setPagos([{ id: Date.now(), metodoPagoId: '', moneda: 'UYU', monedaId: 1, monto: '' }]);
      }
      
      if (onCobroCompletado) onCobroCompletado(res.data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al procesar');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-zinc-50">
      {clienteSel && (
        <div className="px-5 py-1 border-b border-zinc-200 bg-white/80 sticky top-0 z-20 shrink-0 shadow-sm">
          <ClienteBilletera clienteId={clienteSel.CliIdCliente} clienteNombre={clienteSel.Nombre} />
        </div>
      )}

      <div className="flex-1 p-0 overflow-y-auto w-full flex flex-col">
        <div className="flex flex-col md:flex-row gap-0 w-full flex-1 bg-white">
          
          {/* COLUMNA IZQUIERDA */}
          <div className="flex flex-col flex-1 border-r border-zinc-200 min-w-0">
            <h2 className="text-2xl font-black text-zinc-800 flex items-center gap-3 px-6 pt-6 pb-2 shrink-0">
              <div className="bg-brand-cyan/10 p-2 rounded-xl border border-brand-cyan/20">
                <Wallet size={24} className="text-brand-cyan" />
              </div>
              Venta Libre / Saldo a Favor
            </h2>

            {/* CLiente */}
            <div className="bg-white border-b border-zinc-200 rounded-none p-6 shadow-sm shrink-0">
            <h3 className="font-black text-zinc-400 text-[11px] uppercase tracking-widest mb-6 font-archivo">1. Seleccionar Cliente</h3>
            
            {!clienteSel ? (
              <div className="relative">
                <div className="flex items-center bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-5 py-2 focus-within:border-brand-cyan focus-within:bg-white focus-within:ring-8 focus-within:ring-brand-cyan/5 transition-all">
                  <Search size={22} className="text-zinc-400" />
                  <input 
                      value={qCliente} 
                      onChange={e=>setQCliente(e.target.value)} 
                      placeholder="Buscar por Nombre, RUC o Código..." 
                      className="w-full bg-transparent text-zinc-800 px-4 py-3 outline-none text-base font-bold placeholder-zinc-400" 
                  />
                  {buscandoCli && <Loader2 size={20} className="text-brand-cyan animate-spin" />}
                </div>
                
                {clientesRes.length > 0 && (
                  <div className="absolute top-full mt-3 left-0 right-0 bg-white border border-zinc-200 rounded-3xl shadow-[0_30px_90px_rgba(15,23,42,0.15)] z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5">
                    {clientesRes.map(c => (
                      <div key={c.CliIdCliente} onClick={()=>{setClienteSel(c); setClientesRes([]); setQCliente('');}} className="w-full text-left px-6 py-5 hover:bg-brand-cyan/10 cursor-pointer border-b border-zinc-50 last:border-0 flex items-center justify-between transition-all active:scale-[0.99] group">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center font-black text-zinc-400 border border-zinc-200 shadow-sm group-hover:bg-white group-hover:border-brand-cyan/30 group-hover:text-brand-cyan transition-all">{c.Nombre?.[0] || 'C'}</div>
                            <div className="flex flex-col gap-1">
                                <span className="text-zinc-900 font-black text-lg group-hover:text-brand-cyan transition-colors">{c.Nombre}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2.5 py-1 rounded-md font-mono font-black uppercase border border-zinc-200 tracking-tight">ID: {c.CliIdCliente}</span>
                                </div>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-brand-cyan/5 border-2 border-brand-cyan/20 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center text-brand-cyan shadow-xl border border-brand-cyan/20 ring-4 ring-brand-cyan/10/30">
                    <User size={32} />
                  </div>
                  <div>
                    <p className="text-zinc-900 text-xl font-black leading-tight tracking-tight">{clienteSel.Nombre}</p>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">ID: {clienteSel.CodCliente || clienteSel.CliIdCliente}</p>
                  </div>
                </div>
                <button onClick={()=>setClienteSel(null)} className="bg-white hover:bg-rose-50 text-zinc-400 hover:text-rose-600 p-4 rounded-2xl transition-all border border-zinc-200 hover:border-rose-200 shadow-sm hover:shadow-md">
                  <Trash2 size={24}/>
                </button>
              </div>
            )}
          </div>

            {/* Concepto y Monto */}
            <div className="bg-white rounded-none p-6 flex flex-col gap-6 flex-1">
              <h3 className="font-black text-zinc-400 text-[11px] uppercase tracking-widest font-archivo">2. Ingrese Concepto e Importe</h3>

              <div>
                <label className="text-[10px] font-black tracking-widest uppercase text-zinc-400 ml-2 mb-2 block font-archivo">Concepto / Servicio</label>
                <input 
                  type="text" 
                  value={concepto}
                  onChange={e=>setConcepto(e.target.value)}
                  placeholder="Ej: Servicio de Mantenimiento..."
                  className="w-full border-2 border-zinc-200 bg-white rounded-2xl px-5 py-4 focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 outline-none text-base font-bold text-zinc-800 transition-all placeholder-zinc-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-black tracking-widest uppercase text-zinc-400 ml-2 mb-2 block font-archivo">Importe de la Operación</label>
                <div className="flex rounded-2xl overflow-hidden border-2 border-zinc-200 bg-white focus-within:border-brand-cyan transition-colors focus-within:ring-4 focus-within:ring-brand-cyan/5">
                  <div className="w-32 bg-zinc-50 border-r border-zinc-200">
                    <CustomSelect
                        value={moneda}
                        onChange={setMoneda}
                        options={[{ value: 'UYU', label: '$ (UYU)' }, { value: 'USD', label: 'U$S (USD)' }]}
                        variant="white"
                        size="normal"
                        className="rounded-none border-none shadow-none bg-transparent"
                    />
                  </div>
                  <input 
                    type="number"
                    value={importe}
                    onChange={e=>setImporte(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-5 py-4 bg-transparent flex-1 outline-none font-black text-2xl text-zinc-800 placeholder-zinc-300"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="flex flex-col flex-1 bg-white min-w-0">
            {/* Metodo de Pago */}
            <div className="bg-white rounded-none p-6 relative overflow-hidden flex flex-col justify-between flex-1">
              
              <h3 className="font-black text-zinc-400 text-[11px] uppercase tracking-widest mb-6 font-archivo">3. Cobro y Documentación</h3>

              {/* Banner de crédito */}
              {esCredito && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                  <AlertCircle className="text-amber-500 shrink-0" size={20} />
                  <div>
                    <p className="text-amber-700 font-black text-xs uppercase tracking-widest">Documento a Crédito</p>
                    <p className="text-amber-600/70 text-[10px] font-bold mt-1 leading-relaxed uppercase tracking-wider">
                      No se requiere pago hoy. El monto quedará registrado como deuda pendiente.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex-1 flex flex-col -mx-6 -mb-6 mt-4 border-t border-zinc-200">
                <CajaPanelPago 
                    containerClassName="w-full flex flex-col h-full bg-zinc-50/50"
                    mode="VENTA"
                    metodosPago={metodosPago}
                    pagos={pagos}
                    onPagosChange={setPagos}
                    totalACubrir={importeTotal}
                    moneda={moneda}
                    cotizacion={cotizacion}
                    procesando={procesando}
                    onConfirmar={handleProcesar}
                    notas={observaciones}
                    onNotas={setObservaciones}
                    tipoDoc={tipoDoc}
                    onTipoDoc={setTipoDoc}
                    serieDoc={serieDoc}
                    onSerieDoc={setSerieDoc}
                    numDoc={numDocPredict}
                    tiposDocDisponibles={tiposDocDisponibles}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

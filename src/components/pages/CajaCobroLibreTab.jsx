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
    <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
      {clienteSel && (
        <div className="px-5 py-1 border-b border-zinc-800 bg-zinc-900 sticky top-0 z-20 shrink-0 shadow-sm">
          <ClienteBilletera clienteId={clienteSel.CliIdCliente} clienteNombre={clienteSel.Nombre} />
        </div>
      )}

      <div className="flex-1 p-6 overflow-y-auto w-full flex justify-center">
        <div className="flex flex-col gap-8 w-full max-w-4xl">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="bg-brand-gold/10 p-2 rounded-xl border border-brand-gold/20">
              <Wallet size={24} className="text-brand-gold" />
            </div>
            Venta Libre / Saldo a Favor
          </h2>

          {/* CLiente */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-sm">
            <h3 className="font-black text-zinc-500 text-[11px] uppercase tracking-widest mb-6">1. Seleccionar Cliente</h3>
            
            {!clienteSel ? (
              <div className="relative">
                <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-2 focus-within:border-brand-gold/50 focus-within:ring-8 focus-within:ring-brand-gold/5 transition-all">
                  <Search size={22} className="text-zinc-600" />
                  <input 
                      value={qCliente} 
                      onChange={e=>setQCliente(e.target.value)} 
                      placeholder="Buscar por Nombre, RUC o Código..." 
                      className="w-full bg-transparent text-white px-4 py-3 outline-none text-base font-bold placeholder-zinc-700" 
                  />
                  {buscandoCli && <Loader2 size={20} className="text-brand-gold animate-spin" />}
                </div>
                
                {clientesRes.length > 0 && (
                  <div className="absolute top-full mt-3 left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                    {clientesRes.map(c => (
                      <div key={c.CliIdCliente} onClick={()=>{setClienteSel(c); setClientesRes([]); setQCliente('');}} className="w-full text-left px-6 py-5 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-brand-gold flex items-center justify-center font-black border border-zinc-700">{c.Nombre?.[0] || 'C'}</div>
                            <div className="flex flex-col gap-1">
                                <span className="text-white font-black text-lg">{c.Nombre}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-1 rounded font-mono border border-zinc-700">ID: {c.CliIdCliente}</span>
                                </div>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-brand-gold shadow-sm border border-zinc-800"><User size={24} /></div>
                  <div>
                    <p className="text-white text-lg font-black leading-tight">{clienteSel.Nombre}</p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">ID: {clienteSel.CodCliente || clienteSel.CliIdCliente}</p>
                  </div>
                </div>
                <button onClick={()=>setClienteSel(null)} className="text-zinc-600 hover:text-rose-500 p-3 hover:bg-rose-500/10 rounded-xl transition-colors"><Trash2 size={24}/></button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Concepto y Monto */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-sm flex flex-col gap-6">
              <h3 className="font-black text-zinc-500 text-[11px] uppercase tracking-widest">2. Ingrese Concepto e Importe</h3>

              <div>
                <label className="text-[10px] font-black tracking-widest uppercase text-zinc-500 ml-2 mb-2 block">Concepto / Servicio</label>
                <input 
                  type="text" 
                  value={concepto}
                  onChange={e=>setConcepto(e.target.value)}
                  placeholder="Ej: Servicio de Mantenimiento..."
                  className="w-full border border-zinc-800 bg-zinc-950 rounded-2xl px-5 py-4 focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/5 outline-none text-base font-bold text-white transition-all placeholder-zinc-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-black tracking-widest uppercase text-zinc-500 ml-2 mb-2 block">Importe de la Operación</label>
                <div className="flex rounded-2xl overflow-hidden border border-zinc-800 focus-within:border-brand-gold transition-colors focus-within:ring-4 focus-within:ring-brand-gold/5">
                  <div className="w-32 bg-zinc-950 border-r border-zinc-800">
                    <CustomSelect
                        value={moneda}
                        onChange={setMoneda}
                        options={[{ value: 'UYU', label: '$ (UYU)' }, { value: 'USD', label: 'U$S (USD)' }]}
                        variant="black"
                        size="normal"
                        className="rounded-none border-none"
                    />
                  </div>
                  <input 
                    type="number"
                    value={importe}
                    onChange={e=>setImporte(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-5 py-4 bg-zinc-950 flex-1 outline-none font-black text-2xl text-white"
                  />
                </div>
              </div>

            </div>

            {/* Metodo de Pago */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 inset-x-0 h-1 bg-brand-gold"></div>
              
              <h3 className="font-black text-zinc-500 text-[11px] uppercase tracking-widest mb-6">3. Cobro y Documentación</h3>

              {/* Banner de crédito */}
              {esCredito && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4 flex items-start gap-3">
                  <AlertCircle className="text-amber-500 shrink-0" size={20} />
                  <div>
                    <p className="text-amber-500 font-black text-xs uppercase tracking-widest">Documento a Crédito</p>
                    <p className="text-amber-500/70 text-[10px] font-bold mt-1 leading-relaxed uppercase tracking-wider">
                      No se requiere pago hoy. El monto quedará registrado como deuda pendiente.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex-1">
                <CajaPanelPago 
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

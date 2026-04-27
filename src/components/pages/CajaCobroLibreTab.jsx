import React, { useState, useRef, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Search, Loader2, ArrowRight, User, Trash2, Wallet, Plus, AlertCircle } from 'lucide-react';
import api from '../../services/apiClient';
import { toast } from 'sonner';
import ClienteBilletera from '../common/ClienteBilletera';
import CajaPanelPago from './CajaPanelPago';

export default function CajaCobroLibreTab({ sesion, onCobroCompletado, metodosPago, cotizacion }) {
  const [qCliente, setQCliente] = useState('');
  const [buscandoCli, setBuscandoCli] = useState(false);
  const [clientesRes, setClientesRes] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);

  const [concepto, setConcepto] = useState('');
  const [importe, setImporte] = useState('');
  const [moneda, setMoneda] = useState('UYU');
  
  const [pagos, setPagos] = useState([{ id: Date.now(), metodoPagoId: '', moneda: 'UYU', monedaId: 1, monto: '' }]);
  const [observaciones, setObservaciones] = useState('');
  const [tipoDoc, setTipoDoc] = useState('ETICKET');
  const [serieDoc, setSerieDoc] = useState('A');
  const [procesando, setProcesando] = useState(false);

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

  const importeTotal = parseFloat(importe) || 0;

  const handleProcesar = async () => {
    if (!clienteSel) return toast.warning('Debe seleccionar un cliente.');
    if (!concepto.trim()) return toast.warning('Debe ingresar un concepto o detalle.');
    if (importeTotal <= 0) return toast.warning('El importe debe ser mayor a 0.');
    
    const pagosValidos = pagos.filter(p => parseFloat(p.monto) > 0 && p.metodoPagoId);
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

    setProcesando(true);
    try {
      const payload = {
        header: {
          clienteId: clienteSel.CliIdCliente,
          tipoDocumento: tipoDoc,
          serieDoc: serieDoc,
          observaciones: observaciones || concepto,
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
        pagos: pagosValidos.map(p => ({
          metodoPagoId: parseInt(p.metodoPagoId, 10),
          monedaId: parseInt(p.monedaId, 10),
          montoOriginal: parseFloat(p.monto),
          cotizacion: p.monedaId === 2 ? cotizacion : 1
        }))
      };

      const res = await api.post('/contabilidad/caja/transaccion', payload);
      toast.success('Cobro registrado exitosamente!');
      
      setConcepto('');
      setImporte('');
      setObservaciones('');
      setPagos([{ id: Date.now(), metodoPagoId: pagosValidos[0].metodoPagoId, moneda: 'UYU', monedaId: 1, monto: '' }]);
      
      if (onCobroCompletado) onCobroCompletado(res.data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al procesar cobro');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f1f5f9]">
      {clienteSel && (
        <div className="px-5 py-1 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20 shrink-0 shadow-sm">
          <ClienteBilletera clienteId={clienteSel.CliIdCliente} clienteNombre={clienteSel.Nombre} />
        </div>
      )}

      <div className="flex-1 p-6 overflow-y-auto w-full flex justify-center">
        <div className="flex flex-col gap-8 w-full max-w-4xl">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Wallet size={28} className="text-indigo-600 fill-indigo-100" />
            Venta Libre / Saldo a Favor
          </h2>

          {/* CLiente */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <h3 className="font-black text-slate-400 text-[11px] uppercase tracking-widest mb-6">1. Seleccionar Cliente</h3>
            
            {!clienteSel ? (
              <div className="relative">
                <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-8 focus-within:ring-indigo-500/5 transition-all">
                  <Search size={22} className="text-slate-400" />
                  <input 
                      value={qCliente} 
                      onChange={e=>setQCliente(e.target.value)} 
                      placeholder="Buscar por Nombre, RUC o Código..." 
                      className="w-full bg-transparent text-slate-800 px-4 py-3 outline-none text-base font-bold placeholder-slate-400" 
                  />
                  {buscandoCli && <Loader2 size={20} className="text-indigo-500 animate-spin" />}
                </div>
                
                {clientesRes.length > 0 && (
                  <div className="absolute top-full mt-3 left-0 right-0 bg-white border border-slate-200 rounded-3xl shadow-xl z-50 max-h-96 overflow-y-auto">
                    {clientesRes.map(c => (
                      <div key={c.CliIdCliente} onClick={()=>{setClienteSel(c); setClientesRes([]); setQCliente('');}} className="w-full text-left px-6 py-5 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">{c.Nombre?.[0] || 'C'}</div>
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-900 font-black text-lg">{c.Nombre}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded bg-slate-100 font-mono">ID: {c.CliIdCliente}</span>
                                </div>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-indigo-50/50 border-2 border-indigo-100 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100"><User size={24} /></div>
                  <div>
                    <p className="text-slate-900 text-lg font-black leading-tight">{clienteSel.Nombre}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">ID: {clienteSel.CodCliente || clienteSel.CliIdCliente}</p>
                  </div>
                </div>
                <button onClick={()=>setClienteSel(null)} className="text-slate-400 hover:text-rose-600 p-3 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={24}/></button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Concepto y Monto */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col gap-6">
              <h3 className="font-black text-slate-400 text-[11px] uppercase tracking-widest">2. Ingrese Concepto e Importe</h3>

              <div>
                <label className="text-[10px] font-black tracking-widest uppercase text-slate-400 ml-2 mb-2 block">Concepto / Servicio</label>
                <input 
                  type="text" 
                  value={concepto}
                  onChange={e=>setConcepto(e.target.value)}
                  placeholder="Ej: Servicio de Mantenimiento..."
                  className="w-full border-2 border-slate-200 bg-slate-50 rounded-2xl px-5 py-4 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none text-base font-bold text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black tracking-widest uppercase text-slate-400 ml-2 mb-2 block">Importe de la Operación</label>
                <div className="flex rounded-2xl overflow-hidden border-2 border-slate-200 focus-within:border-indigo-600 transition-colors focus-within:ring-4 focus-within:ring-indigo-100">
                  <select 
                    value={moneda} 
                    onChange={e=>setMoneda(e.target.value)}
                    className="bg-slate-100 px-4 font-black outline-none border-r border-slate-200 cursor-pointer"
                  >
                    <option value="UYU">$ (UYU)</option>
                    <option value="USD">U$S (USD)</option>
                  </select>
                  <input 
                    type="number"
                    value={importe}
                    onChange={e=>setImporte(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-5 py-4 bg-slate-50 flex-1 outline-none font-black text-2xl"
                  />
                </div>
              </div>

            </div>

            {/* Metodo de Pago */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 to-indigo-500"></div>
              
              <h3 className="font-black text-slate-400 text-[11px] uppercase tracking-widest mb-6">3. Cobro y Documentación</h3>
              
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
                />
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

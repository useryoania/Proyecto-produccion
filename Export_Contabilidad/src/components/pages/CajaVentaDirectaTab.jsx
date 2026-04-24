import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Loader2, User, CheckCircle, ArrowRight, Wallet, History } from 'lucide-react';
import api from '../../services/apiClient';
import { toast } from 'sonner';
import ClienteBilletera from '../common/ClienteBilletera';

const TIPOS_VENTA = [
  { value: 'RECURSO', label: 'Bolsa de Recursos (Plan Metros)' }
];

export default function CajaVentaDirectaTab({
  metodosPago, cotizacion, onVentaExitosa,
  // Props externas para integración con CajaPanelPago
  pagos: pagosExt, onPagosChange,
  tipoDocumento: tipoDocExt, onTipoDocumento,
  obs: obsExt, onObs,
  onConfirmar: onConfirmarExt,
  procesando: procesandoExt,
  onTotalChange, // notifica al padre el total cuando cambian los items
  onClienteChange, // NUEVO: notifica al padre el cliente seleccionado
}) {
  // Cliente
  const [qCliente, setQCliente] = useState('');
  const [clientesRes, setClientesRes] = useState([]);
  const [buscandoCli, setBuscandoCli] = useState(false);
  const [clienteSel, setClienteSel] = useState(null);

  // Moneda exhibición
  const [monedaExhibicion, setMonedaExhibicion] = useState('UYU');

  // Items
  const [items, setItems] = useState([
    { id: Date.now(), tipo: 'RECURSO', grupo: '', codigo: '', descripcion: '', cantidad: 1, precioTotal: '' }
  ]);
  const [productosBase, setProductosBase] = useState([]);

  // Estado interno para cuando NO se usan props externas
  const [pagosInternal, setPagosInternal] = useState([]);
  const [obsInternal, setObsInternal] = useState('');
  const [tipoDocInternal, setTipoDocInternal] = useState('FACTURA');
  const [procesandoInternal, setProcesandoInternal] = useState(false);

  // Resuelve qué usar: props externas o estado interno
  const pagos = pagosExt !== undefined ? pagosExt : pagosInternal;
  const setPagos = onPagosChange || setPagosInternal;
  const obs = obsExt !== undefined ? obsExt : obsInternal;
  const setObs = onObs || setObsInternal;
  const tipoDocumento = tipoDocExt !== undefined ? tipoDocExt : tipoDocInternal;
  const setTipoDocumento = onTipoDocumento || setTipoDocInternal;
  const procesando = procesandoExt !== undefined ? procesandoExt : procesandoInternal;

  const fmt = (n) => Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    api.get('/contabilidad/caja/productos-venta').then(r => setProductosBase(r.data?.data||[])).catch(e => console.error(e));
  }, []);

  // Notificar al padre cuando el cliente cambia
  useEffect(() => {
    if (onClienteChange) {
      onClienteChange(clienteSel);
    }
  }, [clienteSel, onClienteChange]);

  const productosAgrupados = React.useMemo(() => {
    const map = {};
    productosBase.forEach(p => {
      const g = p.GrupoNombre || 'OTROS';
      if (!map[g]) map[g] = [];
      map[g].push(p);
    });
    return map;
  }, [productosBase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (qCliente.length > 2) searchClientes(qCliente);
    }, 500);
    return () => clearTimeout(timer);
  }, [qCliente]);

  const searchClientes = async (q) => {
    setBuscandoCli(true);
    try {
      const res = await api.get(`/contabilidad/clientes-activos?q=${encodeURIComponent(q)}&tipo=TODOS`);
      setClientesRes(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { toast.error('Error buscando clientes'); }
    setBuscandoCli(false);
  };

  const totalPagar = items.reduce((sum, item) => sum + (parseFloat(item.precioTotal) || 0), 0);

  // Notifica al padre el total para que CajaPanelPago lo muestre
  React.useEffect(() => { if (onTotalChange) onTotalChange(totalPagar, monedaExhibicion); }, [totalPagar, monedaExhibicion]);

  const buildPayload = () => ({
    _clienteNombre: clienteSel?.Nombre || clienteSel?.NombreFantasia || 'Cliente',
    header: {
      clienteId: clienteSel?.CliIdCliente,
      tipoDocumento,
      serieDoc: 'C',
      obs,
      cotizacion,
      monedaBase: monedaExhibicion
    },
    items: items.map(i => ({
      tipo: i.tipo,
      codigo: i.codigo,
      descripcion: i.descripcion,
      cantidad: parseFloat(i.cantidad),
      precioTotal: parseFloat(i.precioTotal),
      monedaId: monedaExhibicion === 'USD' ? 2 : 1
    })),
    pagos: pagos.filter(p => p.monto && p.metodoPagoId).map(p => ({
      metodoPagoId: parseInt(p.metodoPagoId),
      montoOriginal: parseFloat(p.monto),
      monedaId: p.moneda === 'USD' ? 2 : 1,
      cotizacion: p.moneda === 'USD' ? cotizacion : null,
      referenciaNumero: ''
    }))
  });

  const handleGuardar = async () => {
    if (onConfirmarExt) { onConfirmarExt(buildPayload()); return; }
    if (!clienteSel) return toast.warning('Debe seleccionar un cliente.');
    if (items.some(i => !i.codigo || !i.precioTotal || !i.cantidad || !i.descripcion))
      return toast.warning('Complete todos los campos de los ítems.');
    const payload = buildPayload();
    setProcesandoInternal(true);
    try {
      const res = await api.post('/contabilidad/caja/venta-directa', payload);
      toast.success(`Venta procesada exitosamente. Total cobrado: ${fmt(res.data.totalCobrado)}`);
      if (onVentaExitosa) onVentaExitosa();
      setClienteSel(null); setQCliente(''); setPagos([]);
      setItems([{ id: Date.now(), tipo: 'RECURSO', grupo: '', codigo: '', descripcion: '', cantidad: 1, precioTotal: '' }]);
      setObs('');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al procesar la venta');
    } finally {
      setProcesandoInternal(false);
    }
  };

  useEffect(() => {
    const handler = () => handleGuardar();
    document.addEventListener('caja:confirmarVenta', handler);
    return () => document.removeEventListener('caja:confirmarVenta', handler);
  }, [clienteSel, items, tipoDocumento, obs, pagos, cotizacion, monedaExhibicion, onConfirmarExt]);

  return (
    <div className="flex flex-1 overflow-hidden bg-[#f1f5f9]">
      <div className="flex-1 flex flex-col min-h-0 h-full">
        {/* BILLETERA DE CLIENTE STICKY */}
        {clienteSel && (
          <div className="px-5 py-1 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20 shrink-0 shadow-sm">
            <ClienteBilletera 
              clienteId={clienteSel.CliIdCliente} 
              clienteNombre={clienteSel.Nombre} 
            />
          </div>
        )}

        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
            Nuevo Ingreso / Venta de Rollo por Adelantado
            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-indigo-200">POS Express</span>
          </h2>

        <div className="flex flex-col gap-8 max-w-5xl">

          {/* BLOQUE CLIENTE */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] relative group/cli transition-all hover:shadow-[0_15px_50px_rgba(0,0,0,0.06)]">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 rounded-l-3xl opacity-20 group-hover/cli:opacity-100 transition-opacity"></div>
            <h3 className="font-black text-slate-400 text-[11px] uppercase tracking-widest mb-6 flex items-center justify-between">
              1. Seleccionar Cliente
              {clienteSel && <span className="text-emerald-600 flex items-center gap-1.5 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Cliente Verificado <CheckCircle size={12}/></span>}
            </h3>
            
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
                  <div className="absolute top-full mt-3 left-0 right-0 bg-white border border-slate-200 rounded-3xl shadow-[0_30px_90px_rgba(15,23,42,0.15)] z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5">
                    <div className="px-6 py-3.5 bg-slate-50/80 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100 flex items-center justify-between">
                        <span>Resultados de búsqueda</span>
                        <span className="bg-white text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">{clientesRes.length}</span>
                    </div>
                    {clientesRes.map(c => (
                      <div key={c.CliIdCliente} 
                        onClick={()=>{setClienteSel(c); setClientesRes([]); setQCliente('');}} 
                        className="w-full text-left px-6 py-5 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 group flex items-center justify-between transition-all active:scale-[0.99]">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-white group-hover:text-indigo-600 transition-all border border-slate-200 group-hover:border-indigo-200 shadow-sm group-hover:shadow-md">
                                {c.Nombre?.[0] || 'C'}
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-900 font-black group-hover:text-indigo-700 transition-colors text-lg">{c.Nombre}</span>
                                {c.NombreFantasia && <span className="text-xs text-slate-500 font-semibold tracking-tight">"{c.NombreFantasia}"</span>}
                                <div className="flex items-center gap-2.5 mt-1.5">
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-mono font-black uppercase border border-slate-200 tracking-tight">ID: {c.CliIdCliente}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.CodCliente || 'Sin Código'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
                                <ArrowRight size={18} className="text-white" />
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-indigo-50/50 border-2 border-indigo-100 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center text-indigo-600 shadow-xl border border-indigo-100 ring-4 ring-indigo-50/30">
                    <User size={32} />
                  </div>
                  <div>
                    <p className="text-slate-900 text-xl font-black leading-tight tracking-tight">{clienteSel.Nombre}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                      ID: {clienteSel.CodCliente || clienteSel.CliIdCliente} {clienteSel.NombreFantasia && ` · ${clienteSel.NombreFantasia}`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={()=>setClienteSel(null)} 
                  className="bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-4 rounded-2xl transition-all border border-slate-200 hover:border-rose-200 shadow-sm hover:shadow-md"
                  title="Quitar cliente"
                >
                  <Trash2 size={24} />
                </button>
              </div>
            )}
          </div>

          {/* BLOQUE ITEMS */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.03)] flex flex-col gap-8 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
              <h3 className="font-black text-slate-400 text-[11px] uppercase tracking-widest">2. Conceptos a Cobrar</h3>
              <div className="flex bg-slate-100 rounded-2xl p-1.5 border border-slate-200">
                <button onClick={()=>setMonedaExhibicion('UYU')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${monedaExhibicion==='UYU'?'bg-white text-indigo-700 shadow-md border border-slate-200':'text-slate-500 hover:text-slate-800'}`}>UYU ($)</button>
                <button onClick={()=>setMonedaExhibicion('USD')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${monedaExhibicion==='USD'?'bg-white text-emerald-700 shadow-md border border-slate-200':'text-slate-500 hover:text-slate-800'}`}>USD (US$)</button>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {items.map((it, idx) => (
                <div key={it.id} className="flex flex-col gap-6 bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100 relative group/item hover:bg-slate-50 transition-colors">
                  {idx > 0 && <button onClick={()=>setItems(p=>p.filter(x=>x.id!==it.id))} className="absolute top-5 right-5 text-slate-300 hover:text-rose-600 p-1.5 transition-all hover:bg-rose-50 rounded-xl"><Trash2 size={18} /></button>}
                  
                  <div className={`grid ${(it.tipo === 'RECURSO' || it.tipo === 'PRODUCTO') ? 'grid-cols-3' : 'grid-cols-2'} gap-6`}>
                    <div className="flex flex-col gap-2.5">
                      <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">Operación</label>
                      <select value={it.tipo} onChange={e=>{
                        const t=e.target.value;
                        setItems(p=>p.map(x=>x.id===it.id ? {...x, tipo:t, grupo:'', codigo: t==='FACT_CREDITO' ? 'FACT' : ''}:x));
                      }} className="bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm">
                        {TIPOS_VENTA.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    {(it.tipo === 'RECURSO' || it.tipo === 'PRODUCTO') && (
                      <div className="flex flex-col gap-2.5">
                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">Grupo</label>
                        <select value={it.grupo || ''} onChange={e => {
                          const val = e.target.value;
                          setItems(p=>p.map(x=>x.id===it.id ? {...x, grupo: val, codigo: '', descripcion: ''} : x));
                        }} className="bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm">
                          <option value="">Seleccione grupo...</option>
                          {Object.keys(productosAgrupados).filter(g => /dtf|sublimaci/i.test(g)).map(g => (<option key={g} value={g}>{g}</option>))}
                        </select>
                      </div>
                    )}
                    <div className="flex flex-col gap-2.5">
                      <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">{(it.tipo==='RECURSO' || it.tipo==='PRODUCTO') ? 'Producto' : 'Referencia'}</label>
                      {(it.tipo === 'RECURSO' || it.tipo === 'PRODUCTO') ? (
                        <select value={it.codigo} onChange={e => {
                          const val = e.target.value;
                          const prod = (productosAgrupados[it.grupo] || []).find(x => String(x.CodArticulo) === String(val));
                          setItems(p => p.map(x => x.id === it.id ? {...x, codigo: val, descripcion: prod ? prod.Descripcion : x.descripcion} : x));
                        }} className="bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-400" disabled={!it.grupo}>
                          <option value="">{it.grupo ? 'Seleccione...' : 'Elegir grupo...'}</option>
                          {(productosAgrupados[it.grupo] || []).map(p => (<option key={p.CodArticulo} value={p.CodArticulo}>[{p.CodArticulo}] {p.Descripcion}</option>))}
                        </select>
                      ) : (
                        <input value={it.codigo} onChange={e=>setItems(p=>p.map(x=>x.id===it.id?{...x, codigo:e.target.value}:x))} placeholder="Ej: XXX" className="bg-white border-2 border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 placeholder-slate-300 shadow-sm" />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-6">
                    <div className="col-span-2 flex flex-col gap-2.5">
                      <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">Descripción Visible en Documento</label>
                      <input value={it.descripcion} onChange={e=>setItems(p=>p.map(x=>x.id===it.id?{...x, descripcion:e.target.value}:x))} placeholder="Aclaración opcional..." className="bg-white border-2 border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 shadow-sm" />
                    </div>
                    <div className="flex flex-col gap-2.5 text-center">
                      <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Cantidad</label>
                      <input type="number" step="0.5" value={it.cantidad} onChange={e=>setItems(p=>p.map(x=>x.id===it.id?{...x, cantidad:e.target.value}:x))} className="bg-slate-100 border-2 border-slate-200 rounded-2xl px-4 py-3 text-lg font-black text-emerald-600 text-center outline-none focus:border-emerald-500 shadow-inner" />
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Total {monedaExhibicion}</label>
                      <input type="number" step="0.1" value={it.precioTotal} onChange={e=>setItems(p=>p.map(x=>x.id===it.id?{...x, precioTotal:e.target.value}:x))} className="bg-slate-50 border-2 border-indigo-100 rounded-2xl px-5 py-3 text-lg font-black text-slate-900 outline-none focus:border-indigo-500 text-right placeholder-slate-300 shadow-inner" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={()=>setItems(p=>[...p,{ id:Date.now(), tipo:'RECURSO', grupo:'', codigo:'', descripcion:'', cantidad:1, precioTotal:'' }])} 
              className="mt-2 w-full py-5 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-slate-50 rounded-[2rem] flex items-center justify-center gap-4 text-slate-400 hover:text-indigo-600 font-black transition-all group/add active:scale-[0.99]">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center group-hover/add:bg-indigo-600 group-hover/add:text-white transition-all shadow-sm"><Plus size={18} /></div>
              Agregar otro concepto a cobrar
            </button>

            {/* Total resumen compacto */}
            <div className="flex justify-between items-center pt-8 border-t border-slate-100 mt-4 px-2">
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Global a Facturar</span>
                <span className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-full mt-1.5 border border-slate-200">Emitiendo documento en {monedaExhibicion}</span>
              </div>
              <div className="flex items-end gap-3">
                <span className={`text-5xl font-black ${monedaExhibicion==='USD'?'text-emerald-600':'text-indigo-600'} tracking-tighter drop-shadow-sm`}>
                  {monedaExhibicion==='USD' ? 'US$' : '$'} {fmt(totalPagar)}
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

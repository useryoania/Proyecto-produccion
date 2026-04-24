import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../../services/apiClient';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Plus, Trash2, RefreshCw, Loader2,
  CreditCard, CheckCircle, AlertCircle,
  FileText, User, Phone, Search, X,
  Zap, ArrowRight, ChevronRight, LayoutGrid, TrendingDown, Hash, History, Wallet, Tag, FileMinus,
  ArrowDownCircle, ArrowUpCircle, ShieldCheck, DoorClosed, LockKeyhole, DollarSign, BookOpen, Power, Calendar
} from 'lucide-react';
import CajaArqueoModal from './CajaArqueoModal';
import CajaVentaDirectaTab from './CajaVentaDirectaTab';
import CajaCobroLibreTab from './CajaCobroLibreTab';
import CajaPanelPago from './CajaPanelPago';
import TicketImpresion from '../common/TicketImpresion';
import ClienteBilletera from '../common/ClienteBilletera';

const TIPOS_DOC = [
  { value: 'ETICKET', label: 'E-Ticket (Contado/Crédito) -> 101' },
  { value: 'FACTURA', label: 'E-Factura (Contado/Crédito) -> 111' },
  { value: 'CREDITO', label: 'Nota de Crédito -> 112' },
  { value: 'NOTA_CONSUMO', label: 'Pedidos Caja / Consumo Interno' },
  { value: 'NINGUNO', label: 'Sin documento' },
];

const TIPOS_DOC_EGRESO = [
  { value: 'RECIBO',       label: 'Recibo' },
  { value: 'ORDEN_PAGO',   label: 'Orden de Pago' },
  { value: 'NINGUNO',      label: 'Sin documento' },
];

const TIPOS_AJUSTE = [
  { value: '',            label: 'Sin ajuste' },
  { value: 'DESCUENTO',   label: 'Descuento' },
  { value: 'REDONDEO',    label: 'Redondeo' },
  { value: 'BONIFICACION',label: 'Bonificación' },
  { value: 'SALDO_CERO',  label: 'Saldo cero' },
  { value: 'RECARGO',     label: 'Recargo' },
];

const fmt = (n) => Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CajaTransaccionView() {
  const [activeTab, setActiveTab] = useState('INGRESOS');
  const [subTabIngreso, setSubTabIngreso] = useState('COBRO');

  const [sesion, setSesion] = useState(null);
  const [loadingSesion, setLoadingSesion] = useState(true);
  const [modalApertura, setModalApertura] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');

  const [metodosPago, setMetodosPago] = useState([]);
  const [cuentasGastos, setCuentasGastos] = useState([]);
  const [cotizacion, setCotizacion] = useState(null);
  const [loadingCot, setLoadingCot] = useState(false);

  const [retiros, setRetiros] = useState([]);
  const [monedaExhibicion, setMonedaExhibicion] = useState('UYU');
  const [showArqueo, setShowArqueo] = useState(false);
  const [busquedaGlobalRes, setBusquedaGlobalRes] = useState(null);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('1');
  const [seleccionados, setSeleccionados] = useState([]);
  const [ajustes, setAjustes] = useState({});
  const [carritosPago, setCarritosPago] = useState([{ id: Date.now(), metodoPagoId: '', moneda: 'UYU', monedaId: 1, monto: '' }]);
  const [tipoDocCobro, setTipoDocCobro] = useState('07');
  const [serieDocCobro, setSerieDocCobro] = useState('A');
  const [numDocCobro, setNumDocCobro] = useState('');
  const [numDocCobroPredict, setNumDocCobroPredict] = useState('');
  const [obsCobro, setObsCobro] = useState('');
  const [procesandoCobro, setProcesandoCobro] = useState(false);
  const [motorPagos, setMotorPagos] = useState([{ id: Date.now(), metodoPagoId: '', moneda: 'UYU', monedaId: 1, monto: '' }]);
  const [motorTipoDoc, setMotorTipoDoc] = useState('07');
  const [motorSerieDoc, setMotorSerieDoc] = useState('A');

  const [ventaPagos, setVentaPagos] = useState([{ id: Date.now(), metodoPagoId: '', moneda: 'UYU', monedaId: 1, monto: '' }]);
  const [ventaTipoDoc, setVentaTipoDoc] = useState('01');
  const [ventaSerieDoc, setVentaSerieDoc] = useState('A');
  const [ventaObs, setVentaObs] = useState('');
  const [ventaTotalACubrir, setVentaTotalACubrir] = useState(0);
  const [ventaMoneda, setVentaMoneda] = useState('UYU');
  const [procesandoVenta, setProcesandoVenta] = useState(false);

  const [egresoCuentaCodigo, setEgresoCuentaCodigo] = useState('');
  const [egresoProveedor, setEgresoProveedor] = useState('');
  const [egresoMonto, setEgresoMonto] = useState('');
  const [egresoMoneda, setEgresoMoneda] = useState('UYU');
  const [egresoMetodoId, setEgresoMetodoId] = useState('');
  const [egresoTipoDoc, setEgresoTipoDoc] = useState('05');
  const [egresoSerieDoc, setEgresoSerieDoc] = useState('A');
  const [egresoNumDocPredict, setEgresoNumDocPredict] = useState('');
  const [egresoObs, setEgresoObs] = useState('');
  const [procesandoEgreso, setProcesandoEgreso] = useState(false);

  const [retiroSelectAut, setRetiroSelectAut] = useState(null);
  const [autMotivo, setAutMotivo] = useState('');
  const [autVencimiento, setAutVencimiento] = useState('');
  const [procesandoAut, setProcesandoAut] = useState(false);
  const ticketRef = useRef(null);
  const [ticketData, setTicketData] = useState(null);

  const [resumenCierre, setResumenCierre] = useState(null);
  const [cierreMontoFisico, setCierreMontoFisico] = useState('');
  const [cierreObs, setCierreObs] = useState('');
  const [denominaciones, setDenominaciones] = useState({
    2000: '', 1000: '', 500: '', 200: '', 100: '', 50: '', 20: '',
    10: '', 5: '', 2: '', 1: ''
  });

  const totalDenominaciones = useMemo(() => {
    return Object.entries(denominaciones).reduce((acc, [den, qty]) => acc + (parseFloat(den) * (parseInt(qty)||0)), 0);
  }, [denominaciones]);

  useEffect(() => {
    if (totalDenominaciones > 0) {
      setCierreMontoFisico(totalDenominaciones.toString());
    } else {
      setCierreMontoFisico('');
    }
  }, [totalDenominaciones]);

  const [operacionesCaja, setOperacionesCaja] = useState([]);
  const [opSeleccionada, setOpSeleccionada] = useState(null);
  const [opClienteId, setOpClienteId] = useState('');
  const [opClienteNombre, setOpClienteNombre] = useState('');
  const [opImporte, setOpImporte] = useState('');
  const [opMoneda, setOpMoneda] = useState('UYU');
  const [opObs, setOpObs] = useState('');
  const [opMetodoId, setOpMetodoId] = useState('');
  const [procesandoOp, setProcesandoOp] = useState(false);
  const [busquedaClientes, setBusquedaClientes] = useState([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  
  // Seguimiento Global de Cliente para la Billetera
  const [ventaClienteId, setVentaClienteId] = useState('');
  const [ventaClienteNombre, setVentaClienteNombre] = useState('');
  const [tiposDocumentos, setTiposDocumentos] = useState([]);

  const globalClient = useMemo(() => {
    if (subTabIngreso === 'MOTOR') return { id: opClienteId, nombre: opClienteNombre };
    if (subTabIngreso === 'VENTA') return { id: ventaClienteId, nombre: ventaClienteNombre };
    if (subTabIngreso === 'COBRO' && seleccionados.length > 0) {
      const first = seleccionados[0].retiro;
      return { id: first.CliIdCliente, nombre: first.CliNombre || first.Nombre };
    }
    return { id: null, nombre: '' };
  }, [subTabIngreso, opClienteId, opClienteNombre, ventaClienteId, ventaClienteNombre, seleccionados]);

  const filtroRef = useRef(filtroTipo);
  useEffect(() => { 
    filtroRef.current = filtroTipo; 
    fetchRetiros();
  }, [filtroTipo]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('retiros:update', fetchRetiros);
    socket.on('actualizado', fetchRetiros);
    verificarSesion();
    cargarDatosBasicos();
    return () => socket.disconnect();
  }, []);

  const verificarSesion = async () => {
    setLoadingSesion(true);
    try {
      const res = await api.get('/contabilidad/caja/sesion/actual');
      if (res.data?.sesion) { setSesion(res.data.sesion); setModalApertura(false); }
      else { setSesion(null); setModalApertura(true); }
    } catch (e) { console.error(e); toast.error('Error al verificar estado de caja.'); }
    finally { setLoadingSesion(false); }
  };

  const cargarDatosBasicos = async () => {
    try {
      fetchRetiros();
      const [rMet, rCot, rGastos, rOps, rNom] = await Promise.allSettled([
        api.get('/apipagos/metodos'),
        api.get('/apicotizaciones/hoy'),
        api.get('/contabilidad/erp/cuentas/gastos'),
        api.get('/contabilidad/caja/operaciones'),
        api.get('/contabilidad/cfe/nomencladores')
      ]);
      if (rMet.status === 'fulfilled') {
        const mets = Array.isArray(rMet.value.data) ? rMet.value.data : [];
        setMetodosPago(mets);
        // Pre-seleccionar Efectivo/Contado por defecto en la pestaña Venta
        const contadoId = mets.find(m => /(contado|efectivo)/i.test(m.MPaDescripcionMetodo))?.MPaIdMetodoPago || mets[0]?.MPaIdMetodoPago;
        if (contadoId) setVentaPagos([{ id: Date.now(), metodoPagoId: contadoId, moneda: 'UYU', monedaId: 1, monto: '' }]);
      }
      if (rCot.status === 'fulfilled' && rCot.value.data?.cotizaciones?.[0]) setCotizacion(rCot.value.data.cotizaciones[0].CotDolar);
      if (rGastos.status === 'fulfilled') setCuentasGastos(rGastos.value.data?.data || []);
      if (rOps.status === 'fulfilled') setOperacionesCaja(rOps.value.data?.data || []);
      if (rNom.status === 'fulfilled' && rNom.value.data?.success) {
        setTiposDocumentos(rNom.value.data.tiposDocumentos || []);
      }
    } catch(e) {}
  };

  const fetchRetiros = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (filtroRef.current !== 'todos') p.append('tipoCliente', filtroRef.current);
      const res = await api.get(`/apiordenesRetiro/caja?${p}`);
      setRetiros(Array.isArray(res.data) ? res.data : []);
    } catch{}
  }, []);

  const buscarCotizBCU = async () => {
    setLoadingCot(true);
    try {
      const res = await api.get('/apicotizaciones/bcu');
      if (res.data?.cotizacion) { setCotizacion(res.data.cotizacion); toast.success(`Cotización actualizada: $${res.data.cotizacion}`); }
    } catch { toast.error('Error BCU'); }
    setLoadingCot(false);
  };

  const handleAbrirCaja = async () => {
    try {
      const res = await api.post('/contabilidad/caja/sesion/abrir', { montoInicial });
      toast.success('Caja iniciada exitosamente.');
      setSesion(res.data.sesion);
      setModalApertura(false);
    } catch (e) { toast.error(e.response?.data?.error || 'Error al abrir caja'); }
  };

  const cargarResumenCierre = async () => {
    if (!sesion) return;
    try {
      const res = await api.get(`/contabilidad/caja/sesion/${sesion.StuIdSesion}/resumen`);
      setResumenCierre(res.data);
    } catch { toast.error('No se pudo cargar el resumen de caja.'); }
  };

  const handleCerrarCaja = async () => {
    if (!cierreMontoFisico) return toast.warning('Ingrese el efectivo contado final.');
    try {
      await api.post(`/contabilidad/caja/sesion/${sesion.StuIdSesion}/cerrar`, {
        montoFinal: parseFloat(cierreMontoFisico), observaciones: cierreObs
      });
      toast.success('Sesión de caja cerrada.');
      setSesion(null); setModalApertura(true); setActiveTab('COBRO');
    } catch(e) { toast.error(e.response?.data?.error || 'Error al cerrar caja'); }
  };

  useEffect(() => { if (activeTab === 'OPERACIONES' && sesion) cargarResumenCierre(); }, [activeTab]);

  const getOrdenes = r => r?.orders || [];
  
  const calcularMontoPorMoneda = useCallback((r, target) => {
    let t = 0;
    getOrdenes(r).forEach(o => {
      if (o.orderIdMetodoPago !== null || o.orderPago !== null) return;
      if (o.orderCobertura || o.orderEstado === 'Abonado' || o.orderEstado === 'Autorizado') return;
      const val = parseFloat((o.orderCosto||'').replace(/[^0-9.-]/g,''))||0;
      if (target === 'UYU') { t += (o.monedaId === 2 && cotizacion) ? val * cotizacion : val; }
      else { t += (o.monedaId === 1 && cotizacion) ? val / cotizacion : val; }
    });
    return t;
  }, [cotizacion]);

  const toggleSeleccion = (r) => {
    const id = r.OReIdOrdenRetiro || r.ordenDeRetiro;
    setSeleccionados(prev => {
      if (prev.find(s => s.retiroId === id)) return prev.filter(s => s.retiroId !== id);
      return [...prev, { retiroId: id, retiro: r, ordenesIds: getOrdenes(r).filter(o=>!o.orderIdMetodoPago && !o.orderPago).map(o=>o.orderId), codigoRef: r.ordenDeRetiro, descripcion: r.CliNombre||'' }];
    });
  };

  const totalesCobro = useMemo(() => {
    let b=0, ajT=0;
    seleccionados.forEach(s => {
      b += calcularMontoPorMoneda(s.retiro, monedaExhibicion);
      const a = parseFloat(ajustes[s.retiroId]?.ajuste||0);
      ajT += isNaN(a)?0:a;
    });
    return { bruto:b, ajusteTotal:ajT, neto:b+ajT };
  }, [seleccionados, ajustes, monedaExhibicion, calcularMontoPorMoneda]);

  const totalIngresado = useMemo(() => {
    return carritosPago.reduce((acc, p) => {
      const pMonto = parseFloat(p.monto) || 0;
      if (monedaExhibicion === 'UYU') return acc + (p.moneda === 'USD' ? pMonto * (cotizacion||1) : pMonto);
      else return acc + (p.moneda === 'UYU' ? pMonto / (cotizacion||1) : pMonto);
    }, 0);
  }, [carritosPago, cotizacion, monedaExhibicion]);

  const cobroBalanceado = Math.abs(totalesCobro.neto - totalIngresado) < (monedaExhibicion === 'UYU' ? 1.0 : 0.05);

  const calcularMontoRetiro = (r) => calcularMontoPorMoneda(r, 'UYU');


  const handleRealizarCobro = async () => {
    if (seleccionados.length===0) return toast.warning('Seleccione retiros a cobrar.');
    if (!cobroBalanceado) return toast.warning('Pagos no cuadran con el total.');
    if (carritosPago.some(p => !p.metodoPagoId)) return toast.warning('Debe seleccionar Método de pago en todas las líneas.');
    const chequeFaltante = carritosPago.some(p => {
       const isCheque = metodosPago.find(m => m.MPaIdMetodoPago === parseInt(p.metodoPagoId))?.MPaDescripcionMetodo?.toLowerCase().includes('cheque');
       return isCheque && !p.idCheque;
    });
    if (chequeFaltante) return toast.warning('Debe cargar los datos del cheque en el método de pago correspondiente.');
    if (!tipoDocCobro || tipoDocCobro === 'NINGUNO') return toast.warning('La emisión de un Documento es requerida.');
    setProcesandoCobro(true);
    try {
      let deudaPuraUSD = 0, deudaPuraUYU = 0;
      seleccionados.forEach(s => {
        getOrdenes(s.retiro).forEach(o => {
          if (o.orderIdMetodoPago !== null || o.orderPago !== null) return;
          if (o.orderCobertura || o.orderEstado === 'Abonado' || o.orderEstado === 'Autorizado') return;
          const val = parseFloat((o.orderCosto||'').replace(/[^0-9.-]/g,''))||0;
          if (o.monedaId === 2) deudaPuraUSD += val;
          if (o.monedaId === 1) deudaPuraUYU += val;
        });
      });
      const apps = seleccionados.map(s => {
        const montoBaseUYU = calcularMontoPorMoneda(s.retiro, 'UYU');
        return { tipo: 'ORDEN_RETIRO', referenciaId: s.retiroId, codigoRef: s.codigoRef, descripcion: s.descripcion, montoOriginal: montoBaseUYU,
          ajuste: (monedaExhibicion === 'USD' && cotizacion) ? (parseFloat(ajustes[s.retiroId]?.ajuste||0)||0) * cotizacion : (parseFloat(ajustes[s.retiroId]?.ajuste||0)||0),
          tipoAjuste: ajustes[s.retiroId]?.tipoAjuste||null, orderNumbers: s.ordenesIds };
      });
      const pags = carritosPago.map(p => ({ metodoPagoId: parseInt(p.metodoPagoId), moneda: p.moneda, monedaId: p.monedaId, montoOriginal: parseFloat(p.monto), cotizacion: p.moneda==='USD'?cotizacion:null }));
      const res = await api.post('/contabilidad/caja/transaccion', {
        header: { clienteId: seleccionados[0]?.retiro?.CliIdCliente, tipoDocumento: tipoDocCobro, serieDoc: serieDocCobro, numeroDoc: numDocCobro||null, observaciones: obsCobro, deudaPuraUSD, deudaPuraUYU },
        aplicaciones: apps, pagos: pags
      });

      // ── ARMADO DEL TICKET PARA IMPRIMIR ──
      const newTicket = {
        empresa: 'MACROSOFT LTDA',
        fecha: new Date().toLocaleString('es-UY'),
        comprobante: res.data?.numeroDoc || 'TICKET CAJA',
        cajero: sesion?.usrLogin || 'Sistema',
        cliente: seleccionados[0]?.retiro?.CliNombre || 'CLIENTE',
        items: seleccionados.map(s => {
          const m = calcularMontoPorMoneda(s.retiro, monedaExhibicion);
          return { descripcion: `Orden ${s.codigoRef}`, cantidad: 1, importe: m };
        }),
        totales: {
          subtotal: totalesCobro.bruto,
          descuento: Object.values(ajustes).reduce((a, b) => a + (b.tipo==='DESCUENTO'?b.ajuste:0), 0),
          ajuste: Object.values(ajustes).reduce((a, b) => a + (b.tipo!=='DESCUENTO'?b.ajuste:0), 0),
          total: totalIngresado,
          moneda: monedaExhibicion === 'USD' ? 'US$' : '$'
        },
        pagos: carritosPago.map(p => ({
          metodo: metodosPago.find(m => m.MPaIdMetodoPago === parseInt(p.metodoPagoId))?.MPaDescripcionMetodo || 'Pago',
          moneda: p.moneda,
          monto: p.monto
        }))
      };
      setTicketData(newTicket);
      setTimeout(() => { if (ticketRef.current) window.print(); }, 300);

      toast.success(`Cobro registrado (${res.data?.numeroDoc || 'OK'})`);
      setSeleccionados([]); setAjustes({});
      setCarritosPago([{ id: Date.now(), metodoPagoId: '', moneda: 'UYU', monedaId: 1, monto: '' }]);
      setObsCobro(''); fetchRetiros();
    } catch(e) { toast.error(e.response?.data?.error||'Error al cobrar'); }
    finally { setProcesandoCobro(false); }
  };

  // Preview número de documento para COBRO
  useEffect(() => {
    if (tipoDocCobro && tipoDocCobro !== 'NINGUNO') {
      setNumDocCobroPredict('...');
      api.get(`/contabilidad/caja/siguiente-numero?tipoDoc=${tipoDocCobro}&serie=${serieDocCobro}`)
        .then(r => { if(r.data.success) setNumDocCobroPredict(r.data.NumeroFormato); })
        .catch(() => setNumDocCobroPredict('?'));
    } else {
      setNumDocCobroPredict('Sin Número');
    }
  }, [tipoDocCobro, serieDocCobro]);

  useEffect(() => {
    if (activeTab === 'EGRESOS' && egresoTipoDoc !== 'NINGUNO') {
      api.get(`/contabilidad/caja/siguiente-numero?tipoDoc=${egresoTipoDoc}&serie=${egresoSerieDoc}`)
        .then(r => { if(r.data.success) setEgresoNumDocPredict(r.data.NumeroFormato); })
        .catch(() => setEgresoNumDocPredict('...'));
    }
  }, [activeTab, egresoTipoDoc, egresoSerieDoc]);

  const handleRealizarEgreso = async () => {
    if (!egresoCuentaCodigo || !egresoMonto || !egresoMetodoId) return toast.warning('Cuenta de Gasto, método y monto obligatorios.');
    if (egresoMoneda==='USD' && !cotizacion) return toast.warning('Falta cotiz BCU para USD.');
    setProcesandoEgreso(true);
    try {
      const ctaSelec = cuentasGastos.find(c => c.CueCodigo === egresoCuentaCodigo);
      await api.post('/contabilidad/caja/egreso', {
        stuIdSesion: sesion.StuIdSesion, cuentaGastoCodigo: egresoCuentaCodigo,
        concepto: ctaSelec?.CueNombre || 'Gasto no mapeado', proveedor: egresoProveedor,
        monto: egresoMonto, moneda: egresoMoneda, monedaId: egresoMoneda==='USD'?2:1,
        cotizacion: egresoMoneda==='USD'?cotizacion:null, metodoPagoId: egresoMetodoId,
        tipoDocumento: egresoTipoDoc, serieDoc: egresoSerieDoc, observaciones: egresoObs
      });
      toast.success('Egreso y asiento registrados.');
      setEgresoCuentaCodigo(''); setEgresoProveedor(''); setEgresoMonto(''); setEgresoObs('');
      setActiveTab('EGRESOS');
    } catch(e) { toast.error(e.response?.data?.error||'Error al registrar egreso'); }
    finally { setProcesandoEgreso(false); }
  };

  const handleAutorizar = async () => {
    if (!retiroSelectAut || !autMotivo) return toast.warning('Seleccione orden y escriba motivo.');
    setProcesandoAut(true);
    try {
      await api.post('/contabilidad/caja/autorizar', { oreIdOrdenRetiro: retiroSelectAut.retiroId, motivo: autMotivo, montoDeuda: retiroSelectAut.deudaEstimada, fechaVencimiento: autVencimiento || null });
      toast.success('Orden autorizada para entrega.');
      setRetiroSelectAut(null); setAutMotivo(''); setAutVencimiento(''); fetchRetiros();
    } catch(e){ toast.error(e.response?.data?.error||'Error al autorizar'); }
    finally { setProcesandoAut(false); }
  };

  const buscarClientes = async (q) => {
    if (!q || q.length < 2) { setBusquedaClientes([]); return; }
    setBuscandoCliente(true);
    try {
      const res = await api.get(`/contabilidad/clientes-activos?q=${encodeURIComponent(q)}&limit=8`);
      setBusquedaClientes(res.data?.data || []);
    } catch { setBusquedaClientes([]); }
    finally { setBuscandoCliente(false); }
  };

  const handleOperacionManual = async () => {
    if (!opSeleccionada) return toast.warning('Seleccione una operacion del Motor.');
    if (!opImporte || isNaN(parseFloat(opImporte))) return toast.warning('Ingrese el importe.');
    if (opSeleccionada.EvtUsaEntidad && !opClienteId) return toast.warning(`La operacion requiere seleccionar un cliente.`);
    setProcesandoOp(true);
    try {
      await api.post('/contabilidad/caja/operacion-manual', {
        evtCodigo: opSeleccionada.EvtCodigo, clienteId: opClienteId || null,
        importe: parseFloat(opImporte), moneda: opMoneda, monedaId: opMoneda === 'USD' ? 2 : 1,
        cotizacion: opMoneda === 'USD' ? cotizacion : null, metodoPagoId: opMetodoId || null, observaciones: opObs,
      });
      toast.success(`Operacion "${opSeleccionada.EvtNombre}" registrada correctamente.`);
      setOpSeleccionada(null); setOpClienteId(''); setOpClienteNombre(''); setOpImporte(''); setOpObs(''); setOpMetodoId(''); setBusquedaClientes([]);
    } catch(e) { toast.error(e.response?.data?.error || 'Error al procesar operacion'); }
    finally { setProcesandoOp(false); }
  };

  const retirosFiltrados = useMemo(() => {
    const t = searchTerm.toLowerCase().trim();
    if (!t) return retiros;
    return retiros.filter(r => 
      (r.ordenDeRetiro || '').toLowerCase().includes(t) || 
      (r.CliNombre || '').toLowerCase().includes(t) ||
      (r.CliCodigoCliente || '').toLowerCase().includes(t) ||
      r.orders?.some(o => (o.orderNumber || '').toLowerCase().includes(t) || String(o.orderId) === t)
    );
  }, [retiros, searchTerm]);

  if (loadingSesion) return <div className="p-10 text-white flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>;

  if (modalApertura) {
    return (
      <div className="min-h-full bg-[#0f1117] flex items-center justify-center p-4 text-slate-200 font-sans">
        <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-2"><LockKeyhole size={32} className="text-indigo-400" /></div>
            <h2 className="text-2xl font-black text-white">Caja Cerrada</h2>
            <p className="text-sm text-slate-400 text-center">Debes abrir una sesión de turno para registrar movimientos de dinero.</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto Inicial en Efectivo ($)</label>
            <input type="number" autoFocus placeholder="Ej: 5000.00" value={montoInicial} onChange={e=>setMontoInicial(e.target.value)}
              className="bg-slate-800 border-2 border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-2xl font-black text-center text-white outline-none" />
          </div>
          <button onClick={handleAbrirCaja} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex justify-center items-center gap-2">
            Abrir Caja <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ visibility: 'hidden', position: 'fixed', top: 0, left: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <TicketImpresion ref={ticketRef} data={ticketData} />
      </div>

    <div className="min-h-full bg-[#0f1117] text-slate-200 font-sans flex flex-col h-screen overflow-hidden">
      <div className="border-b border-slate-800 bg-[#0f1117] shrink-0">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">C</div>
            <div>
              <h1 className="text-lg font-black text-white leading-none tracking-tight">Caja Central</h1>
              <p className="text-xs text-emerald-400 font-bold mt-0.5">Estado: ABIERTA</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <form onSubmit={async (e) => {
                 e.preventDefault();
                 const val = new FormData(e.target).get('q');
                 if(!val || val.length < 2) return toast.warning('Ingresá al menos 2 caracteres');
                 try {
                   const res = await api.get(`/apiordenesRetiro/mostrador/buscar?q=${val}`);
                   const data = res.data || {};
                   const combined = [
                     ...(data.retiroRows || []),
                     ...(data.sinRetiro || []).map(o => ({ 
                         OReIdOrdenRetiro: o.OrdIdOrden, 
                         ordenDeRetiro: o.OrdCodigoOrden, 
                         CliNombre: o.CliNombre, 
                         CliCodigo: o.CliCodigo, 
                         OReCostoTotalOrden: o.OrdCostoFinal, 
                         Pagada: o.Pagada, 
                         estadoRetiro: o.estadoOrden, 
                         OReFechaAlta: o.OReFechaAlta || null, 
                         orders: [{ 
                             orderNumber: o.OrdCodigoOrden, 
                             orderEstado: o.estadoOrden,
                             orderCosto: o.MonSimbolo ? `${o.MonSimbolo} ${parseFloat(o.OrdCostoFinal).toFixed(2)}` : `$ ${parseFloat(o.OrdCostoFinal).toFixed(2)}`,
                             monedaId: (o.MonSimbolo && o.MonSimbolo.includes('US')) ? 2 : 1
                         }] 
                     }))
                   ];
                   setRetiros(combined);
                   setSearchTerm(val);
                   setActiveTab('COBRO');
                   setSubTabIngreso('COBRO');
                   toast.success(`Resultados para "${val}"`);
                 } catch { toast.error('Error en búsqueda global'); }
               }} className="relative group/topsearch flex items-center">
                 <Search size={14} className="absolute left-3.5 text-slate-500 group-focus-within/topsearch:text-indigo-400 transition-colors" />
                 <input 
                   name="q" 
                   type="text" 
                   placeholder="BUSCAR PEDIDO..." 
                   className="bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 rounded-full pl-10 pr-4 py-1.5 text-[11px] font-black tracking-widest text-white placeholder-slate-600 outline-none w-64 focus:w-80 focus:border-indigo-500 focus:bg-slate-900 transition-all focus:ring-4 focus:ring-indigo-500/10 shadow-inner" 
                 />
                 <button type="submit" className="hidden">Buscar</button>
               </form>
            <div className="bg-slate-800 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 h-9">
              <RefreshCw size={14} className={`text-indigo-400 cursor-pointer hover:text-indigo-300 ${loadingCot?'animate-spin':''}`} onClick={buscarCotizBCU} />
              <span className="font-bold text-slate-300">1 US$ = <span className="text-indigo-400">${cotizacion ? fmt(cotizacion) : '---'}</span></span>
            </div>
            {/* Arqueo y Cierre movidos a la pestaña de Operaciones */}
          </div>
        </div>
        <div className="flex gap-2 px-8 pt-4">
          {[
            { id:'INGRESOS', label:'Ingresos a Caja', icon:ArrowDownCircle, color:'text-emerald-600' },
            { id:'EGRESOS', label:'Salidas / Pagos', icon:ArrowUpCircle, color:'text-rose-600' },
            { id:'OPERACIONES', label:'Operaciones Turno', icon:History, color:'text-amber-600' }
          ].map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); if(t.id==='INGRESOS') setSubTabIngreso('COBRO'); }}
              className={`px-7 py-3.5 rounded-t-[1.5rem] text-sm font-black flex items-center gap-2.5 transition-all border-x border-t border-transparent ${activeTab===t.id ? 'bg-[#f1f5f9] border-slate-200 text-slate-800 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]' : 'bg-transparent text-slate-400 hover:bg-white hover:text-slate-600'}`}>
              <t.icon size={18} className={activeTab===t.id ? t.color : 'opacity-40'} /> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-[#f1f5f9] flex overflow-hidden">

        {/* ======== INGRESOS A CAJA ======== */}
        {activeTab === 'INGRESOS' && (
          <div className="flex-1 flex flex-col overflow-hidden">
             
             {/* SUBMENÚ HORIZONTAL DE INGRESOS */}
             <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0 shadow-sm z-10 overflow-x-auto">
                {[
                   { id:'COBRO', label:'Pago de Pedidos', icon:ShoppingCart },
                   { id:'VENTA', label:'Venta de Recursos Adelantados', icon:Plus },
                   { id:'VENTA_DIRECTA', label:'Venta Libre', icon:Tag },
                   { id:'SALDO_FAVOR', label:'Ingreso de Saldo Anticipado', icon:Wallet },
                   { id:'PAGO_DEUDAS', label:'Pago de Deudas', icon:FileMinus },
                   { id:'AUTORIZAR', label:'Autorizar Entrega', icon:ShieldCheck }
                ].map(st => (
                   <button key={st.id} onClick={()=>setSubTabIngreso(st.id)}
                     className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-black text-sm transition-all border whitespace-nowrap ${subTabIngreso === st.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50'}`}>
                     <st.icon size={18}/> {st.label}
                   </button>
                ))}
             </div>

             {/* ÁREA DE TRABAJO (CENTRO + PANEL DERECHO) */}
             <div className="flex-1 flex overflow-hidden">
                {/* 2) COLUMNA CENTRAL: CONTENIDO DINÁMICO */}
                <div className="flex-1 overflow-hidden flex flex-col relative bg-[#f1f5f9]">
                   {/* --- SUBTAB COBRO --- */}
                {subTabIngreso === 'COBRO' && (
                  <div className="flex-1 flex overflow-hidden">
                     {/* Lista Buscador de Retiros (SIDEBAR) */}
                     <div className="w-[440px] border-r border-slate-200 flex flex-col bg-white shrink-0 shadow-lg z-0">
                        <div className="p-6 border-b border-slate-100 flex flex-col gap-5 bg-slate-50/50">
                             <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-2 px-1">
                                <Search size={12}/> Buscar Pedidos Disponibles
                             </h3>
                             <div className="relative group">
                               <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                               <input 
                                 type="text" 
                                 placeholder="Ingrese orden o cliente..." 
                                 value={searchTerm} 
                                 onChange={e=>setSearchTerm(e.target.value)} 
                                 className="bg-white border-2 border-slate-200 rounded-[1.5rem] pl-14 pr-6 py-4 text-base text-slate-900 placeholder-slate-400 outline-none w-full focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all font-bold shadow-sm" 
                               />
                             </div>
                             <div className="flex gap-2 flex-wrap px-1">
                               {[{val:'todos',l:'Todos'},{val:'1',l:'Comunes'},{val:'2',l:'Sem'},{val:'3',l:'Rollos'}].map(f=>(
                                 <button 
                                   key={f.val} 
                                   onClick={()=>setFiltroTipo(f.val)} 
                                   className={`px-4 py-2 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all ${filtroTipo===f.val?'bg-indigo-600 text-white shadow-md shadow-indigo-200':'bg-white text-slate-500 border border-slate-200 hover:border-slate-400 hover:text-slate-800'}`}
                                 >
                                   {f.l}
                                 </button>
                               ))}
                               <div className="ml-auto flex items-center gap-2">
                                 {seleccionados.length > 0 && (
                                   <button 
                                     onClick={() => setSeleccionados([])}
                                     className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-100 hover:text-rose-700 transition-colors uppercase tracking-widest shadow-sm flex items-center gap-1"
                                   >
                                     <X size={12} /> Desmarcar Todos
                                   </button>
                                 )}
                                 <span className="text-[10px] font-black text-slate-500 self-center bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">{retirosFiltrados.length} Registros</span>
                               </div>
                             </div>
                        </div>

                       <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                          {retirosFiltrados.length === 0 ? (
                              <div className="m-auto text-center opacity-30 px-6">
                                 <Search size={48} className="mx-auto mb-3 text-slate-700" />
                                 <p className="text-sm font-black uppercase tracking-widest text-slate-500">Sin pedidos por cobrar</p>
                              </div>
                          ) : retirosFiltrados.map(r => {
                              const sel = seleccionados.find(x=>x.retiroId===(r.OReIdOrdenRetiro||r.ordenDeRetiro));
                              let sumUsd = 0, sumUyu = 0;
                              getOrdenes(r).forEach(o => {
                                if (o.orderIdMetodoPago !== null || o.orderPago !== null) return;
                                const val = parseFloat((o.orderCosto||'').replace(/[^0-9.-]/g,''))||0;
                                if (o.monedaId === 2) sumUsd += val; else sumUyu += val;
                              });
                              return (
                                <div key={r.ordenDeRetiro} onClick={()=>toggleSeleccion(r)}
                                  className={`cursor-pointer shrink-0 rounded-[1.2rem] p-4 border-2 transition-all flex flex-col gap-4 relative overflow-hidden group shadow-sm active:scale-[0.98] ${sel?'border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/10':'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5'}`}>
                                  
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${sel?'border-emerald-500 bg-emerald-500 shadow-md shadow-emerald-500/20':'border-slate-200 bg-slate-50 group-hover:border-indigo-400 group-hover:bg-white'}`}>
                                        {sel && <CheckCircle size={20} className="text-white" />}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className={`font-black text-lg transition-colors leading-none tracking-tight ${sel?'text-emerald-700':'text-slate-900 group-hover:text-indigo-600'}`}>{r.ordenDeRetiro}</span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{r.lugarRetiro || 'Retiro Local'}</span>
                                      </div>
                                    </div>
                                    <div className="font-black text-right flex flex-col items-end shrink-0 gap-1.5">
                                      {sumUsd > 0 && <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[11px] font-black border border-emerald-200 shadow-sm">US$ {fmt(sumUsd)}</span>}
                                      {sumUyu > 0 && <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[11px] font-black border border-indigo-200 shadow-sm">${fmt(sumUyu)}</span>}
                                      {(sumUsd === 0 && sumUyu === 0) && <span className="text-slate-300 text-xs font-black italic">$0.00</span>}
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-3">
                                    <p className="text-sm font-black text-slate-700 group-hover:text-slate-900 transition-colors truncate tracking-wide">{r.CliNombre || 'Consumidor Final'}</p>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 uppercase tracking-widest">{r.CliCodigoCliente || 'S/C'}</span>
                                        {r.estadoRetiro && <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight opacity-70 bg-slate-100 px-2 py-0.5 rounded-md">{r.estadoRetiro}</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                          })}
                       </div>
                    </div>

                    {/* Area Central de COBRO (SELECCIONADAS) */}
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Billetera Sticky */}
                      {globalClient.id && (
                        <div className="px-6 py-2 border-b border-slate-200 bg-white/80 backdrop-blur-md z-50 shadow-sm shrink-0">
                          <ClienteBilletera 
                            clienteId={globalClient.id} 
                            clienteNombre={globalClient.nombre} 
                          />
                        </div>
                      )}

                      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
                        {seleccionados.length === 0 ? (
                          <div className="m-auto text-center opacity-40">
                            <ShoppingCart size={80} className="mx-auto mb-4 text-slate-300" />
                            <p className="font-black uppercase tracking-widest text-slate-400">Selecciona órdenes para cobrar</p>
                          </div>
                        ) : (
                          <div className="animate-in fade-in slide-in-from-bottom-5 duration-500 flex flex-col gap-8">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Resumen de Cobro Seleccionado</h2>
                              <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm">
                                <button 
                                  onClick={() => setMonedaExhibicion('UYU')} 
                                  className={`px-6 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${monedaExhibicion === 'UYU' ? 'bg-indigo-600 text-white shadow-lg ring-1 ring-indigo-400' : 'text-slate-400 hover:text-slate-700'}`}
                                >
                                  Pesos ($)
                                </button>
                                <button 
                                  onClick={() => setMonedaExhibicion('USD')} 
                                  className={`px-6 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${monedaExhibicion === 'USD' ? 'bg-emerald-600 text-white shadow-lg ring-1 ring-emerald-400' : 'text-slate-400 hover:text-slate-700'}`}
                                >
                                  Dólares (US$)
                                </button>
                              </div>
                            </div>

                            {seleccionados.map(s => (
                              <div key={s.retiroId} className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex-1 flex items-center gap-4 flex-wrap">
                                    <span className="font-black text-xl text-emerald-600 tracking-tighter">{s.codigoRef}</span>
                                    <span className="text-sm text-slate-500 font-bold tracking-tight bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                                      <span className="text-indigo-600 opacity-60">ID: {s.retiro?.CliCodigoCliente || '-'}</span> {s.descripcion}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest border border-slate-200 px-3 py-1 rounded-full shrink-0 shadow-sm">{s.retiro?.lugarRetiro || 'Retiro en el Local'}</span>
                                  </div>
                                  <div className="flex gap-4">
                                    <div className="text-right">
                                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Saldo Base</p>
                                      <p className="font-black text-slate-900 text-lg">{monedaExhibicion === 'USD' ? 'US$' : '$'}{fmt(calcularMontoPorMoneda(s.retiro, monedaExhibicion))}</p>
                                    </div>
                                    <div className="w-px h-10 bg-slate-100 self-center"></div>
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Ajuste Manual</p>
                                      <input type="number" value={ajustes[s.retiroId]?.ajuste || ''} onChange={e => setAjustes(p => ({ ...p, [s.retiroId]: { ...p[s.retiroId], ajuste: e.target.value } }))} className="bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 w-24 text-amber-600 font-black text-sm outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner" placeholder="0.0" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Motivo Ajuste</p>
                                      <select value={ajustes[s.retiroId]?.tipoAjuste || ''} onChange={e => setAjustes(p => ({ ...p, [s.retiroId]: { ...p[s.retiroId], tipoAjuste: e.target.value } }))} className="bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm">
                                        {TIPOS_AJUSTE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                      </select>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 border-t border-slate-100 pt-5">
                                  {getOrdenes(s.retiro).map(o => {
                                    const val = parseFloat((o.orderCosto || '').replace(/[^0-9.-]/g, '')) || 0;
                                    const currency = o.monedaId === 2 ? 'US$' : '$';
                                    const pagado = o.orderIdMetodoPago !== null || o.orderPago !== null;
                                    const cubierto = o.orderEstado === 'Abonado' || o.orderEstado === 'Autorizado';
                                    return (
                                      <div key={o.orderId} className={`flex justify-between items-center px-4 py-3 mt-1 rounded-2xl border gap-4 ${(pagado || cubierto) ? 'bg-slate-50/50 border-slate-100 opacity-60' : 'bg-white border-slate-200'}`}>
                                        <div className="flex items-center gap-4 w-full truncate text-sm">
                                          <AlertCircle size={14} className={`shrink-0 ${(pagado || cubierto) ? 'text-slate-300' : 'text-indigo-400'}`} /> 
                                          <span className="font-black text-slate-400 shrink-0 text-xs">#{o.orderNumber || o.orderId}</span>
                                          <span className="font-bold text-slate-700 truncate">Trabajo: {o.orderNombreTrabajo || 'Impreso'}</span>
                                          <span className="font-medium text-slate-400 truncate hidden md:block">Material: {o.orderMaterial || '-'}</span>
                                          <span className="font-black text-slate-800 shrink-0 bg-slate-100/50 px-2 py-0.5 rounded-lg text-xs">Cant: {o.orderCantidad || '?'}</span>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                          <span className={`font-black text-slate-800 min-w-[80px] text-right ${cubierto ? 'line-through text-slate-300' : ''}`}>{currency} {fmt(val)}</span>
                                          {pagado ? (
                                            <span className="w-20 text-center px-2 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-black rounded-lg border border-emerald-200">Facturada</span>
                                          ) : cubierto ? (
                                            <span className="w-24 text-center px-2 py-1 bg-amber-100 text-amber-600 text-[10px] font-black rounded-lg border border-amber-200">{o.orderEstado === 'Autorizado' ? 'Autorizado' : 'Abonada'}</span>
                                          ) : (
                                            <span className="w-20 text-center px-2 py-1 bg-rose-50 text-rose-500 text-[10px] font-black rounded-lg border border-rose-100">Pendiente</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- SUBTAB VENTA DE ROLLO --- */}
                {subTabIngreso === 'VENTA' && (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                     <CajaVentaDirectaTab
                        allowedTipos={['RECURSO']}
                        metodosPago={metodosPago}
                        cotizacion={cotizacion}
                        onVentaExitosa={()=>{ fetchRetiros(); setVentaPagos([{ id: Date.now(), metodoPagoId: '', moneda: 'UYU', monedaId: 1, monto: '' }]); setVentaObs(''); setVentaTotalACubrir(0); setVentaMoneda('UYU'); setVentaClienteId(''); setVentaClienteNombre(''); }}
                        onClienteChange={(c) => { 
                          setVentaClienteId(c?.CliIdCliente || ''); 
                          setVentaClienteNombre(c?.Nombre || ''); 
                        }}
                        pagos={ventaPagos}
                        onPagosChange={setVentaPagos}
                        tipoDocumento={ventaTipoDoc}
                        onTipoDocumento={setVentaTipoDoc}
                        obs={ventaObs}
                        onObs={setVentaObs}
                        procesando={procesandoVenta}
                        onConfirmar={async (payload) => {
                          if (!payload.header.clienteId) { toast.warning('Debe seleccionar un cliente.'); return; }
                          if (!payload.items.every(i => i.codigo && i.precioTotal && i.cantidad)) { toast.warning('Complete todos los campos de los ítems.'); return; }
                          
                          const pagosFilt = ventaPagos.filter(p => p.monto && p.metodoPagoId);
                          if (pagosFilt.length === 0 && ventaTotalACubrir > 0) {
                              const confirm = await Swal.fire({
                                  title: '¿Venta a Crédito?',
                                  html: `No ingresaste ninguna <b>Forma de Pago</b>.<br/><br/>Esto enviará la venta 100% a la cuenta corriente del cliente como <b>deuda (-${ventaMoneda === 'USD'?'US$':'$'} ${ventaTotalACubrir})</b>.<br/><br/>¿Es correcto o te olvidaste de agregar el pago?`,
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonText: 'Sí, vender a crédito',
                                  cancelButtonText: 'Uy, olvidé el pago'
                              });
                              if (!confirm.isConfirmed) return;
                          }

                          setProcesandoVenta(true);
                          try {
                            const ventaPayload = { ...payload, pagos: ventaPagos.filter(p => p.monto && p.metodoPagoId).map(p => ({ metodoPagoId: parseInt(p.metodoPagoId), montoOriginal: parseFloat(p.monto), monedaId: p.moneda === 'USD' ? 2 : 1, cotizacion: p.moneda === 'USD' ? cotizacion : null, referenciaNumero: '' })) };
                            const res = await api.post('/contabilidad/caja/venta-directa', ventaPayload);
                            toast.success(`Venta procesada. Comprobante: ${res.data.numeroDocFormato || res.data.tcaIdTransaccion}`);

                            // ── ARMADO DEL TICKET PARA IMPRIMIR ──
                            const ventaTicket = {
                              empresa: 'MACROSOFT LTDA',
                              fecha: new Date().toLocaleString('es-UY'),
                              comprobante: res.data.numeroDocFormato || `TCA-${res.data.tcaIdTransaccion}`,
                              cajero: sesion?.usrLogin || 'Sistema',
                              cliente: payload.header.clienteId ? (payload._clienteNombre || 'Cliente') : 'Consumidor Final',
                              items: payload.items.map(it => ({
                                descripcion: it.descripcion || it.codigo,
                                cantidad: it.cantidad,
                                importe: it.precioTotal
                              })),
                              totales: {
                                subtotal: res.data.totalBruto,
                                total: res.data.totalBruto,
                                moneda: ventaMoneda === 'USD' ? 'US$' : '$'
                              },
                              pagos: ventaPagos.filter(p => p.monto && p.metodoPagoId).map(p => ({
                                metodo: metodosPago.find(m => m.MPaIdMetodoPago === parseInt(p.metodoPagoId))?.MPaDescripcionMetodo || 'Pago',
                                moneda: p.moneda,
                                monto: p.monto
                              }))
                            };
                            setTicketData(ventaTicket);
                            setTimeout(() => { if (ticketRef.current) window.print(); }, 300);

                            fetchRetiros(); setVentaPagos([{ id: Date.now(), metodoPagoId: '', moneda: 'UYU', monedaId: 1, monto: '' }]); setVentaObs(''); setVentaTotalACubrir(0); setVentaMoneda('UYU');
                          } catch(e) { toast.error(e.response?.data?.error || 'Error al procesar venta'); }
                          finally { setProcesandoVenta(false); }
                        }}
                        onTotalChange={(t, m) => { setVentaTotalACubrir(t); if(m) setVentaMoneda(m); }}
                     />
                  </div>
                )}
                {/* --- SUBTAB VENTA GENERICA --- */}
                {subTabIngreso === 'VENTA_DIRECTA' && (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                     <CajaVentaDirectaTab
                        defaultTipo="VENTA_INSUMOS" allowedTipos={['VENTA_INSUMOS', 'VENTA_PRODUCTOS']}
                        metodosPago={metodosPago}
                        cotizacion={cotizacion}
                        onVentaExitosa={()=>{ fetchRetiros(); setVentaPagos([{ id: Date.now(), metodoPagoId: '', moneda: 'UYU', monedaId: 1, monto: '' }]); setVentaObs(''); setVentaTotalACubrir(0); setVentaMoneda('UYU'); setVentaClienteId(''); setVentaClienteNombre(''); }}
                        onClienteChange={(c) => { 
                          setVentaClienteId(c?.CliIdCliente || ''); 
                          setVentaClienteNombre(c?.Nombre || ''); 
                        }}
                        pagos={ventaPagos}
                        onPagosChange={setVentaPagos}
                        tipoDocumento={ventaTipoDoc}
                        onTipoDocumento={setVentaTipoDoc}
                        obs={ventaObs}
                        onObs={setVentaObs}
                        procesando={procesandoVenta}
                        onConfirmar={async (payload) => {
                          if (!payload.header.clienteId) { toast.warning('Debe seleccionar un cliente.'); return; }
                          if (!payload.items.every(i => i.codigo && i.precioTotal && i.cantidad)) { toast.warning('Complete todos los campos de los �tems.'); return; }
                          setProcesandoVenta(true);
                          try {
                            const ventaPayload = { ...payload, pagos: ventaPagos.filter(p => p.monto && p.metodoPagoId).map(p => ({ metodoPagoId: parseInt(p.metodoPagoId), montoOriginal: parseFloat(p.monto), monedaId: p.moneda === 'USD' ? 2 : 1, cotizacion: p.moneda === 'USD' ? cotizacion : null, referenciaNumero: '' })) };
                            const res = await api.post('/contabilidad/caja/venta-directa', ventaPayload);
                            toast.success('Venta procesada');
                            fetchRetiros(); setVentaPagos([{ id: Date.now(), metodoPagoId: '', moneda: 'UYU', monedaId: 1, monto: '' }]); setVentaObs(''); setVentaTotalACubrir(0); setVentaMoneda('UYU');
                          } catch(e) { toast.error('Error al procesar venta'); }
                          finally { setProcesandoVenta(false); }
                        }}
                        onTotalChange={(t, m) => { setVentaTotalACubrir(t); if(m) setVentaMoneda(m); }}
                     />
                  </div>
                )}
                {/* --- SUBTAB COBRO LIBRE (Insertar Saldo / Servicios Varios) --- */}
                {subTabIngreso === 'SALDO_FAVOR' && (
                  <CajaCobroLibreTab 
                     sesion={sesion}
                     metodosPago={metodosPago}
                     cotizacion={cotizacion}
                     onCobroCompletado={(res) => {
                       const tick = {
                         title: 'RECIBO DE CAJA / POS',
                         empresa: 'MACROSOFT LTDA',
                         fecha: new Date().toLocaleString('es-UY'),
                         comprobante: res.numeroDocFormato || `TCA-${res.tcaIdTransaccion}`,
                         cajero: sesion?.usrLogin || 'Sistema',
                         cliente: res.clienteInfo || 'Cliente',
                         items: [{ descripcion: 'Venta Libre / Saldo a Favor', cantidad: 1, importe: res.totalBruto }],
                         totales: { subtotal: res.totalBruto, total: res.totalBruto, moneda: '$' },
                         pagos: res.pagosCreados || []
                       };
                       setTicketData(tick);
                       setTimeout(() => { if (ticketRef.current) window.print(); }, 300);
                     }}
                  />
                )}
                {/* --- SUBTAB PAGO DE DEUDAS --- */}
                {subTabIngreso === 'PAGO_DEUDAS' && (
                  <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-0 overflow-hidden p-10">
                      <div className="text-center max-w-lg">
                          <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full inline-block mb-4 shadow-sm">
                              <FileMinus size={48} />
                          </div>
                          <h3 className="text-2xl font-black text-slate-800 mb-2">Pago de Deudas</h3>
                          <p className="text-slate-500 font-medium leading-relaxed">
                              Esta funci�n se est� preparando para liquidar deudas desde caja.
                          </p>
                      </div>
                  </div>
                )}
                {/* --- SUBTAB MOTOR (Reglas Manuales) --- */}
                {subTabIngreso === 'MOTOR' && (
                  <div className="flex-1 p-6 flex gap-6 bg-[#f1f5f9] overflow-hidden">
                    
                    {/* 1. Lista de Operaciones */}
                    <div className="w-80 flex flex-col gap-4 shrink-0">
                      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden flex flex-col flex-1 shadow-2xl">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                          <div>
                            <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-widest">
                              <Zap size={16} className="text-indigo-600 fill-indigo-600/10"/> Operaciones
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1 font-black">REGLAS DEL MOTOR</p>
                          </div>
                          <LayoutGrid size={18} className="text-slate-300" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-white">
                          {operacionesCaja.length === 0 && (
                            <div className="text-center text-slate-400 text-xs py-12 px-6">
                              <AlertCircle size={32} className="mx-auto mb-3 opacity-20"/>
                              Sin operaciones configuradas
                            </div>
                          )}
                          {operacionesCaja.map(op => {
                            const sel = opSeleccionada?.EvtCodigo === op.EvtCodigo;
                            const colorEfecto = op.EvtGeneraDeuda ? 'text-amber-600' : op.EvtAfectaSaldo === 1 ? 'text-emerald-600' : op.EvtAfectaSaldo === -1 ? 'text-rose-600' : op.EvtAplicaRecurso ? 'text-indigo-600' : 'text-slate-500';
                            return (
                              <button key={op.EvtCodigo} onClick={() => { setOpSeleccionada(op); setOpClienteId(''); setOpClienteNombre(''); setOpImporte(''); }}
                                className={`text-left p-4 rounded-2xl border-2 transition-all group relative overflow-hidden active:scale-[0.98] ${sel ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border-slate-100 hover:border-indigo-400 bg-slate-50/50 hover:bg-white text-slate-600'}`}>
                                {sel && <div className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-md animate-in slide-in-from-top-4 duration-200"><CheckCircle size={14} className="text-white font-black"/></div>}
                                <div className="flex justify-between items-start gap-2">
                                  <span className={`font-black text-sm transition-colors ${sel ? 'text-white' : 'text-slate-700 group-hover:text-indigo-600'}`}>{op.EvtNombre}</span>
                                  {!sel && <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded-lg border border-slate-200 text-slate-400 uppercase transition-all group-hover:border-indigo-200">{op.EvtCodigo}</span>}
                                </div>
                                <div className={`text-[10px] mt-2 font-black uppercase tracking-widest ${sel ? 'text-indigo-100' : colorEfecto}`}>
                                  {op.EvtGeneraDeuda ? '⚡ Genera deuda' : op.EvtAfectaSaldo === 1 ? '↑ Acredita saldo' : op.EvtAfectaSaldo === -1 ? '↓ Debita saldo' : '○ Neutro'}
                                  {op.EvtAplicaRecurso && ' · Recursos'}
                                </div>
                                {op.EvtDescripcion && <p className={`text-[10px] mt-2 line-clamp-1 italic font-bold leading-tight ${sel ? 'text-indigo-200' : 'text-slate-400'}`}>"{op.EvtDescripcion}"</p>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 2. Formulario de Operación */}
                    <div className="flex-1 flex flex-col min-h-0 bg-[#f1f5f9]">
                      {/* Billetera Sticky (Encima de todo) */}
                      {globalClient.id && (
                        <div className="px-6 py-2 border-b border-slate-200 bg-white/80 backdrop-blur-md z-20 shrink-0 shadow-sm">
                          <ClienteBilletera 
                            clienteId={globalClient.id} 
                            clienteNombre={globalClient.nombre} 
                          />
                        </div>
                      )}

                      <div className="flex-1 p-6 overflow-y-auto flex flex-col min-w-[500px]">
                        {!opSeleccionada ? (
                          <div className="m-auto text-center opacity-40 py-20 animate-pulse">
                            <Zap size={80} className="mx-auto mb-6 text-indigo-400 fill-indigo-100" />
                            <p className="text-slate-800 text-2xl font-black tracking-tight">Selecciona una Operación</p>
                            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto font-bold uppercase tracking-widest leading-relaxed">Elige un tipo de movimiento contable del menú izquierdo.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-2xl max-w-3xl w-full flex flex-col gap-8 relative group/form overflow-hidden border-t-8 border-t-indigo-600">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-100 shadow-sm">Operación Configurada</span>
                                        <History size={16} className="text-slate-300" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 tracking-tight"><Zap size={28} className="text-indigo-600 fill-indigo-100"/> {opSeleccionada.EvtNombre}</h2>
                                    {opSeleccionada.EvtDescripcion && <p className="text-base text-slate-400 mt-2 font-bold italic">"{opSeleccionada.EvtDescripcion}"</p>}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs font-black font-mono bg-slate-50 border-2 border-slate-100 px-4 py-1.5 rounded-xl text-slate-600 shadow-inner group-hover/form:border-indigo-100 transition-colors uppercase">{opSeleccionada.EvtCodigo}</span>
                                </div>
                              </div>

                              <div className="flex gap-3 flex-wrap pb-6 border-b border-slate-100">
                                {opSeleccionada.EvtGeneraDeuda && <span className="text-[10px] font-black bg-amber-50 border border-amber-100 text-amber-600 px-4 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">⚡ Genera deuda</span>}
                                {opSeleccionada.EvtAfectaSaldo === 1 && <span className="text-[10px] font-black bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">↑ Acredita Saldo</span>}
                                {opSeleccionada.EvtAfectaSaldo === -1 && <span className="text-[10px] font-black bg-rose-50 border border-rose-100 text-rose-600 px-4 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">↓ Debita Saldo</span>}
                                {opSeleccionada.EvtAplicaRecurso && <span className="text-[10px] font-black bg-indigo-50 border border-indigo-100 text-indigo-600 px-4 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">◎ Aplica Recursos</span>}
                              </div>

                              <div className="flex flex-col gap-8">
                                {(opSeleccionada.EvtUsaEntidad || opSeleccionada.EvtAfectaSaldo !== 0) && (
                                  <div className="relative">
                                    <label className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                                      <span>Selección de Cliente {opSeleccionada.EvtUsaEntidad ? '(OBLIGATORIO)' : '(OPCIONAL)'}</span>
                                      {opClienteId && <span className="text-emerald-600 flex items-center gap-1.5 font-black bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">Cliente Verificado <CheckCircle size={12}/></span>}
                                    </label>
                                    <div className={`relative flex items-center group/search ${opClienteId ? 'ring-8 ring-emerald-500/5' : 'focus-within:ring-8 focus-within:ring-indigo-500/5'} rounded-[1.5rem] transition-all`}>
                                        <div className="absolute left-5 text-slate-400 group-focus-within/search:text-indigo-600 transition-colors">
                                            <Search size={22} />
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="Buscar por Nombre, RUT o Código..." 
                                            value={opClienteNombre} 
                                            onChange={e => { setOpClienteNombre(e.target.value); setOpClienteId(''); buscarClientes(e.target.value); }} 
                                            className={`w-full bg-slate-50/50 border-2 ${opClienteId ? 'border-emerald-500/50 bg-white' : 'border-slate-100 hover:border-slate-300 focus:border-indigo-600 focus:bg-white'} rounded-[1.5rem] pl-16 pr-6 py-5 text-lg font-bold text-slate-900 placeholder-slate-400 outline-none transition-all shadow-inner`} 
                                        />
                                        {buscandoCliente && <div className="absolute right-5"><Loader2 size={24} className="animate-spin text-indigo-500"/></div>}
                                        {opClienteId && (
                                            <button onClick={() => { setOpClienteId(''); setOpClienteNombre(''); }} className="absolute right-5 p-2 bg-slate-100 hover:bg-rose-100 rounded-full transition-all text-slate-400 hover:text-rose-600">
                                                <X size={18}/>
                                            </button>
                                        )}
                                    </div>
                                    
                                    {busquedaClientes.length > 0 && !opClienteId && (
                                      <div className="absolute z-50 top-full mt-3 left-0 right-0 bg-white border border-slate-200 rounded-[2rem] shadow-[0_30px_90px_rgba(0,0,0,0.15)] overflow-hidden max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300 ring-8 ring-black/5">
                                        <div className="px-6 py-4 bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 flex items-center justify-between">
                                            <span>Sugerencias Encontradas</span>
                                            <span className="bg-white text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black border border-slate-200 shadow-sm">{busquedaClientes.length} registros</span>
                                        </div>
                                        {busquedaClientes.map(c => (
                                          <button key={c.CliIdCliente} 
                                            onClick={() => { setOpClienteId(c.CliIdCliente); setOpClienteNombre(`${c.CodCliente || ''} - ${c.Nombre}`); setBusquedaClientes([]); }} 
                                            className="w-full text-left px-6 py-5 hover:bg-indigo-50 text-sm border-b border-slate-50 last:border-0 group flex items-center justify-between transition-all active:bg-indigo-100">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all border-2 border-slate-100 group-hover:border-indigo-600 shadow-sm group-hover:shadow-indigo-200">
                                                    {c.Nombre?.[0] || 'C'}
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors text-lg">{c.Nombre}</span>
                                                    {c.NombreFantasia && <span className="text-[12px] text-slate-400 font-bold uppercase tracking-tight opacity-70">"{c.NombreFantasia}"</span>}
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg font-black uppercase border border-slate-200 group-hover:bg-white group-hover:border-indigo-100">ID: {c.CliIdCliente}</span>
                                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{c.CodCliente || 'SIN CÓDIGO'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
                                                    <ArrowRight size={20} className="text-white" />
                                                </div>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-8">
                                  <div className="col-span-1">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Importe de Operación</label>
                                    <div className="flex group/amount shadow-sm rounded-[1.5rem] overflow-hidden border-2 border-slate-100 focus-within:border-indigo-600 transition-all bg-slate-50/50 focus-within:bg-white focus-within:ring-8 focus-within:ring-indigo-600/5">
                                      <select value={opMoneda} onChange={e => setOpMoneda(e.target.value)} className="bg-slate-100 border-r border-slate-200 px-5 font-black text-slate-700 outline-none text-lg cursor-pointer hover:bg-slate-200 transition-colors">
                                        <option value="UYU">$</option>
                                        <option value="USD">U$</option>
                                      </select>
                                      <input 
                                        type="number" 
                                        placeholder="0.00" 
                                        value={opImporte} 
                                        onChange={e => setOpImporte(e.target.value)} 
                                        className="w-full bg-transparent px-6 py-5 text-3xl font-black text-slate-900 outline-none text-right placeholder-slate-300" 
                                      />
                                    </div>
                                    {opMoneda === 'USD' && cotizacion && (
                                        <div className="flex items-center justify-between mt-3 px-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cotización: {fmt(cotizacion)}</span>
                                            <p className="text-[12px] font-black text-emerald-600 tracking-tighter bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 shadow-sm">≈ $ {fmt(parseFloat(opImporte||0) * cotizacion)} UYU</p>
                                        </div>
                                    )}
                                  </div>

                                  <div className="col-span-1">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Metodo de Pago (opcional)</label>
                                    <div className="relative group/pay shadow-sm">
                                        <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/pay:text-indigo-600 transition-colors" size={22} />
                                        <select 
                                            value={opMetodoId} 
                                            onChange={e => setOpMetodoId(e.target.value)} 
                                            className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-[1.5rem] pl-16 pr-6 py-5 text-base font-bold text-slate-800 outline-none transition-all appearance-none shadow-inner cursor-pointer"
                                        >
                                            <option value="">A elección en asiento...</option>
                                            {metodosPago.map(m => <option key={m.MPaIdMetodoPago} value={m.MPaIdMetodoPago}>{m.MPaDescripcionMetodo}</option>)}
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                            <ChevronRight size={20} className="rotate-90" />
                                        </div>
                                    </div>
                                  </div>

                                  <div className="col-span-2">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Notas / Concepto / Glosa</label>
                                    <textarea 
                                        value={opObs} 
                                        onChange={e => setOpObs(e.target.value)} 
                                        placeholder="Detalla el motivo de este movimiento para auditoría..." 
                                        className="w-full bg-slate-50/50 border-2 border-slate-100 hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded-[2rem] px-6 py-5 text-base text-slate-800 font-bold outline-none resize-none h-32 transition-all shadow-inner placeholder-slate-300" 
                                    />
                                  </div>
                                </div>

                                <button
                                  onClick={handleOperacionManual}
                                  disabled={procesandoOp}
                                  className={`w-full py-6 rounded-[1.5rem] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-xl active:scale-[0.98] mt-4 ${procesandoOp ? 'bg-slate-200 cursor-not-allowed text-slate-400' : 'bg-indigo-600 hover:bg-black text-white shadow-indigo-200 hover:shadow-2xl hover:-translate-y-1'}`}
                                >
                                  {procesandoOp ? <Loader2 size={28} className="animate-spin"/> : <><Zap size={28} className="fill-white/20"/> Confirmar y Registrar Movimiento</>}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- SUBTAB AUTORIZAR --- */}
                {subTabIngreso === 'AUTORIZAR' && (
                  <div className="flex-1 flex p-6 gap-6 min-h-0 bg-[#f1f5f9]">
                     <div className="w-[400px] bg-white border border-slate-200 rounded-[2rem] flex flex-col overflow-hidden shadow-xl">
                       <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                         <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-widest"><ShieldCheck className="text-indigo-600" size={18}/> Retiros Pendientes</h3>
                         <div className="relative mt-4">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Filtrar por nombre o ID..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-700 font-bold outline-none focus:border-indigo-600 shadow-sm transition-all" />
                         </div>
                       </div>
                       <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-white">
                         {retirosFiltrados.length === 0 ? (
                           <div className="text-center py-12 opacity-30">
                             <ShoppingCart size={40} className="mx-auto mb-2" />
                             <p className="text-[10px] font-black uppercase">Sin retiros pendientes</p>
                           </div>
                         ) : retirosFiltrados.map(r => (
                           <div key={r.ordenDeRetiro} onClick={()=>setRetiroSelectAut({retiroId: r.ordenDeRetiro, raw:r, deudaEstimada:calcularMontoRetiro(r)})} 
                             className={`p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98] ${retiroSelectAut?.retiroId===r.ordenDeRetiro ? 'border-indigo-600 bg-indigo-50 shadow-md':'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white'}`}>
                             <div className="flex justify-between items-start mb-1">
                                <span className={`font-black text-sm tracking-tight ${retiroSelectAut?.retiroId===r.ordenDeRetiro ? 'text-indigo-600':'text-slate-800'}`}>ORDEN #{r.ordenDeRetiro}</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.OReFechaAlta ? new Date(r.OReFechaAlta).toLocaleDateString() : '-'}</span>
                             </div>
                             <div className="text-xs text-slate-500 font-bold mb-3">{r.CliNombre}</div>
                             <div className="flex justify-between items-center bg-white/50 p-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Adeudado:</span>
                                <span className="font-black text-rose-600 text-sm">${fmt(calcularMontoRetiro(r))}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>

                     <div className="flex-1 flex items-center justify-center overflow-y-auto">
                       {!retiroSelectAut ? (
                         <div className="text-center opacity-30 py-20 animate-pulse">
                           <ShieldCheck size={80} className="mx-auto mb-6 text-indigo-400 fill-indigo-100" />
                           <p className="text-slate-800 text-2xl font-black tracking-tight">Autorización de Entrega</p>
                           <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto font-bold uppercase tracking-widest leading-relaxed">Selecciona un retiro de la lista para proceder.</p>
                         </div>
                       ) : (
                         <div className="max-w-xl w-full bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-2xl flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-500 border-t-8 border-t-amber-500">
                           <div className="text-center">
                             <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-100 shadow-sm">
                                <ShieldCheck size={40} className="text-amber-600" />
                             </div>
                             <h2 className="text-2xl font-black text-slate-800 tracking-tight">Autorizar Entrega Sin Cobro</h2>
                             <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[10px]">Referencia de Retiro: <span className="text-indigo-600">{retiroSelectAut.retiroId}</span></p>
                           </div>

                           <div className="flex flex-col gap-6">
                            <div>
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3 px-1">Motivo de la autorización <span className="text-rose-500">*</span></label>
                              <textarea autoFocus value={autMotivo} onChange={e=>setAutMotivo(e.target.value)} placeholder="Ej: Autorizado por Gerencia, Cliente cuenta corriente, Paga mañana..." className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[1.5rem] p-5 text-slate-800 font-bold outline-none focus:border-amber-500 focus:bg-white h-32 resize-none transition-all shadow-inner placeholder-slate-300"></textarea>
                            </div>
                            
                            <div>
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3 px-1">Vencimiento del compromiso (Opcional)</label>
                              <div className="relative">
                                <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input type="date" value={autVencimiento} onChange={e=>setAutVencimiento(e.target.value)} className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[1.5rem] pl-16 pr-5 py-4 text-slate-800 font-bold outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner" />
                              </div>
                            </div>

                            <button onClick={handleAutorizar} disabled={procesandoAut} className="mt-4 w-full bg-amber-500 hover:bg-black disabled:bg-slate-200 text-white font-black py-6 rounded-[1.5rem] shadow-xl shadow-amber-100 hover:shadow-2xl transition-all active:scale-[0.98] text-lg flex items-center justify-center gap-3">
                              {procesandoAut ? <Loader2 className="animate-spin" size={24} /> : <><ShieldCheck size={24}/> CONFIRMAR Y AUTORIZAR</>}
                            </button>
                           </div>
                         </div>
                       )}
                      </div>
                    </div>
                )}
             </div>

             {/* 3) COLUMNA DERECHA: PANEL FIJO DE PAGO */}
             {(subTabIngreso === 'COBRO' || subTabIngreso === 'MOTOR' || subTabIngreso === 'VENTA' || subTabIngreso === 'VENTA_DIRECTA') && (
                <CajaPanelPago 
                   mode={subTabIngreso}
                   tiposDocDisponibles={tiposDocumentos}
                   {...(subTabIngreso === 'COBRO' ? {
                       totalACubrir: totalesCobro.neto,
                       moneda: monedaExhibicion,
                       cotizacion: cotizacion,
                       metodosPago: metodosPago,
                       pagos: carritosPago,
                       onPagosChange: setCarritosPago,
                       tipoDoc: tipoDocCobro,
                       onTipoDoc: setTipoDocCobro,
                       serieDoc: serieDocCobro,
                       onSerieDoc: setSerieDocCobro,
                       numDoc: numDocCobro || numDocCobroPredict,
                       notas: obsCobro,
                       onNotas: setObsCobro,
                       onConfirmar: handleRealizarCobro,
                       procesando: procesandoCobro,
                       disabledExtra: seleccionados.length === 0 || !cobroBalanceado
                    } : subTabIngreso === 'VENTA' ? {
                       totalACubrir: ventaTotalACubrir,
                       moneda: ventaMoneda,
                       cotizacion: cotizacion,
                       metodosPago: metodosPago,
                       pagos: ventaPagos,
                       onPagosChange: setVentaPagos,
                       tipoDoc: ventaTipoDoc,
                       onTipoDoc: setVentaTipoDoc,
                       serieDoc: ventaSerieDoc,
                       onSerieDoc: setVentaSerieDoc,
                       numDoc: '',
                       notas: ventaObs,
                       onNotas: setVentaObs,
                       onConfirmar: () => document.dispatchEvent(new CustomEvent('caja:confirmarVenta')),
                       procesando: procesandoVenta,
                       disabledExtra: procesandoVenta
                    } : {
                       totalACubrir: parseFloat(opImporte) || 0,
                       moneda: opMoneda,
                       cotizacion: cotizacion,
                       metodosPago: metodosPago,
                       pagos: motorPagos,
                       onPagosChange: setMotorPagos,
                       tipoDoc: motorTipoDoc,
                       onTipoDoc: setMotorTipoDoc,
                       serieDoc: motorSerieDoc,
                       onSerieDoc: setMotorSerieDoc,
                       numDoc: '',
                       notas: opObs,
                       onNotas: setOpObs,
                       onConfirmar: handleOperacionManual,
                       procesando: procesandoOp,
                       disabledExtra: !opSeleccionada || !opImporte
                    })}
                 />
              )}
             </div>
          </div>
        )}


        {/* ======== EGRESOS (SALIDAS) ======== */}

        {activeTab === 'EGRESOS' && (
          <div className="flex-1 flex overflow-hidden bg-[#f1f5f9]">
            <div className="flex-1 p-10 flex justify-center overflow-y-auto">
              <div className="max-w-3xl w-full bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-2xl flex flex-col gap-8 h-fit animate-in fade-in slide-in-from-bottom-10 duration-700 border-t-8 border-t-rose-500">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 tracking-tight"><ArrowUpCircle className="text-rose-600" size={32}/> Salida de Dinero</h2>
                        <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[10px]">Registro de egresos y gastos de caja chica</p>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-3xl border border-rose-100 shadow-sm">
                        <DollarSign size={24} className="text-rose-600" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3 px-1">Concepto de Gasto (Plan de Cuentas)</label>
                    <div className="relative group/cuenta">
                        <BookOpen className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/cuenta:text-rose-600 transition-colors" size={20} />
                        <select value={egresoCuentaCodigo} onChange={e=>setEgresoCuentaCodigo(e.target.value)} className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[1.5rem] pl-16 pr-6 py-5 font-black text-slate-700 focus:border-rose-500 focus:bg-white outline-none appearance-none transition-all cursor-pointer shadow-inner">
                            <option value="">Seleccione cuenta contable...</option>
                            {cuentasGastos.map(c => <option key={c.CueCodigo} value={c.CueCodigo}>[{c.CueCodigo}] {c.CueNombre}</option>)}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                            <ChevronRight size={20} className="rotate-90" />
                        </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3 px-1">Proveedor / Beneficiario / Destinatario</label>
                    <div className="relative group/prov">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/prov:text-rose-600 transition-colors" size={20} />
                        <input type="text" value={egresoProveedor} onChange={e=>setEgresoProveedor(e.target.value)} placeholder="¿A quién se le entrega el dinero?" className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[1.5rem] pl-16 pr-6 py-5 text-slate-800 font-bold focus:border-rose-500 focus:bg-white outline-none transition-all shadow-inner placeholder-slate-300" />
                    </div>
                  </div>

                  <div className="col-span-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3 px-1">Monto de Salida</label>
                    <div className="flex group/amount shadow-sm rounded-[1.5rem] overflow-hidden border-2 border-slate-100 focus-within:border-rose-600 transition-all bg-slate-50/50 focus-within:bg-white">
                      <select value={egresoMoneda} onChange={e=>setEgresoMoneda(e.target.value)} className="bg-slate-100 border-r border-slate-200 px-5 font-black text-slate-700 outline-none text-lg cursor-pointer hover:bg-slate-200 transition-colors">
                        <option value="UYU">$</option><option value="USD">U$</option>
                      </select>
                      <input type="number" value={egresoMonto} onChange={e=>setEgresoMonto(e.target.value)} placeholder="0.00" className="w-full bg-transparent px-6 py-5 text-3xl font-black text-rose-600 outline-none text-right placeholder-rose-200" />
                    </div>
                  </div>

                  <div className="col-span-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3 px-1">Método de Retiro</label>
                    <div className="relative group/met">
                        <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/met:text-rose-600 transition-colors" size={20} />
                        <select value={egresoMetodoId} onChange={e=>setEgresoMetodoId(e.target.value)} className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[1.5rem] pl-16 pr-6 py-5 text-slate-800 font-bold focus:border-rose-500 focus:bg-white outline-none transition-all shadow-inner appearance-none cursor-pointer">
                            <option value="">Seleccione forma...</option>
                            {metodosPago.filter(m=>m.MPaAfectaCaja).map(m=> <option key={m.MPaIdMetodoPago} value={m.MPaIdMetodoPago}>{m.MPaDescripcionMetodo}</option>)}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                            <ChevronRight size={20} className="rotate-90" />
                        </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3 px-1">Referencia / Observaciones de Salida</label>
                    <textarea value={egresoObs} onChange={e=>setEgresoObs(e.target.value)} placeholder="Explique brevemente el destino del dinero..." className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[2rem] px-6 py-5 text-slate-800 font-bold focus:border-rose-500 focus:bg-white outline-none h-32 resize-none transition-all shadow-inner placeholder-slate-300" />
                  </div>
                </div>
              </div>
            </div>
            
            <CajaPanelPago 
               mode="EGRESO"
               tiposDocDisponibles={tiposDocumentos}
               totalACubrir={parseFloat(egresoMonto) || 0}
               moneda={egresoMoneda}
               cotizacion={cotizacion}
               metodosPago={metodosPago.filter(m=>m.MPaAfectaCaja)}
               pagos={[{ id: 1, metodoPagoId: egresoMetodoId, moneda: egresoMoneda, monedaId: egresoMoneda==='USD'?2:1, monto: egresoMonto }]}
               onPagosChange={(newPagos) => {
                 if(newPagos[0]) {
                    setEgresoMetodoId(newPagos[0].metodoPagoId);
                    setEgresoMonto(newPagos[0].monto);
                 }
               }}
               tipoDoc={egresoTipoDoc}
               onTipoDoc={setEgresoTipoDoc}
               serieDoc={egresoSerieDoc}
               onSerieDoc={setEgresoSerieDoc}
               numDoc={egresoTipoDoc==='NINGUNO' ? 'Sin número' : (egresoNumDocPredict || 'Generando...')}
               notas={egresoObs}
               onNotas={setEgresoObs}
               onConfirmar={handleRealizarEgreso}
               procesando={procesandoEgreso}
               disabledExtra={!egresoCuentaCodigo || !egresoMonto || !egresoMetodoId}
            />
          </div>
        )}

        {/* ======== OPERACIONES DE TURNO ======== */}
        {activeTab === 'OPERACIONES' && (
           <div className="flex-1 flex flex-col overflow-hidden">
             {/* SUBMENÚ HORIZONTAL DE OPERACIONES */}
             <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0 shadow-sm z-10 overflow-x-auto">
                <button onClick={()=>setShowArqueo(true)} className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-black text-sm transition-all border whitespace-nowrap bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50">
                  <FileText size={18}/> Arqueo de Turno
                </button>
                <button className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-black text-sm transition-all border whitespace-nowrap bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200">
                  <DoorClosed size={18}/> Cierre de Turno
                </button>
             </div>

             <div className="flex-1 p-10 flex justify-center overflow-y-auto bg-[#f1f5f9]">
               <div className="max-w-3xl w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                 <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden border-t-8 border-t-indigo-600">
                 <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-8">
                    <div>
                        <h2 className="text-4xl font-black text-slate-800 flex items-center gap-4 tracking-tighter"><DoorClosed className="text-indigo-600" size={48}/> Cierre de Caja</h2>
                        <p className="text-slate-400 font-bold mt-2 uppercase tracking-[0.2em] text-xs">Arqueo y finalización de jornada</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-4 py-2 rounded-xl uppercase tracking-widest border border-slate-200 shadow-sm">Turno Actual</span>
                    </div>
                 </div>

                 {!resumenCierre ? (
                    <div className="text-center py-20 flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-indigo-600" size={48} />
                        <p className="font-black text-slate-400 uppercase tracking-widest text-sm animate-pulse">Consolidando transacciones...</p>
                    </div>
                 ) : (
                   <div className="flex flex-col gap-10">
                     <div className="bg-slate-50/50 rounded-[2.5rem] p-10 grid grid-cols-2 gap-10 border border-slate-100 shadow-inner">
                       <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Monto Inicial Apertura</p>
                          <p className="text-3xl font-black text-slate-800 tracking-tighter">${fmt(resumenCierre.sesion.StuMontoInicial)}</p>
                       </div>
                       <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                          <p className="text-[10px] text-emerald-600/60 font-black uppercase tracking-widest mb-2">Total Cobrado (+)</p>
                          <p className="text-3xl font-black text-emerald-600 tracking-tighter">${fmt(resumenCierre.cobros.TotalCobrado)}</p>
                       </div>
                       <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                          <p className="text-[10px] text-rose-600/60 font-black uppercase tracking-widest mb-2">Gastos / Egresos (-)</p>
                          <p className="text-3xl font-black text-rose-600 tracking-tighter">${fmt(resumenCierre.egresos.TotalEgresos)}</p>
                       </div>
                       <div className="col-span-1 bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-100 flex flex-col justify-center">
                         <p className="text-[10px] text-white/60 font-black uppercase tracking-widest mb-2">Saldo Esperado en Sistema</p>
                         <p className="text-4xl font-black text-white tracking-tighter">${fmt(resumenCierre.sesion.StuMontoInicial + resumenCierre.cobros.TotalCobrado - resumenCierre.egresos.TotalEgresos)}</p>
                       </div>
                     </div>

                     <div className="bg-white border-2 border-indigo-100 rounded-[2.5rem] p-10 flex flex-col gap-8 shadow-xl relative">
                       <div className="absolute -top-4 -right-4 bg-indigo-600 text-white p-3 rounded-2xl shadow-lg">
                          <CheckCircle size={24} />
                       </div>
                       <h3 className="font-black text-slate-800 flex items-center gap-4 text-xl tracking-tight"><DollarSign size={24} className="text-indigo-600" /> Arqueo Físico de Valores</h3>
                       
                       <div className="flex flex-col gap-4">
                         <div className="flex justify-between items-end px-1">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Desglose de Efectivo Físico en Cajón</label>
                           <span className="text-2xl font-black text-indigo-600 tracking-tighter bg-indigo-50 px-4 py-1 rounded-xl border border-indigo-100">Total Físico: $ {fmt(totalDenominaciones)}</span>
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-inner">
                           <div className="col-span-2 md:col-span-4"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Billetes</p></div>
                           {[2000, 1000, 500, 200, 100, 50, 20].map(den => (
                             <div key={den} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                               <div className="w-16 text-right"><span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">${den}</span></div>
                               <span className="text-slate-300 font-bold">x</span>
                               <input type="number" min="0" value={denominaciones[den]} onChange={e => setDenominaciones(p => ({ ...p, [den]: e.target.value }))} placeholder="0" className="w-full bg-transparent text-lg font-black text-slate-800 outline-none text-center" />
                             </div>
                           ))}
                           <div className="col-span-2 md:col-span-4 mt-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Monedas</p></div>
                           {[50, 10, 5, 2, 1].map(den => (
                             <div key={den} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                               <div className="w-16 text-right"><span className="text-sm font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">${den}</span></div>
                               <span className="text-slate-300 font-bold">x</span>
                               <input type="number" min="0" value={denominaciones[den]} onChange={e => setDenominaciones(p => ({ ...p, [den]: e.target.value }))} placeholder="0" className="w-full bg-transparent text-lg font-black text-slate-800 outline-none text-center" />
                             </div>
                           ))}
                         </div>
                       </div>

                       {cierreMontoFisico !== '' && (() => {
                          const sis = resumenCierre.sesion.StuMontoInicial + resumenCierre.cobros.TotalCobrado - resumenCierre.egresos.TotalEgresos;
                          const real = parseFloat(cierreMontoFisico)||0;
                          const diff = real - sis;
                          return (
                            <div className={`p-8 rounded-[1.5rem] font-black flex justify-between items-center animate-in zoom-in-95 duration-300 border-2 ${Math.abs(diff)<2 ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-50' : diff>0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-indigo-50' : 'bg-rose-50 border-rose-200 text-rose-700 shadow-rose-50'}`}>
                              <div className="flex items-center gap-4">
                                  {Math.abs(diff)<2 ? <CheckCircle size={32}/> : diff>0 ? <TrendingUp size={32}/> : <TrendingDown size={32}/>}
                                  <span className="text-xl tracking-tight uppercase">{Math.abs(diff)<2 ? 'BALANCE MANTENIDO CON ÉXITO' : diff>0 ? 'SOBRANTE DE CAJA DETECTADO' : 'FALTANTE DE CAJA DETECTADO'}</span>
                              </div>
                              <span className="text-4xl tracking-tighter font-black">{diff>0?'+':''}{fmt(diff)}</span>
                            </div>
                          )
                       })()}

                       <div className="flex flex-col gap-2">
                         <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Observaciones Finales / Justificación</label>
                         <textarea value={cierreObs} onChange={e=>setCierreObs(e.target.value)} placeholder="Justifique diferencias de arqueo o anote comentarios sobre la jornada..." className="w-full bg-white border-2 border-slate-100 rounded-[1.5rem] p-6 text-slate-800 font-bold outline-none h-32 resize-none focus:border-indigo-600 transition-all shadow-sm" />
                       </div>
                     </div>

                     <button onClick={handleCerrarCaja} className="w-full bg-rose-600 hover:bg-black text-white font-black py-8 rounded-[2rem] shadow-2xl shadow-rose-200 hover:shadow-black/20 hover:-translate-y-2 transition-all active:scale-[0.98] text-2xl tracking-tighter flex items-center justify-center gap-4 group">
                       <Power size={32} className="group-hover:text-rose-400 transition-colors"/> FINALIZAR TURNO Y CERRAR SESIÓN
                     </button>
                   </div>
                 )}
               </div>
             </div>
           </div>
         </div>
        )}
      </div>
    </div>

    {showArqueo && <CajaArqueoModal onClose={() => setShowArqueo(false)} />}
      
      {busquedaGlobalRes && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-8 animate-in fade-in duration-300" onClick={(e) => e.target === e.currentTarget && setBusquedaGlobalRes(null)}>
          <div className="bg-white border border-slate-200 rounded-[3rem] w-full max-w-5xl max-h-[85vh] flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-4 tracking-tight"><Search size={32} className="text-indigo-600"/> Resultados de Búsqueda Global</h2>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Se han encontrado {busquedaGlobalRes.length} coincidencias</p>
              </div>
              <button onClick={() => setBusquedaGlobalRes(null)} className="text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 p-4 rounded-2xl transition-all border border-slate-200 hover:border-rose-200 shadow-sm"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-auto p-10 flex flex-col gap-6">
              {busquedaGlobalRes.map((r, i) => (
                <div key={i} className="border border-slate-200 rounded-[2rem] p-8 bg-white flex flex-col gap-4 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                          {r.CliNombre?.[0] || 'R'}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">Retiro: <span className="underline decoration-indigo-600/30 decoration-4">{r.ordenDeRetiro || `R-${r.OReIdOrdenRetiro}`}</span></h3>
                        <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                            {r.CliNombre} 
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[10px] border border-slate-200 font-black">{r.CliCodigo||'S/C'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-slate-900 tracking-tighter">${fmt(r.OReCostoTotalOrden || r.Costo || 0)}</p>
                      <span className={`text-[10px] font-black px-4 py-1.5 rounded-full mt-2 inline-block border-2 uppercase tracking-widest shadow-sm ${r.Pagada || r.Pago ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                        {r.Pagada || r.Pago ? '✓ FINALIZADO' : '⚠ PENDIENTE'}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-slate-50 pt-6 mt-2 grid grid-cols-3 gap-8">
                     <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-inner"><span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Estado de Entrega</span><p className="text-slate-700 font-bold text-sm">{r.estadoRetiro || r.estado || 'Procesando...'}</p></div>
                     <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-inner"><span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Fecha de Registro</span><p className="text-slate-700 font-bold text-sm">{r.OReFechaAlta ? new Date(r.OReFechaAlta).toLocaleString('es-UY') : '-'}</p></div>
                     <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-inner"><span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Lugar Establecido</span><p className="text-slate-700 font-bold text-sm">{r.lugarRetiro || 'Planta Principal'}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}






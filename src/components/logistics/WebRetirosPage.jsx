import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, Check, AlertCircle, ArrowLeft, CheckCircle,
  Truck, Loader2, LayoutGrid, MapPin, Clock, Printer
} from 'lucide-react';
import api from '../../services/api'; // Axios instance base
import { io } from 'socket.io-client';

// ─── HELPER: Comprobante unificado de Orden de Retiro ───
// Patrón: mismo encabezado que LogisticsPage + ReceptionPage (MACROSOFT TEXTIL)
// Campos: código retiro, cliente, tipo, estado, local, monto, órdenes, fecha, firma
const printRetiroTicket = (item) => {
  const now = new Date().toLocaleString('es-UY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  const pagado = item.pagorealizado === 1 || item.pagorealizado === true;
  // Array de objetos completo para mostrar costo por orden
  const orderObjs = (item.orders || []);
  const orders = orderObjs.map(o => o.orderNumber || o.codigoOrden || '').filter(Boolean);
  const tipoDesc = item.TClDescripcion || 'Común';
  const local = (item.lugarRetiro && item.lugarRetiro !== '-' && item.lugarRetiro !== 'Web')
    ? item.lugarRetiro : 'Retiro Web';
  const monto = item.totalCost && item.totalCost !== '-' ? item.totalCost : null;
  const esWeb = item._isWeb || (item.ordenDeRetiro || '').includes('R-');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante Retiro ${item.displayLabel || item.ordenDeRetiro}</title>
  <style>
    @page { size: A5; margin: 12mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 13px;
      color: #111;
      background: #fff;
    }

    /* ── ENCABEZADO (igual a LogisticsPage / ReceptionPage) ── */
    .header {
      text-align: center;
      border-bottom: 2px solid #222;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header .empresa {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .header .modulo {
      font-size: 12px;
      color: #555;
      margin-top: 2px;
    }
    .header .doc-tipo {
      font-size: 11px;
      color: #888;
      margin-top: 1px;
      font-style: italic;
    }

    /* ── CÓDIGO PRINCIPAL ── */
    .codigo-principal {
      text-align: center;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 2px;
      margin: 10px 0 8px;
      padding: 6px 0;
      border-top: 1px dashed #ccc;
      border-bottom: 1px dashed #ccc;
    }

    /* ── ESTADO BADGE ── */
    .estado-badge {
      display: inline-block;
      padding: 3px 10px;
      border: 2px solid ${pagado ? '#16a34a' : '#dc2626'};
      color: ${pagado ? '#16a34a' : '#dc2626'};
      font-weight: 900;
      font-size: 11px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* ── TABLA DE DATOS ── */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    .info-table td {
      padding: 5px 2px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    .info-table td:first-child {
      color: #555;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      width: 32%;
      white-space: nowrap;
    }
    .info-table td:last-child {
      font-weight: 700;
      text-align: right;
      font-size: 13px;
    }

    /* ── TABLA DE ÓRDENES (igual a LogisticsPage) ── */
    .orders-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 12px;
    }
    .orders-table thead tr {
      background: #f3f4f6;
    }
    .orders-table th {
      padding: 6px 6px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #444;
      border-bottom: 1px solid #ddd;
    }
    .orders-table td {
      padding: 6px 6px;
      border-bottom: 1px solid #eee;
      font-weight: 600;
    }

    /* ── SEPARADOR ── */
    .sep { border-top: 1px dashed #bbb; margin: 10px 0; }

    /* ── FIRMA (igual a LogisticsPage) ── */
    .firma-row {
      display: flex;
      justify-content: space-between;
      margin-top: 28px;
    }
    .firma-box {
      width: 44%;
      border-top: 1px solid #333;
      padding-top: 4px;
      text-align: center;
      font-size: 11px;
      color: #555;
    }

    /* ── PIE ── */
    .footer {
      margin-top: 14px;
      font-size: 11px;
      text-align: center;
      color: #aaa;
      border-top: 1px solid #eee;
      padding-top: 6px;
    }
  </style>
</head>
<body>

  <!-- ENCABEZADO igual a todos los comprobantes Macrosoft -->
  <div class="header">
    <div class="empresa">USER</div>
    <div class="modulo">Logística — Comprobante de Retiro</div>
    <div class="doc-tipo">${esWeb ? 'Pedido Web' : 'Retiro Local'} · Local: ${local}</div>
  </div>

  <!-- CÓDIGO PRINCIPAL -->
  <div class="codigo-principal">${item.displayLabel || item.ordenDeRetiro}</div>

  <!-- ESTADO -->
  <div style="text-align:center; margin-bottom:8px;">
    <span class="estado-badge">${pagado ? '✓ PAGADO' : 'PENDIENTE DE PAGO'}</span>
  </div>

  <!-- DATOS DEL RETIRO -->
  <table class="info-table">
    <tr>
      <td>Cliente</td>
      <td>
        ${item.CliNombre ? `<strong>${item.CliNombre}</strong>` : ''}
        ${item.idcliente ? `<span style="color:#888;font-size:9px;">&nbsp;(${item.idcliente})</span>` : ''}
      </td>
    </tr>
    ${item.CliTelefono && item.CliTelefono.trim() ? `<tr><td>Tel\u00e9fono</td><td>${item.CliTelefono.trim()}</td></tr>` : ''}
    <tr>
      <td>Tipo Cliente</td>
      <td>${tipoDesc}</td>
    </tr>
    ${monto ? `<tr><td>Monto</td><td>${monto}</td></tr>` : ''}
    ${item.metodoPago ? `<tr><td>Forma Pago</td><td>${item.metodoPago}</td></tr>` : ''}
    <tr>
      <td>Local Retiro</td>
      <td>${local}</td>
    </tr>
    <tr>
      <td>Fecha Alta</td>
      <td>${item.fechaAlta ? new Date(item.fechaAlta).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
    </tr>
    ${(item.direccionEnvio || item.departamentoEnvio || item.localidadEnvio || item.agenciaNombre) ? `
    <tr><td colspan="2" style="padding-top:6px;padding-bottom:2px;font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.5px;font-weight:700;">Datos de Envío</td></tr>
    ${item.direccionEnvio ? `<tr><td>Dirección</td><td>${item.direccionEnvio}</td></tr>` : ''}
    ${item.departamentoEnvio ? `<tr><td>Departamento</td><td>${item.departamentoEnvio}</td></tr>` : ''}
    ${item.localidadEnvio ? `<tr><td>Localidad</td><td>${item.localidadEnvio}</td></tr>` : ''}
    ${item.agenciaNombre ? `<tr><td>Agencia</td><td><strong>${item.agenciaNombre}</strong></td></tr>` : ''}
    ` : ''}
  </table>

  <div class="sep"></div>

  <!-- TABLA DE ÓRDENES con importe -->
  <div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">
    Órdenes incluidas (${orderObjs.length})
  </div>
  <table class="orders-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Código de Orden</th>
        <th style="text-align:right;">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${orderObjs.map((o, i) => {
    const cod = o.orderNumber || o.codigoOrden || '-';
    const costo = o.orderCosto || (o.costoFinal ? o.costoFinal : null);
    return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${cod}</strong></td>
          <td style="text-align:right;">${costo || '-'}</td>
        </tr>`;
  }).join('')}
      ${orderObjs.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#aaa;">Sin órdenes registradas</td></tr>' : ''}
    </tbody>
  </table>

  <div class="sep"></div>

  <!-- PIE: impresión + firmas (igual a LogisticsPage) -->
  <table style="width:100%;font-size:9px;color:#666;">
    <tr>
      <td>Impreso:</td>
      <td style="text-align:right;">${now}</td>
    </tr>
  </table>

  <!-- QR del retiro (igual patrón que labelPrinter.js) -->
  <div style="text-align:center; margin:8px 0 14px;">
    <img
      src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(item.displayLabel || item.ordenDeRetiro)}&color=000000&bgcolor=ffffff&margin=2"
      alt="QR"
      style="width:90px;height:90px;border:1px solid #eee;"
    />
    <div style="font-size:9px;color:#999;margin-top:2px;letter-spacing:1px;">${item.displayLabel || item.ordenDeRetiro}</div>
  </div>

  <div class="firma-row">
    <div class="firma-box">Firma y Aclaración Cliente</div>
    <div class="firma-box">Firma Responsable Logística</div>
  </div>

  <div class="footer">
    USER — Documento interno. Conserve este comprobante.
  </div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=620,height=800');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    // No auto-print: el usuario ve la vista previa y decide cuando imprimir (Ctrl+P o botón del browser)
  }
};

// La configuración visual de los estantes ahora se trae de la BDD dinámicamente.

const WebRetirosPage = () => {
  const [view, setView] = useState('empaque');
  const [apiOrders, setApiOrders] = useState([]);
  const [estantesConfigArr, setEstantesConfigArr] = useState([]); // Array extraido del server
  const [ocupacionEstantes, setOcupacionEstantes] = useState({});
  const [otrosRetiros, setOtrosRetiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRetiro, setSelectedRetiro] = useState(null);
  const [scannedBultos, setScannedBultos] = useState({});
  const [ubicationMode, setUbicationMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstante, setFilterEstante] = useState('ALL');
  const [filtroTipo, setFiltroTipo] = React.useState('ALL'); // Nuevo filtro unificado
  const [filtroLugarRetiro, setFiltroLugarRetiro] = React.useState('ALL');
  const [confirmDelivery, setConfirmDelivery] = React.useState(null);
  const [excepcionDelivery, setExcepcionDelivery] = React.useState(null);
  const [adminPassword, setAdminPassword] = React.useState('');
  const [excepcionExplicacion, setExcepcionExplicacion] = React.useState('');
  const [deliveryScannedBultos, setDeliveryScannedBultos] = React.useState({});
  const [deliveryBarcodeInput, setDeliveryBarcodeInput] = React.useState('');
  const [deliverySelectedOrders, setDeliverySelectedOrders] = React.useState({});

  // 1. Conexión WebSocket para Tiempo Real
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    socket.on('retiros:update', (payload) => {
      const tipo = payload?.type || 'estado';
      console.log(`♻️ [WebSocket] retiros:update — tipo: ${tipo}`);

      if (tipo === 'pago' || tipo === 'pago_web' || tipo === 'estado') {
        // Refetch LIVIANO: sin sincronización ERP, sin spinner pesado
        fetchAllData(false);
      } else {
        // nuevo_retiro u otro: refetch completo (puede incluir sync con ERP)
        fetchAllData(true);
      }
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Traer toda la información combinada
  const fetchAllData = useCallback(async (backgroundSync = true) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Intentar obtener retiros web (tolerante a fallo si tabla no existe)
      let formattedRetiros = [];
      try {
        const { data: retirosData } = await api.get('/web-retiros/locales');
        formattedRetiros = (retirosData || [])
          .filter(r => r.Estado === 1 || r.Estado === 3)
          .map(r => ({
            ordenDeRetiro: r.OrdIdRetiro,
            idcliente: r.NombreCliente || r.CodCliente || 'Ecommerce',
            monto: r.Monto || 0,
            moneda: r.Moneda || 'UYU',
            pagorealizado: r.Estado === 3 || r.Estado === 8 ? 1 : 0,
            pagoHandy: !!r.ReferenciaPago,
            orders: r.BultosJSON ? JSON.parse(r.BultosJSON) :
              (r.OrdenesCodigos ? r.OrdenesCodigos.split(',').map(code => ({ orderNumber: code.trim(), orderId: code.trim() })) : [])
          }));
      } catch (e) {
        console.warn('[WebRetiros] /web-retiros/locales no disponible:', e.message);
      }
      setApiOrders(formattedRetiros);

      // 2. Obtener el Mapa de Estantes (tolerante a fallo)
      let estantesData = [];
      try {
        const res = await api.get('/web-retiros/estantes');
        estantesData = res.data || [];
      } catch (e) {
        console.warn('[WebRetiros] /web-retiros/estantes no disponible:', e.message);
      }
      const estantesMap = {};
      const configMap = {};

      estantesData.forEach(item => {
        if (item.OrdenRetiro) {
          if (!estantesMap[item.UbicacionID]) estantesMap[item.UbicacionID] = [];
          // Convertir OrdenesCodigos (STRING_AGG: "DF-123,DF-456") en array orders[]
          const ordersFromDB = item.OrdenesCodigos
            ? item.OrdenesCodigos.split(',').map(code => ({ orderNumber: code.trim(), orderId: code.trim() }))
            : (item.BultosJSON ? JSON.parse(item.BultosJSON) : []);
          estantesMap[item.UbicacionID].push({ ...item, orders: ordersFromDB });
        }
        if (!configMap[item.EstanteID]) {
          configMap[item.EstanteID] = { id: item.EstanteID, secciones: 0, posiciones: 0 };
        }
        if (item.Seccion > configMap[item.EstanteID].secciones) configMap[item.EstanteID].secciones = item.Seccion;
        if (item.Posicion > configMap[item.EstanteID].posiciones) configMap[item.EstanteID].posiciones = item.Posicion;
      });

      setEstantesConfigArr(Object.values(configMap).sort((a, b) => a.id.localeCompare(b.id)));
      setOcupacionEstantes(estantesMap);

      // 2.5 Traer "Retiros Fuera de Estante":
      //   - Empaquetados (7,8) sin ubicacion asignada
      //   - Retiros RL (generados en Logistica local) en estado 1 que no fueron a estante
      try {
        const ocupadasSet = new Set(estantesData.map(e => e.OrdenRetiro));

        // Empaquetados sin estante
        const { data: empaquetadosData } = await api.get('/apiordenesRetiro/estados?estados=7,8');
        const empaquetados = Array.isArray(empaquetadosData)
          ? empaquetadosData.filter(o => !ocupadasSet.has(o.ordenDeRetiro))
          : [];

        // Retiros RL (generados desde Logistica local) en estado 1 sin estante
        // Aparecen en Fuera de Estante aunque tambien esten en Empaque
        const { data: rlData } = await api.get('/apiordenesRetiro/estados?estados=1');
        const rlFuera = Array.isArray(rlData)
          ? rlData.filter(o =>
            o.ordenDeRetiro?.startsWith('RL-') &&
            !ocupadasSet.has(o.ordenDeRetiro)
          )
          : [];

        setOtrosRetiros([...empaquetados, ...rlFuera]);
      } catch (e) { console.error(e) }

      // 3. Lanzar sincronización pesada en segundo plano si aplica (sin bloquear UI)
      if (backgroundSync) {
        api.post('/web-retiros/sincronizar').then(() => {
          // Solo refrescamos la lista de retiros izquierda en background, no bloqueamos
          api.get('/web-retiros/locales').then(res => {
            const refreshed = res.data
              .filter(r => r.Estado === 1 || r.Estado === 3)
              .map(r => ({
                ordenDeRetiro: r.OrdIdRetiro,
                idcliente: r.NombreCliente || r.CodCliente || 'Ecommerce',
                monto: r.Monto || 0,
                moneda: r.Moneda || 'UYU',
                pagorealizado: r.Estado === 3 || r.Estado === 8 ? 1 : 0,
                pagoHandy: !!r.ReferenciaPago,
                orders: r.BultosJSON ? JSON.parse(r.BultosJSON) :
                  (r.OrdenesCodigos ? r.OrdenesCodigos.split(',').map(code => ({ orderNumber: code.trim(), orderId: code.trim() })) : [])
              }));
            setApiOrders(refreshed);
          });
        }).catch(e => console.error('Fallo en sync de fondo:', e));
      }

    } catch (err) {
      console.error("Error fetching data:", err);
      setError('Problema al cargar la base de datos de retiros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 3. Acciones del Operario
  const handleSelectRetiro = (o) => {
    setSelectedRetiro(o);
    setScannedBultos({});
    setUbicationMode(false);
  };

  const handleAsignarUbicacion = async (estanteId, sec, pos) => {
    if (!selectedRetiro) return;

    const ubicacionId = `${estanteId}-${sec}-${pos}`;
    const retiroParaAsignar = selectedRetiro; // Capturamos para optimismo

    // === VALIDACIÓN DE CLIENTE ===
    const dataList = ocupacionEstantes[ubicacionId] || [];
    if (dataList.length > 0) {
      // Tomamos el primer ocupante para chequear
      const primerOcupante = dataList[0];
      const codigoExistente = String(primerOcupante.CodigoCliente || '').trim().toLowerCase();
      const codigoNuevo = String(retiroParaAsignar.idcliente || '').trim().toLowerCase();

      if (codigoExistente !== codigoNuevo && codigoExistente !== 'ecommerce') {
        setError('No puedes guardar órdenes de diferentes clientes en el mismo casillero.');
        return; // Abortamos la asignación
      }
    }

    // === OPTIMISMO UI: Actualizamos visualmente al instante ===
    setOcupacionEstantes(prev => {
      const currentList = prev[ubicacionId] || [];
      return {
        ...prev,
        [ubicacionId]: [...currentList, {
          OrdenRetiro: retiroParaAsignar.ordenDeRetiro,
          CodigoCliente: retiroParaAsignar.idcliente,
          ClientName: retiroParaAsignar.clienteNombre || retiroParaAsignar.ClientName || retiroParaAsignar.idcliente
        }]
      };
    });
    setApiOrders(prev => prev.filter(o => o.ordenDeRetiro !== retiroParaAsignar.ordenDeRetiro));
    setOtrosRetiros(prev => prev.filter(o => o.ordenDeRetiro !== retiroParaAsignar.ordenDeRetiro));

    setSelectedRetiro(null);
    setScannedBultos({});
    setUbicationMode(false);

    try {
      const scannedArray = [];
      retiroParaAsignar.orders?.forEach((o) => {
        if (scannedBultos[o.orderNumber]) {
          scannedArray.push(o.orderNumber);
        }
      });

      const payload = {
        estanteId,
        seccion: sec,
        posicion: pos,
        ordenRetiro: retiroParaAsignar.ordenDeRetiro,
        codigoCliente: retiroParaAsignar.idcliente,
        bultos: retiroParaAsignar.orders,
        pagado: retiroParaAsignar.pagorealizado === 1,
        scannedValues: scannedArray
      };

      await api.post('/web-retiros/estantes/asignar', payload);
      // Data se refresca por Socket o en background
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al asignar');
      // Revertir en caso de que ocurra al estallar
      fetchAllData(false);
    }
  };

  const triggerEntregar = (id, dataOrDataList) => {
    const list = Array.isArray(dataOrDataList) ? dataOrDataList : [dataOrDataList];

    // Enriquecer cada item del estante con los orders del retiro completo
    // (los items del estante solo tienen OrdenRetiro/CodigoCliente, sin orders[])
    const listEnriquecida = list.map(item => {
      const ordenStr = item.OrdenRetiro || item.ordenDeRetiro;
      const retiroFull = apiOrders.find(o => o.ordenDeRetiro === ordenStr)
        || otrosRetiros.find(o => o.ordenDeRetiro === ordenStr);
      return {
        ...item,
        orders: item.orders?.length ? item.orders : (retiroFull?.orders || []),
        pagorealizado: item.Pagado ? 1 : (retiroFull?.pagorealizado ?? item.pagorealizado ?? 0),
        TClDescripcion: retiroFull?.TClDescripcion || item.TClDescripcion || '',
        estado: retiroFull?.estado || item.estado || '',
      };
    });

    // Find if ANY order in the list is unauthorized
    let exceptionItem = null;
    let exceptionItemRaw = null;

    for (const item of listEnriquecida) {
      const ordenStr = item.OrdenRetiro || item.ordenDeRetiro;
      const retiroFull = apiOrders.find(o => o.ordenDeRetiro === ordenStr) || otrosRetiros.find(o => o.ordenDeRetiro === ordenStr);
      let isAuthorized = false;

      if (retiroFull) {
        const desc = (retiroFull.TClDescripcion || '').toLowerCase();
        const estadoReal = typeof retiroFull.estado === 'string' ? retiroFull.estado.toLowerCase() : '';
        const isPagado = retiroFull.pagorealizado === 1;

        if (isPagado || estadoReal.includes('abonado')) isAuthorized = true;
        if (desc.includes('semanal') || desc.includes('rollo')) isAuthorized = true;
      } else {
        if (item.Pagado) isAuthorized = true;
      }

      if (!isAuthorized) {
        exceptionItem = item;
        exceptionItemRaw = retiroFull;
        break;
      }
    }

    if (exceptionItem) {
      setExcepcionDelivery({ id, data: exceptionItem, raw: exceptionItemRaw, blockList: listEnriquecida });
      return;
    }

    setConfirmDelivery({ id, dataList: listEnriquecida });
    setDeliveryScannedBultos({});
    setDeliveryBarcodeInput('');

    // Select all orders by default for delivery
    const sel = {};
    listEnriquecida.forEach(o => sel[o.OrdenRetiro || o.ordenDeRetiro] = true);
    setDeliverySelectedOrders(sel);
  };


  const handleExcepcionSubmit = async (e) => {
    e.preventDefault();
    if (!adminPassword || !excepcionExplicacion) return;

    // IMPORTANTE: capturar todo ANTES de cualquier setState
    const deliverySnap = excepcionDelivery;
    const block = deliverySnap.blockList;
    const retiro = deliverySnap.raw || deliverySnap.data;

    try {
      await api.post('/web-retiros/excepcional', {
        ordenRetiro: retiro.ordenDeRetiro || retiro.OrdenRetiro,
        codigoCliente: retiro.idcliente || retiro.CodigoCliente || retiro.CliCodigoCliente,
        monto: retiro.monto || retiro.Monto || 0,
        password: adminPassword,
        explicacion: excepcionExplicacion
      });

      // Autorizado: limpiar modal excepción y abrir checklist
      setExcepcionDelivery(null);
      setAdminPassword('');
      setExcepcionExplicacion('');
      setError(null);

      setConfirmDelivery({ id: deliverySnap.id, dataList: block });
      setDeliveryScannedBultos({});
      setDeliveryBarcodeInput('');

      const sel = {};
      block.forEach(o => sel[o.OrdenRetiro || o.ordenDeRetiro] = true);
      setDeliverySelectedOrders(sel);

    } catch (err) {
      // Mostrar error inline en el modal (contraseña incorrecta, etc.)
      const msg = err.response?.data?.error || 'Falló la autorización excepcional';
      setError(msg);
    }
  };

  const handleEntregar = async () => {
    if (!confirmDelivery) return;
    const { id: ubicacionId, dataList } = confirmDelivery;

    // Obtener los seleccionados de la lista de confirmDelivery 
    let ordenesSeleccionadas = [];
    if (ubicacionId === 'FUERA DE ESTANTE') {
      ordenesSeleccionadas = [dataList[0].ordenDeRetiro || dataList[0].OrdenRetiro];
    } else {
      ordenesSeleccionadas = dataList
        .map(item => item.OrdenRetiro || item.ordenDeRetiro)
        .filter(ord => deliverySelectedOrders[ord]);
    }

    if (ordenesSeleccionadas.length === 0) return; // Nada seleccionado

    // === OPTIMISMO UI: Liberar el casillero visualmente de inmediato ===
    setOcupacionEstantes(prev => {
      const next = { ...prev };
      // Si seleccionaron TODO, eliminamos la ubicación entera. Si no, sólo retiramos de la UI las seleccionadas
      if (next[ubicacionId]) {
        const remaining = next[ubicacionId].filter(item => !ordenesSeleccionadas.includes(item.OrdenRetiro || item.ordenDeRetiro));
        if (remaining.length === 0) {
          delete next[ubicacionId];
        } else {
          next[ubicacionId] = remaining;
        }
      }
      return next;
    });

    setConfirmDelivery(null);

    try {
      if (ubicacionId === 'FUERA DE ESTANTE') {
        // TODO handle Fuera de estante which needs direct API central contact
        // Normally we just did an api request to our own backend to mark it depending on what we mapped
        // Para fuera de estante, enviemos la info a eliminar si aplica
      }

      await api.post(`/web-retiros/estantes/liberar-multiple`, {
        ubicacionId,
        ordenesParaEntregar: ordenesSeleccionadas
      });
      // El fetch vendrá por socket 
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al liberar el estante');
      // Revertimos la UI si falla
      fetchAllData(false);
    }
  };

  // Scroll a la estantería encontrada al buscar
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 3) return;
    const term = searchTerm.toLowerCase();

    for (const id in ocupacionEstantes) {
      const data = ocupacionEstantes[id];
      if ((data.OrdenRetiro && data.OrdenRetiro.toLowerCase().includes(term)) ||
        (data.ClientName && data.ClientName.toLowerCase().includes(term)) ||
        (data.CodigoCliente && data.CodigoCliente.toLowerCase().includes(term))) {

        const el = document.getElementById(`box-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break; // Al primer hallazgo soltamos y saltamos allí
      }
    }
  }, [searchTerm, ocupacionEstantes]);

  // --- COMPONENTES VISUALES INTERNOS ---
  const OrderDetail = () => {
    const [barcodeInput, setBarcodeInput] = useState('');
    const inputRef = React.useRef(null);

    const toggle = (id) => setScannedBultos(prev => ({ ...prev, [id]: !prev[id] }));
    const allChecked = selectedRetiro.orders?.every(o => scannedBultos[o.orderNumber]);

    const handleScanSubmit = (e) => {
      e.preventDefault();
      const code = barcodeInput.trim().toUpperCase();
      if (!code) return;

      // Find if code exists in order
      const found = selectedRetiro.orders?.find(o => o.orderNumber.toUpperCase() === code);
      if (found) {
        setScannedBultos(prev => ({ ...prev, [found.orderNumber]: true }));
      }
      setBarcodeInput('');
    };

    return (
      <div className="bg-white rounded-[24px] shadow-sm p-8 max-w-2xl mx-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-6">
          <button onClick={() => setSelectedRetiro(null)} className="p-3 bg-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="text-right">
            <span className="text-[10px] font-bold text-blue-500 tracking-wider uppercase">Detalle Envio Web</span>
            <h2 className="text-3xl font-black text-slate-800 mt-1">{selectedRetiro.pagoHandy ? selectedRetiro.ordenDeRetiro.replace('R-', 'PW-') : selectedRetiro.ordenDeRetiro}</h2>
            <p className="text-slate-400 font-medium uppercase text-sm mt-1">{selectedRetiro.idcliente}</p>
          </div>
        </div>

        <form onSubmit={handleScanSubmit} className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-blue-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            className="block w-full pl-12 pr-16 py-4 border-2 border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white text-lg font-bold transition-all text-slate-700"
            placeholder="Escanee el bulto aquí..."
            autoFocus
          />
          <button type="submit" className="absolute inset-y-2 right-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700">OK</button>
        </form>

        <div className="grid gap-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Checklist de Bultos</p>
          {selectedRetiro.orders?.map(o => (
            <div key={o.orderNumber}
              onClick={() => toggle(o.orderNumber)}
              className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${scannedBultos[o.orderNumber] ? 'bg-green-50 border-green-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${scannedBultos[o.orderNumber] ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <Package size={20} />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-700">{o.orderNumber}</div>
                  <div className="text-[10px] font-medium text-slate-400 uppercase">Verificado automáticamente</div>
                </div>
              </div>
              {scannedBultos[o.orderNumber] ? <CheckCircle className="text-green-500" size={24} /> : <div className="w-6 h-6 rounded-full border-2 border-slate-300" />}
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button onClick={() => setSelectedRetiro(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
          <button
            disabled={!allChecked}
            onClick={() => setUbicationMode(true)}
            className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Asignar a Estante
          </button>
        </div>
      </div>
    );
  };

  const UbicationGrid = () => (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Mapa del Depósito</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Haga click en un casillero vacío para ubicar la orden <strong className="text-blue-600">{selectedRetiro.pagoHandy ? selectedRetiro.ordenDeRetiro.replace('R-', 'PW-') : selectedRetiro.ordenDeRetiro}</strong></p>
        </div>
        <button onClick={() => setUbicationMode(false)} className="px-6 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-500 shadow-sm hover:bg-slate-50 text-sm">Atrás</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {estantesConfigArr.map(est => (
          <div key={est.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white font-black text-lg">{est.id}</div>
              <span className="text-lg font-bold text-slate-700">Módulo de Estantería</span>
            </div>

            <div className="space-y-4">
              {[...Array(est.secciones)].map((_, s) => (
                <div key={s} className="flex gap-4 items-stretch">
                  <div className="w-12 bg-slate-50 rounded-lg flex flex-col items-center justify-center border border-slate-200 p-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Sec</span>
                    <span className="text-lg font-black text-slate-700">{s + 1}</span>
                  </div>
                  <div className="grid grid-cols-4 flex-1 gap-2">
                    {[...Array(est.posiciones)].map((_, p) => {
                      const id = `${est.id}-${s + 1}-${p + 1}`;
                      const dataList = ocupacionEstantes[id] || [];
                      const isOccupied = dataList.length > 0;

                      let puedeGuardarAca = true;
                      if (isOccupied && selectedRetiro) {
                        const clienteExistente = String(dataList[0].CodigoCliente || '').trim().toLowerCase();
                        const clienteNuevo = String(selectedRetiro.idcliente || '').trim().toLowerCase();
                        if (clienteExistente !== clienteNuevo && clienteExistente !== 'ecommerce') {
                          puedeGuardarAca = false;
                        }
                      }

                      return (
                        <button
                          key={p}
                          title={!puedeGuardarAca ? "No puedes mezclar órdenes de distintos clientes aquí" : ""}
                          onClick={() => {
                            if (!puedeGuardarAca) {
                              setError('No puedes guardar órdenes de diferentes clientes en el mismo casillero.');
                              return;
                            }
                            handleAsignarUbicacion(est.id, s + 1, p + 1);
                          }}
                          className={`relative h-24 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-sm overflow-hidden ${isOccupied ? (puedeGuardarAca ? 'bg-indigo-600 border-indigo-700 hover:bg-indigo-500 opacity-90' : 'bg-rose-950 border-rose-800 opacity-60 cursor-not-allowed') : 'bg-white border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 group'}`}
                        >
                          <div className="absolute top-1 left-2">
                            <span className={`text-[10px] font-bold ${isOccupied ? 'text-indigo-200' : 'text-slate-400 uppercase group-hover:text-blue-600'}`}>{id}</span>
                          </div>
                          {isOccupied && dataList.length > 1 && (
                            <div className="absolute top-1 right-1 bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10">
                              {dataList.length}
                            </div>
                          )}

                          {isOccupied ? (
                            <div className="flex flex-col gap-1 w-full max-h-full overflow-y-auto mt-4 px-1" style={{ scrollbarWidth: 'none' }}>
                              {dataList.map((data, idx) => (
                                <div key={idx} className="flex flex-col items-center bg-indigo-500/50 rounded flex-shrink-0 w-full border border-indigo-400/50 py-0.5">
                                  <span className="text-[9px] font-black text-white px-1 truncate max-w-full">{data.PagoHandy ? data.OrdenRetiro.replace('R-', 'PW-') : data.OrdenRetiro}</span>
                                  <span className="text-[7px] font-bold text-indigo-100 px-1 truncate max-w-[90%]">{data.CodigoCliente || data.ClientName || 'Cliente'}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-blue-600 mb-1">{id}</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors" />
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const handlePrintLocal = (retiro, copias = 2) => {
    const clienteNombre = retiro.orders && retiro.orders[0] ? retiro.orders[0].cliente?.nombreApellido || retiro.CliCodigoCliente : retiro.CliCodigoCliente;
    let content = '';
    for (let i = 0; i < copias; i++) {
      content += `
              <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px dashed #000; margin-bottom: 20px; width: 300px;">
                  <h2 style="text-align: center; margin: 0 0 10px 0;">ORDEN DE RETIRO</h2>
                  <h3 style="text-align: center; margin: 0 0 20px 0; font-size: 24px;">${retiro.ordenDeRetiro}</h3>
                  <p><strong>Cliente:</strong> ${clienteNombre || 'N/A'}</p>
                  <p><strong>Lugar:</strong> ${retiro.lugarRetiro || '-'}</p>
                  <p><strong>Estado:</strong> ${retiro.estado || retiro.estadoRetiro || '-'}</p>
                  <p><strong>Total:</strong> ${retiro.totalCost && retiro.totalCost !== 'NaN' ? retiro.totalCost : retiro.montopagorealizado || '-'}</p>
                  <hr/>
                  <p style="font-size: 10px; text-align: center;">Copia ${i + 1} de ${copias}</p>
              </div>
          `;
    }

    const win = window.open('', '', 'width=400,height=600');
    win.document.write(`<html><body style="margin: 0;">${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  const determineColorByDescAndStatus = (retiro) => {
    const desc = (retiro.TClDescripcion || '').toLowerCase();
    const pagado = retiro.pagorealizado === 1;

    if (desc.includes('semanal')) {
      return { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800' };
    }
    if (desc.includes('rollo')) {
      return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' };
    }
    if (pagado) {
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' };
    }
    // Pendiente de pago
    return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800' };
  };


  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Navbar Interno */}
      <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200">
            <LayoutGrid size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Logística eCommerce</h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> App Activa
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button onClick={() => setView('empaque')} className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${view === 'empaque' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>
            <Truck size={18} /> Empaque
          </button>
          <button onClick={() => setView('entrega')} className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${view === 'entrega' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>
            <MapPin size={18} /> Entregas a Mostrar
          </button>
        </div>
      </div>

      {loading && !selectedRetiro && apiOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-slate-500 font-medium">Sincronizando con Servidor Web...</p>
        </div>
      )}

      {/* VISTA PRINCIPAL */}
      {!loading || apiOrders.length > 0 || otrosRetiros.length > 0 ? (
        view === 'empaque' ? (
          !selectedRetiro ? (
            <div className="animate-in fade-in duration-300">
              <div className="relative mb-6">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar orden web o cliente..."
                  className="w-full pl-14 pr-6 py-4 bg-white rounded-xl shadow-sm border border-slate-200 focus:border-blue-500 outline-none text-base font-medium transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* ─── FILTROS ─── */}
              {(() => {
                const PRIORITY_META = [
                  { key: 'PAGADO', label: 'Pagados', color: 'text-emerald-600', dot: 'bg-emerald-500', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                  { key: 'ROLLO', label: 'Rollo por Adelantado', color: 'text-amber-600', dot: 'bg-amber-500', badge: 'bg-amber-50 border-amber-200 text-amber-700' },
                  { key: 'SEMANAL', label: 'Semanales', color: 'text-indigo-600', dot: 'bg-indigo-500', badge: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                  { key: 'PENDIENTE', label: 'Pendientes de Pago', color: 'text-rose-600', dot: 'bg-rose-500', badge: 'bg-rose-50 border-rose-200 text-rose-700' },
                ];

                const uniqueLugares = Array.from(
                  new Set([...apiOrders, ...otrosRetiros].map(o => o.lugarRetiro).filter(Boolean))
                ).sort();

                return (
                  <div className="flex flex-col gap-3 mb-5">
                    {/* Filtro por Tipo */}
                    <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
                      <button
                        onClick={() => setFiltroTipo('ALL')}
                        className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all ${filtroTipo === 'ALL' ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                      >Todos</button>
                      {PRIORITY_META.map(m => (
                        <button key={m.key}
                          onClick={() => setFiltroTipo(m.key)}
                          className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all ${filtroTipo === m.key
                            ? `${m.dot.replace('bg-', 'bg-').replace('500', '500')} text-white border-transparent shadow-md`
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${m.dot}`} />
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Filtro por Lugar */}
                    {uniqueLugares.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center text-xs font-bold uppercase tracking-wider">
                        <span className="text-slate-400 py-2">Local de recogida:</span>
                        <button
                          onClick={() => setFiltroLugarRetiro('ALL')}
                          className={`px-4 py-2 rounded-xl border transition-all ${filtroLugarRetiro === 'ALL' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >Cualquiera</button>
                        {uniqueLugares.map((lugar, i) => (
                          <button key={i}
                            onClick={() => setFiltroLugarRetiro(lugar)}
                            className={`px-4 py-2 rounded-xl border transition-all ${filtroLugarRetiro === lugar ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                          >{lugar}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ─── LISTA UNIFICADA DE RETIROS ─── */}
              {(() => {
                const PRIORITY_META = [
                  { label: 'Pagados', color: 'text-emerald-600', dot: 'bg-emerald-500', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                  { label: 'Rollo por Adelantado', color: 'text-amber-600', dot: 'bg-amber-500', badge: 'bg-amber-50 border-amber-200 text-amber-700' },
                  { label: 'Semanales', color: 'text-indigo-600', dot: 'bg-indigo-500', badge: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                  { label: 'Pendientes de Pago', color: 'text-rose-600', dot: 'bg-rose-500', badge: 'bg-rose-50 border-rose-200 text-rose-700' },
                ];

                const getPriority = (item) => {
                  if (item.pagorealizado === 1 || item.pagorealizado === true) return 0;
                  const desc = (item.TClDescripcion || '').toLowerCase();
                  if (desc.includes('rollo')) return 1;
                  if (desc.includes('semanal')) return 2;
                  return 3;
                };

                const getTipoKey = (item) => {
                  const p = getPriority(item);
                  return ['PAGADO', 'ROLLO', 'SEMANAL', 'PENDIENTE'][p];
                };

                // 1. Normalizar fuentes
                const webNorm = apiOrders.map(o => ({
                  _key: `web-${o.ordenDeRetiro}`,
                  ordenDeRetiro: o.ordenDeRetiro,
                  idcliente: o.idcliente,
                  displayLabel: o.pagoHandy ? o.ordenDeRetiro.replace('R-', 'PW-') : o.ordenDeRetiro,
                  pagorealizado: o.pagorealizado,
                  TClDescripcion: o.TClDescripcion || '',
                  fechaAlta: o.fechaAlta || o.FechaAlta || null,
                  lugarRetiro: o.lugarRetiro || 'Web',
                  totalCost: o.monto ? `${o.moneda} ${Number(o.monto).toFixed(2)}` : '-',
                  orders: o.orders,
                  pagoHandy: o.pagoHandy,
                  _isWeb: true,
                  _raw: o,
                }));

                const localNorm = otrosRetiros.map(o => ({
                  _key: `local-${o.ordenDeRetiro}`,
                  ordenDeRetiro: o.ordenDeRetiro,
                  idcliente: o.CliCodigoCliente,
                  displayLabel: o.ordenDeRetiro,
                  pagorealizado: o.pagorealizado,
                  TClDescripcion: o.TClDescripcion || '',
                  fechaAlta: o.fechaAlta || o.FechaAlta || null,
                  lugarRetiro: o.lugarRetiro || '-',
                  totalCost: (o.totalCost && o.totalCost !== 'NaN') ? o.totalCost : (o.montopagorealizado || '-'),
                  orders: (o.orders || []).map(sub => ({
                    orderNumber: sub.orderNumber || sub.codigoOrden,
                    orderId: sub.orderId
                  })),
                  pagoHandy: false,
                  _isWeb: false,
                  _raw: o,
                }));

                // 2. Unificar y filtrar
                const all = [...webNorm, ...localNorm].filter(item => {
                  // Filtro tipo
                  if (filtroTipo !== 'ALL' && getTipoKey(item) !== filtroTipo) return false;
                  // Filtro lugar
                  if (filtroLugarRetiro !== 'ALL' && item.lugarRetiro !== filtroLugarRetiro) return false;
                  // Búsqueda
                  if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    if (
                      !(item.ordenDeRetiro && item.ordenDeRetiro.toLowerCase().includes(term)) &&
                      !(item.idcliente && String(item.idcliente).toLowerCase().includes(term))
                    ) return false;
                  }
                  return true;
                }).sort((a, b) => {
                  const pa = getPriority(a), pb = getPriority(b);
                  if (pa !== pb) return pa - pb;
                  const da = a.fechaAlta ? new Date(a.fechaAlta).getTime() : Infinity;
                  const db = b.fechaAlta ? new Date(b.fechaAlta).getTime() : Infinity;
                  return da - db;
                });

                if (webNorm.length === 0 && localNorm.length === 0) {
                  return (
                    <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                      <Package size={48} strokeWidth={1.5} className="opacity-40" />
                      <p className="font-semibold">No hay retiros en espera.</p>
                    </div>
                  );
                }

                if (all.length === 0) {
                  return (
                    <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
                      <p className="font-semibold text-sm">No hay retiros con los filtros seleccionados.</p>
                    </div>
                  );
                }

                // 3. Renderizar agrupado en grid de tarjetas
                const groups = [0, 1, 2, 3]
                  .map(p => ({ priority: p, meta: PRIORITY_META[p], items: all.filter(i => getPriority(i) === p) }))
                  .filter(g => g.items.length > 0);

                return (
                  <div className="flex flex-col gap-6">
                    {groups.map(({ priority, meta, items }) => (
                      <div key={priority}>
                        {/* Encabezado de grupo */}
                        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl mb-3 border ${meta.badge}`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                          <span className={`text-[11px] font-black uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
                          <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${meta.dot} text-white`}>{items.length}</span>
                        </div>

                        {/* Grid de tarjetas pequeñas */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                          {items.map(item => {
                            const handleClick = () => {
                              if (item._isWeb) {
                                handleSelectRetiro(item._raw);
                              } else {
                                handleSelectRetiro({
                                  ordenDeRetiro: item.ordenDeRetiro,
                                  idcliente: item.idcliente,
                                  clienteNombre: item._raw.TClNombre || item.idcliente,
                                  monto: parseFloat(item._raw.totalCost) || 0,
                                  moneda: 'UYU',
                                  pagorealizado: item.pagorealizado,
                                  TClDescripcion: item.TClDescripcion,
                                  orders: item.orders
                                });
                              }
                            };

                            // Tiempo transcurrido desde la alta
                            const timeAgo = (dateStr) => {
                              if (!dateStr) return null;
                              const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
                              if (diff < 60) return `${diff}s`;
                              if (diff < 3600) return `${Math.floor(diff / 60)}m`;
                              if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
                              return `${Math.floor(diff / 86400)}d`;
                            };

                            const elapsed = timeAgo(item.fechaAlta);
                            const orderCount = (item.orders || []).length;
                            // Colorear tiempo: >2h amarillo, >8h rojo
                            const diffMin = item.fechaAlta ? Math.floor((Date.now() - new Date(item.fechaAlta).getTime()) / 60000) : 0;
                            const timeColor = diffMin > 480 ? 'text-rose-600 font-black' : 'text-slate-700 font-bold';

                            return (
                              <button
                                key={item._key}
                                onClick={handleClick}
                                className="group relative bg-white rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 flex flex-col gap-2 overflow-hidden"
                              >
                                {/* Barra de color superior */}
                                <div className={`absolute top-0 left-0 right-0 h-1 ${meta.dot} rounded-t-2xl`} />

                                {/* Código de orden */}
                                <div className="font-black text-slate-800 text-sm tracking-tight leading-tight mt-1">
                                  {item.displayLabel}
                                </div>

                                {/* Nombre cliente */}
                                {item.CliNombre && (
                                  <div className="text-[11px] font-semibold text-slate-600 truncate leading-tight">
                                    {item.CliNombre}
                                  </div>
                                )}

                                {/* ID + tipo + lugar */}
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">{item.idcliente}</span>
                                  {item.TClDescripcion && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">{item.TClDescripcion}</span>
                                  )}
                                  {item.lugarRetiro && item.lugarRetiro !== 'Desconocido' && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-500 font-bold truncate max-w-[80px]">{item.lugarRetiro}</span>
                                  )}
                                </div>

                                {/* Pie: tiempo + órdenes + impresora */}
                                <div className="flex items-center justify-between mt-auto">
                                  {elapsed && (
                                    <span className={`flex items-center gap-0.5 text-xs ${timeColor}`}>
                                      <Clock size={10} /> {elapsed}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-2 ml-auto">
                                    {orderCount > 0 && (
                                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400">
                                        <Package size={9} /> {orderCount}
                                      </span>
                                    )}
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => { e.stopPropagation(); printRetiroTicket(item); }}
                                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); printRetiroTicket(item); } }}
                                      title="Imprimir ticket"
                                      className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                                    >
                                      <Printer size={11} />
                                    </div>
                                  </div>
                                </div>

                                {/* Badge Web */}
                                {item._isWeb && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 self-start">Web</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : (
            ubicationMode ? <UbicationGrid /> : <OrderDetail />
          )
        ) : (
          /* VISTA MOSTRADOR - MATRIZ DE ESTANTERÍA */
          <div className="animate-in fade-in duration-300">
            <div className="mt-4">

              {/* FILTROS DE ESTANTES Y BUSCADOR */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white p-3 rounded-3xl border border-slate-100 shadow-sm">
                {/* Buscador Integrado */}
                <div className="relative w-full md:w-96 flex-shrink-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por orden o cliente..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Filtros de Pestañas */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setFilterEstante('ALL')}
                    className={`px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border ${filterEstante === 'ALL' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50'}`}
                  >
                    Ver Todo
                  </button>
                  <button
                    onClick={() => setFilterEstante('FUERA')}
                    className={`px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border ${filterEstante === 'FUERA' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50'}`}
                  >
                    Fuera de Estante
                  </button>
                  {estantesConfigArr.map(est => (
                    <button
                      key={est.id}
                      onClick={() => setFilterEstante(est.id)}
                      className={`px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border ${filterEstante === est.id ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50'}`}
                    >
                      Estante {est.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* MAPA VISUAL DE ESTANTES */}
              {filterEstante !== 'FUERA' && (
                <div className="grid gap-8">
                  {estantesConfigArr.filter(est => filterEstante === 'ALL' || filterEstante === est.id).map(est => (
                    <div key={est.id} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl italic shadow-md shadow-blue-200">{est.id}</div>
                        <span className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Bloque {est.id}</span>
                      </div>

                      <div className="space-y-6">
                        {[...Array(est.secciones)].map((_, s) => (
                          <div key={s} className="flex gap-6 items-center">
                            <div className="w-16 h-16 flex flex-col items-center justify-center bg-slate-50/50 rounded-[20px] border border-slate-100">
                              <span className="text-[10px] font-black text-slate-400 uppercase">Sec</span>
                              <span className="text-xl font-black text-blue-600">{s + 1}</span>
                            </div>
                            <div className="grid grid-cols-4 flex-1 gap-4">
                              {[...Array(est.posiciones)].map((_, p) => {
                                const id = `${est.id}-${s + 1}-${p + 1}`;
                                const dataList = ocupacionEstantes[id] || [];
                                const isOccupied = dataList.length > 0;
                                const firstData = dataList[0];

                                const term = searchTerm.toLowerCase();
                                const matchesSearch = isOccupied && dataList.some(item => (
                                  (item.OrdenRetiro && item.OrdenRetiro.toLowerCase().includes(term)) ||
                                  (item.CodigoCliente && String(item.CodigoCliente).toLowerCase().includes(term)) ||
                                  (item.ClientName && item.ClientName.toLowerCase().includes(term))
                                ));
                                const isMismatched = searchTerm && isOccupied && !matchesSearch;
                                const isMatched = searchTerm && isOccupied && matchesSearch;

                                return (
                                  <div
                                    id={`box-${id}`}
                                    key={p}
                                    className={`h-28 rounded-[24px] border-2 transition-all flex flex-col items-center justify-center gap-2 relative group overflow-hidden 
                                        ${isOccupied ? 'bg-indigo-600 border-indigo-700 shadow-md shadow-indigo-300' : 'bg-white border-dashed border-slate-200'}
                                        ${isMismatched ? 'opacity-20 grayscale' : ''}
                                        ${isMatched ? 'ring-4 ring-green-400 border-green-500 bg-green-600 scale-[1.02] shadow-lg shadow-green-200/50' : ''}
                                      `}
                                  >
                                    {isOccupied ? (
                                      <>
                                        {dataList.length > 1 && (
                                          <div className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 animate-bounce">
                                            {dataList.length} retiros
                                          </div>
                                        )}
                                        <span className={`font-black tracking-widest absolute top-2 left-3 ${isMatched ? 'text-white text-[10px] drop-shadow-md bg-green-700/50 px-2 py-0.5 rounded mb-1' : 'text-indigo-200 text-[10px]'}`}>{id}</span>

                                        <div className="flex flex-col gap-1 w-full max-h-full overflow-y-auto mt-6 px-2" style={{ scrollbarWidth: 'none' }}>
                                          {dataList.map((data, idx) => (
                                            <div key={idx} className={`flex flex-col items-center rounded flex-shrink-0 w-full border py-0.5 ${isMatched ? 'bg-green-700/50 border-green-400' : 'bg-indigo-500/50 border-indigo-400/50'}`}>
                                              <span className={`text-[11px] font-black italic uppercase truncate px-2 ${isMatched ? 'text-white' : 'text-white'}`}>
                                                {data.PagoHandy ? data.OrdenRetiro.replace('R-', 'PW-') : data.OrdenRetiro}
                                              </span>
                                              <span className={`text-[9px] font-bold truncate px-2 max-w-[90%] bg-black/20 rounded-md py-[1px] mt-[1px] ${isMatched ? 'text-green-100' : 'text-indigo-100'}`}>
                                                {data.CodigoCliente || data.ClientName || 'Cliente'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>

                                        {isOccupied && (
                                          <div className={`absolute inset-0 bg-blue-600/95 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer`}
                                            onClick={() => triggerEntregar(id, dataList)}
                                          >
                                            <button
                                              className="px-6 py-2 bg-white text-blue-600 rounded-xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
                                            >
                                              <Check size={16} /> ENTREGAR
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-[12px] font-black text-slate-300">P{p + 1}</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* RETIROS FUERA DE ESTANTE */}
              {(filterEstante === 'ALL' || filterEstante === 'FUERA') && otrosRetiros.length > 0 && (
                <div className={filterEstante === 'ALL' ? 'mt-10 pt-8 border-t-2 border-slate-100' : ''}>
                  <div className="flex items-center gap-3 mb-5">
                    <h3 className="text-lg font-black text-slate-800">Retiros fuera de estante</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                      {otrosRetiros.filter(o => {
                        if (!searchTerm) return true;
                        const t = searchTerm.toLowerCase();
                        return (o.ordenDeRetiro || '').toLowerCase().includes(t) || (o.CliCodigoCliente || '').toLowerCase().includes(t);
                      }).length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {otrosRetiros
                      .filter(o => {
                        if (!searchTerm) return true;
                        const t = searchTerm.toLowerCase();
                        return (o.ordenDeRetiro || '').toLowerCase().includes(t) || (o.CliCodigoCliente || '').toLowerCase().includes(t);
                      })
                      .sort((a, b) => {
                        const pri = x => (x.pagorealizado === 1 || x.pagorealizado === true) ? 0
                          : (x.TClDescripcion || '').toLowerCase().includes('rollo') ? 1
                            : (x.TClDescripcion || '').toLowerCase().includes('semanal') ? 2 : 3;
                        if (pri(a) !== pri(b)) return pri(a) - pri(b);
                        return new Date(a.fechaAlta || 0) - new Date(b.fechaAlta || 0);
                      })
                      .map((o) => {
                        const pagado = o.pagorealizado === 1 || o.pagorealizado === true;
                        const desc = (o.TClDescripcion || '').toLowerCase();
                        const dotColor = pagado ? 'bg-emerald-500' : desc.includes('rollo') ? 'bg-amber-500' : desc.includes('semanal') ? 'bg-indigo-500' : 'bg-rose-500';
                        const diffMin = o.fechaAlta ? Math.floor((Date.now() - new Date(o.fechaAlta).getTime()) / 60000) : 0;
                        const d = Math.floor(diffMin / 1440), h = Math.floor((diffMin % 1440) / 60), m = diffMin % 60;
                        const timeStr = d > 0 ? `${d}d` : h > 0 ? `${h}h ${m}m` : `${m}m`;
                        return (
                          <div key={o.ordenDeRetiro} className="relative bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2 overflow-hidden">
                            <div className={`absolute top-0 left-0 right-0 h-1 ${dotColor} rounded-t-2xl`} />
                            <div className="font-black text-slate-800 text-sm tracking-tight mt-1">{o.ordenDeRetiro}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase truncate">{o.CliCodigoCliente}</div>
                            <div className={`text-xs font-black ${pagado ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {pagado ? 'Pagado ✓' : 'Pend. Pago'}
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-700"><Clock size={9} /> {timeStr}</span>
                              <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400"><Package size={9} /> {(o.orders || []).length}</span>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              )}
              {filterEstante === 'FUERA' && otrosRetiros.length === 0 && (
                <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                  <Package size={48} strokeWidth={1.5} className="opacity-40" />
                  <p className="font-semibold">No hay retiros fuera de estante.</p>
                </div>
              )}


            </div>
          </div>
        )
      ) : null}

      {/* CONFIRMATION MODAL FOR DELIVERY */}
      {
        confirmDelivery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95">
              <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Confirmar Entrega</h3>
              <p className="text-slate-500 mb-4 font-medium">
                Ubicación a entregar: <strong className="text-blue-600">{confirmDelivery.id}</strong>
              </p>

              {/* SELECCIÓN DE ÓRDENES MULTPLES */}
              {confirmDelivery.dataList.length > 1 && (
                <div className="mb-4 bg-slate-100 p-4 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Seleccione las órdenes a retirar:</p>
                  <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-2">
                    {confirmDelivery.dataList.map(item => {
                      const ordStr = item.OrdenRetiro || item.ordenDeRetiro;
                      const isChecked = !!deliverySelectedOrders[ordStr];
                      return (
                        <label key={ordStr} className={`flex items-center gap-3 cursor-pointer p-2 rounded-xl transition-all ${isChecked ? 'bg-blue-50/80 border border-blue-200' : 'hover:bg-slate-200 border border-transparent'}`}>
                          <input type="checkbox" className="w-5 h-5 accent-blue-600 rounded" checked={isChecked} onChange={(e) => setDeliverySelectedOrders(prev => ({ ...prev, [ordStr]: e.target.checked }))} />
                          <span className="font-bold text-slate-700">{item.PagoHandy ? ordStr.replace('R-', 'PW-') : ordStr}</span>
                          <span className="text-xs text-slate-500 truncate">{item.ClientName || item.CodigoCliente || 'Cliente'}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <form onSubmit={(e) => {
                e.preventDefault();
                const code = deliveryBarcodeInput.trim().toUpperCase();
                if (!code) return;
                try {
                  let bultosFlat = [];
                  confirmDelivery.dataList.forEach(obj => {
                    const ordStr = obj.OrdenRetiro || obj.ordenDeRetiro;
                    if (!deliverySelectedOrders[ordStr]) return;
                    if (obj.BultosJSON) { bultosFlat.push(...JSON.parse(obj.BultosJSON)); }
                    else if (obj.orders) { bultosFlat.push(...obj.orders); }
                  });

                  const found = bultosFlat.find((o) => (o.orderNumber && o.orderNumber.toUpperCase() === code) || (o.id && o.id.toString().toUpperCase() === code));
                  if (found) {
                    setDeliveryScannedBultos(prev => ({ ...prev, [found.orderNumber || found.id]: true }));
                  }
                  setDeliveryBarcodeInput('');
                } catch (e) { }
              }} className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-blue-400" />
                </div>
                <input
                  type="text"
                  value={deliveryBarcodeInput}
                  onChange={(e) => setDeliveryBarcodeInput(e.target.value)}
                  className="block w-full pl-12 pr-16 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white font-medium transition-all text-slate-700"
                  placeholder="Escanee el bulto aquí (opcional manual)..."
                  autoFocus
                />
                <button type="submit" className="absolute inset-y-1.5 right-1.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700">OK</button>
              </form>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 max-h-48 overflow-y-auto">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Checklist Bultos a Entregar</p>
                <ul className="space-y-2">
                  {(() => {
                    try {
                      let bultosFlat = [];
                      confirmDelivery.dataList.forEach(obj => {
                        const ordStr = obj.OrdenRetiro || obj.ordenDeRetiro;
                        if (!deliverySelectedOrders[ordStr]) return;
                        if (obj.BultosJSON) { bultosFlat.push(...JSON.parse(obj.BultosJSON)); }
                        else if (obj.orders) { bultosFlat.push(...obj.orders); }
                      });

                      if (bultosFlat.length === 0) return <li className="text-sm font-medium text-slate-600">No hay bultos u órdenes seleccionadas.</li>;
                      return bultosFlat.map((b, i) => {
                        const identifier = b.orderNumber || b.id || `Desconocido_${i}`;
                        const isScanned = !!deliveryScannedBultos[identifier];
                        return (
                          <li
                            key={i}
                            onClick={() => setDeliveryScannedBultos(prev => ({ ...prev, [identifier]: !isScanned }))}
                            className={`flex items-center gap-3 text-sm font-bold cursor-pointer transition-all p-3 rounded-xl border-2 shadow-sm ${isScanned ? 'bg-green-50/80 border-green-400 text-green-800' : 'bg-white border-slate-200 text-slate-700'}`}
                          >
                            <div className={`p-1.5 rounded-md ${isScanned ? 'bg-green-500/10' : 'bg-slate-100'}`}>
                              <Package size={16} className={isScanned ? 'text-green-600' : 'text-blue-500'} />
                            </div>
                            {identifier}
                            <span className="text-[11px] font-normal opacity-60 ml-auto mr-2 truncate max-w-[120px]">{b.ordNombreTrabajo || ''}</span>
                            {isScanned ? <CheckCircle className="text-green-500" size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300" />}
                          </li>
                        );
                      });
                    } catch (e) {
                      return <li className="text-sm font-medium text-slate-600">Error al leer bultos.</li>;
                    }
                  })()}
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setConfirmDelivery(null)}
                  className="flex-[0.8] py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                {(() => {
                  let allChecked = true;
                  try {
                    let bultosFlat = [];
                    confirmDelivery.dataList.forEach(obj => {
                      const ordStr = obj.OrdenRetiro || obj.ordenDeRetiro;
                      if (!deliverySelectedOrders[ordStr]) return;
                      if (obj.BultosJSON) { bultosFlat.push(...JSON.parse(obj.BultosJSON)); }
                      else if (obj.orders) { bultosFlat.push(...obj.orders); }
                    });

                    // Ensure at least one order is selected
                    const hayOrdenSeleccionada = Object.values(deliverySelectedOrders).some(v => v);

                    if (!hayOrdenSeleccionada) {
                      allChecked = false;
                    } else if (bultosFlat.length > 0) {
                      allChecked = bultosFlat.every(b => !!deliveryScannedBultos[b.orderNumber || b.id || '']);
                    }
                  } catch (e) { }

                  return (
                    <button
                      disabled={!allChecked}
                      onClick={handleEntregar}
                      className="flex-[1.2] py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:text-white disabled:shadow-none disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2"
                    >
                      <Check size={20} /> Entregar Ahora
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        )
      }

      {/* EXCEPCION MODAL FOR UNPAID DELIVERY */}
      {
        excepcionDelivery && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 border-2 border-rose-200">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 text-center mb-2">!ALERTA!</h3>
              <p className="text-slate-600 font-medium text-center mb-6">
                Este retiro <strong>DEBE SER ABONADO</strong>. Por favor verifique que pase por caja y confirme el pago.
                <br /><br />
                <span className="text-xs text-rose-500 font-bold uppercase tracking-wider">Esto es una excepcionalidad</span>
              </p>

              <form onSubmit={handleExcepcionSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña de Autorización</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => { setAdminPassword(e.target.value); setError(null); }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all"
                    placeholder="Ingrese contraseña..."
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Explicación o Detalle (Requerido)</label>
                  <textarea
                    required
                    value={excepcionExplicacion}
                    onChange={(e) => setExcepcionExplicacion(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all resize-none"
                    placeholder="Justifique la excepción de este retiro..."
                  ></textarea>
                </div>

                {/* Error inline: contraseña incorrecta, etc. */}
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-300 text-red-700 text-sm font-bold rounded-xl px-4 py-2.5">
                    ⚠️ {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => { setExcepcionDelivery(null); setAdminPassword(''); setError(null); }}
                    className="flex-[1] py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-[1] py-3 px-4 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-md shadow-rose-200 transition-all flex justify-center items-center gap-2"
                  >
                    <Check size={18} /> Autorizar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default WebRetirosPage;

import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { printRetiroStation } from './webPrintHelper';
import {
  Package, Search, Check, AlertCircle, ArrowLeft, CheckCircle,
  Loader2, LayoutGrid, MapPin, Clock, Printer, Tag,
  XCircle, MoveHorizontal, X, BellRing, PackageCheck, Lock, Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api'; // Axios instance base

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
    @page { size: A5; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 15px;
      color: #111;
      background: #fff;
      padding: 10mm 10mm 8mm;
    }

    /* ── ENCABEZADO ── */
    .header {
      text-align: center;
      border-bottom: 2px solid #222;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .header .empresa {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .header .modulo {
      font-size: 13px;
      color: #555;
      margin-top: 3px;
    }
    .header .doc-tipo {
      font-size: 12px;
      color: #888;
      margin-top: 2px;
      font-style: italic;
    }

    /* ── CÓDIGO PRINCIPAL ── */
    .codigo-principal {
      text-align: center;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 3px;
      margin: 12px 0 10px;
      padding: 8px 0;
      border-top: 1px dashed #ccc;
      border-bottom: 1px dashed #ccc;
    }

    /* ── ESTADO BADGE ── */
    .estado-badge {
      display: inline-block;
      padding: 5px 14px;
      border: 2px solid ${pagado ? '#16a34a' : '#dc2626'};
      color: ${pagado ? '#16a34a' : '#dc2626'};
      font-weight: 900;
      font-size: 14px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* ── TABLA DE DATOS ── */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
    }
    .info-table td {
      padding: 6px 4px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    .info-table td:first-child {
      color: #000;
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      width: 34%;
      white-space: nowrap;
    }
    .info-table td:last-child {
      font-weight: 700;
      text-align: right;
      font-size: 15px;
    }

    /* ── TABLA DE ÓRDENES ── */
    .orders-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 14px;
    }
    .orders-table thead tr {
      background: #f3f4f6;
    }
    .orders-table th {
      padding: 7px 6px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #444;
      border-bottom: 1px solid #ddd;
    }
    .orders-table td {
      padding: 7px 6px;
      border-bottom: 1px solid #eee;
      font-weight: 600;
    }

    /* ── SEPARADOR ── */
    .sep { border-top: 1px dashed #bbb; margin: 12px 0; }

    /* ── FIRMA ── */
    .firma-row {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
    }
    .firma-box {
      width: 44%;
      border-top: 1px solid #333;
      padding-top: 5px;
      text-align: center;
      font-size: 12px;
      color: #555;
    }

    /* ── PIE ── */
    .footer {
      margin-top: 14px;
      font-size: 12px;
      text-align: center;
      color: #aaa;
      border-top: 1px solid #eee;
      padding-top: 6px;
    }

    @media print {
      html, body { margin: 0; padding: 10mm 10mm 8mm; }
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
  <div style="text-align:center; margin-bottom:18px;">
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
  <div style="font-size:11px;color:#000;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;font-weight:800;">
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
    let costo = o.orderCosto || o.costoFinal || o.amount;
    let finalCosto = '-';
    if (costo !== undefined && costo !== null && costo !== '' && costo !== '-') {
        if (typeof costo === 'string' && costo.includes('$')) {
            finalCosto = costo;
        } else {
            finalCosto = `${o.simbolo || o.currency || '$'} ${Number(costo).toFixed(2)}`;
        }
    }
    return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${cod}</strong></td>
          <td style="text-align:right; font-weight:700;">${finalCosto}</td>
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

// ─── HELPER: Etiqueta de despacho ───
const printRetiroLabel = (items) => {
  const labelsArr = Array.isArray(items) ? items : [items];
  const labelsHtml = labelsArr.map(item => {
    const nombre = item.CliNombre || item.idcliente || '-';
    const telefono = item.CliTelefono ? item.CliTelefono.trim() : '';
    const depto = item.departamentoEnvio || '';
    const localidad = item.localidadEnvio || '';
    const direccion = item.direccionEnvio || '';
    const agencia = item.agenciaNombre || '';
    const ordenRetiro = item.displayLabel || item.ordenDeRetiro || '';

    return `
      <div class="label">
        <div class="header-bar">
          <span class="logo">USER</span>
          <span class="orden-code">${ordenRetiro}</span>
        </div>

        <div class="dest-section">
          <div class="badge">DESTINATARIO</div>
          <div class="dest-nombre">${nombre}</div>
          ${telefono ? `<div class="dest-row"><span class="icon">&#9742;</span> ${telefono}</div>` : ''}
          ${depto ? `<div style="font-size:26px;font-weight:900;color:#111;text-transform:uppercase;line-height:1.2;">${depto}</div>` : ''}
          ${localidad ? `<div style="font-size:26px;font-weight:900;color:#111;text-transform:uppercase;line-height:1.2;margin-bottom:4px;">${localidad}</div>` : ''}
          ${direccion ? `<div style="font-size:20px;font-weight:800;color:#222;line-height:1.3;margin-bottom:4px;">${direccion}</div>` : ''}
          ${agencia ? `<div class="agencia-pill">AGENCIA &gt; ${agencia}</div>` : ''}
        </div>

        <div class="divider-area" style="padding-top:0;margin-top:-4px;">
          <div class="divider-line"></div>
        </div>

        <div class="rem-section">
          <div class="badge rem-badge">REMITENTE</div>
          <div class="rem-nombre">USER</div>
          <div class="rem-row">Arenal Grande 2667</div>
          <div class="rem-row">Montevideo, Uruguay</div>
          <div class="rem-row">&#9742; 092284262</div>
        </div>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Etiquetas de Despacho</title>
  <style>
    @page { size: 10cm 15cm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; }
    
    .label {
      width: 10cm;
      height: 15cm;
      background: #fff;
      border: 2px solid #222;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      overflow: hidden;
    }
    .label:last-child { page-break-after: avoid; }

    /* Header bar */
    .header-bar {
      background: #1a1a1a;
      color: #fff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .orden-code {
      font-size: 16px;
      font-weight: 900;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
      background: rgba(255,255,255,0.15);
      padding: 3px 10px;
      border-radius: 4px;
    }

    /* Destinatario */
    .dest-section {
      flex: 1;
      padding: 16px 20px 10px;
      display: flex;
      flex-direction: column;
    }
    .badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #fff;
      background: #1a1a1a;
      padding: 3px 10px;
      border-radius: 3px;
      margin-bottom: 10px;
      width: fit-content;
    }
    .dest-nombre {
      font-size: 24px;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1.15;
      margin-bottom: 10px;
      color: #111;
      border-bottom: 2px solid #eee;
      padding-bottom: 8px;
    }
    .dest-row {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .dest-row .icon {
      display: inline-block;
      width: 18px;
      font-size: 13px;
      color: #888;
    }
    .agencia-pill {
      margin-top: 10px;
      font-size: 15px;
      font-weight: 800;
      color: #1a1a1a;
      background: #f0f0f0;
      border: 1.5px solid #ccc;
      padding: 6px 14px;
      border-radius: 6px;
      display: inline-block;
    }

    /* Divider */
    .divider-area {
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 8px;
    }
    .divider-line {
      flex: 1;
      border-top: 2px dashed #aaa;
    }
    .scissors {
      font-size: 16px;
      color: #aaa;
    }

    /* Remitente */
    .rem-section {
      padding: 10px 20px 14px;
      background: #fafafa;
      border-top: 1px solid #eee;
    }
    .rem-badge {
      background: #666;
      margin-bottom: 6px;
    }
    .rem-nombre {
      font-size: 20px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #333;
      margin-bottom: 4px;
    }
    .rem-row {
      font-size: 14px;
      font-weight: 700;
      color: #555;
      line-height: 1.6;
    }

    @media print {
      body { background: #fff; }
      .label { border: none; }
    }
  </style>
</head>
<body>
  ${labelsHtml}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=420,height=620');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [dragItem, setDragItem] = useState(null);
  const [filtroTipo, setFiltroTipo] = React.useState('ALL'); // Nuevo filtro unificado
  const [filtroLugarRetiro, setFiltroLugarRetiro] = React.useState('ALL');
  const [expandedCol, setExpandedCol] = React.useState(null); // null = both, 'RT' | 'RWRL' = solo esa
  const [confirmDelivery, setConfirmDelivery] = React.useState(null);
  // excepcionDelivery removido — reemplazado por estado 9
  const [adminPassword, setAdminPassword] = React.useState('');
  // excepcionExplicacion removido
  const [deliveryScannedBultos, setDeliveryScannedBultos] = React.useState({});
  const [deliveryBarcodeInput, setDeliveryBarcodeInput] = React.useState('');
  const [deliverySelectedOrders, setDeliverySelectedOrders] = React.useState({});
  const [announcedOrders, setAnnouncedOrders] = React.useState(new Set()); // Órdenes anunciadas desde el tótem
  const [duplicateDeliveryWarn, setDuplicateDeliveryWarn] = React.useState(null);
  const [layoutLocked, setLayoutLocked] = React.useState(false); // lock de layout de columnas
  const [lockedWeights, setLockedWeights] = React.useState(null); // pesos congelados
  const deliveryInputRef = React.useRef(null);
  const knownApiOrdersRef = React.useRef(new Set()); // Ref para delta detection sin closure stale
  const lastComputedWeightsRef = React.useRef({}); // Ref para capturar pesos al hacer lock

  // Scanner redirect for ConfirmDelivery
  useEffect(() => {
    if (!confirmDelivery) return;
    const handleScannerFocus = (e) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        deliveryInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleScannerFocus);
    return () => window.removeEventListener('keydown', handleScannerFocus);
  }, [confirmDelivery]);

  // Cerrar modales con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (confirmDelivery) { setConfirmDelivery(null); }
      else if (ubicationMode) { setUbicationMode(false); }
      else if (selectedRetiro) { setSelectedRetiro(null); }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [confirmDelivery, ubicationMode, selectedRetiro]);

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
            lugarRetiro: r.LugarRetiro || null,
            agenciaNombre: r.AgenciaNombre || null,
            direccionEnvio: r.DireccionEnvio || null,
            departamentoEnvio: r.DepartamentoEnvio || null,
            localidadEnvio: r.LocalidadEnvio || null,
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
          // Convertir OrdenesCodigos solo como fallback; BultosJSON tiene la data rica (costos, monedas)
          const ordersFromDB = item.BultosJSON 
            ? JSON.parse(item.BultosJSON)
            : (item.OrdenesCodigos ? item.OrdenesCodigos.split(',').map(code => ({ orderNumber: code.trim(), orderId: code.trim() })) : []);
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
        // Traer TODOS los retiros pendientes (no entregados ni cancelados), sin excluir por estante
        // Estado 1 = Ingresado, 3 = Abonado de antemano, 4 = Abonado de antemano (variante),
        // 7 = Empaquetado sin abonar, 8 = Empaquetado y abonado
        const { data: todosData } = await api.get('/apiordenesRetiro/estados?estados=1,3,4,7,8,9');
        // Filter out retiros that are already assigned to a shelf
        const enEstante = new Set();
        Object.values(estantesMap).forEach(items => items.forEach(item => {
          if (item.OrdenRetiro) enEstante.add(item.OrdenRetiro);
        }));
        // Filter out retiros already in apiOrders (web/totem) to avoid duplicates
        // apiOrders use format "RT-18", otrosRetiros use "RT-0018" — compare by numeric ID
        const apiOrderIds = new Set(formattedRetiros.map(o => {
          const match = (o.ordenDeRetiro || '').match(/(\d+)$/);
          return match ? parseInt(match[1], 10) : null;
        }).filter(Boolean));
        const sinEstante = (Array.isArray(todosData) ? todosData : []).filter(o => {
          if (enEstante.has(o.ordenDeRetiro)) return false;
          // Extract numeric ID from "RT-0018" format
          const match = (o.ordenDeRetiro || '').match(/(\d+)$/);
          const numId = match ? parseInt(match[1], 10) : null;
          if (numId && apiOrderIds.has(numId)) return false;
          return true;
        });
        setOtrosRetiros(sinEstante);
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
                lugarRetiro: r.LugarRetiro || null,
                agenciaNombre: r.AgenciaNombre || null,
                direccionEnvio: r.DireccionEnvio || null,
                departamentoEnvio: r.DepartamentoEnvio || null,
                localidadEnvio: r.LocalidadEnvio || null,
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

  // Sync ref de órdenes conocidas para delta detection
  useEffect(() => {
    knownApiOrdersRef.current = new Set(apiOrders.map(o => o.ordenDeRetiro));
  }, [apiOrders]);

  // Fetch silencioso: aplica directamente sin badge
  const fetchPendingUpdate = useCallback(async () => {
    try {
      const { data } = await api.get('/web-retiros/locales');
      const newOrders = (data || [])
        .filter(r => r.Estado === 1 || r.Estado === 3)
        .map(r => ({
          ordenDeRetiro: r.OrdIdRetiro,
          idcliente: r.NombreCliente || r.CodCliente || 'Ecommerce',
          monto: r.Monto || 0,
          moneda: r.Moneda || 'UYU',
          pagorealizado: r.Estado === 3 || r.Estado === 8 ? 1 : 0,
          pagoHandy: !!r.ReferenciaPago,
          lugarRetiro: r.LugarRetiro || null,
          agenciaNombre: r.AgenciaNombre || null,
          direccionEnvio: r.DireccionEnvio || null,
          departamentoEnvio: r.DepartamentoEnvio || null,
          localidadEnvio: r.LocalidadEnvio || null,
          orders: r.BultosJSON ? JSON.parse(r.BultosJSON)
            : (r.OrdenesCodigos ? r.OrdenesCodigos.split(',').map(c => ({ orderNumber: c.trim(), orderId: c.trim() })) : []),
        }));
      setApiOrders(newOrders);
    } catch (e) { console.warn('[fetchPendingUpdate]', e); }
  }, []);

  // ─── SOCKET: actualizar en tiempo real ───
  useEffect(() => {
    let socket;
    const initSocket = async () => {
      const { io } = await import('socket.io-client');
      const { SOCKET_URL } = await import('../../services/apiClient');
      socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
      socket.on("connect", () => console.log("WebRetiros conectado a Sockets:", socket.id));
      socket.on("retiros:update", () => { fetchPendingUpdate(); });
      socket.on("actualizado", () => { fetchPendingUpdate(); });
      socket.on("totem:cliente-anunciado", (data) => {
        console.log('[WebRetiros] 📢 Cliente anunciado desde tótem:', data);
        // Buscar todas las variantes posibles del ID del retiro (RT-123, RW-123, RL-123)
        const numId = data.ordenRetiro;
        setAnnouncedOrders(prev => {
          const next = new Set(prev);
          next.add(numId);
          return next;
        });
        // Notificación visual al operario
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: `📢 ${data.cliente} se anunció con Retiro #${numId}`,
          showConfirmButton: false,
          timer: 8000,
          background: '#fdf2f8',
          color: '#831843',
        });
        // Auto-limpiar después de 30 minutos
        setTimeout(() => {
          setAnnouncedOrders(prev => {
            const next = new Set(prev);
            next.delete(numId);
            return next;
          });
        }, 1800000);
      });
    };
    initSocket();
    return () => { if (socket) socket.disconnect(); };
  }, [fetchAllData, fetchPendingUpdate]);

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

  const triggerEntregar = async (id, dataOrDataList) => {
    const list = Array.isArray(dataOrDataList) ? dataOrDataList : [dataOrDataList];

    // Fetch fresh data from the server to ensure payment status is up-to-date
    let freshRetiros = [];
    try {
      const { data } = await api.get('/apiordenesRetiro/estados?estados=1,2,3,4,7,8,9');
      freshRetiros = Array.isArray(data) ? data : [];
    } catch (e) { console.warn('No se pudo verificar estado actual de retiros:', e); }

    // Enriquecer cada item del estante con los orders del retiro completo
    // (los items del estante solo tienen OrdenRetiro/CodigoCliente, sin orders[])
    const listEnriquecida = list.map(item => {
      const ordenStr = item.OrdenRetiro || item.ordenDeRetiro;
      const retiroFresh = freshRetiros.find(o => o.ordenDeRetiro === ordenStr);
      const retiroFull = retiroFresh
        || apiOrders.find(o => o.ordenDeRetiro === ordenStr)
        || otrosRetiros.find(o => o.ordenDeRetiro === ordenStr);
      return {
        ...item,
        orders: item.orders?.length ? item.orders : (retiroFull?.orders || []),
        pagorealizado: item.Pagado ? 1 : (retiroFull?.pagorealizado ?? item.pagorealizado ?? 0),
        TClDescripcion: retiroFull?.TClDescripcion || item.TClDescripcion || '',
        estado: retiroFull?.estado || item.estado || '',
      };
    });

    // Verificar autorización: pagada o estado 9 (Autorizado) — tipo 2 siempre pasa
    for (const item of listEnriquecida) {
      const ordenStr = item.OrdenRetiro || item.ordenDeRetiro;
      const retiroFull = freshRetiros.find(o => o.ordenDeRetiro === ordenStr) || apiOrders.find(o => o.ordenDeRetiro === ordenStr) || otrosRetiros.find(o => o.ordenDeRetiro === ordenStr);

      // Si no se encuentra en la lista (ej. estado 5 ghost), permitir entrega
      if (!retiroFull) continue;

      const esSemanal = retiroFull.TClIdTipoCliente === 2;
      if (esSemanal) continue; // Tipo 2: siempre se entrega sin pasar por caja

      const isPagado = retiroFull?.pagorealizado === 1 || item.Pagado;
      const estadoStr = (typeof retiroFull?.estado === 'string' ? retiroFull.estado : '').toLowerCase();
      const isAutorizado = retiroFull?.estadoNumerico === 9 || estadoStr === 'autorizado' || item.estadoNumerico === 9;

      if (!isPagado && !isAutorizado) {
        Swal.fire({ toast: true, position: 'top', icon: 'warning', title: `${ordenStr} no está pagada ni autorizada. Debe pasar por Caja.`, showConfirmButton: false, timer: 4000 });
        return;
      }
    }

    setConfirmDelivery({ id, dataList: listEnriquecida });
    setDeliveryScannedBultos({});
    setDeliveryBarcodeInput('');

    // Select all orders by default for delivery
    const sel = {};
    listEnriquecida.forEach(o => sel[o.OrdenRetiro || o.ordenDeRetiro] = true);
    setDeliverySelectedOrders(sel);
  };


  // handleExcepcionSubmit removido — reemplazado por estado 9 desde caja

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
      // Para fuera de estante, el backend ya maneja ubicacionId='FUERA DE ESTANTE'
      // (omite el DELETE de OcupacionEstantes y llama directamente a marcarEntregado)

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

  // Entrega directa desde estante (doble clic) — sin abrir control de bultos
  const directEntregar = async (ubicacionId, dataList) => {
    const list = Array.isArray(dataList) ? dataList : [dataList];

    // Fetch fresh data
    let freshRetiros = [];
    try {
      const { data } = await api.get('/apiordenesRetiro/estados?estados=1,2,3,4,7,8,9');
      freshRetiros = Array.isArray(data) ? data : [];
    } catch (e) { console.warn('No se pudo verificar estado actual de retiros:', e); }

    // Verificar pago/autorización — tipo 2 siempre pasa
    for (const item of list) {
      const ordenStr = item.OrdenRetiro || item.ordenDeRetiro;
      const retiroFull = freshRetiros.find(o => o.ordenDeRetiro === ordenStr) || apiOrders.find(o => o.ordenDeRetiro === ordenStr);

      // Si no se encuentra (ej. estado 5 ghost), permitir entrega
      if (!retiroFull) continue;

      const esSemanal = retiroFull.TClIdTipoCliente === 2;
      if (esSemanal) continue; // Tipo 2: siempre se entrega

      const isPagado = retiroFull?.pagorealizado === 1 || item.Pagado;
      const isAutorizado = retiroFull?.estadoNumerico === 9 || (retiroFull?.estado || '').toLowerCase() === 'autorizado' || item.estadoNumerico === 9;
      if (!isPagado && !isAutorizado) {
        Swal.fire({
          toast: true, position: 'top-end', icon: 'warning', title: `${ordenStr} no está pagada ni autorizada. Debe pasar por Caja.`, showConfirmButton: false, timer: 4000,
          showClass: { popup: 'animate-[slideInRight_0.3s_ease-out]' }, hideClass: { popup: 'animate-[slideOutRight_0.3s_ease-in]' }
        });
        return;
      }
    }

    const ordenesParaEntregar = list.map(item => item.OrdenRetiro || item.ordenDeRetiro);

    // Optimismo UI
    setOcupacionEstantes(prev => {
      const next = { ...prev };
      if (next[ubicacionId]) {
        const remaining = next[ubicacionId].filter(item => !ordenesParaEntregar.includes(item.OrdenRetiro || item.ordenDeRetiro));
        if (remaining.length === 0) delete next[ubicacionId];
        else next[ubicacionId] = remaining;
      }
      return next;
    });

    try {
      await api.post('/web-retiros/estantes/liberar-multiple', { ubicacionId, ordenesParaEntregar });
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success', title: 'Entregado correctamente.', showConfirmButton: false, timer: 2500,
        showClass: { popup: 'animate-[slideInRight_0.3s_ease-out]' }, hideClass: { popup: 'animate-[slideOutRight_0.3s_ease-in]' }
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al entregar');
      fetchAllData(false);
    }
  };

  // Quita la orden del estante y la devuelve a la lista de empaque (sin marcar como entregada)
  const handleDesasignar = async (ordenRetiro, ubicacionId) => {
    if (!ordenRetiro || !ubicacionId) return;
    // Optimismo UI: liberar visualmente el casillero
    setOcupacionEstantes(prev => {
      const next = { ...prev };
      if (next[ubicacionId]) {
        const remaining = next[ubicacionId].filter(item =>
          (item.OrdenRetiro || item.ordenDeRetiro) !== ordenRetiro
        );
        if (remaining.length === 0) delete next[ubicacionId];
        else next[ubicacionId] = remaining;
      }
      return next;
    });
    try {
      await api.delete('/web-retiros/estantes/desasignar', { data: { ubicacionId, ordenRetiro } });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al desasignar del estante');
      fetchAllData(false); // Revertir si falla
    }
  };

  const handleDrop = async (targetId) => {
    if (!dragItem || !targetId) return;
    const sourceId = dragItem.ubicacionId;
    const ordenRetiro = dragItem.OrdenRetiro;
    if (sourceId === targetId) return;

    // Optimismo UI
    setOcupacionEstantes(prev => {
      const next = { ...prev };
      const sourceList = (next[sourceId] || []).filter(i => (i.OrdenRetiro || i.ordenDeRetiro) !== ordenRetiro);
      const movedItem = (prev[sourceId] || []).find(i => (i.OrdenRetiro || i.ordenDeRetiro) === ordenRetiro);
      if (sourceList.length === 0) delete next[sourceId]; else next[sourceId] = sourceList;
      if (movedItem) next[targetId] = [...(next[targetId] || []), movedItem];
      return next;
    });
    setDragItem(null);
    setIsDragging(false);
    setDragOverSlot(null);

    try {
      const parts = targetId.split('-');
      // targetId format: "A-2-3" → destEstanteId=A, destSeccion=2, destPosicion=3
      const destEstanteId = parts[0];
      const destSeccion = parseInt(parts[1]);
      const destPosicion = parseInt(parts[2]);
      await api.post('/web-retiros/estantes/mover', {
        ordenRetiro,
        destEstanteId,
        destSeccion,
        destPosicion
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al mover');
      fetchAllData(false);
    }
  };

  // Scroll + focus visual al casillero cuando se busca (por retiro, cliente o depósito)
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) return;
    const term = searchTerm.toLowerCase();

    for (const id in ocupacionEstantes) {
      const dataList = ocupacionEstantes[id];
      if (!Array.isArray(dataList) || dataList.length === 0) continue;

      const matches = dataList.some(item =>
        (item.OrdenRetiro && item.OrdenRetiro.toLowerCase().includes(term)) ||
        (item.ClientName && item.ClientName.toLowerCase().includes(term)) ||
        (item.CodigoCliente && String(item.CodigoCliente).toLowerCase().includes(term)) ||
        (Array.isArray(item.orders) && item.orders.some(o =>
          o.orderNumber && o.orderNumber.toLowerCase().includes(term)
        ))
      );

      if (matches) {
        const el = document.getElementById(`box-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-yellow-400', 'ring-offset-2', 'scale-110', 'z-50');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-yellow-400', 'ring-offset-2', 'scale-110', 'z-50');
          }, 2500);
        }
        break;
      }
    }
  }, [searchTerm, ocupacionEstantes]);

  // --- COMPONENTES VISUALES INTERNOS ---
  const OrderDetail = () => {
    const [barcodeInput, setBarcodeInput] = useState('');
    const inputRef = React.useRef(null);
    const [duplicateWarn, setDuplicateWarn] = useState(null);

    useEffect(() => {
      // Focus input once on mount
      inputRef.current?.focus();
    }, []);

    useEffect(() => {
      const handleGlobalKeyDown = (e) => {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          inputRef.current?.focus();
        }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const toggle = (id) => setScannedBultos(prev => ({ ...prev, [id]: !prev[id] }));
    const allChecked = selectedRetiro.orders?.every(o => scannedBultos[o.orderNumber]);

    const handleScanSubmit = (e) => {
      e.preventDefault();
      const rawCode = barcodeInput.trim().toUpperCase();
      if (!rawCode) return;
      const code = rawCode.replace(/^([A-Z]+)(\d+)$/, '$1-$2');

      // Find matches (exact or numeric suffix if unique)
      const possibleMatches = selectedRetiro.orders?.filter(o => {
        const oNum = o.orderNumber.toUpperCase();
        return oNum === code || (code.match(/^\d+$/) && oNum.endsWith(`-${code}`));
      }) || [];
      const found = possibleMatches.length === 1 ? possibleMatches[0] : null;
      if (found) {
        if (scannedBultos[found.orderNumber]) {
          setDuplicateWarn(found.orderNumber);
          setTimeout(() => setDuplicateWarn(null), 200);
        } else {
          setScannedBultos(prev => ({ ...prev, [found.orderNumber]: true }));
        }
      }
      setBarcodeInput('');
    };

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-black text-slate-800">Orden de Retiro: <span className="text-blue-600">{selectedRetiro.pagoHandy ? selectedRetiro.ordenDeRetiro.replace('R-', 'PW-') : selectedRetiro.ordenDeRetiro}</span></span>
              <span className="text-slate-300">|</span>
              <span className="font-bold text-slate-500">ID Cliente: <span className="text-slate-700">{selectedRetiro.idcliente}</span></span>
            </div>
            <button onClick={() => setSelectedRetiro(null)} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
              <XCircle size={20} />
            </button>
          </div>
          <form onSubmit={handleScanSubmit} className="mb-4 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-blue-400" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => {
                const val = e.target.value;
                setBarcodeInput(val);
                const rawCode = val.trim().toUpperCase();
                const code = rawCode.replace(/^([A-Z]+)(\d+)$/, '$1-$2');
                if (code && selectedRetiro?.orders) {
                  const possibleMatches = selectedRetiro.orders.filter(o => {
                    const oNum = o.orderNumber.toUpperCase();
                    return oNum === code || (code.match(/^\d+$/) && oNum.endsWith(`-${code}`));
                  });
                  const found = possibleMatches.length === 1 ? possibleMatches[0] : null;

                  if (found) {
                    if (scannedBultos[found.orderNumber]) {
                      setDuplicateWarn(found.orderNumber);
                      setTimeout(() => setDuplicateWarn(null), 200);
                    } else {
                      setScannedBultos(prev => ({ ...prev, [found.orderNumber]: true }));
                    }
                    setTimeout(() => setBarcodeInput(''), 0);
                  }
                }
              }}
              className="block w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white text-base font-bold transition-all text-slate-700"
              placeholder="Escanee el bulto aquí..."
              autoComplete="off"
              spellCheck={false}
            />
          </form>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Checklist de Bultos</p>
            </div>
            <div className="grid grid-cols-3 gap-3 p-1 max-h-64 overflow-y-auto">
              {selectedRetiro.orders?.map(o => (
                <motion.div key={o.orderNumber}
                  animate={duplicateWarn === o.orderNumber ? { rotate: [0, -3, 3, -3, 3, 0] } : {}}
                  transition={duplicateWarn === o.orderNumber ? { duration: 0.2 } : { duration: 0 }}
                  onClick={() => {
                    if (scannedBultos[o.orderNumber]) {
                      setScannedBultos(prev => ({ ...prev, [o.orderNumber]: false }));
                    }
                  }}
                  className={`flex flex-row items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${scannedBultos[o.orderNumber] ? 'bg-green-100 border-green-500 shadow-sm cursor-pointer hover:opacity-80' : 'bg-white border-slate-200'
                    }`}>
                  <div className={`shrink-0 ${scannedBultos[o.orderNumber] ? 'text-green-700' : 'text-slate-400'}`}>
                    {scannedBultos[o.orderNumber] ? <PackageCheck size={24} /> : <Package size={24} />}
                  </div>
                  <div className="text-base font-black text-slate-800 truncate">{o.orderNumber}</div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setSelectedRetiro(null)} className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
            <button
              disabled={!allChecked}
              onClick={() => {
                // Auto-find first empty slot
                for (const est of estantesConfigArr) {
                  for (let s = 1; s <= est.secciones; s++) {
                    for (let p = 1; p <= est.posiciones; p++) {
                      const id = `${est.id}-${s}-${p}`;
                      if (!ocupacionEstantes[id] || ocupacionEstantes[id].length === 0) {
                        handleAsignarUbicacion(est.id, s, p);
                        return;
                      }
                    }
                  }
                }
                // No empty slot found — fallback to manual
                Swal.fire({ toast: true, position: 'top', icon: 'warning', title: 'No hay casilleros vacíos. Seleccioná uno manualmente.', showConfirmButton: false, timer: 3000 });
                setUbicationMode(true);
              }}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Asignar a Estante
            </button>
          </div>
        </div>
      </div>
    );
  };

  const UbicationGrid = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8" onClick={() => setUbicationMode(false)}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Mapa del Depósito</h2>
            <p className="text-slate-500 font-medium text-sm mt-1">Haga click en un casillero vacío para ubicar la orden <strong className="text-blue-600">{selectedRetiro.pagoHandy ? selectedRetiro.ordenDeRetiro.replace('R-', 'PW-') : selectedRetiro.ordenDeRetiro}</strong></p>
          </div>
          <button onClick={() => setUbicationMode(false)} className="px-6 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-500 shadow-sm hover:bg-slate-50 text-sm">Atrás</button>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {estantesConfigArr.map(est => (
            <div key={est.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white font-black text-base">{est.id}</div>
                <span className="text-sm font-bold text-slate-700">Estante {est.id}</span>
              </div>

              <div className="space-y-1.5">
                {[...Array(est.secciones)].map((_, s) => (
                  <div key={s} className="flex gap-1.5 items-center">
                    <div className="w-8 bg-slate-50 rounded-md flex flex-col items-center justify-center border border-slate-200 py-1 shrink-0">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">S</span>
                      <span className="text-xs font-black text-slate-700">{s + 1}</span>
                    </div>
                    <div className="grid grid-cols-5 flex-1 gap-1">
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
                            title={isOccupied ? (dataList[0]?.OrdenRetiro || id) : id}
                            onClick={() => {
                              if (!puedeGuardarAca) {
                                setError('No puedes guardar órdenes de diferentes clientes en el mismo casillero.');
                                return;
                              }
                              handleAsignarUbicacion(est.id, s + 1, p + 1);
                            }}
                            className={`relative h-10 rounded-lg border-2 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${isOccupied
                              ? puedeGuardarAca
                                ? 'bg-indigo-600 border-indigo-700 hover:bg-indigo-500'
                                : 'bg-rose-950 border-rose-800 opacity-60 cursor-not-allowed'
                              : 'bg-white border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50'
                              }`}
                          >
                            {isOccupied ? (
                              <span className="text-[8px] font-black text-white leading-tight px-0.5 truncate w-full text-center">
                                {dataList[0]?.OrdenRetiro?.split('-')[1] || '?'}
                              </span>
                            ) : (
                              <span className="text-[8px] text-slate-300">{p + 1}</span>
                            )}
                            {dataList.length > 1 && (
                              <div className="absolute top-0 right-0 bg-rose-500 text-white text-[7px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                                {dataList.length}
                              </div>
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
    const autorizado = retiro.estadoNumerico === 9 || retiro.OReEstadoActual === 9;

    if (desc.includes('semanal')) {
      return { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800' };
    }
    if (desc.includes('rollo')) {
      return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' };
    }
    if (pagado) {
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' };
    }
    if (autorizado) {
      return { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800' };
    }
    // Pendiente de pago
    return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800' };
  };


  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Navbar compacto: logo + buscador a la izquierda, tabs a la derecha */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="shrink-0 text-brand-cyan">
            <LayoutGrid size={18} />
          </div>
          <span className="text-sm font-black text-slate-800 tracking-tight shrink-0 uppercase">Logística</span>

          {/* Buscador compacto — solo en empaque sin orden seleccionada */}
          {view === 'empaque' && !selectedRetiro && (
            <div className="relative w-56 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Buscar orden o cliente..."
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 focus:border-blue-400 focus:bg-white outline-none text-xs font-medium transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}



          {/* Lock de layout */}
          {view === 'empaque' && !selectedRetiro && (
            <button
              onClick={() => {
                if (layoutLocked) {
                  setLayoutLocked(false);
                  setLockedWeights(null);
                } else {
                  setLockedWeights({ ...lastComputedWeightsRef.current });
                  setLayoutLocked(true);
                }
              }}
              title={layoutLocked ? 'Desbloquear layout' : 'Bloquear layout'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors shrink-0 ${
                layoutLocked
                  ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {layoutLocked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Toggle de vista: un solo botón que lleva a la otra */}
          <button
            onClick={() => setView(view === 'empaque' ? 'entrega' : 'empaque')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors shrink-0 uppercase"
          >
            {view === 'empaque'
              ? <><MapPin size={16} className="text-brand-cyan" /> Ir a Entregas</>
              : <><Package size={16} className="text-brand-cyan" /> Ir a Empaque</>
            }
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
          <>
            <div className="animate-in fade-in duration-300">
              {/* ─── LISTA UNIFICADA DE RETIROS ─── */}
              {(() => {
                const PRIORITY_META = {
                  '-1': { label: 'Anunciadas', color: 'text-pink-600', dot: 'bg-pink-500', badge: 'bg-pink-50 border-pink-200 text-pink-700', icon: BellRing },
                  '0': { label: 'Pagados', color: 'text-emerald-600', dot: 'bg-emerald-500', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                  '1': { label: 'Rollo por Adelantado', color: 'text-amber-600', dot: 'bg-amber-500', badge: 'bg-amber-50 border-amber-200 text-amber-700' },
                  '2': { label: 'Semanales', color: 'text-indigo-600', dot: 'bg-indigo-500', badge: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                  '3': { label: 'Autorizados', color: 'text-orange-600', dot: 'bg-orange-500', badge: 'bg-orange-50 border-orange-200 text-orange-700' },
                  '4': { label: 'Pendientes de Pago', color: 'text-rose-600', dot: 'bg-rose-500', badge: 'bg-rose-50 border-rose-200 text-rose-700' },
                };

                const getPriority = (item) => {
                  // Anunciadas desde el tótem = prioridad máxima (-1)
                  const itemNum = (item.ordenDeRetiro || '').match(/(\d+)$/);
                  if (itemNum && announcedOrders.has(parseInt(itemNum[1], 10))) return -1;
                  if (item.pagorealizado === 1 || item.pagorealizado === true) return 0;
                  const desc = (item.TClDescripcion || '').toLowerCase();
                  if (desc.includes('rollo')) return 1;
                  if (desc.includes('semanal')) return 2;
                  // Estado 9 = Autorizado en Caja
                  if (item.estadoNumerico === 9 || item.OReEstadoActual === 9) return 3;
                  return 4; // Pendiente
                };

                const getTipoKey = (item) => {
                  const p = getPriority(item);
                  const map = { '-1': 'ANUNCIADA', '0': 'PAGADO', '1': 'ROLLO', '2': 'SEMANAL', '3': 'AUTORIZADO', '4': 'PENDIENTE' };
                  return map[String(p)] || 'PENDIENTE';
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
                  agenciaNombre: o.agenciaNombre || null,
                  direccionEnvio: o.direccionEnvio || null,
                  departamentoEnvio: o.departamentoEnvio || null,
                  localidadEnvio: o.localidadEnvio || null,
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
                  estadoNumerico: o.OReEstadoActual,   // <-- estado numérico para detectar estado 9
                  OReEstadoActual: o.OReEstadoActual,
                  TClDescripcion: o.TClDescripcion || '',
                  fechaAlta: o.fechaAlta || o.FechaAlta || null,
                  lugarRetiro: o.lugarRetiro || '-',
                  agenciaNombre: o.agenciaNombre || null,
                  direccionEnvio: o.direccionEnvio || null,
                  departamentoEnvio: o.departamentoEnvio || null,
                  localidadEnvio: o.localidadEnvio || null,
                  totalCost: (o.totalCost && o.totalCost !== 'NaN') ? o.totalCost : (o.montopagorealizado || '-'),
                  orders: (o.orders || []).map(sub => ({
                    orderNumber: sub.orderNumber || sub.codigoOrden,
                    orderId: sub.orderId
                  })),
                  pagoHandy: false,
                  _isWeb: false,
                  _raw: o,
                }));

                // 2. Unificar, deduplicar y filtrar
                const seenOrders = new Set();
                const deduped = [];
                // Web orders first (they have richer data like payment info)
                for (const item of [...webNorm, ...localNorm]) {
                  if (!seenOrders.has(item.ordenDeRetiro)) {
                    seenOrders.add(item.ordenDeRetiro);
                    deduped.push(item);
                  }
                }
                const all = deduped.filter(item => {
                  // Filtro por prefijo (RT / RW / RL)
                  if (filtroTipo !== 'ALL') {
                    const m = (item.ordenDeRetiro || '').match(/^([A-Z]+)/i);
                    const prefix = m ? m[1].toUpperCase() : 'OTRO';
                    if (filtroTipo === 'RWRL') {
                      if (prefix !== 'RW' && prefix !== 'RL') return false;
                    } else {
                      if (prefix !== filtroTipo) return false;
                    }
                  }
                  // Filtro lugar
                  if (filtroLugarRetiro !== 'ALL' && item.lugarRetiro !== filtroLugarRetiro) return false;
                  // Búsqueda por retiro, cliente o número de orden de depósito
                  if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    const matchRetiro = item.ordenDeRetiro && item.ordenDeRetiro.toLowerCase().includes(term);
                    const matchCliente = item.idcliente && String(item.idcliente).toLowerCase().includes(term);
                    const matchDeposito = Array.isArray(item.orders) && item.orders.some(o =>
                      o.orderNumber && o.orderNumber.toLowerCase().includes(term)
                    );
                    if (!matchRetiro && !matchCliente && !matchDeposito) return false;
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

                // 3. Columnas por tipo: RT / RW / RL
                const TYPE_COLS = [
                  { prefix: 'RT',   label: 'RT',   color: 'text-custom-cyan', dot: 'bg-custom-cyan', badge: 'bg-custom-cyan/10 border-custom-cyan/30 text-custom-cyan' },
                  { prefix: 'RWRL', label: 'RW/L', color: 'text-custom-cyan', dot: 'bg-custom-cyan', badge: 'bg-custom-cyan/10 border-custom-cyan/30 text-custom-cyan' },
                ];

                const getPrefix = (item) => {
                  const m = (item.ordenDeRetiro || '').match(/^([A-Z]+)/i);
                  const raw = m ? m[1].toUpperCase() : 'OTRO';
                  return (raw === 'RW' || raw === 'RL') ? 'RWRL' : raw;
                };

                // Siempre mostrar las 3 columnas aunque estén vacías
                const activeCols = TYPE_COLS;

                const renderCard = (item, meta) => {
                  const handleClickCard = () => {
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
                  const diffMin = item.fechaAlta ? Math.floor((Date.now() - new Date(item.fechaAlta).getTime()) / 60000) : 0;
                  const isOld = diffMin > 60;
                  const timeColor = diffMin > 480 ? 'text-rose-600 font-black' : diffMin > 60 ? 'text-orange-500 font-bold' : 'text-slate-700 font-bold';

                  const itemNum = (item.ordenDeRetiro || '').match(/(\d+)$/);
                  const isAnnounced = itemNum ? announcedOrders.has(parseInt(itemNum[1], 10)) : false;

                  return (
                    <button key={item._key} onClick={handleClickCard}
                      className={`group relative bg-white rounded-2xl border p-3 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 flex flex-col gap-1 overflow-hidden w-full min-h-[100px] uppercase ${isOld ? 'border-rose-400 shadow-sm shadow-rose-100' : 'border-slate-200'}`}
                    >
                      {isOld && (
                        <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                        </span>
                      )}

                      {/* Fila 1: Código | Botones */}
                      <div className="flex items-center gap-2 w-full">
                        <div className="font-black text-slate-800 text-sm tracking-tight leading-tight shrink-0">{item.displayLabel}</div>
                        <div className="flex-1" />
                        <div className="flex items-center gap-1 shrink-0">
                          <div role="button" tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); printRetiroStation(item); }}
                            title="Imprimir Copia/Etiqueta"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
                          ><Printer size={16} /></div>
                          {(/^RT-/i.test(item.ordenDeRetiro) || isAnnounced) && (
                            <div role="button" tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerEntregar('FUERA DE ESTANTE', [{
                                  OrdenRetiro: item.ordenDeRetiro,
                                  ordenDeRetiro: item.ordenDeRetiro,
                                  orders: item.orders || [],
                                  pagorealizado: item.pagorealizado,
                                  Pagado: item.pagorealizado === 1,
                                  TClDescripcion: item.TClDescripcion || '',
                                }]);
                              }}
                              title="Entregar ahora"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-custom-dark hover:text-violet-500 hover:bg-violet-50 transition-colors cursor-pointer"
                            ><PackageCheck size={18} /></div>
                          )}
                        </div>
                      </div>

                      {/* Fila 2: idcliente + tipo */}
                      <div className="flex items-center gap-1.5 w-full min-w-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{item.idcliente}</span>
                        {item.TClDescripcion && <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-bold shrink-0">{item.TClDescripcion}</span>}
                      </div>

                      {/* Fila 3: lugar retiro | bultos | tiempo */}
                      <div className="flex items-center justify-between w-full">
                        {item.lugarRetiro && item.lugarRetiro !== 'Desconocido' ? (
                          <div className="text-[10px] font-bold text-brand-cyan truncate min-w-0">
                            {item.agenciaNombre ? item.lugarRetiro.replace(/\s*\(.*\)\s*$/g, '') + ` (${item.agenciaNombre})` : item.lugarRetiro}
                          </div>
                        ) : <div />}
                        {orderCount > 0 && <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400 shrink-0"><Package size={9} /> {orderCount}</span>}
                        {elapsed && <span className={`flex items-center gap-0.5 text-xs shrink-0 ${timeColor}`}><Clock size={10} /> {elapsed}</span>}
                      </div>
                    </button>
                  );
                };

                return (() => {
                  const getWeight = (count) => count === 0 ? 0 : count === 1 ? 1 : 3;
                  const colData = activeCols.map(col => {
                    const colItems = all.filter(item => {
                      const prefix = getPrefix(item);
                      const itemNum = (item.ordenDeRetiro || '').match(/(\d+)$/);
                      const isAnn = itemNum ? announcedOrders.has(parseInt(itemNum[1], 10)) : false;
                      if (col.prefix === 'RT') return prefix === 'RT' || isAnn;
                      return prefix === col.prefix && !isAnn;
                    });
                    const colGroups = [-1, 0, 1, 2, 3, 4]
                      .map(p => ({ priority: p, meta: PRIORITY_META[String(p)], items: colItems.filter(i => getPriority(i) === p) }))
                      .filter(g => g.items.length > 0);
                    return { col, colItems, colGroups, weight: getWeight(colItems.length) };
                  });
                  const totalWeight = colData.reduce((s, d) => s + d.weight, 0);
                  // Guardar pesos para captura al hacer lock
                  lastComputedWeightsRef.current = Object.fromEntries(colData.map(d => [d.col.prefix, d.weight]));

                  return (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {colData.map(({ col, colItems, colGroups, weight }) => {
                        const effectiveWeight = layoutLocked && lockedWeights ? (lockedWeights[col.prefix] ?? weight) : weight;
                        const isPill = effectiveWeight === 0;
                        const effectiveTotal = layoutLocked && lockedWeights
                          ? Object.values(lockedWeights).reduce((s, w) => s + w, 0)
                          : totalWeight;
                        const myPercent = effectiveTotal === 0 ? 1 : effectiveWeight / effectiveTotal;
                        const gridColsClass = myPercent > 0.6 ? 'grid-cols-3' : myPercent > 0.35 ? 'grid-cols-2' : 'grid-cols-1';

                        return (
                          <div
                            key={col.prefix}
                            style={{
                              ...(isPill ? { flex: '0 0 auto' } : { flex: `${effectiveWeight} ${effectiveWeight} 0%` }),
                              display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden',
                              gap: isPill ? 0 : 12,
                              transition: 'flex 0.35s ease',
                            }}
                          >
                            {isPill ? (
                              <div
                                className="flex flex-row items-center justify-center gap-2 px-3 py-2 rounded-xl border bg-slate-100 border-slate-200 select-none"
                                style={{ userSelect: 'none', whiteSpace: 'nowrap' }}
                              >
                                <span className="text-xs font-black uppercase tracking-wide text-slate-400">{col.label || col.prefix}</span>
                              </div>
                            ) : (
                              <>
                                <div
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${col.badge} sticky top-0 z-10 select-none`}
                                  style={{ userSelect: 'none' }}
                                >
                                  <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                                  <span className={`text-xs font-black uppercase tracking-widest ${col.color}`}>{col.label || col.prefix}</span>
                                  <span className={`ml-auto text-xs font-black leading-none ${col.color}`}>{colItems.length}</span>
                                </div>
                                <div className={`grid gap-3 ${gridColsClass}`}>
                                  {colGroups.map(({ priority, meta, items }) =>
                                    items.map(item => renderCard(item, meta))
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })();
              })()}
            </div>
            {/* OrderDetail / UbicationGrid as overlay modals */}
            {selectedRetiro && (
              ubicationMode ? <UbicationGrid /> : <OrderDetail />
            )}
          </>
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
                <div className="grid gap-4">
                  {estantesConfigArr.filter(est => filterEstante === 'ALL' || filterEstante === est.id).map(est => (
                    <div key={est.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-base italic shadow-md shadow-blue-200">{est.id}</div>
                        <span className="text-base font-black text-slate-800 uppercase italic tracking-tighter">Bloque {est.id}</span>
                      </div>

                      <div className="space-y-1.5">
                        {[...Array(est.secciones)].map((_, s) => (
                          <div key={s} className="flex gap-2 items-center">
                            <div className="w-10 h-10 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 shrink-0">
                              <span className="text-[9px] font-black text-slate-400 uppercase">Sec</span>
                              <span className="text-sm font-black text-blue-600">{s + 1}</span>
                            </div>
                            <div className="grid grid-cols-5 flex-1 gap-3">
                              {[...Array(est.posiciones)].map((_, p) => {
                                const id = `${est.id}-${s + 1}-${p + 1}`;
                                const dataList = ocupacionEstantes[id] || [];
                                const isOccupied = dataList.length > 0;
                                const firstData = dataList[0];

                                const term = searchTerm.toLowerCase();
                                const matchesSearch = isOccupied && dataList.some(item => {
                                  if (item.OrdenRetiro && item.OrdenRetiro.toLowerCase().includes(term)) return true;
                                  if (item.CodigoCliente && String(item.CodigoCliente).toLowerCase().includes(term)) return true;
                                  if (item.ClientName && item.ClientName.toLowerCase().includes(term)) return true;
                                  // Buscar por número de orden de depósito cruzando con apiOrders/otrosRetiros
                                  const retiroFull = apiOrders.find(o => o.ordenDeRetiro === item.OrdenRetiro)
                                    || otrosRetiros.find(o => o.ordenDeRetiro === item.OrdenRetiro);
                                  if (retiroFull && Array.isArray(retiroFull.orders)) {
                                    return retiroFull.orders.some(o =>
                                      o.orderNumber && o.orderNumber.toLowerCase().includes(term)
                                    );
                                  }
                                  return false;
                                });
                                const isMismatched = searchTerm && isOccupied && !matchesSearch;
                                const isMatched = searchTerm && isOccupied && matchesSearch;

                                // ─── Color por situación de pago ───────────────────────────────
                                // Cruza OrdenRetiro con los datos cargados para obtener estado real
                                const retiroInfo = firstData ? (
                                  apiOrders.find(o => o.ordenDeRetiro === firstData.OrdenRetiro)
                                  || otrosRetiros.find(o => o.ordenDeRetiro === firstData.OrdenRetiro)
                                ) : null;

                                const getSlotColors = () => {
                                  if (!isOccupied) return { bg: '', border: '' };
                                  if (isMatched) return { bg: 'bg-green-600', border: 'border-green-500', subText: 'text-green-100', hover: 'bg-green-900/85' };
                                  const pagado = retiroInfo?.pagorealizado === 1 || retiroInfo?.pagorealizado === true || firstData?.Pagado === true;
                                  const autorizado = retiroInfo?.estadoNumerico === 9 || retiroInfo?.OReEstadoActual === 9 || firstData?.Autorizado === true;
                                  const desc = (retiroInfo?.TClDescripcion || firstData?.TClDescripcion || '').toLowerCase();
                                  if (pagado || desc.includes('rollo')) return { bg: 'bg-emerald-600', border: 'border-emerald-700', subText: 'text-emerald-200', hover: 'bg-emerald-900/85' };
                                  if (autorizado) return { bg: 'bg-amber-500', border: 'border-amber-600', subText: 'text-amber-100', hover: 'bg-amber-900/85' };
                                  if (desc.includes('semanal')) return { bg: 'bg-indigo-600', border: 'border-indigo-700', subText: 'text-indigo-200', hover: 'bg-indigo-900/85' };
                                  // Pendiente de pago → rojo
                                  return { bg: 'bg-rose-600', border: 'border-rose-700', subText: 'text-rose-200', hover: 'bg-rose-900/85' };
                                };
                                const slotColors = getSlotColors();

                                // Detectar si alguna orden en este casillero fue anunciada desde el tótem
                                const isSlotAnnounced = isOccupied && dataList.some(d => {
                                  const m = (d.OrdenRetiro || '').match(/(\d+)$/);
                                  return m ? announcedOrders.has(parseInt(m[1], 10)) : false;
                                });

                                return (
                                  <motion.div
                                    id={`box-${id}`}
                                    key={`${p}-${dataList.map(d => d.OrdenRetiro).join(',')}`}
                                    initial={isOccupied ? { opacity: 0, scale: 0.85 } : false}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.08 }}
                                    transition={{ duration: 0.2 }}
                                    draggable={isOccupied}
                                    onDragStart={isOccupied ? (e) => {
                                      setIsDragging(true);
                                      setDragItem({ ...dataList[0], ubicacionId: id });
                                      e.dataTransfer.effectAllowed = 'move';
                                    } : undefined}
                                    onDragEnd={() => { setIsDragging(false); setDragOverSlot(null); }}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverSlot(id); }}
                                    onDragLeave={(e) => { e.preventDefault(); setDragOverSlot(prev => prev === id ? null : prev); }}
                                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(id); setDragOverSlot(null); }}
                                    className={`h-14 rounded-xl border-2 transition-colors flex flex-col items-center justify-center gap-0.5 relative group overflow-hidden cursor-pointer
                                        ${isOccupied
                                        ? `${slotColors.bg} ${slotColors.border} shadow-sm`
                                        : 'bg-white border-dashed border-slate-200'}
                                        ${isMismatched ? 'opacity-20 grayscale' : ''}
                                        ${isMatched ? 'ring-4 ring-green-400 scale-[1.02]' : ''}
                                        ${dragOverSlot === id && !isOccupied ? 'border-blue-400 bg-blue-50 scale-105' : ''}
                                        ${dragOverSlot === id && isOccupied ? 'ring-2 ring-blue-400' : ''}
                                        ${isSlotAnnounced ? 'ring-4 ring-pink-400 animate-pulse shadow-lg shadow-pink-200' : ''}
                                      `}
                                    onDoubleClick={() => { if (isOccupied) directEntregar(id, dataList); }}
                                  >
                                    {isOccupied ? (
                                      <>
                                        <span className={`text-[7px] font-bold absolute top-0.5 left-1 select-none pointer-events-none ${isMatched ? 'text-green-100' : (slotColors.subText || 'text-indigo-300')}`}>{id}</span>

                                        {dataList.length > 1 && (
                                          <div className="absolute top-0.5 right-1 bg-rose-500 text-white text-[7px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center z-20 pointer-events-none">
                                            {dataList.length}
                                          </div>
                                        )}

                                        {isSlotAnnounced && (
                                          <div className="absolute -top-1 -left-1 bg-pink-500 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center z-30 pointer-events-none shadow-md">
                                            <BellRing size={10} />
                                          </div>
                                        )}

                                        {/* X button to return/unassign — visible on hover */}
                                        <button draggable={false}
                                          onClick={(e) => { e.stopPropagation(); handleDesasignar(dataList[0]?.OrdenRetiro, id); }}
                                          className={`absolute top-0 right-0 w-6 h-6 flex items-center justify-center text-zinc-100 hover:scale-125 z-30 opacity-0 group-hover:opacity-100 transition-all ${isDragging ? 'pointer-events-none' : ''}`}
                                        ><X size={14} strokeWidth={2.5} /></button>


                                        <div className="flex flex-col items-center justify-center gap-0 w-full overflow-hidden px-1 select-none pointer-events-none flex-1">
                                          {dataList.slice(0, 2).map((data, idx) => {
                                            const subLabel = dataList.length === 1 && Array.isArray(data.orders) && data.orders.length === 1
                                              ? data.orders[0].orderNumber : null;
                                            return (
                                              <React.Fragment key={idx}>
                                                <span className="text-[11px] font-black text-white truncate leading-tight text-center w-full">
                                                  {data.PagoHandy ? data.OrdenRetiro.replace('R-', 'PW-') : data.OrdenRetiro}
                                                </span>
                                                {subLabel && (
                                                  <span className={`text-[11px] font-black truncate leading-tight text-center w-full ${slotColors.subText || 'text-indigo-200'}`}>{subLabel}</span>
                                                )}
                                              </React.Fragment>
                                            );
                                          })}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-[9px] font-black text-slate-300">P{p + 1}</span>
                                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                                      </>
                                    )}
                                  </motion.div>
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
                    <AnimatePresence>
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
                            <motion.div
                              key={o.ordenDeRetiro}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.85, y: 10 }}
                              transition={{ duration: 0.25 }}
                              className="relative bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2 overflow-hidden"
                            >
                              <div className={`absolute top-0 left-0 right-0 h-1 ${dotColor} rounded-t-2xl`} />
                              <div className="font-black text-slate-800 text-sm tracking-tight mt-1">{o.ordenDeRetiro}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase truncate">{o.CliCodigoCliente || o.CliNombre}</div>
                              <div className={`text-xs font-black ${pagado ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {pagado ? 'Pagado ✓' : 'Pend. Pago'}
                              </div>
                              <div className="flex items-center justify-between mt-auto">
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-700"><Clock size={9} /> {timeStr}</span>
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400"><Package size={9} /> {(o.orders || []).length}</span>
                              </div>
                              <button
                                onClick={() => triggerEntregar('FUERA DE ESTANTE', o)}
                                className="mt-1 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-xl transition-colors"
                              >
                                Entregar
                              </button>
                            </motion.div>
                          );
                        })}
                    </AnimatePresence>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setConfirmDelivery(null)}>
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Confirmar Entrega</h3>
              <p className="text-slate-500 mb-4 font-medium">
                {confirmDelivery.id === 'FUERA DE ESTANTE'
                  ? <>Orden de retiro: <strong className="text-blue-600">{confirmDelivery.dataList[0]?.ordenDeRetiro || confirmDelivery.dataList[0]?.OrdenRetiro}</strong><span className="ml-2 text-slate-400">· {confirmDelivery.dataList[0]?.CliNombre || confirmDelivery.dataList[0]?.idcliente || confirmDelivery.dataList[0]?.CodigoCliente || ''}</span></>
                  : <>Ubicación a entregar: <strong className="text-blue-600">{confirmDelivery.id}</strong></>}
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
                const rawCode = deliveryBarcodeInput.trim().toUpperCase();
                if (!rawCode) return;
                const code = rawCode.replace(/^([A-Z]+)(\d+)$/, '$1-$2');
                try {
                  let bultosFlat = [];
                  confirmDelivery.dataList.forEach(obj => {
                    const ordStr = obj.OrdenRetiro || obj.ordenDeRetiro;
                    if (!deliverySelectedOrders[ordStr]) return;
                    if (obj.BultosJSON) { bultosFlat.push(...JSON.parse(obj.BultosJSON)); }
                    else if (obj.orders) { bultosFlat.push(...obj.orders); }
                  });

                  const possibleMatches = bultosFlat.filter(o => {
                    const oNum = (o.orderNumber || '').toUpperCase();
                    const oId = (o.id || '').toString().toUpperCase();
                    return oNum === code || oId === code || (code.match(/^\d+$/) && oNum.endsWith(`-${code}`));
                  });
                  const found = possibleMatches.length === 1 ? possibleMatches[0] : null;

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
                  onChange={(e) => {
                    const val = e.target.value;
                    setDeliveryBarcodeInput(val);
                    const rawCode = val.trim().toUpperCase();
                    const code = rawCode.replace(/^([A-Z]+)(\d+)$/, '$1-$2');
                    if (code && confirmDelivery?.dataList) {
                      try {
                        let bultosFlat = [];
                        confirmDelivery.dataList.forEach(obj => {
                          const ordStr = obj.OrdenRetiro || obj.ordenDeRetiro;
                          if (!deliverySelectedOrders[ordStr]) return;
                          if (obj.BultosJSON) { bultosFlat.push(...JSON.parse(obj.BultosJSON)); }
                          else if (obj.orders) { bultosFlat.push(...obj.orders); }
                        });
                        const possibleMatches = bultosFlat.filter(o => {
                          const oNum = (o.orderNumber || '').toUpperCase();
                          const oId = (o.id || '').toString().toUpperCase();
                          return oNum === code || oId === code || (code.match(/^\d+$/) && oNum.endsWith(`-${code}`));
                        });
                        const found = possibleMatches.length === 1 ? possibleMatches[0] : null;

                        if (found) {
                          setDeliveryScannedBultos(prev => ({ ...prev, [found.orderNumber || found.id]: true }));
                          setTimeout(() => setDeliveryBarcodeInput(''), 0);
                        }
                      } catch (err) {}
                    }
                  }}
                  className="block w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white font-medium transition-all text-slate-700"
                  placeholder="Escanee el bulto aquí (opción automatch)..."
                  ref={deliveryInputRef}
                  autoComplete="off"
                  spellCheck={false}
                />
              </form>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 max-h-48 overflow-y-auto">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Checklist Bultos a Entregar</p>
                <ul className="space-y-3 p-1">
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
                          <motion.li
                            key={i}
                            animate={duplicateDeliveryWarn === identifier ? { rotate: [0, -3, 3, -3, 3, 0] } : { rotate: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => {
                              if (isScanned) {
                                setDeliveryScannedBultos(prev => ({ ...prev, [identifier]: false }));
                              }
                            }}
                            className={`flex items-center gap-3 text-sm font-bold transition-colors p-3 rounded-xl border-2 shadow-sm ${isScanned ? 'bg-green-100 border-green-400 text-green-800 cursor-pointer hover:opacity-80' : 'bg-white border-slate-200 text-slate-700'}`}
                          >
                            <div className="p-1.5">
                              <Package size={16} className={isScanned ? 'text-green-700' : 'text-blue-500'} />
                            </div>
                            <span className="flex-1 min-w-0 truncate">{identifier}</span>
                            <span className="text-[11px] font-normal opacity-60 ml-auto mr-2 truncate max-w-[120px]">{b.ordNombreTrabajo || ''}</span>
                          </motion.li>
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

      {/* Modal excepción eliminado — las órdenes sin pago deben ser autorizadas desde Caja (estado 9) */}
    </div >
  );
};

export default WebRetirosPage;

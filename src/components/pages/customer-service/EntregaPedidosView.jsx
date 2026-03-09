import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import { Package, Truck, Search, QrCode, FileText, CheckCircle, RefreshCcw, DollarSign, ChevronDown, ChevronRight, Printer } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import AlertaAutorizacionModal from '../../modals/AlertaAutorizacionModal';

// ─── TICKET: Comprobante de Retiro (igual a WebRetirosPage) ───
const printTicketEncomienda = (enc) => {
    const now = new Date().toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const pagado = enc.pagorealizado === 1;
    const orderObjs = enc.orders || [];
    const tipoDesc = enc.TClDescripcion || 'Común';
    const local = enc.lugarRetiro && enc.lugarRetiro !== 'Desconocido' ? enc.lugarRetiro : 'Retiro';
    const monto = enc.totalCost && enc.totalCost !== '0.00' ? enc.totalCost : null;
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Comprobante ${enc.ordenDeRetiro}</title>
  <style>
    @page{size:A5;margin:12mm 10mm;}*{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:#111;background:#fff;}
    .header{text-align:center;border-bottom:2px solid #222;padding-bottom:8px;margin-bottom:12px;}
    .header .empresa{font-size:20px;font-weight:900;letter-spacing:2px;text-transform:uppercase;}
    .header .modulo{font-size:12px;color:#555;margin-top:2px;}
    .codigo-principal{text-align:center;font-size:28px;font-weight:900;letter-spacing:2px;margin:10px 0 8px;padding:6px 0;border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;}
    .estado-badge{display:inline-block;padding:4px 12px;border:2px solid ${pagado ? '#16a34a' : '#dc2626'};color:${pagado ? '#16a34a' : '#dc2626'};font-weight:900;font-size:13px;border-radius:4px;text-transform:uppercase;letter-spacing:1px;}
    .info-table{width:100%;border-collapse:collapse;margin:10px 0;}
    .info-table td{padding:5px 2px;border-bottom:1px solid #eee;vertical-align:top;}
    .info-table td:first-child{color:#555;font-size:11px;text-transform:uppercase;letter-spacing:.5px;width:32%;white-space:nowrap;}
    .info-table td:last-child{font-weight:700;text-align:right;font-size:13px;}
    .orders-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px;}
    .orders-table thead tr{background:#f3f4f6;}
    .orders-table th{padding:6px 6px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#444;border-bottom:1px solid #ddd;}
    .orders-table td{padding:6px 6px;border-bottom:1px solid #eee;font-weight:600;}
    .sep{border-top:1px dashed #bbb;margin:10px 0;}
    .firma-row{display:flex;justify-content:space-between;margin-top:28px;}
    .firma-box{width:44%;border-top:1px solid #333;padding-top:4px;text-align:center;font-size:11px;color:#555;}
    .footer{margin-top:14px;font-size:11px;text-align:center;color:#aaa;border-top:1px solid #eee;padding-top:6px;}
  </style></head><body>
  <div class="header">
    <div class="empresa">USER</div>
    <div class="modulo">Logística — Comprobante de Retiro</div>
    <div style="font-size:9px;color:#888;margin-top:1px;font-style:italic;">Local: ${local}</div>
  </div>
  <div class="codigo-principal">${enc.ordenDeRetiro}</div>
  <div style="text-align:center;margin-bottom:8px;">
    <span class="estado-badge">${pagado ? '\u2713 PAGADO' : 'PENDIENTE DE PAGO'}</span>
  </div>
  <table class="info-table">
    <tr><td>Cliente</td><td><strong>${enc.CliNombre || enc.CliCodigoCliente || '-'}</strong></td></tr>
    ${enc.CliCodigoCliente ? `<tr><td>Cód.Cliente</td><td>${enc.CliCodigoCliente}</td></tr>` : ''}
    ${enc.CliTelefono ? `<tr><td>Teléfono</td><td>${enc.CliTelefono}</td></tr>` : ''}
    <tr><td>Tipo Cliente</td><td>${tipoDesc}</td></tr>
    ${monto ? `<tr><td>Monto</td><td>${monto}</td></tr>` : ''}
    ${enc.metodoPago ? `<tr><td>Forma Pago</td><td>${enc.metodoPago}</td></tr>` : ''}
    <tr><td>Local Retiro</td><td>${local}</td></tr>
    <tr><td>Fecha Alta</td><td>${enc.fechaAlta ? new Date(enc.fechaAlta).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td></tr>
    ${(enc.direccionEnvio || enc.departamentoEnvio || enc.localidadEnvio || enc.agenciaNombre) ? `
    <tr><td colspan="2" style="padding-top:6px;font-size:9px;color:#666;text-transform:uppercase;font-weight:700;">Datos de Envío</td></tr>
    ${enc.direccionEnvio ? `<tr><td>Dirección</td><td>${enc.direccionEnvio}</td></tr>` : ''}
    ${enc.departamentoEnvio ? `<tr><td>Departamento</td><td>${enc.departamentoEnvio}</td></tr>` : ''}
    ${enc.localidadEnvio ? `<tr><td>Localidad</td><td>${enc.localidadEnvio}</td></tr>` : ''}
    ${enc.agenciaNombre ? `<tr><td>Agencia</td><td><strong>${enc.agenciaNombre}</strong></td></tr>` : ''}
    `: ''}
  </table>
  <div class="sep"></div>
  <div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">\u00d3rdenes incluidas (${orderObjs.length})</div>
  <table class="orders-table">
    <thead><tr><th>#</th><th>Código</th><th>Estado</th><th style="text-align:right;">Importe</th></tr></thead>
    <tbody>
      ${orderObjs.map((o, i) => `<tr><td>${i + 1}</td><td><strong>${o.orderNumber || '-'}</strong></td><td>${o.orderEstado || '-'}</td><td style="text-align:right;">${o.orderCosto || '-'}</td></tr>`).join('')}
      ${orderObjs.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#aaa;">Sin \u00f3rdenes registradas</td></tr>' : ''}
    </tbody>
  </table>
  <div class="sep"></div>
  <table style="width:100%;font-size:9px;color:#666;"><tr><td>Impreso:</td><td style="text-align:right;">${now}</td></tr></table>
  <div style="text-align:center;margin:8px 0 14px;">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(enc.ordenDeRetiro)}&color=000000&bgcolor=ffffff&margin=2" alt="QR" style="width:90px;height:90px;border:1px solid #eee;"/>
    <div style="font-size:9px;color:#999;margin-top:2px;letter-spacing:1px;">${enc.ordenDeRetiro}</div>
  </div>
  <div class="firma-row">
    <div class="firma-box">Firma y Aclaración Cliente</div>
    <div class="firma-box">Firma Responsable Logística</div>
  </div>
   <div class="footer">USER \u2014 Conserve este comprobante.</div>
  <div style="text-align:center;margin-top:16px;"><button onclick="window.print()" style="background:#0070bc;color:#fff;border:none;padding:8px 28px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.5px;">&#128438; Imprimir</button></div>
  </body></html>`;
    const win = window.open('', '_blank', 'width=620,height=800');
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 600); }
};

const EntregaPedidosView = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('encomiendas'); // Arrancamos en encomiendas por pedido del user 
    const [loading, setLoading] = useState(false);

    // --- TAB: MOSTRADOR (Gestión por Cliente / Pedido) ---
    const [searchTerm, setSearchTerm] = useState('');
    const [clientData, setClientData] = useState(null);

    // --- TAB: ENCOMIENDAS (DESPACHOS) ---
    const [lugaresRetiro, setLugaresRetiro] = useState([]);
    const [filtroLugar, setFiltroLugar] = useState(''); // '' = Todas
    const [filtroPagoEncomiendas, setFiltroPagoEncomiendas] = useState('todas'); // todas, pagas, nopagas

    const [encomiendas, setEncomiendas] = useState([]);
    const [selectedEncomiendas, setSelectedEncomiendas] = useState(new Set());
    const [showAlertaAuth, setShowAlertaAuth] = useState(false); // Modal autorización custom
    const [pendingDelivery, setPendingDelivery] = useState(null); // Payload pendiente hasta autorizar

    // UI State para expandir filas (ver las ordenes hijas)
    const [expandedRows, setExpandedRows] = useState(new Set());

    // --- INICIALIZACIÓN ---
    useEffect(() => {
        loadLugaresRetiro();
    }, []);

    useEffect(() => {
        if (activeTab === 'encomiendas') {
            loadDespachos();
        }
    }, [activeTab]); // Solo recarga al cambiar de tab, NO al cambiar filtros (usa botón Buscar)

    // Cargar Catálogo de Lugares
    const loadLugaresRetiro = async () => {
        try {
            const response = await api.get('/apilugaresRetiro/lugares-retiro');
            setLugaresRetiro(response.data);
            // Si la data viene vacía, no pisamos el filtro por ahora
        } catch (error) {
            console.error("Error cargando lugares:", error);
            toast.error("Error al cargar los Lugares de Retiro");
        }
    };

    // Cargar las "Encomiendas" desde el Endpoint de Backend
    // Recibe los filtros como parámetros para evitar capturar valores desactualizados del closure
    const loadDespachos = async (lugar = filtroLugar, filtroPago = filtroPagoEncomiendas) => {
        setLoading(true);
        try {
            const pagas = filtroPago === 'pagas' ? 'true' : '';
            const nopagas = filtroPago === 'nopagas' ? 'true' : '';

            let url;
            if (!lugar || lugar === 'todas') {
                url = `/apiordenesRetiro/estados?estados=1,2,3,4,7,8${pagas ? '&pagas=true' : ''}${nopagas ? '&no_pagas=true' : ''}`;
            } else {
                url = `/apiordenesRetiro/lugar/${lugar}?pagas=${pagas}&no_pagas=${nopagas}`;
            }
            const response = await api.get(url);
            setEncomiendas(response.data);
            setSelectedEncomiendas(new Set());
        } catch (error) {
            console.error("Error cargando despachos:", error);
            toast.error("Error al cargar las Órdenes de Retiro");
        } finally {
            setLoading(false);
        }
    };

    // --- ACCIONES TAB ENCOMIENDAS ---
    const toggleRow = (ordenRetiro) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(ordenRetiro)) {
            newSet.delete(ordenRetiro);
        } else {
            newSet.add(ordenRetiro);
        }
        setExpandedRows(newSet);
    };

    const toggleCheckEncomienda = (ordenRetiro) => {
        const newSet = new Set(selectedEncomiendas);
        if (newSet.has(ordenRetiro)) {
            newSet.delete(ordenRetiro);
        } else {
            newSet.add(ordenRetiro);
        }
        setSelectedEncomiendas(newSet);
    };

    const toggleAllEncomiendas = () => {
        if (selectedEncomiendas.size === encomiendas.length && encomiendas.length > 0) {
            setSelectedEncomiendas(new Set());
        } else {
            setSelectedEncomiendas(new Set(encomiendas.map(e => e.ordenDeRetiro)));
        }
    };

    const printResumenSeleccionados = () => {
        const sel = encomiendas.filter(e => selectedEncomiendas.has(e.ordenDeRetiro));
        if (sel.length === 0) return toast.warning('Seleccioná al menos una orden.');
        const fecha = new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo' });
        // Agrupar por agencia (agenciaNombre o 'Sin Agencia / Retiro Local')
        const grupos = {};
        sel.forEach(enc => {
            const agKey = enc.agenciaNombre || enc.lugarRetiro || 'Sin Agencia / Retiro Local';
            if (!grupos[agKey]) grupos[agKey] = [];
            grupos[agKey].push(enc);
        });

        const renderFila = (enc) => {
            const ordenesList = (enc.orders || []).map((o, i) =>
                `<tr>
                    <td style="padding:5px 8px;font-size:12px;">${i + 1}</td>
                    <td style="padding:5px 8px;font-size:12px;font-weight:700;">${o.orderNumber || '-'}</td>
                    <td style="padding:5px 8px;font-size:12px;color:#475569;">${o.orderEstado || '-'}</td>
                    <td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:700;color:#0070bc;">${o.orderCosto || '-'}</td>
                </tr>`).join('');
            const ordTable = enc.orders?.length > 0
                ? `<table style="width:100%;border-collapse:collapse;margin-top:6px;">
                    <thead><tr style="background:#f8fafc;">
                        <th style="padding:5px 8px;font-size:11px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">#</th>
                        <th style="padding:5px 8px;font-size:11px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">Cód. Orden</th>
                        <th style="padding:5px 8px;font-size:11px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">Estado</th>
                        <th style="padding:5px 8px;font-size:11px;text-align:right;color:#64748b;border-bottom:1px solid #e2e8f0;">Importe</th>
                    </tr></thead><tbody>${ordenesList}</tbody>
                </table>`
                : '<span style="font-size:12px;color:#aaa;">Sin órdenes registradas</span>';

            return `<tr style="border-bottom:1px solid #e2e8f0;vertical-align:top;">
                <td style="padding:10px 8px;font-size:13px;font-weight:900;color:#1e293b;white-space:nowrap;">${enc.ordenDeRetiro}</td>
                <td style="padding:10px 8px;">
                    <div style="font-size:13px;font-weight:700;">${enc.CliNombre || '-'}</div>
                    <div style="font-size:11px;color:#64748b;">${enc.CliCodigoCliente || ''} &bull; ${enc.TClDescripcion || ''}</div>
                    ${enc.CliTelefono ? `<div style="font-size:11px;color:#64748b;">&#128222; ${enc.CliTelefono}</div>` : ''}
                </td>
                <td style="padding:10px 8px;">
                    ${enc.departamentoEnvio ? `<div style="font-size:12px;"><strong>Dpto:</strong> ${enc.departamentoEnvio}</div>` : ''}
                    ${enc.localidadEnvio ? `<div style="font-size:12px;"><strong>Localidad:</strong> ${enc.localidadEnvio}</div>` : ''}
                    ${enc.direccionEnvio ? `<div style="font-size:12px;"><strong>Dir:</strong> ${enc.direccionEnvio}</div>` : ''}
                    ${(!enc.departamentoEnvio && !enc.localidadEnvio && !enc.direccionEnvio) ? `<span style="color:#aaa;font-size:11px;">—</span>` : ''}
                </td>
                <td style="padding:10px 8px;">${ordTable}</td>
                <td style="padding:10px 8px;text-align:center;">
                    <span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;
                        border:1.5px solid ${enc.pagorealizado === 1 ? '#16a34a' : '#dc2626'};
                        color:${enc.pagorealizado === 1 ? '#16a34a' : '#dc2626'};">
                        ${enc.pagorealizado === 1 ? 'PAGADO' : 'PENDIENTE'}
                    </span>
                </td>
            </tr>`;
        };

        const seccionesHtml = Object.entries(grupos).map(([agencia, ordenes]) => `
            <div style="margin-bottom:24px;page-break-inside:avoid;">
                <div style="background:#0070bc;color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-size:13px;font-weight:900;letter-spacing:.5px;">
                    &#128666; ${agencia} &nbsp;<span style="font-size:11px;font-weight:400;opacity:.85;">(${ordenes.length} retiro${ordenes.length > 1 ? 's' : ''})</span>
                </div>
                <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
                    <thead><tr style="background:#f1f5f9;">
                        <th style="padding:7px 8px;font-size:11px;text-align:left;color:#334155;border-bottom:2px solid #e2e8f0;">Retiro</th>
                        <th style="padding:7px 8px;font-size:11px;text-align:left;color:#334155;border-bottom:2px solid #e2e8f0;">Cliente</th>
                        <th style="padding:7px 8px;font-size:11px;text-align:left;color:#334155;border-bottom:2px solid #e2e8f0;">Destino</th>
                        <th style="padding:7px 8px;font-size:11px;text-align:left;color:#334155;border-bottom:2px solid #e2e8f0;">Órdenes</th>
                        <th style="padding:7px 8px;font-size:11px;text-align:center;color:#334155;border-bottom:2px solid #e2e8f0;">Pago</th>
                    </tr></thead>
                    <tbody>${ordenes.map(renderFila).join('')}</tbody>
                </table>
            </div>`).join('');

        const firmasHtml = `
            <div style="margin-top:40px;page-break-inside:avoid;">
                <div style="display:flex;justify-content:space-around;gap:24px;">
                    <div style="flex:1;text-align:center;">
                        <div style="border-top:1.5px solid #334155;padding-top:8px;margin-top:50px;">
                            <div style="font-size:13px;font-weight:700;">Firma Entrega</div>
                            <div style="font-size:11px;color:#64748b;margin-top:2px;">Responsable despacho</div>
                        </div>
                    </div>
                    <div style="flex:1;text-align:center;">
                        <div style="border-top:1.5px solid #334155;padding-top:8px;margin-top:50px;">
                            <div style="font-size:13px;font-weight:700;">Firma Recibe</div>
                            <div style="font-size:11px;color:#64748b;margin-top:2px;">Transportista / Agencia</div>
                        </div>
                    </div>
                    <div style="flex:1;text-align:center;">
                        <div style="border-top:1.5px solid #334155;padding-top:8px;margin-top:50px;">
                            <div style="font-size:13px;font-weight:700;">Confirma Comprobante</div>
                            <div style="font-size:11px;color:#64748b;margin-top:2px;">Aclaración y sello</div>
                        </div>
                    </div>
                </div>
            </div>`;

        const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
        <title>Reporte Despacho &mdash; USER</title>
        <style>
            *{box-sizing:border-box;margin:0;padding:0;}
            body{font-family:'Segoe UI',Calibri,sans-serif;padding:28px 32px;color:#1e293b;font-size:13px;}
            @media print{body{padding:14px 16px;} button{display:none!important;}}
        </style></head><body>
        <div style="border-bottom:3px solid #0070bc;padding-bottom:14px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-end;">
            <div>
                <div style="font-size:24px;font-weight:900;color:#0070bc;letter-spacing:1px;">USER</div>
                <div style="font-size:15px;font-weight:700;color:#475569;">Logística &mdash; Hoja de Despacho</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:12px;color:#94a3b8;">${fecha}</div>
                <div style="font-size:12px;color:#94a3b8;"><strong style="color:#1e293b;">${sel.length}</strong> retiros &bull; <strong style="color:#1e293b;">${Object.keys(grupos).length}</strong> agencia(s)</div>
            </div>
        </div>
        ${seccionesHtml}
        ${firmasHtml}
        <div style="margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
            USER &mdash; Sistema de Gestión Logística &mdash; Documento interno
        </div>
        <div style="text-align:center;margin-top:16px;">
            <button onclick="window.print()" style="background:#0070bc;color:#fff;border:none;padding:9px 30px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">&#128438; Imprimir Reporte</button>
        </div>
        </body></html>`;
        const win = window.open('', '_blank', 'width=1050,height=950');
        if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 700); }
    };

    const marcarEntregadas = async () => {
        if (selectedEncomiendas.size === 0) {
            return toast.warning('Selecciona al menos una orden para entregar.');
        }

        // ¿Requiere autorización?
        const requiereAuth = Array.from(selectedEncomiendas).some(ordenCodigo => {
            const orden = encomiendas.find(e => e.ordenDeRetiro === ordenCodigo);
            if (!orden) return false;
            const esNoPaga = orden.pagorealizado === 0;
            const requierePass = (orden.TClIdTipoCliente !== 2 && orden.TClIdTipoCliente !== 3);
            return esNoPaga && requierePass;
        });

        if (requiereAuth) {
            // Guardar el payload pendiente y mostrar el modal custom
            setPendingDelivery({ ordenesParaEntregar: Array.from(selectedEncomiendas) });
            setShowAlertaAuth(true);
            return;
        }

        // Sin autorización requerida → entregar directo
        await ejecutarEntrega(Array.from(selectedEncomiendas), null, null);
    };

    const ejecutarEntrega = async (ordenes, password, observacion) => {
        setLoading(true);
        try {
            const payload = { ordenesParaEntregar: ordenes, password, observacion };
            const response = await api.post('/apiordenesRetiro/despachos/entregar-autorizado', payload);
            toast.success(response.data.message || 'Órdenes entregadas correctamente.');
            loadDespachos();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Error al procesar la entrega.';
            Swal.fire('Error', errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };


    // --- ACCIONES TAB MOSTRADOR ---
    const [mostradorData, setMostradorData] = useState(null);
    const [mostradorLoading, setMostradorLoading] = useState(false);
    const [pagoModal, setPagoModal] = useState(null);   // { ordenes, retiroId, clienteInfo }
    const [metodosPago, setMetodosPago] = useState([]);
    const [pagandoLoading, setPagandoLoading] = useState(false);

    // Igual que Caja
    const [formaPago, setFormaPago] = useState('');
    const [monedaPago, setMonedaPago] = useState('UYU');
    const [montoPago, setMontoPago] = useState('');
    const [cotizacion, setCotizacion] = useState(null);
    const [fileComprobante, setFileComprobante] = useState(null);

    // Carga métodos + cotización al montar (igual que Caja)
    useEffect(() => {
        const cargarDatosPago = async () => {
            try {
                const [resMetodos, resCotiz] = await Promise.allSettled([
                    api.get('/apipagos/metodos'),
                    api.get('/apicotizaciones/hoy')
                ]);
                if (resMetodos.status === 'fulfilled')
                    setMetodosPago(Array.isArray(resMetodos.value.data) ? resMetodos.value.data : []);
                if (resCotiz.status === 'fulfilled' && resCotiz.value.data?.cotizaciones?.length > 0)
                    setCotizacion(resCotiz.value.data.cotizaciones[0].CotDolar);
            } catch (e) { console.error('Error cargando datos de pago:', e); }
        };
        cargarDatosPago();
    }, []);

    // Conversión de moneda igual que Caja
    const handleCambioMoneda = (nuevaMoneda) => {
        let payment = parseFloat(montoPago);
        if (isNaN(payment) || payment <= 0) { setMonedaPago(nuevaMoneda); return; }
        if (monedaPago === 'USD' && nuevaMoneda === 'UYU' && cotizacion) payment = payment * cotizacion;
        else if (monedaPago === 'UYU' && nuevaMoneda === 'USD' && cotizacion) payment = payment / cotizacion;
        setMonedaPago(nuevaMoneda);
        setMontoPago(payment.toFixed(2));
    };

    const buscarMostrador = async () => {
        if (!searchTerm.trim()) return toast.warning('Ingresá un criterio de búsqueda.');
        setMostradorLoading(true);
        setMostradorData(null);
        try {
            const res = await api.get(`/apiordenesRetiro/mostrador/buscar?q=${encodeURIComponent(searchTerm.trim())}`);
            const { retiroRows, sinRetiro } = res.data;
            const retiroMap = {};
            for (const row of retiroRows) {
                const key = row.OReIdOrdenRetiro;
                if (!retiroMap[key]) {
                    retiroMap[key] = {
                        OReIdOrdenRetiro: key,
                        etiqueta: `R-${String(key).padStart(4, '0')}`,
                        estadoRetiro: row.estadoRetiro,
                        lugarRetiro: row.lugarRetiro,
                        CliNombre: row.CliNombre,
                        CliCodigo: row.CliCodigo,
                        CliTelefono: row.CliTelefono,
                        TClDescripcion: row.TClDescripcion,
                        ordenes: []
                    };
                }
                if (row.OrdIdOrden) {
                    retiroMap[key].ordenes.push({
                        OrdIdOrden: row.OrdIdOrden,
                        codigo: row.OrdCodigoOrden,
                        costo: row.OrdCostoFinal,
                        estado: row.estadoOrden,
                        simbolo: row.MonSimbolo,
                    });
                }
            }
            setMostradorData({ retiros: Object.values(retiroMap), sinRetiro });
            if (Object.values(retiroMap).length === 0 && sinRetiro.length === 0)
                toast.info('No se encontraron órdenes sin pagar para ese criterio.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error en la búsqueda.');
        } finally {
            setMostradorLoading(false);
        }
    };

    const abrirModalPago = (ordenes, retiroId, clienteInfo) => {
        // Calcular total en UYU por defecto (igual que Caja)
        const total = ordenes.reduce((a, o) => {
            const val = parseFloat(o.costo || o.OrdCostoFinal || 0);
            const esUSD = (o.simbolo || '').toUpperCase().includes('USD');
            return a + (esUSD && cotizacion ? val * cotizacion : val);
        }, 0);
        setFormaPago('');
        setMonedaPago('UYU');
        setMontoPago(total.toFixed(2));
        setFileComprobante(null);
        setPagoModal({ ordenes, retiroId, clienteInfo });
    };

    const confirmarPago = async () => {
        if (!formaPago) return toast.warning('Seleccioná un método de pago.');
        const importe = parseFloat(montoPago);
        if (isNaN(importe) || importe <= 0) return toast.warning('Ingresá un monto válido.');
        setPagandoLoading(true);
        try {
            const monedaId = monedaPago === 'USD' ? 2 : 1;
            let comprobanteUrl = null;

            if (fileComprobante) {
                const formData = new FormData();
                formData.append('comprobante', fileComprobante);
                try {
                    const up = await api.post('/apipagos/uploadComprobante', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                    comprobanteUrl = up.data?.filename || up.data?.comprobanteUrl || null;
                } catch (e) { console.warn('Comprobante no subió:', e); }
            }

            const orderIds = pagoModal.ordenes.map(o => o.OrdIdOrden);
            await api.post('/apipagos/realizarPago', {
                metodoPagoId: parseInt(formaPago),
                monedaId,
                monto: importe,
                ordenRetiro: pagoModal.retiroId || null,
                orderNumbers: orderIds,
                comprobanteUrl
            });
            toast.success('✅ Pago registrado correctamente');
            setPagoModal(null);
            buscarMostrador();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al registrar el pago.');
        } finally {
            setPagandoLoading(false);
        }
    };


    return (
        <div className="p-4 lg:p-8 w-full max-w-[1400px] mx-auto min-h-[85vh] flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <Package className="text-blue-600" size={32} />
                        Entrega de Pedidos & Logística
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Gestión integral de despachos, retiros y cobranza remota.</p>
                </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('encomiendas')}
                    className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'encomiendas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Package size={18} /> Logística y Despachos
                </button>
                <button
                    onClick={() => setActiveTab('mostrador')}
                    className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'mostrador' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Truck size={18} /> Mostrador & Facturación Remota
                </button>
            </div>

            {/* TAB: ENCOMIENDAS (DESPACHOS) */}
            {activeTab === 'encomiendas' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                        <h2 className="text-xl font-black text-slate-800">Órdenes a Despachar / Entregar</h2>

                        {/* Filtros Especiales */}
                        <div className="flex flex-wrap gap-4 items-center w-full xl:w-auto">
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Lugar de Retiro:</span>
                                <select
                                    className="bg-transparent font-bold text-slate-800 text-sm outline-none cursor-pointer"
                                    value={filtroLugar}
                                    onChange={(e) => setFiltroLugar(e.target.value)}
                                >
                                    <option value="">— Todas —</option>
                                    {lugaresRetiro.map(lr => (
                                        <option key={lr.LReIdLugarRetiro} value={lr.LReIdLugarRetiro}>{lr.LReNombreLugar}</option>
                                    ))}
                                    {lugaresRetiro.length === 0 && <option value="" disabled>Cargando...</option>}
                                </select>
                            </div>

                            <select
                                value={filtroPagoEncomiendas}
                                onChange={(e) => setFiltroPagoEncomiendas(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="todas">⭐ Mostrar Todas</option>
                                <option value="pagas">💰 Sólo Pagas</option>
                                <option value="nopagas">❗️ No Pagas</option>
                            </select>

                            <button
                                onClick={() => loadDespachos(filtroLugar, filtroPagoEncomiendas)}
                                disabled={loading}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
                            >
                                <Search size={15} />
                                {loading ? 'Buscando...' : 'Buscar'}
                            </button>

                            <button onClick={() => loadDespachos(filtroLugar, filtroPagoEncomiendas)} disabled={loading} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Recargar">
                                <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>

                            <div className="flex-1"></div>

                            <button
                                onClick={printResumenSeleccionados}
                                disabled={selectedEncomiendas.size === 0}
                                className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2"
                                title="Imprimir resumen de los seleccionados"
                            >
                                <FileText size={16} /> Imprimir ({selectedEncomiendas.size})
                            </button>
                            <button
                                onClick={marcarEntregadas}
                                disabled={selectedEncomiendas.size === 0 || loading}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
                            >
                                <CheckCircle size={16} /> {loading ? <RefreshCcw className="animate-spin" size={16} /> : `Entregar (${selectedEncomiendas.size})`}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] font-black border-b border-slate-200">
                                    <th className="p-4 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            checked={selectedEncomiendas.size === encomiendas.length && encomiendas.length > 0}
                                            onChange={toggleAllEncomiendas}
                                        />
                                    </th>
                                    <th className="p-4">Orden Retiro</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Total Importe</th>
                                    <th className="p-4">Estado / Lugar</th>
                                    <th className="p-4 text-center">Pago</th>
                                </tr>
                            </thead>
                            <tbody>
                                {encomiendas.map((enc, i) => {
                                    const isExpanded = expandedRows.has(enc.ordenDeRetiro);
                                    const isSelected = selectedEncomiendas.has(enc.ordenDeRetiro);
                                    const clienteEsComun = enc.TClIdTipoCliente !== 2 && enc.TClIdTipoCliente !== 3;

                                    return (
                                        <React.Fragment key={enc.ordenDeRetiro}>
                                            <tr className={`border-b border-slate-100 transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                                <td className="p-4 text-center h-full align-middle">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        checked={isSelected}
                                                        onChange={() => toggleCheckEncomienda(enc.ordenDeRetiro)}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <button onClick={() => toggleRow(enc.ordenDeRetiro)} className="flex items-center gap-2 font-black text-blue-600 hover:text-blue-800 transition-colors">
                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                        {enc.ordenDeRetiro}
                                                    </button>
                                                    <div className="flex items-center gap-2 ml-6 mt-1">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{enc.orders?.length || 0} HIJAS</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); printTicketEncomienda(enc); }}
                                                            title="Imprimir ticket"
                                                            className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                        >
                                                            <Printer size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-bold text-slate-800 block text-base leading-none mb-1">
                                                        {enc.CliCodigoCliente}
                                                    </span>
                                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${clienteEsComun ? 'bg-slate-100 text-slate-500' : 'bg-purple-100 text-purple-700'}`}>
                                                        {enc.TClDescripcion}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-black text-slate-800 text-lg">
                                                        UYU {enc.totalCost}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="bg-slate-200/80 text-slate-700 px-3 py-1 rounded shadow-sm text-xs font-bold uppercase block w-fit mb-1">{enc.estado}</span>
                                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Truck size={12} /> {enc.lugarRetiro}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {enc.pagorealizado === 1 ?
                                                        <div className="inline-flex flex-col items-center">
                                                            <span className="text-green-700 font-black bg-green-100 px-3 py-1 rounded-md text-xs tracking-wider shadow-sm border border-green-200">
                                                                PAGADO
                                                            </span>
                                                        </div>
                                                        :
                                                        <div className="inline-flex flex-col items-center">
                                                            <span className="text-red-600 font-black bg-red-100 px-3 py-1 rounded-md text-xs tracking-wider shadow-sm border border-red-200">
                                                                PENDIENTE
                                                            </span>
                                                            {clienteEsComun && (
                                                                <i className="fa-solid fa-lock text-slate-400 mt-1" title="Requiere Autorización"></i>
                                                            )}
                                                        </div>
                                                    }
                                                </td>
                                            </tr>
                                            {/* Fila expandible con sub-órdenes */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50">
                                                    <td colSpan="6" className="p-0 border-b border-slate-200">
                                                        <div className="p-4 pl-14 pt-0">
                                                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-2">
                                                                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                                                                    <span className="text-xs font-black text-slate-500 uppercase">Composición de {enc.ordenDeRetiro}</span>
                                                                </div>
                                                                <table className="w-full text-xs text-left">
                                                                    <tbody>
                                                                        {enc.orders?.map(o => (
                                                                            <tr key={o.orderNumber} className="border-b border-slate-50 hover:bg-slate-50">
                                                                                <td className="p-3 pl-4 font-bold text-slate-700 w-32">{o.orderNumber}</td>
                                                                                <td className="p-3 text-slate-500 font-medium">
                                                                                    {o.orderEstado || '—'}
                                                                                </td>
                                                                                <td className="p-3 font-bold text-blue-600 text-right pr-4">{o.orderCosto}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {!loading && encomiendas.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-10 text-center text-slate-500">
                                            <Truck size={40} className="mx-auto mb-3 text-slate-300" />
                                            <p className="font-bold text-lg">No hay órdenes para despachar</p>
                                            <p className="text-sm font-medium">bajo los filtros seleccionados.</p>
                                        </td>
                                    </tr>
                                )}

                                {loading && encomiendas.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-10 text-center text-blue-600">
                                            <RefreshCcw className="animate-spin mx-auto mb-3 text-blue-500" size={30} />
                                            <p className="font-bold">Cargando...</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB MOSTRADOR */}
            {activeTab === 'mostrador' && (
                <div className="flex flex-col gap-6">
                    {/* Barra de búsqueda */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[300px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Buscar por Retiro, Orden de Depósito o Cliente</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Ej: R-60653  |  DF-85423  |  MACROSOFT"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-bold transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && buscarMostrador()}
                                />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                            </div>
                        </div>
                        <button
                            onClick={buscarMostrador}
                            disabled={!searchTerm || mostradorLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {mostradorLoading ? <RefreshCcw className="animate-spin" size={18} /> : <Search size={18} />}
                            {mostradorLoading ? 'Buscando...' : 'Buscar Expediente'}
                        </button>
                    </div>

                    {/* Resultados */}
                    {mostradorData && (
                        <div className="flex flex-col gap-4">
                            {/* Retiros con órdenes sin pagar */}
                            {mostradorData.retiros.map(ret => (
                                <div key={ret.OReIdOrdenRetiro} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                                        <div>
                                            <div className="text-white font-black text-lg tracking-wide">{ret.etiqueta}</div>
                                            <div className="text-blue-100 text-sm font-medium">{ret.estadoRetiro} · {ret.lugarRetiro}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-white font-bold text-sm">{ret.CliNombre || ret.CliCodigo}</div>
                                            <div className="text-blue-200 text-xs">{ret.TClDescripcion}</div>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                                                    <th className="p-3 pl-6 text-left">Código Orden</th>
                                                    <th className="p-3 text-left">Estado</th>
                                                    <th className="p-3 text-right">Importe</th>
                                                    <th className="p-3 pr-6 text-center">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ret.ordenes.map(o => (
                                                    <tr key={o.OrdIdOrden} className="border-b border-slate-50 hover:bg-slate-50">
                                                        <td className="p-3 pl-6 font-bold text-slate-800">{o.codigo}</td>
                                                        <td className="p-3 text-slate-500 font-medium">{o.estado}</td>
                                                        <td className="p-3 text-right font-black text-blue-700">{o.simbolo} {parseFloat(o.costo || 0).toFixed(2)}</td>
                                                        <td className="p-3 pr-6 text-center">
                                                            <button
                                                                onClick={() => abrirModalPago([o], ret.etiqueta, ret)}
                                                                className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 mx-auto"
                                                            >
                                                                <DollarSign size={12} /> Pagar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-400 uppercase">{ret.ordenes.length} orden(es) sin pagar</span>
                                        <button
                                            onClick={() => abrirModalPago(ret.ordenes, ret.etiqueta, ret)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            <DollarSign size={14} /> Pagar Todas las Órdenes
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Órdenes sin retiro */}
                            {mostradorData.sinRetiro.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex justify-between items-center">
                                        <div>
                                            <div className="text-white font-black text-lg">Órdenes sin Retiro</div>
                                            <div className="text-amber-100 text-sm">Sin orden de retiro asignada</div>
                                        </div>
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                                                <th className="p-3 pl-6 text-left">Código</th>
                                                <th className="p-3 text-left">Cliente</th>
                                                <th className="p-3 text-left">Estado</th>
                                                <th className="p-3 text-right">Importe</th>
                                                <th className="p-3 pr-6 text-center">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mostradorData.sinRetiro.map(o => (
                                                <tr key={o.OrdIdOrden} className="border-b border-slate-50 hover:bg-slate-50">
                                                    <td className="p-3 pl-6 font-bold text-slate-800">{o.OrdCodigoOrden}</td>
                                                    <td className="p-3 text-slate-600 font-medium">{o.CliNombre || o.CliCodigo}</td>
                                                    <td className="p-3 text-slate-500">{o.estadoOrden}</td>
                                                    <td className="p-3 text-right font-black text-amber-700">{o.MonSimbolo} {parseFloat(o.OrdCostoFinal || 0).toFixed(2)}</td>
                                                    <td className="p-3 pr-6 text-center">
                                                        <button
                                                            onClick={() => abrirModalPago([{ ...o, codigo: o.OrdCodigoOrden, costo: o.OrdCostoFinal, simbolo: o.MonSimbolo }], null, o)}
                                                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 mx-auto"
                                                        >
                                                            <DollarSign size={12} /> Pagar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ALERTA DE AUTORIZACIÓN — Modal custom reemplaza Swal */}
            <AlertaAutorizacionModal
                visible={showAlertaAuth}
                titulo="!ALERTA!"
                subtitulo="Este retiro DEBE SER ABONADO. Por favor verifique que pase por caja y confirme el pago."
                leyenda="ESTO ES UNA EXCEPCIONALIDAD"
                onCancel={() => { setShowAlertaAuth(false); setPendingDelivery(null); }}
                onConfirm={async (password, observacion) => {
                    setShowAlertaAuth(false);
                    if (pendingDelivery) {
                        await ejecutarEntrega(pendingDelivery.ordenesParaEntregar, password, observacion);
                        setPendingDelivery(null);
                    }
                }}
            />

            {/* MODAL DE PAGO — igual a Caja */}
            {pagoModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        {/* Cabecera */}
                        <div className="bg-gradient-to-r from-[#0070bc] to-[#005a99] px-6 py-4 rounded-t-2xl flex justify-between items-center">
                            <div>
                                <div className="text-white font-black text-lg">Registrar Pago</div>
                                <div className="text-blue-100 text-sm">{pagoModal.retiroId || 'Orden directa'} · {pagoModal.ordenes.length} orden(es)</div>
                            </div>
                            <button onClick={() => setPagoModal(null)} className="text-white hover:text-blue-200 text-2xl font-bold leading-none">&times;</button>
                        </div>

                        <div className="p-6 flex flex-col gap-4">
                            {/* Cotización */}
                            {cotizacion && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-[#0070bc] font-bold text-center">
                                    Cotización: 1 USD = {Number(cotizacion).toFixed(2)} UYU
                                </div>
                            )}

                            {/* Resumen órdenes */}
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                {pagoModal.ordenes.map(o => (
                                    <div key={o.OrdIdOrden} className="flex justify-between text-sm font-bold py-1 border-b border-slate-100 last:border-0">
                                        <span className="text-slate-600">{o.codigo || o.OrdCodigoOrden}</span>
                                        <span className="text-[#0070bc]">{o.simbolo} {parseFloat(o.costo || o.OrdCostoFinal || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Forma de pago — select igual a Caja */}
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-bold text-zinc-800">Seleccionar forma de pago</label>
                                <select
                                    value={formaPago}
                                    onChange={e => setFormaPago(e.target.value)}
                                    className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-700 outline-none focus:border-[#0070bc] focus:ring-1 focus:ring-[#0070bc] appearance-none"
                                >
                                    <option value="">Seleccione un método</option>
                                    {metodosPago.map(m => (
                                        <option key={m.MPaIdMetodoPago} value={m.MPaIdMetodoPago}>{m.MPaDescripcionMetodo}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Moneda — igual a Caja */}
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-bold text-zinc-800">Seleccionar Moneda</label>
                                <select
                                    value={monedaPago}
                                    onChange={e => handleCambioMoneda(e.target.value)}
                                    className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-700 outline-none focus:border-[#0070bc] focus:ring-1 focus:ring-[#0070bc] appearance-none"
                                >
                                    <option value="UYU">UYU — Peso Uruguayo</option>
                                    <option value="USD">USD — Dólar</option>
                                </select>
                            </div>

                            {/* Comprobante */}
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-bold text-zinc-800">Cargar comprobante (opcional)</label>
                                <input
                                    type="file"
                                    onChange={e => setFileComprobante(e.target.files[0])}
                                    className="w-full text-sm border border-zinc-300 p-2 rounded-lg cursor-pointer"
                                />
                            </div>

                            {/* Monto */}
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-bold text-zinc-800">Ingrese Monto ({monedaPago})</label>
                                <input
                                    type="number"
                                    placeholder="Monto"
                                    step="0.01"
                                    value={montoPago}
                                    onChange={e => setMontoPago(e.target.value)}
                                    className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-700 outline-none focus:border-[#0070bc] focus:ring-1 focus:ring-[#0070bc] text-lg font-bold"
                                />
                            </div>

                            {/* Botones */}
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => setPagoModal(null)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
                                <button
                                    onClick={confirmarPago}
                                    disabled={pagandoLoading}
                                    className="flex-1 bg-[#0070bc] hover:bg-[#005a99] disabled:opacity-50 text-white font-black py-2.5 rounded-full transition-colors flex items-center justify-center gap-2 shadow-md"
                                >
                                    {pagandoLoading ? <RefreshCcw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                    {pagandoLoading ? 'Registrando...' : 'Realizar Pago'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EntregaPedidosView;

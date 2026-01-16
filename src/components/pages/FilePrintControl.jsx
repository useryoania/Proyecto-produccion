import React, { useState, useEffect } from 'react';
import { useAuth } from "../../context/AuthContext";
import { fileControlService, ordersService } from "../../services/api";
import KPICard from '../common/KPICard';
import OrderCard from '../production/components/OrderCard';
import RollDetailsModal from '../modals/RollDetailsModal';
import OrderDetailModal from '../production/components/OrderDetailModal';

import { socket } from '../../services/socketService';
import Toast from '../ui/Toast';
import FileItem from '../production/components/FileItem';

const SmallRollMetrics = ({ roll, metrics }) => {
  if (!roll) return null;
  const execution = metrics?.stats?.execution || 0;

  // Validar undefined para evitar "undefinedm"
  const currentMeters = metrics?.stats?.metrosProducidos ?? 0;
  const totalMeters = metrics?.stats?.metrosTotales ?? roll.metros ?? 0;

  const metersText = metrics?.stats
    ? `${currentMeters}/${totalMeters}m`
    : `${totalMeters}m`;

  const files = metrics?.fileStats ? `${metrics.fileStats.ok}/${metrics.fileStats.total}` : '0/0';
  const status = metrics?.estadoMaquina || roll.estado;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-100" />
            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent"
              strokeDasharray={100}
              strokeDashoffset={100 - (100 * execution / 100)}
              className="text-cyan-500 transition-all duration-1000 ease-out" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-700">{execution}%</span>
        </div>
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">METROS</div>
          <div className="font-bold text-xs text-slate-700">{metersText}</div>
        </div>
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">IMPRESIONES</div>
          <div className="font-bold text-xs text-slate-700">{files}</div>
        </div>
      </div>
      {status && (
        <div className={`w-2 h-2 rounded-full ${status.includes('IMPRIMIENDO') ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} title={status}></div>
      )}
    </div>
  );
};


const FilePrintControl = ({ areaCode }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [sortOrder, setSortOrder] = useState('ASC');
  const [autoRotation, setAutoRotation] = useState(false);

  // Datos Generales
  const [rollos, setRollos] = useState([]);
  const [activeRoll, setActiveRoll] = useState(null);
  const [orders, setOrders] = useState([]);

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Estados de métricas
  const [pedidoMetrics, setPedidoMetrics] = useState(null);
  const [activeRollMetrics, setActiveRollMetrics] = useState(null);

  // Modales
  const [rollModalOpen, setRollModalOpen] = useState(false);
  const [currentRollDetails, setCurrentRollDetails] = useState(null);
  const [inspectingOrder, setInspectingOrder] = useState(null);

  // --- NUEVOS ESTADOS PARA MODALES DE CONTROL ---
  const [controlAction, setControlAction] = useState(null);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [failureType, setFailureType] = useState("");
  const [fallaTypes, setFallaTypes] = useState([]); // Tipos de Falla Catálogo
  const [metersToReprint, setMetersToReprint] = useState(""); // Cantidad a reponer (opcional)

  const [completedOrderData, setCompletedOrderData] = useState(null); // Modal Pronto Sector

  // --- NUEVO: ESTADOS PARA CONFIRMACIÓN DE BULTOS ---
  const [showBultosConfirm, setShowBultosConfirm] = useState(false); // Legacy: kept to avoid breaking build if referenced
  const [pendingBultosData, setPendingBultosData] = useState(null);
  const [manualBultosCount, setManualBultosCount] = useState(0);
  const [isEditingBultos, setIsEditingBultos] = useState(false); // NUEVO

  const { user } = useAuth();
  const currentUser = user?.usuario || "Juan Perez"; // Fallback visual

  // Estados de busqueda
  const [searchTerm, setSearchTerm] = useState("");

  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
  };
  const closeToast = () => setToast({ ...toast, visible: false });

  // Load Falla Types Catalog
  useEffect(() => {
    const loadFallas = async () => {
      try {
        const types = await fileControlService.getTiposFalla(areaCode || 'DTF');
        setFallaTypes(types || []);
      } catch (e) {
        console.error("Failed to load falla types", e);
      }
    };
    loadFallas();
  }, [areaCode]);


  useEffect(() => {
    const fetchRollos = async () => {
      try {
        const area = areaCode || 'DTF';
        const data = await fileControlService.getRollosActivos(area);
        setRollos(data || []);
      } catch (error) { console.error("Error rollos:", error); }
    };
    fetchRollos();
  }, [areaCode]);

  useEffect(() => {
    const rollId = activeRoll?.id || 'todo';

    fetchOrdersOfRoll(rollId, searchTerm);

    if (rollId && rollId !== 'todo') {
      fetchRollMetrics(rollId);
    } else {
      setActiveRollMetrics(null);
    }

  }, [activeRoll, searchTerm]);

  const fetchOrdersOfRoll = async (rollId, search = "") => {
    setLoadingOrders(true);
    try {
      const area = areaCode || 'DTF';
      const rId = rollId === 'todo' ? '' : rollId;
      const data = await fileControlService.getOrdenes(search, rId, area);

      // Log para depuración
      console.log("Raw Orders Data:", data);



      // Normalizar datos (Mapping usando keys confirmadas PascalCase)
      const normalizeData = (data) => (data || []).map(o => ({
        id: o.OrdenID,
        code: o.CodigoOrden,
        client: o.Cliente,
        material: o.Material,
        status: o.Estado,
        priority: o.Prioridad,
        areaId: o.AreaID,
        desc: o.Descripcion,
        entryDate: o.FechaIngreso,
        hasLabels: o.CantidadEtiquetas || 0,
        failures: o.CantidadFallas || 0,
        sequence: o.Secuencia || 0,
        nextService: o.ProximoServicio || o.nextService, // AÑADIDO
        _raw: o
      }));

      const formatted = normalizeData(data);
      setOrders(formatted);
    } catch (e) {
      console.error(e);
      showToast("Error cargando órdenes", "error");
    }
    finally { setLoadingOrders(false); }
  };

  const sortedOrders = React.useMemo(() => {
    return [...orders].sort((a, b) => {
      const seqA = a.sequence || 0;
      const seqB = b.sequence || 0;
      if (seqA !== seqB) {
        return sortOrder === 'ASC' ? seqA - seqB : seqB - seqA;
      }
      const valA = parseInt((a.code || '').toString().split(' ')[0]) || a.id;
      const valB = parseInt((b.code || '').toString().split(' ')[0]) || b.id;
      return sortOrder === 'ASC' ? valA - valB : valB - valA;
    });
  }, [orders, sortOrder]);

  // Effect: Auto-Rotation Start
  useEffect(() => {
    if (autoRotation && sortedOrders.length > 0 && !selectedOrder) {
      setSelectedOrder(sortedOrders[0]);
    }
  }, [autoRotation, sortedOrders, selectedOrder]);

  // Effect: Auto-Rotation Advance (On Modal Close)
  const prevCompletedRef = React.useRef(null);
  useEffect(() => {
    if (prevCompletedRef.current && !completedOrderData && autoRotation) {
      // Avanzar usando la referencia guardada al momento de completar
      const nextOrder = prevCompletedRef.current.autoNextOrder;

      if (nextOrder) {
        // Intentamos buscar la versión más fresca de esa orden en la lista actual
        const fresh = sortedOrders.find(o => o.id === nextOrder.id) || nextOrder;
        setSelectedOrder(fresh);
        showToast(`Auto-Rotación: Avanzando a ${fresh.code || fresh.id}`, 'info');
      } else {
        showToast("Auto-Rotación: Fin del listado", 'warning');
      }
    }
    prevCompletedRef.current = completedOrderData;
  }, [completedOrderData, autoRotation, sortedOrders]);

  const fetchRollMetrics = async (rollId) => {
    try {
      const data = await fileControlService.getRolloMetrics(rollId);
      setActiveRollMetrics(data);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    if (selectedOrder) {
      refreshSelectedOrderDetails(selectedOrder);
    } else {
      setFiles([]);
      setPedidoMetrics(null);
    }
  }, [selectedOrder]);

  const refreshSelectedOrderDetails = async (targetOrder = null) => {
    const orderToUse = targetOrder || selectedOrder;
    if (!orderToUse || !orderToUse.id) return;
    setLoadingFiles(true);
    try {
      // Use normalized props
      const dataFiles = await fileControlService.getArchivosPorOrden(orderToUse.id);
      setFiles(dataFiles || []);

      const ref = orderToUse.code || orderToUse.id;
      if (ref) {
        const pMet = await fileControlService.getPedidoMetrics(ref, orderToUse.areaId || areaCode);
        setPedidoMetrics(pMet);
      }
    } catch (error) { console.error("Error details:", error); }
    finally { setLoadingFiles(false); }
  };

  // Sync selectedOrder with updates from orders list
  useEffect(() => {
    if (selectedOrder && orders.length > 0) {
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (updated && (updated.status !== selectedOrder.status || updated.hasLabels !== selectedOrder.hasLabels || updated.nextService !== selectedOrder.nextService)) {
        setSelectedOrder(prev => ({ ...prev, ...updated }));
      }
    }
  }, [orders]);

  useEffect(() => {
    const handleUpdate = (data) => {
      if (activeRoll) {
        fetchOrdersOfRoll(activeRoll.id);
        fetchRollMetrics(activeRoll.id);
      }
      if (selectedOrder && (data.orderId == selectedOrder.id || data.orderId == selectedOrder.OrdenID)) {
        refreshSelectedOrderDetails();
      }
    };
    socket.on('server:order_updated', handleUpdate);
    return () => socket.off('server:order_updated', handleUpdate);
  }, [activeRoll, selectedOrder]);


  // --- MANEJO DE ACCIONES CON MODAL ---
  const openActionModal = (fileId, action) => {
    if (action === 'OK') {
      const fileToControl = files.find(f => (f.ArchivoID || f.id) === fileId);
      if (fileToControl) {
        const met = parseFloat(fileToControl.Metros || 0);
        if (met <= 0) {
          showToast("No se puede controlar un archivo sin medición (0 metros).", 'error');
          return;
        }
      }
    }

    setSelectedFileId(fileId);
    setControlAction(action);
    setActionReason("");
    setFailureType("");
    setMetersToReprint("");

    if (action === 'OK') {
      executeAction(fileId, 'OK');
    }
  };

  const executeAction = async (fileId, action, extraData = {}) => {
    try {
      let finalObs = extraData.observations || "";
      if (action === 'FALLA' && extraData.type) {
        finalObs = `[${extraData.type}] ${finalObs}`;
      }

      const payload = {
        archivoId: fileId || selectedFileId,
        estado: action,
        motivo: finalObs,
        tipoFalla: extraData.type || null,
        metrosReponer: extraData.metrosReponer || null,
        usuario: currentUser,
        areaId: areaCode
      };

      const response = await fileControlService.postControl(payload);

      // 1. CÁLCULO DE AUTO-ROTACIÓN (Común para ambos casos)
      let nextOrderTarget = null;
      if (autoRotation) {
        const currentId = selectedOrder?.id;
        const currentIndex = sortedOrders.findIndex(o => String(o.id) === String(currentId));

        if (currentIndex !== -1 && currentIndex < sortedOrders.length - 1) {
          nextOrderTarget = sortedOrders[currentIndex + 1];
        } else if (sortedOrders.length > 0 && sortedOrders.length > 1) {
          // Si era el último y hay más, volver al primero (opcional, ayuda al flujo continuo)
          nextOrderTarget = sortedOrders[0];
        }
      }

      // 2. ACTUALIZAR ESTADO LOCAL (Visual)
      if (selectedOrder && response?.nuevoEstado) {
        setSelectedOrder(prev => ({
          ...prev,
          status: response.nuevoEstado.toUpperCase(),
          nextService: response.proximoServicio || prev.nextService
        }));
      }

      if (response?.orderCompleted) {
        // Alerta de Generación Automática
        if (response.totalBultos > 0) {
          alert(`¡ORDEN COMPLETADA!\n\nSistema: Se han generado ${response.totalBultos} etiquetas automáticamente según configuración.\n(Bultos: ${response.totalBultos})`);
        }

        // CASO A: GRUPO COMPLETO -> Muestra Modal -> Avanza al cerrar
        setCompletedOrderData({
          bultos: response.totalBultos,
          orderId: selectedOrder?.id,
          destino: response.destinoLogistica,
          estado: response.nuevoEstado,
          proximoServicio: response.proximoServicio || selectedOrder.nextService,
          autoNextOrder: nextOrderTarget // GUARDA LA REFERENCIA PARA EL EFFECT
        });

        // Auto-Cerrar Modal a los 10s
        setTimeout(() => {
          setCompletedOrderData(null);
        }, 10000);

      } else {
        // CASO B: SOLO ORDEN LOCAL COMPLETA (Sin Modal) -> Avanza Inmediatamente
        // Si tenemos un target y la rotación activa, avanzamos YA.
        if (autoRotation && nextOrderTarget) {
          setSelectedOrder(nextOrderTarget);
          // Forzar refresco visual INMEDIATO
          refreshSelectedOrderDetails(nextOrderTarget);
          showToast(`Auto-Rotación: Avanzando a ${nextOrderTarget.code || nextOrderTarget.id}`, 'info');
        }
      }

      refreshSelectedOrderDetails();
      if (activeRoll) fetchRollMetrics(activeRoll.id);
      closeModal();

    } catch (error) {
      console.error(error);
      showToast("Error al guardar la acción: " + error.message, 'error');
    }
  };

  const handleRegenerateBultos = async () => {
    if (!completedOrderData?.orderId) return;
    try {
      const res = await fileControlService.regenerateLabels(completedOrderData.orderId, manualBultosCount);
      if (res.success) {
        setCompletedOrderData(prev => ({ ...prev, bultos: res.totalBultos }));
        setIsEditingBultos(false);
        showToast("Etiquetas actualizadas correctamente", 'success');
      }
    } catch (e) {
      console.error(e);
      showToast("Error al regenerar etiquetas: " + e.message, 'error');
    }
  };

  const handleSubmitModal = () => {
    if (!controlAction) return;
    if (controlAction === 'FALLA' && !failureType) {
      showToast("Seleccione un tipo de falla", 'warning');
      return;
    }
    if (controlAction === 'CANCELADO' && !actionReason) {
      showToast("Indique el motivo de cancelación", 'warning');
      return;
    }

    executeAction(selectedFileId, controlAction, {
      observations: actionReason,
      type: failureType,
      metrosReponer: metersToReprint
    });
  };

  const closeModal = () => {
    setControlAction(null);
    setSelectedFileId(null);
    setActionReason("");
    setFailureType("");
  };

  const handlePrintLabels = async () => {
    try {
      if (!selectedOrder) return;
      // Use standard ID property
      const orderId = selectedOrder.id || selectedOrder.OrdenID;
      if (!orderId) {
        showToast("Error: No se puede identificar la orden.", "error");
        return;
      }
      const labels = await fileControlService.getEtiquetas(orderId);

      if (!labels || labels.length === 0) {
        showToast("No hay etiquetas generadas para esta orden.", 'warning');
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast("Por favor habilite los pop-ups para imprimir.", 'error');
        return;
      }

      let labelsHtml = labels.map(l => {
        let qrObj = {};
        try {
          qrObj = JSON.parse(l.CodigoQR || '{}');
        } catch (e) {
          // Fallback if not JSON
          qrObj = { code: selectedOrder.code, bulto: l.NumeroBulto, total: l.TotalBultos };
        }

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(l.CodigoQR)}`;

        // Data Extraction
        const client = qrObj.client || selectedOrder.client || 'Cliente Genérico';
        const job = qrObj.job || selectedOrder.desc || 'Sin Descripción';
        const area = areaCode || qrObj.area || 'GEN';
        const genDate = new Date(l.FechaGeneracion).toLocaleDateString() + ' ' + new Date(l.FechaGeneracion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Clean Code: "11 (1/1)" -> "11"
        let rawCode = qrObj.code || l.OrdenID || '';
        const orderCode = rawCode.toString().split('(')[0].trim();

        const bultoStr = `(${qrObj.bulto || l.NumeroBulto}/${qrObj.total || l.TotalBultos})`;
        const labelIdCode = l.CodigoEtiqueta || '';

        // Services List Generation
        const services = qrObj.services || [{ area: area, status: 'PRONTO' }]; // Fallback
        const servicesHtml = services.map(s => {
          // Logic for checkmark: If status indicates completion or it is the current area generating this label
          const isDone = ['PRONTO', 'FINALIZADO', 'ENTREGADO', 'ENVIADO'].includes((s.status || '').toUpperCase()) || s.area === area;
          const icon = isDone ? '&#10004;' : '&minus;';
          const weight = isDone ? 'bold' : 'normal';
          return `<li style="list-style:none; margin-bottom:5px; font-weight:${weight}; font-size:14px;"><span style="display:inline-block; width:20px; font-weight:bold;">${icon}</span> ${s.area}</li>`;
        }).join('');

        return `
        <div class="label-container" style="border: 2px solid black; margin: 0; page-break-after: always; box-sizing: border-box; width: 4in; height: 6in; position: relative; font-family: Arial, sans-serif;">
          
          <!-- HEADER -->
          <div style="border-bottom: 2px solid black; padding: 10px; height: 15%;">
            <div style="display:flex; justify-content: space-between; align-items: flex-start;">
                <div style="width: 65%;">
                    <div style="font-weight: bold; font-size: 14px;">CLIENTE: ${client.substring(0, 25)}</div>
                    <div style="font-size: 12px; margin-top:4px;">TRABAJO: ${job.substring(0, 35)}</div>
                </div>
                <div style="width: 35%; text-align: right;">
                    <div style="font-weight: bold; font-size: 14px;">ÁREA: ${area}</div>
                    <div style="font-size: 10px; margin-top:4px;">${genDate}</div>
                </div>
            </div>
          </div>

          <!-- BODY -->
          <div style="display: flex; height: 85%;">
            
            <!-- LEFT: QR & BULTOS -->
            <div style="width: 60%; padding: 10px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <img src="${qrUrl}" style="width: 180px; height: 180px; object-fit: contain; margin-bottom: 10px;">
                
                <div style="font-size: ${orderCode.toString().length > 8 ? '24px' : '38px'}; font-weight: 900; line-height: 1;">ORDEN: ${orderCode}</div>
                <div style="font-size: 24px; font-weight: bold; margin-top: 5px;">BULTO ${bultoStr}</div>
                ${labelIdCode ? `<div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: #000; font-family: monospace;">${labelIdCode}</div>` : ''}
                <div style="font-size: 12px; margin-top: 15px;">Destino: <strong>${(qrObj.dest || 'LOGISTICA').toUpperCase()}</strong></div>
            </div>

            <!-- RIGHT: SERVICES LIST -->
            <div style="width: 40%; border-left: 2px solid black; padding: 10px;">
                <div style="font-weight: 900; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid black; padding-bottom: 5px; margin-bottom: 10px;">SERVICIOS</div>
                <ul style="padding: 0; margin: 0;">
                    ${servicesHtml}
                </ul>
            </div>

          </div>
        </div>
      `}).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir Etiquetas 4x6</title>
            <style>
              @page { 
                size: 4in 6in; 
                margin: 0; 
              }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0; 
                padding: 0; 
                background: #fff;
              }
              
              .label-container {
                width: 4in;
                height: 6in;
                box-sizing: border-box;
                padding: 15px;
                border: 1px dashed #ddd; /* Helper border for visual, verify if needed for print */
                display: flex;
                flex-direction: column;
                page-break-after: always;
                position: relative;
                overflow: hidden;
              }

              @media print {
                .label-container { border: none; }
                body { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${labelsHtml}
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();

      // DO NOT CLOSE MODAL HERE - User needs to click "Send to Cart"
      // setCompletedOrderData(null); 
    } catch (err) {
      console.error("Error printing:", err);
      showToast("Error al imprimir etiquetas", 'error');
    }
  };
  const handleSendToCart = async () => {
    try {
      if (!selectedOrder) return;

      const orderId = selectedOrder.id || selectedOrder.OrdenID;
      if (!orderId) {
        showToast("Error: Identificador de orden no válido", 'error');
        return;
      }

      // Determine destination for feedback
      const destination = selectedOrder.nextService || 'LOGÍSTICA';

      // Actualizamos estado.
      await ordersService.updateStatus(orderId, 'EN_LOGISTICA');

      showToast(`Orden enviada al carrito. Destino: ${destination}`, 'success');
      setCompletedOrderData(null);
      fetchOrdersOfRoll(activeRoll?.id);
    } catch (e) {
      console.error(e);
      showToast("Error al enviar a carrito", 'error');
    }
  };

  const handleViewRollDetails = (roll) => {
    setCurrentRollDetails(roll);
    setRollModalOpen(true);
  };

  const handleViewOrderDetails = () => {
    if (selectedOrder) {
      // selectedOrder ya está normalizado (id, code, client...), no usar claves crudas (OrdenID, etc.)
      setInspectingOrder({
        ...selectedOrder,
        id: selectedOrder.id || selectedOrder.OrdenID,
        code: selectedOrder.code || selectedOrder.CodigoOrden,
        client: selectedOrder.client || selectedOrder.Cliente,
        material: selectedOrder.material || selectedOrder.Material || selectedOrder.desc,
        // El modal espera 'area' para hacer el fetch
        area: selectedOrder.areaId || selectedOrder.AreaID
      });
    }
  };

  const normalizeStatus = (f) => {
    if (!f) return '';
    const s = f.EstadoArchivo || f.Estado || f.EstadoControl || f.status;
    return s ? s.toString().toUpperCase().trim() : '';
  };

  const getStatusColor = (s) => {
    if (!s) return 'bg-amber-400';
    if (s === 'OK' || s === 'FINALIZADO' || s === 'PRONTO SECTOR') return 'bg-emerald-500';
    if (s === 'FALLA') return 'bg-red-500';
    if (s === 'CANCELADO') return 'bg-slate-400';
    if (s === 'CONTROL Y CALIDAD' || s?.includes('CONTROL')) return 'bg-purple-500';
    if (s === 'EN PROCESO' || s?.includes('IMPRIMIENDO')) return 'bg-blue-500 animate-pulse';
    return 'bg-amber-400';
  };

  const orderMetrics = React.useMemo(() => {
    const totalFiles = files.length;
    const okFiles = files.filter(f => ['OK', 'FINALIZADO'].includes(normalizeStatus(f))).length;
    const failFiles = files.filter(f => normalizeStatus(f) === 'FALLA').length;
    const cancelFiles = files.filter(f => normalizeStatus(f) === 'CANCELADO').length;
    const activeTotal = totalFiles - cancelFiles;
    const progressFiles = activeTotal > 0 ? ((okFiles / activeTotal) * 100).toFixed(0) : 0;
    return { total: totalFiles, ok: okFiles, fail: failFiles, cancel: cancelFiles, progress: progressFiles };
  }, [files]);


  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-[360px] h-full bg-white border-r border-slate-200 flex flex-col z-10 shrink-0">

        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex flex-col gap-2">

          {/* BUSCADOR */}
          <div className="relative mb-2">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Buscar orden, cliente..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">LOTE EN PROCESO</span>

          {/* TARJETA DE ROLLO PEQUEÑA (Solo si es un rollo especifico) */}
          {activeRoll && activeRoll.id !== 'todo' && <SmallRollMetrics roll={activeRoll} metrics={activeRollMetrics} />}

          <div className="relative">
            <select
              className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-cyan-300 appearance-none cursor-pointer hover:border-cyan-300 transition-colors"
              value={activeRoll?.id || 'todo'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'todo') setActiveRoll({ id: 'todo', nombre: 'Todos' });
                else setActiveRoll(rollos.find(x => x.id === parseInt(val))); // Asegurar tipo numero si ids son numeros
              }}
            >
              <option value="todo">Todos los Lotes / Sin Lote</option>
              {rollos.map(r => <option key={r.id} value={r.id}>{r.nombre || `Lote ${r.id}`} (ID: {r.id})</option>)}
            </select>
            <div className="absolute right-3 top-3 pointer-events-none text-slate-400 text-xs"><i className="fa-solid fa-chevron-down"></i></div>
          </div>

          {/* CONTROLES: ORDEN Y ROTACION */}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
              className="flex-1 flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-slate-600">Orden</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-700">{sortOrder === 'ASC' ? 'ASC' : 'DESC'}</span>
                <i className={`fa-solid fa-arrow-${sortOrder === 'ASC' ? 'down-1-9' : 'up-1-9'} text-cyan-500`}></i>
              </div>
            </button>

            <button
              onClick={() => setAutoRotation(!autoRotation)}
              className={`flex-1 flex items-center justify-between px-3 py-2 border rounded-xl transition-all ${autoRotation ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              <span className={`text-[10px] font-bold uppercase ${autoRotation ? 'text-indigo-600' : 'text-slate-400'}`}>Auto-Rot</span>
              <i className={`fa-solid fa-sync ${autoRotation ? 'text-indigo-500 animate-spin-slow' : 'text-slate-300'}`}></i>
            </button>
          </div>
        </div>

        <div className="px-4 py-2 border-b border-slate-50 bg-white flex justify-between items-center">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ÓRDENES ({orders.length})</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/30">
          {loadingOrders ? (
            <div className="text-center py-8 text-cyan-500"><i className="fa-solid fa-circle-notch fa-spin text-2xl"></i></div>
          ) : (
            sortedOrders.map(o => (
              <OrderCard
                key={o.id}
                order={o}
                isSelected={selectedOrder?.id === o.id}
                onToggleSelect={() => setSelectedOrder(o)}
                onViewDetails={() => setSelectedOrder(o)}
                minimal={true}
              />
            ))
          )}
          {orders.length === 0 && !loadingOrders && <div className="text-center py-8 text-slate-400 italic text-xs">Seleccione un lote.</div>}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
        {selectedOrder ? (
          <div className="flex-1 flex flex-col p-6 max-w-[1600px] mx-auto w-full">

            {/* TOP BAR: SIMPLIFIED HEADER */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap items-center justify-between gap-6">

              {/* Header: Title + Eye Button (Sin Recuadro #) */}
              <div className="flex flex-col gap-1 pr-6 border-r border-slate-100 mr-auto min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">GESTIÓN DE PROCESO</span>
                  <button
                    onClick={handleViewOrderDetails}
                    className="bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                    title="Ver Detalle Completo"
                  >
                    <i className="fa-regular fa-eye text-xs"></i>
                  </button>
                </div>
                <div className="text-2xl font-black text-slate-800 leading-none tracking-tight">
                  Orden No.: {selectedOrder.code || selectedOrder.CodigoOrden || selectedOrder.id || '---'}
                </div>
              </div>

              {/* Metrics */}
              <div className="flex gap-8 items-center">
                <div className="text-center">
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Archivos</div>
                  <div className="text-lg font-black text-slate-700 leading-none">{orderMetrics.total}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-black uppercase text-red-300 tracking-wider mb-0.5">Fallas</div>
                  <div className="text-lg font-black text-red-500 leading-none">{orderMetrics.fail}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Cancelados</div>
                  <div className="text-lg font-black text-slate-400 leading-none">{orderMetrics.cancel}</div>
                </div>
                <div className="flex flex-col justify-center w-32">
                  <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase mb-1"><span>Avance</span><span className="text-indigo-600">{orderMetrics.progress}%</span></div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${orderMetrics.progress}%` }}></div></div>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-100 mx-2 hidden lg:block"></div>

              {/* Logistics */}
              <div className="flex gap-6 items-center">
                {/* BULTOS */}
                <div className={`flex items-center gap-2 ${selectedOrder.hasLabels > 0 ? 'opacity-100' : 'opacity-40'}`}>
                  <i className="fa-solid fa-box text-slate-300"></i>
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Bultos</div>
                    <div className="text-xs font-bold text-slate-600">
                      {selectedOrder.hasLabels > 0 ? `${selectedOrder.hasLabels} PQT` : '--'}
                    </div>
                  </div>
                </div>

                {/* ETIQUETAS */}
                <div
                  className={`flex items-center gap-2 group ${selectedOrder.hasLabels > 0 ? 'opacity-100 cursor-pointer hover:bg-slate-50 rounded-lg pr-2 transition-all' : 'opacity-40 pointer-events-none'}`}
                  onClick={selectedOrder.hasLabels > 0 ? handlePrintLabels : undefined}
                  title="Clic para reimprimir etiquetas"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${selectedOrder.hasLabels > 0 ? 'bg-emerald-100 text-emerald-500 group-hover:bg-emerald-200' : 'bg-slate-100 text-slate-300'}`}>
                    <i className="fa-solid fa-tags"></i>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Etiquetas</div>
                    <div className={`text-xs font-bold ${selectedOrder.hasLabels > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {selectedOrder.hasLabels > 0 ? 'OK (Imprimir)' : 'PENDIENTE'}
                    </div>
                  </div>
                </div>

                {/* LOGÍSTICA / ESTADO DESTINO */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${selectedOrder.status === 'EN_LOGISTICA' ? 'bg-blue-50 border-blue-100' :
                  (selectedOrder.status === 'PRONTO' || selectedOrder.status === 'PRONTO SECTOR') ? 'bg-emerald-50 border-emerald-100' :
                    'bg-slate-50 border-slate-100'
                  }`}>
                  <i className={`fa-solid fa-truck-fast ${selectedOrder.status === 'EN_LOGISTICA' ? 'text-blue-500' : 'text-slate-400'}`}></i>
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Logística</div>
                    <div className={`text-xs font-bold uppercase ${selectedOrder.status === 'EN_LOGISTICA' ? 'text-blue-600' :
                      (selectedOrder.status === 'PRONTO' || selectedOrder.status === 'PRONTO SECTOR') ? 'text-emerald-600' : 'text-slate-600'
                      }`}>
                      {selectedOrder.status === 'EN_LOGISTICA'
                        ? `HACIA ${selectedOrder.nextService || 'LOGISTICA'}`
                        : `${selectedOrder.status || 'PENDIENTE'}${selectedOrder.nextService ? ' ➔ ' + selectedOrder.nextService : ''}`
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">

              {/* CONTROL LIST */}
              <div className="col-span-12 lg:col-span-6 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 flex flex-col min-h-[400px]">
                <div className="flex items-center gap-3 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 shrink-0">
                  <i className="fa-solid fa-list-check text-cyan-500"></i> Control de Archivos
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px]">{files.filter(f => !['OK', 'FINALIZADO', 'FALLA', 'CANCELADO'].includes(normalizeStatus(f))).length} Pendientes</span>
                </div>

                <div className="">
                  <div className="space-y-2">
                    {files.filter(f => !['OK', 'FINALIZADO', 'FALLA', 'CANCELADO'].includes(normalizeStatus(f))).map(file => (
                      <FileItem
                        key={file.ArchivoID || file.id}
                        file={file}
                        onAction={(f, action) => openActionModal(f.ArchivoID || f.id, action)}
                        extraInfo={{
                          roll: activeRoll?.nombre || 'General',
                          machine: activeRollMetrics?.maquinaNombre || activeRoll?.NombreMaquina || activeRollMetrics?.maquinaId || 'Sin Asignar'
                        }}
                      />
                    ))}
                    {files.filter(f => !['OK', 'FINALIZADO', 'FALLA', 'CANCELADO'].includes(normalizeStatus(f))).length === 0 && (
                      <div className="text-center py-10 text-slate-300 italic text-sm">
                        <i className="fa-solid fa-check-circle text-2xl mb-2 text-slate-200 block"></i>
                        Todo controlado.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* VISUALIZER (Detailed) */}
              <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 flex flex-col">
                  <div className="flex items-center gap-3 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 shrink-0">
                    <i className="fa-solid fa-magnifying-glass-chart text-purple-500"></i> Visualizador de Producción
                  </div>
                  <div className="p-1">
                    {pedidoMetrics && pedidoMetrics.allFiles && pedidoMetrics.allFiles.length > 0 ? (
                      Object.entries(pedidoMetrics.allFiles.reduce((acc, f) => {
                        const mat = f.Material || 'Sin Material';
                        if (!acc[mat]) acc[mat] = [];
                        acc[mat].push(f);
                        return acc;
                      }, {})).map(([material, matFiles]) => (
                        <div key={material} className="mb-6 last:mb-0">
                          <div className="text-[10px] font-black text-slate-400 mb-2 px-1 uppercase tracking-wider border-b border-slate-100 pb-1">{material}</div>
                          <div className="space-y-3">
                            {matFiles.map((f, i) => (
                              <FileItem
                                key={i}
                                file={f}
                                readOnly={false}
                                extraInfo={{
                                  roll: activeRoll?.nombre || 'General',
                                  machine: activeRollMetrics?.maquinaNombre || activeRoll?.NombreMaquina || activeRollMetrics?.maquinaId || 'Sin Asignar'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    ) : <div className="text-center py-10 text-slate-300 italic">No hay archivos.</div>}
                  </div>
                </div>

                {/* Route */}
                <div className="h-24 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center shrink-0 overflow-x-auto">
                  <div className="mr-4 text-center shrink-0">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-1 mx-auto"><i className="fa-solid fa-route"></i></div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Ruta</div>
                  </div>
                  <div className="flex-1 flex items-center gap-4">
                    {pedidoMetrics && pedidoMetrics.ruta ? pedidoMetrics.ruta.map((r, idx) => {
                      const isDone = r.estado === 'FINALIZADO' || r.estado === 'PRONTO';
                      const isActive = r.estado === 'EN PROCESO';
                      let bgClass = 'bg-slate-200 text-slate-500 border-slate-300';
                      if (isDone) bgClass = 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200';
                      else if (isActive) bgClass = 'bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-200 animate-pulse';
                      return (
                        <React.Fragment key={idx}>
                          <div className="flex flex-col items-center gap-1 group relative">
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${bgClass} cursor-help`}>{r.area.substring(0, 2)}</div>
                            <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">{r.area} - {r.estado}</div>
                          </div>
                          {idx < pedidoMetrics.ruta.length - 1 && (<div className={`h-1 flex-1 min-w-[20px] ${isDone ? 'bg-emerald-300' : 'bg-slate-300'}`}></div>)}
                        </React.Fragment>
                      )
                    }) : <span className="text-xs text-slate-300 italic">Sin ruta</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-slate-300">
            <i className="fa-solid fa-hand-pointer text-5xl opacity-30 mb-4 animate-bounce"></i>
            <div className="font-bold text-slate-400">Seleccione una orden del lote</div>
          </div>
        )}
      </main >

      {/* MODAL DE ACCIONES (FALLA / CANCELAR) */}
      {controlAction && (controlAction === 'FALLA' || controlAction === 'CANCELADO') && (
        <div className="fixed inset-0 z-[1400] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`px-6 py-4 border-b flex justify-between items-center ${controlAction === 'FALLA' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className={`font-black text-lg ${controlAction === 'FALLA' ? 'text-red-600' : 'text-slate-600'}`}>
                {controlAction === 'FALLA' ? 'REPORTAR FALLA DE IMPRESIÓN' : 'CANCELAR ARCHIVO'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <div className="p-6 space-y-4">
              {controlAction === 'FALLA' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Falla</label>
                  <select
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-400 font-medium text-sm text-slate-700"
                    value={failureType}
                    onChange={(e) => setFailureType(e.target.value)}
                  >
                    <option value="">Seleccione...</option>
                    {fallaTypes.map(f => (
                      <option key={f.FallaID} value={f.FallaID} title={f.DescripcionDefault}>{f.Titulo}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* INPUT METROS A REPONER (OPCIONAL) */}
              {controlAction === 'FALLA' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Cantidad a Reponer (Metros) <span className="text-slate-400 font-normal normal-case">(Opcional. Dejar vacío para reponer todo)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-400 font-medium text-sm text-slate-700"
                    placeholder="Ej: 2.5"
                    value={metersToReprint}
                    onChange={(e) => setMetersToReprint(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {controlAction === 'FALLA' ? 'Observaciones / Detalle' : 'Motivo de Cancelación'}
                </label>
                <textarea
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 min-h-[100px] text-sm font-medium text-slate-700 resize-none"
                  placeholder={controlAction === 'FALLA' ? "Describa el problema..." : "Ingrese el motivo..."}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                ></textarea>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={closeModal} className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button
                  onClick={handleSubmitModal}
                  className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${controlAction === 'FALLA' ? 'bg-red-500 shadow-red-200 hover:bg-red-600' : 'bg-slate-700 shadow-slate-300 hover:bg-slate-800'}`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div >
      )}

      {/* MODAL PRONTO SECTOR (NUEVO) */}
      {
        completedOrderData && (
          <div className="fixed inset-0 z-[1600] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-4 border-emerald-400">

              <div className="bg-emerald-500 p-8 flex flex-col items-center justify-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                <i className="fa-solid fa-clipboard-check text-7xl mb-4 relative z-10 animate-[bounce_1s_infinite]"></i>
                <h2 className="text-3xl font-black uppercase tracking-widest relative z-10">¡ORDEN PRONTA!</h2>
              </div>

              <div className="p-8 flex flex-col items-center text-center">

                <div className="w-full bg-slate-50 rounded-2xl border-2 border-slate-100 p-4 mb-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DESTINO FÍSICO (Canasto)</div>
                  <div className="text-xl font-black text-slate-700 leading-tight">
                    {completedOrderData.destino || 'LOGÍSTICA'}
                  </div>
                </div>

                <div className="w-full bg-blue-50 rounded-2xl border-2 border-blue-100 p-4 mb-6">
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">PRÓXIMO SERVICIO</div>
                  <div className="text-2xl font-black text-blue-700 leading-tight">
                    {completedOrderData.proximoServicio || '---'}
                  </div>
                </div>

                <button onClick={() => setCompletedOrderData(null)} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-black text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-600 hover:scale-[1.02] transition-all active:scale-95">
                  <i className="fa-solid fa-check mr-2"></i> ENTENDIDO
                </button>

                <div className="mt-4 text-[10px] text-slate-400 font-bold uppercase">
                  Cerrando automáticamente en 10s...
                </div>

              </div>
            </div>
          </div>
        )
      }

      {/* Helper Modal Rollo */}
      {
        rollModalOpen && (
          <RollDetailsModal
            roll={currentRollDetails}
            onClose={() => setRollModalOpen(false)}
          />
        )
      }

      {/* Helper Modal Detalle Orden (Ojito) */}
      <OrderDetailModal
        order={inspectingOrder}
        onClose={() => setInspectingOrder(null)}
      />

      {/* Toast Component */}
      {
        toast.visible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={closeToast}
          />
        )
      }

    </div >
  );
};

export default FilePrintControl;
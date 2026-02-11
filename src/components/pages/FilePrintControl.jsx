import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { fileControlService, ordersService } from "../../services/api";
import KPICard from '../common/KPICard';
import OrderCard from '../production/components/OrderCard';
import RollDetailsModal from '../modals/RollDetailsModal';
import OrderDetailModal from '../production/components/OrderDetailModal';
import FileControlCard from '../production/components/FileControlCard';

import { socket } from '../../services/socketService';
import Toast from '../ui/Toast';

const SmallRollMetrics = ({ roll, metrics }) => {
  if (!roll) return null;
  const execution = metrics?.stats?.execution || 0;
  const currentMeters = metrics?.stats?.metrosProducidos ?? 0;
  const totalMeters = metrics?.stats?.metrosTotales ?? roll.metros ?? 0;
  const metersText = metrics?.stats ? `${currentMeters}/${totalMeters}m` : `${totalMeters}m`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm flex items-center gap-6 mb-4 w-full">
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] font-black text-slate-400 uppercase leading-none">LOTE</div>
          <div className="font-black text-slate-700 text-lg">#{roll.id}</div>
        </div>
        <div className="h-8 w-px bg-slate-100"></div>
      </div>

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
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">PROGRESO</div>
          <div className="font-bold text-xs text-slate-700">{metersText}</div>
        </div>
      </div>
    </div>
  );
};


const FilePrintControl = ({ areaCode }) => {
  const { user } = useAuth(); // for fallback logic if needed
  // --- STATES ---
  const [activeRoll, setActiveRoll] = useState(null);
  const [rollos, setRollos] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [files, setFiles] = useState([]);
  const [pedidoMetrics, setPedidoMetrics] = useState(null); // For Stepper and Full details

  // Loading & Metrics
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [activeRollMetrics, setActiveRollMetrics] = useState(null);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  // Modals States
  const [controlAction, setControlAction] = useState(null);
  const [selectedFileForAction, setSelectedFileForAction] = useState(null);
  const [completedOrderData, setCompletedOrderData] = useState(null);
  const [fallaTypes, setFallaTypes] = useState([]);

  // Falla Form
  const [failureType, setFailureType] = useState('');
  const [metersToReprint, setMetersToReprint] = useState('');
  const [actionReason, setActionReason] = useState('');

  // --- EFFECTS ---

  // 0. Load Falla Types
  useEffect(() => {
    fileControlService.getFallaTypes().then(setFallaTypes).catch(console.error);
  }, []);

  // 1. Load active rolls
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

  // 2. Load Orders when Roll changes
  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const rId = activeRoll?.id === 'todo' ? '' : (activeRoll?.id || '');
        const data = await fileControlService.getOrdenes(searchTerm, rId, areaCode || 'DTF');

        // Normalize
        const normalized = (data || []).map(o => ({
          id: o.OrdenID,
          code: o.CodigoOrden,
          client: o.Cliente,
          material: o.Material,
          status: o.Estado,
          sequence: o.Secuencia || 0,
          failures: o.CantidadFallas || 0,
          hasLabels: o.CantidadEtiquetas || 0,
          nextService: o.ProximoServicio
        }));
        setOrders(normalized);
      } catch (e) { console.error(e); }
      finally { setLoadingOrders(false); }
    };

    const fetchMetrics = async () => {
      if (activeRoll?.id) {
        try {
          const data = await fileControlService.getRolloMetrics(activeRoll.id);
          setActiveRollMetrics(data);
        } catch (e) { console.error(e); }
      } else setActiveRollMetrics(null);
    };

    fetchOrders();
    fetchMetrics();
  }, [activeRoll, searchTerm, areaCode]);


  // 3. Load Files and Details when Order Selected
  useEffect(() => {
    const fetchDetails = async () => {
      if (!selectedOrder) {
        setFiles([]);
        setPedidoMetrics(null);
        return;
      }
      setLoadingFiles(true);
      try {
        const data = await fileControlService.getArchivosPorOrden(selectedOrder.id);
        setFiles(data || []);

        // Also fetch full details for Stepper (using same service as visualizer)
        const fullDetails = await fileControlService.getPedidoMetrics(selectedOrder.code || selectedOrder.id);
        setPedidoMetrics(fullDetails);

      } catch (e) { console.error(e); }
      finally { setLoadingFiles(false); }
    };
    fetchDetails();
  }, [selectedOrder]);

  // 4. Socket Listeners
  useEffect(() => {
    const handleUpdate = (data) => {
      if (activeRoll) {
        // Refresh orders list
        fileControlService.getOrdenes(searchTerm, activeRoll.id, areaCode || 'DTF').then(newOrders => {
          const normalized = (newOrders || []).map(o => ({
            id: o.OrdenID,
            code: o.CodigoOrden,
            client: o.Cliente,
            material: o.Material,
            status: o.Estado,
            sequence: o.Secuencia || 0,
            failures: o.CantidadFallas || 0,
            hasLabels: o.CantidadEtiquetas || 0,
            nextService: o.ProximoServicio
          }));
          setOrders(normalized);

          if (selectedOrder) {
            const fresh = normalized.find(o => o.id === selectedOrder.id);
            if (fresh) {
              setSelectedOrder(prev => ({ ...prev, ...fresh }));
              // Check if just completed to show modal
              if (fresh.status === 'PRONTO' && prev.status !== 'PRONTO') {
                setCompletedOrderData({
                  destino: fresh.nextService || 'LOGÍSTICA', // Fallback logic
                  proximoServicio: fresh.nextService
                });
              }
            }
          }
        });
      }
      if (data.orderId && selectedOrder && data.orderId == selectedOrder.id) {
        refreshCurrentOrder();
      }
    };

    socket.on('server:order_updated', handleUpdate);
    return () => socket.off('server:order_updated', handleUpdate);
  }, [activeRoll, selectedOrder, searchTerm, areaCode]);


  // --- HELPERS ---
  const orderMetrics = React.useMemo(() => {
    const total = files.length;
    const done = files.filter(f => ['OK', 'FINALIZADO'].includes(f.EstadoArchivo)).length;
    return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [files]);

  const refreshCurrentOrder = () => {
    if (selectedOrder) {
      fileControlService.getArchivosPorOrden(selectedOrder.id).then(setFiles);
      fileControlService.getPedidoMetrics(selectedOrder.code || selectedOrder.id).then(setPedidoMetrics);
    }
  };

  // --- ACTIONS HANDLERS ---
  const handlePrintLabels = async () => {
    if (!selectedOrder) return;
    try {
      alert("Imprimiendo etiquetas... (Simulación)");
      // Call backend to regenerate/print labels
      // await fileControlService.regenerateLabels(selectedOrder.id);
    } catch (e) { console.error(e); alert("Error imprimiendo"); }
  };

  const openActionModal = (file, action) => {
    setSelectedFileForAction(file);
    setControlAction(action);
    setActionReason('');
    setFailureType('');
    setMetersToReprint('');
  };

  const closeModal = () => {
    setControlAction(null);
    setSelectedFileForAction(null);
  };

  const handleSubmitModal = async () => {
    if (!selectedFileForAction) return;

    const payload = {
      archivoId: selectedFileForAction.ArchivoID || selectedFileForAction.id,
      estado: controlAction, // Correct field
      motivo: actionReason,
      tipoFalla: failureType,
      metrosReponer: metersToReprint, // Correct field
      usuario: user?.usuario || user?.username || 'Sistema' // String username
    };

    try {
      const res = await fileControlService.controlarArchivo(payload);
      if (res.success) {
        setToast({ visible: true, message: 'Acción registrada correctamente', type: 'success' });
        refreshCurrentOrder();
        closeModal();
      } else {
        alert("Error al registrar acción");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    }
  };


  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">

      {/* --- SIDEBAR (ORDER LIST) --- */}
      <aside className="w-[360px] h-full bg-white border-r border-slate-200 flex flex-col z-10 shrink-0 shadow-xl shadow-slate-200/50">

        {/* Header Sidebar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-200">
              <i className="fa-solid fa-boxes-packing"></i>
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase leading-none">Control</h2>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Empaquetado {areaCode}</div>
            </div>
          </div>

          {/* Lote Selector */}
          <div className="relative mb-2">
            <select
              className="w-full pl-3 pr-8 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs outline-none appearance-none cursor-pointer hover:bg-slate-700 transition-colors shadow-lg shadow-slate-300"
              value={activeRoll?.id || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) setActiveRoll(null);
                else setActiveRoll(rollos.find(x => x.id === parseInt(val)));
              }}
            >
              <option value="">Seleccione Lote...</option>
              {rollos.map(r => <option key={r.id} value={r.id}>Lote #{r.id} - {r.nombre}</option>)}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
          </div>

          {/* Search */}
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              placeholder="Buscar orden..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Metrics */}
        {activeRoll && <div className="p-4 border-b border-slate-100"><SmallRollMetrics roll={activeRoll} metrics={activeRollMetrics} /></div>}

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 bg-slate-50/30">
          {loadingOrders ? (
            <div className="py-8 text-center text-cyan-500"><i className="fa-solid fa-circle-notch fa-spin"></i></div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 italic text-xs">Sin órdenes</div>
          ) : (
            orders.map(o => (
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
        </div>
      </aside>

      {/* --- MAIN CONTENT (SELECTED ORDER DETAILS) --- */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col">
        {selectedOrder ? (
          <div className="max-w-5xl mx-auto w-full pb-20">

            {/* ORDER HEADER */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <i className="fa-solid fa-box-open text-9xl text-slate-800"></i>
              </div>

              <div className="flex justify-between items-start relative z-10 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                      ORDEN
                    </span>
                    {selectedOrder.status === 'PRONTO' && <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest">COMPLETA</span>}
                  </div>
                  <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-none mb-1">
                    {selectedOrder.code || selectedOrder.id}
                  </h1>
                  <div className="text-lg font-medium text-slate-500">
                    {selectedOrder.client}
                  </div>
                </div>

                <div className="flex items-center gap-6">

                  {/* Label Button (Etiquetas) */}
                  <div
                    className={`flex items-center gap-2 group ${selectedOrder.hasLabels > 0 ? 'opacity-100 cursor-pointer hover:bg-slate-50 rounded-lg p-2 transition-all border border-transparent hover:border-slate-100' : 'opacity-40 pointer-events-none'}`}
                    onClick={selectedOrder.hasLabels > 0 ? handlePrintLabels : undefined}
                    title="Reimprimir etiquetas"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${selectedOrder.hasLabels > 0 ? 'bg-emerald-100 text-emerald-500 group-hover:bg-emerald-200' : 'bg-slate-100 text-slate-300'}`}>
                      <i className="fa-solid fa-tags text-lg"></i>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Etiquetas</div>
                      <div className={`text-xs font-bold ${selectedOrder.hasLabels > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {selectedOrder.hasLabels > 0 ? 'OK' : 'PEND'}
                      </div>
                    </div>
                  </div>

                  {/* Big Counter */}
                  <div className="text-right pl-6 border-l border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PROGRESO</div>
                    <div className="text-4xl font-black text-slate-800 leading-none">
                      {orderMetrics.done}<span className="text-xl text-slate-300">/{orderMetrics.total}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEPPER (Ruta) */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <div className="mr-2 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <i className="fa-solid fa-route"></i>
                    </div>
                  </div>
                  {pedidoMetrics && pedidoMetrics.ruta ? pedidoMetrics.ruta.map((r, idx) => {
                    const isDone = r.estado === 'FINALIZADO' || r.estado === 'PRONTO' || r.estado === 'COMPLETADO';
                    const isActive = r.estado === 'EN PROCESO';
                    let bgClass = 'bg-slate-100 text-slate-400 border-slate-200';
                    if (isDone) bgClass = 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200';
                    else if (isActive) bgClass = 'bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-200 animate-pulse';

                    return (
                      <React.Fragment key={idx}>
                        <div className="flex flex-col items-center gap-1 group relative shrink-0">
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${bgClass} cursor-help`}>
                            {r.area.substring(0, 2)}
                          </div>
                          <div className="absolute top-full mt-2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                            {r.area} - {r.estado}
                          </div>
                        </div>
                        {idx < pedidoMetrics.ruta.length - 1 && (
                          <div className={`h-1 w-8 rounded-full ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`}></div>
                        )}
                      </React.Fragment>
                    )
                  }) : <span className="text-xs text-slate-300 italic ml-2">Cargando ruta...</span>}
                </div>
              </div>
            </div>

            {/* FILES LIST (CONTAINER) */}
            <div className="space-y-4">
              {loadingFiles ? (
                <div className="py-20 text-center text-slate-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-2"></i>
                  <div>Cargando archivos...</div>
                </div>
              ) : files.length === 0 ? (
                <div className="py-20 text-center text-slate-400 italic">
                  Sin archivos de producción
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      {files.length} ARCHIVOS EN ORDEN
                    </div>
                  </div>

                  {files.map(file => (
                    <FileControlCard
                      key={file.ArchivoID || file.id}
                      file={file}
                      refreshOrder={refreshCurrentOrder}
                      onAction={openActionModal}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* BOTTOM COMPLETION BAR */}
            {orderMetrics.done === orderMetrics.total && orderMetrics.total > 0 && selectedOrder.status !== 'PRONTO' && (
              <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-500">
                <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-500/40 flex items-center gap-4">
                  <i className="fa-solid fa-check-circle text-2xl"></i>
                  <div>
                    <div className="font-black text-lg">ORDEN COMPLETA</div>
                    <div className="text-xs opacity-90">Verificando cierre automática...</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <i className="fa-solid fa-arrow-left text-4xl opacity-50"></i>
            </div>
            <div className="text-xl font-black text-slate-400">SELECCIONE UNA ORDEN</div>
            <div className="text-sm">para ver sus archivos y controlar copias</div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* 1. Action Modal (Falla/Cancel) */}
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

              {controlAction === 'FALLA' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Cantidad a Reponer (Metros) <span className="text-slate-400 font-normal normal-case">(Opcional)</span>
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

      {/* 2. Completed Order Modal (Pronto Sector) */}
      {completedOrderData && (
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

              <div className="space-y-3 w-full">
                <button onClick={() => { setCompletedOrderData(null); handlePrintLabels(); }} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-black text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-600 hover:scale-[1.02] transition-all active:scale-95">
                  <i className="fa-solid fa-print mr-2"></i> IMPRIMIR ETIQUETAS
                </button>
                <button onClick={() => setCompletedOrderData(null)} className="w-full py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50">
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Toast Wrapper */}
      {toast.visible && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, visible: false })} />}
    </div>
  );
};

export default FilePrintControl;
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Package, CheckCircle, MapPin, Search, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, XCircle, Save, Edit2 } from 'lucide-react';
import { wmsService } from '../../services/modules/wmsService';

const WmsReceiveSalesView = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [cancelDialog, setCancelDialog] = useState(null);
    const [editingItem, setEditingItem] = useState(null); // { pedidoId, wms_variante_id, nuevaCantidad }

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await wmsService.getPreparedOrders();
            setOrders(data || []);
        } catch (error) {
            console.error('Error cargando pedidos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReceiveOrder = async (pedidoId) => {
        try {
            setConfirmDialog(null);
            const loadingToast = toast.loading('Registrando ingreso y notificando...');
            const res = await wmsService.receivePreparedOrder(pedidoId);
            toast.success(res.message || 'Ingresado con éxito', { id: loadingToast });
            loadOrders();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al ingresar pedido');
        }
    };

    const handleCancelOrder = async (pedidoId) => {
        try {
            setCancelDialog(null);
            const loadingToast = toast.loading('Cancelando pedido...');
            const res = await wmsService.cancelOrder(pedidoId);
            toast.success(res.message || 'Pedido cancelado', { id: loadingToast });
            loadOrders();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al cancelar');
        }
    };

    const handleSaveQuantity = async () => {
        if (!editingItem) return;
        try {
            const loadingToast = toast.loading('Actualizando cantidad...');
            await wmsService.updateItemQuantity(editingItem.pedidoId, {
                wms_variante_id: editingItem.wms_variante_id,
                nuevaCantidad: editingItem.nuevaCantidad
            });
            toast.success('Cantidad actualizada', { id: loadingToast });
            setEditingItem(null);
            loadOrders();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al actualizar cantidad');
        }
    };

    const preparedCount = orders.length;

    return (
        <div className="p-6 bg-slate-50 min-h-screen relative">
            
            {/* Confirmation Dialog */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-4 mb-4 text-emerald-600">
                            <div className="bg-emerald-100 p-3 rounded-full">
                                <CheckCircle size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">¿Confirmar Ingreso a Depósito?</h2>
                        </div>
                        <p className="text-slate-600 mb-6">
                            Estás a punto de recibir el pedido <strong>{confirmDialog.codigo}</strong>. 
                            Esta acción generará el ingreso en Depósito y enviará el aviso automático (WhatsApp) al cliente.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => setConfirmDialog(null)}
                                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => handleReceiveOrder(confirmDialog.id)}
                                className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2"
                            >
                                <CheckCircle size={18} />
                                Sí, Recibir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Dialog */}
            {cancelDialog && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-4 mb-4 text-red-600">
                            <div className="bg-red-100 p-3 rounded-full">
                                <XCircle size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">¿Cancelar Pedido?</h2>
                        </div>
                        <p className="text-slate-600 mb-6">
                            Estás a punto de CANCELAR el pedido <strong>{cancelDialog.codigo}</strong>. 
                            Esta acción no se puede deshacer y el pedido será removido.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => setCancelDialog(null)}
                                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Volver
                            </button>
                            <button 
                                onClick={() => handleCancelOrder(cancelDialog.id)}
                                className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all flex items-center gap-2"
                            >
                                <XCircle size={18} />
                                Sí, Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-tr from-indigo-500 to-indigo-400 p-4 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Package size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Recibir Órdenes WMS</h1>
                            <p className="text-slate-500 font-medium">Recepción en depósito y aviso automático al cliente</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={loadOrders}
                        className="self-start md:self-auto flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold shadow-sm transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                </div>

                <div className="flex items-center justify-between mb-4 px-2">
                    <h2 className="text-lg font-bold text-slate-700">Pedidos Preparados Listos para Recibir</h2>
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
                        {preparedCount} en cola
                    </span>
                </div>

                {/* Orders List */}
                <div className="space-y-4">
                    {orders.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                            <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                            <h3 className="text-xl font-bold text-slate-700 mb-2">¡Todo al día!</h3>
                            <p className="text-slate-500">No hay pedidos preparados pendientes de ingreso.</p>
                        </div>
                    ) : (
                        orders.map(order => {
                            const isExpanded = expandedOrder === order.id;

                            return (
                                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                                    {/* Card Header (Always visible) */}
                                    <div 
                                        className="p-5 flex items-center justify-between cursor-pointer"
                                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                    >
                                        <div className="flex items-center gap-6 flex-1">
                                            {/* Accent Bar */}
                                            <div className="w-1.5 h-12 rounded-full bg-indigo-500"></div>
                                            
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="font-mono text-lg font-bold text-slate-800">{order.codigo}</span>
                                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                                                        <CheckCircle size={14} />
                                                        Preparado WMS
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500 font-medium">
                                                    {order.cliente} • {new Date(order.fecha).toLocaleDateString('es-UY', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs text-slate-400 font-bold uppercase mb-0.5">Total</p>
                                                <p className="font-bold text-slate-800">{order.moneda} ${order.total}</p>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Detail View */}
                                    <div className={`overflow-hidden transition-all duration-300 border-t border-slate-100 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="p-6 bg-slate-50/50">
                                            
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Revisión de Artículos</h4>
                                                
                                                <button 
                                                    onClick={() => setCancelDialog(order)}
                                                    className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm font-bold transition-colors"
                                                >
                                                    <XCircle size={16} />
                                                    Cancelar Pedido
                                                </button>
                                            </div>
                                            
                                            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-6">
                                                {order.items.map((item, idx) => {
                                                    const isEditing = editingItem?.pedidoId === order.id && editingItem?.wms_variante_id === item.wms_variante_id;
                                                    return (
                                                        <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                            <div className="flex items-center gap-4 flex-1">
                                                                {isEditing ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <input 
                                                                            type="number" 
                                                                            min="0"
                                                                            value={editingItem.nuevaCantidad}
                                                                            onChange={(e) => setEditingItem({...editingItem, nuevaCantidad: Number(e.target.value)})}
                                                                            className="w-20 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                        />
                                                                        <button 
                                                                            onClick={handleSaveQuantity}
                                                                            className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"
                                                                            title="Guardar Cantidad"
                                                                        >
                                                                            <Save size={18} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => setEditingItem(null)}
                                                                            className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                                                            title="Cancelar Edición"
                                                                        >
                                                                            <XCircle size={18} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="bg-slate-100 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-slate-600">
                                                                            x{item.cantidad}
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => setEditingItem({ pedidoId: order.id, wms_variante_id: item.wms_variante_id, nuevaCantidad: item.cantidad })}
                                                                            className="text-slate-400 hover:text-indigo-500 transition-colors"
                                                                            title="Editar Cantidad"
                                                                        >
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="font-bold text-slate-800">{item.nombre_variante}</p>
                                                                    <p className="text-xs text-slate-500 font-mono">SKU: {item.sku || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Action Bar */}
                                            <div className="flex justify-end pt-2 border-t border-slate-200">
                                                <button 
                                                    onClick={() => setConfirmDialog(order)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                                                >
                                                    <CheckCircle size={20} />
                                                    Confirmar Ingreso a Depósito y Avisar
                                                </button>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div>
        </div>
    );
};

export default WmsReceiveSalesView;

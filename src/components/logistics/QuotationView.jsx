import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import QuotationEditModal from './QuotationEditModal';


const ESTADO_COLORS = {
    confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    zero: 'bg-slate-100 text-slate-500 border-slate-200',
};

function QuotationCard({ order, onOpen, onDelete }) {
    const monto = Number(order.MontoTotal || 0);
    const estados = monto > 0 ? 'confirmed' : monto === 0 ? 'zero' : 'pending';

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
            <div className="flex items-stretch">
                {/* Barra lateral de estado */}
                <div className={`w-1.5 shrink-0 ${monto > 0 ? 'bg-emerald-500' : 'bg-amber-400'}`} />

                <div className="flex-1 p-4">
                    <div className="flex justify-between items-start gap-3">
                        <div>
                            <div className="font-black text-slate-800 tracking-tight text-base font-mono">{order.NoDocERP}</div>
                            <div className="text-xs text-slate-400 mt-0.5">Última actualización: {order.FechaGeneracion ? new Date(order.FechaGeneracion).toLocaleString('es-UY') : '—'}</div>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ESTADO_COLORS[estados]}`}>
                            {monto > 0 ? `${order.Moneda} ${monto.toFixed(2)}` : 'Sin costo'}
                        </span>
                    </div>

                    {order.QR_Trabajo && (
                        <div className="mt-2 text-sm text-slate-600 truncate" title={order.QR_Trabajo}>
                            <i className="fa-solid fa-tag text-slate-300 mr-1.5" />
                            {order.QR_Trabajo}
                        </div>
                    )}

                    <div className="mt-3 flex gap-2">
                        <button
                            onClick={() => onOpen(order.NoDocERP)}
                            className="flex-1 text-sm font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-transparent px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 group-hover:shadow-sm"
                        >
                            <i className="fa-solid fa-pen-to-square" />
                            Editar Cotización
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(order.NoDocERP); }}
                            className="w-10 shrink-0 text-sm font-bold text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 border border-rose-200 hover:border-transparent rounded-lg transition-all flex items-center justify-center group-hover:shadow-sm"
                            title="Eliminar Cotización Completa"
                        >
                            <i className="fa-solid fa-trash-can" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function QuotationView({ areaFilter }) {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [editingDoc, setEditingDoc] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [viewMode, setViewMode] = useState('card');

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const query = new URLSearchParams();
            if (search) query.append('q', search);
            if (areaFilter) query.append('areaId', areaFilter);

            const res = await api.get(`/quotation/list?${query.toString()}`);
            setOrders(res.data || []);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    }, [search, refreshKey, areaFilter]);

    const handleDeleteBundle = async (docId) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente todo el pedido ${docId} y sus cotizaciones? Esta acción es irreversible.`)) {
            return;
        }

        try {
            await api.delete(`/web-orders/bundle/${docId}`);
            setRefreshKey(k => k + 1);
        } catch (err) {
            alert('Error al intentar eliminar: ' + (err.response?.data?.error || err.message));
        }
    };


    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleSaved = () => {
        setRefreshKey(k => k + 1);  // Refrescar lista
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header de la vista */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <i className="fa-solid fa-file-invoice-dollar text-indigo-600" />
                            Confirmación de Cotización
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">Revisá y ajustá los costos antes de imprimir las etiquetas.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center mr-2">
                            <button onClick={() => setViewMode('card')} className={`px-3 py-1 text-sm font-bold rounded-md transition-all ${viewMode==='card' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><i className="fa-solid fa-grip mr-1"/> Tarjetas</button>
                            <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm font-bold rounded-md transition-all ${viewMode==='list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><i className="fa-solid fa-list mr-1"/> Lista</button>
                        </div>
                        <button onClick={() => setRefreshKey(k => k + 1)}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-indigo-700 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg transition-all flex items-center gap-2 shadow-sm">
                            <i className="fa-solid fa-rotate-right" />
                            Actualizar
                        </button>
                    </div>
                </div>

                {/* Buscador */}
                <div className="mt-3 relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por número de documento, trabajo o código..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                    />
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                            <i className="fa-solid fa-spinner fa-spin text-4xl text-indigo-400" />
                            <span className="text-sm font-medium">Cargando cotizaciones...</span>
                        </div>
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl font-medium text-sm">
                        ⚠️ {error}
                    </div>
                )}

                {!loading && !error && orders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <i className="fa-solid fa-file-circle-check text-5xl mb-4 text-slate-300" />
                        <p className="text-lg font-semibold text-slate-500">No hay cotizaciones pendientes</p>
                        <p className="text-sm mt-1">Importa órdenes en la pestaña "Cargar Órdenes" para comenzar.</p>
                    </div>
                )}

                {!loading && orders.length > 0 && viewMode === 'card' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {orders.map(order => (
                            <QuotationCard key={order.ID} order={order} onOpen={setEditingDoc} onDelete={handleDeleteBundle} />
                        ))}
                    </div>
                )}

                {!loading && orders.length > 0 && viewMode === 'list' && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-bold uppercase text-[11px] tracking-wider">Orden</th>
                                    <th className="px-4 py-3 font-bold uppercase text-[11px] tracking-wider">Trabajo</th>
                                    <th className="px-4 py-3 font-bold uppercase text-[11px] tracking-wider">Actualizado</th>
                                    <th className="px-4 py-3 font-bold uppercase text-[11px] tracking-wider text-right">Importe</th>
                                    <th className="px-4 py-3 font-bold uppercase text-[11px] tracking-wider text-center w-24">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orders.map(order => {
                                    const monto = Number(order.MontoTotal || 0);
                                    const estados = monto > 0 ? 'confirmed' : monto === 0 ? 'zero' : 'pending';
                                    return (
                                        <tr key={order.ID} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-4 py-3 font-black text-slate-800 font-mono text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-6 rounded-full ${monto > 0 ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                                    {order.NoDocERP}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 max-w-[400px] truncate" title={order.QR_Trabajo}>
                                                {order.QR_Trabajo || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                                                {order.FechaGeneracion ? new Date(order.FechaGeneracion).toLocaleString('es-UY') : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${ESTADO_COLORS[estados]}`}>
                                                    {monto > 0 ? `${order.Moneda} ${monto.toFixed(2)}` : 'Sin costo'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setEditingDoc(order.NoDocERP)} className="w-full text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-transparent px-3 py-1.5 rounded transition-all text-xs font-bold">
                                                        Editar
                                                    </button>
                                                    <button onClick={() => handleDeleteBundle(order.NoDocERP)} className="w-8 shrink-0 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 border border-rose-200 hover:border-transparent px-0 py-1.5 rounded transition-all text-xs font-bold" title="Eliminar Cotización Completa">
                                                        <i className="fa-solid fa-trash-can" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal editor */}
            {editingDoc && (
                <QuotationEditModal
                    noDocERP={editingDoc}
                    currentUser={user}
                    areaFilter={areaFilter}
                    onClose={() => setEditingDoc(null)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { ordersService } from '../../services/api';
import OrderRouteTracker from '../orders/OrderRouteTracker';

const OrderTrackingModal = ({ orderId, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('files');
    const [route, setRoute] = useState([]);

    useEffect(() => {
        if (!orderId) return;
        setLoading(true);
        ordersService.getFullDetails(orderId)
            .then(res => {
                setData(res);
                // Calculate Route from History
                if (res.history && res.history.length > 0) {
                    // Re-process reliably: Sort chronological
                    const sortedHistory = [...res.history].sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));
                    const uniqueRoute = [];

                    sortedHistory.forEach(h => {
                        if (h.AreaCode) {
                            const last = uniqueRoute[uniqueRoute.length - 1];
                            if (!last || last.AreaCode !== h.AreaCode) {
                                uniqueRoute.push({
                                    id: h.AreaCode,
                                    name: h.AreaNombre,
                                    date: h.Fecha,
                                    status: h.Estado
                                });
                            } else {
                                // Update with latest status/date for this block if needed
                                last.status = h.Estado;
                                last.date = h.Fecha;
                            }
                        }
                    });

                    // If no route derived (maybe no AreaCodes in history), try to use current Header
                    if (uniqueRoute.length === 0 && res.header.AreaID) {
                        uniqueRoute.push({
                            id: res.header.AreaID,
                            name: res.header.AreaNombre,
                            date: res.header.FechaIngreso,
                            status: res.header.Estado
                        });
                    }

                    setRoute(uniqueRoute);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [orderId]);

    if (!orderId) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden ring-1 ring-black/5">

                {/* 1. ELEGANT HEADER */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-white z-20 shadow-sm relative">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                Orden #{data?.header?.CodigoOrden}
                            </h2>
                            {data?.header?.Estado && (
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1.5 ${data.header.Estado === 'FALLA'
                                    ? 'bg-red-50 text-red-600 ring-1 ring-red-100'
                                    : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${data.header.Estado === 'FALLA' ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`}></span>
                                    {data.header.Estado}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-5 mt-1 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5">
                                <i className="fa-regular fa-user text-slate-400"></i>
                                {data?.header?.Cliente}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <i className="fa-regular fa-clock text-slate-400"></i>
                                {data?.header?.FechaIngreso ? new Date(data.header.FechaIngreso).toLocaleDateString('es-MX') : '-'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-all absolute top-5 right-5"
                    >
                        <i className="fa-solid fa-times text-sm"></i>
                    </button>
                </div>

                {/* 2. MAIN SCROLLABLE AREA */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-blue-500"></i>
                            <p className="text-xs font-bold tracking-wider uppercase animate-pulse">Consultando Trazabilidad...</p>
                        </div>
                    ) : (data && (
                        <div className="p-6 space-y-6">

                            {/* HORIZONTAL STEPPER (TRAZABILIDAD) COMPACTA - REUTILIZABLE */}
                            <OrderRouteTracker steps={route} title="Hoja de Ruta" />

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* LEFT COLUMN: DETAILS & DESCRIPTION */}
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Detalles del Pedido</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Trabajo</div>
                                                <p className="text-slate-700 font-medium leading-relaxed">
                                                    {data.header.DescripcionTrabajo || 'Sin descripción detallada.'}
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                                <div>
                                                    <div className="text-[10px] uppercase text-slate-400 font-bold">Bultos</div>
                                                    <div className="text-lg font-bold text-slate-700">
                                                        {data.files.length > 0 ? <span className="text-xs bg-slate-100 px-2 py-1 rounded-lg">x{data.files.length} Archivos</span> : '-'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase text-slate-400 font-bold">Prioridad</div>
                                                    <div className="text-lg font-bold text-slate-700">Normal</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* STATUS CARD */}
                                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>
                                        <div className="relative z-10">
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Area Actual</div>
                                            <div className="text-3xl font-black mb-1">{data.header.AreaID}</div>
                                            <div className="text-sm text-slate-300 tracking-wide">{data.header.AreaNombre}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: TABS CONTENT */}
                                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden min-h-[400px]">
                                    {/* Tabs */}
                                    <div className="flex border-b border-slate-100 bg-slate-50/50">
                                        <button onClick={() => setActiveTab('files')} className={`flex-1 py-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'files' ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Archivos ({data.files.length})</button>
                                        <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'history' ? 'border-purple-500 text-purple-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Historial</button>
                                        <button onClick={() => setActiveTab('fails')} className={`flex-1 py-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'fails' ? 'border-red-500 text-red-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Fallas ({data.fails.length})</button>
                                    </div>

                                    {/* Content Area */}
                                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                                        {activeTab === 'files' && (
                                            <div className="space-y-3">
                                                {data.files.map(f => (
                                                    <div key={f.ArchivoID} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition-colors group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg">
                                                                <i className="fa-regular fa-file-image"></i>
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-700 text-sm group-hover:text-blue-600 transition-colors">{f.NombreArchivo}</div>
                                                                <div className="text-xs text-slate-400 mt-0.5">{f.Metros} metros • {f.Copias} copias</div>
                                                            </div>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${f.EstadoArchivo === 'OK' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{f.EstadoArchivo}</span>
                                                    </div>
                                                ))}
                                                {data.files.length === 0 && <div className="text-center py-10 text-slate-400 italic">No hay archivos.</div>}
                                            </div>
                                        )}

                                        {activeTab === 'history' && (
                                            <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pl-8 py-2">
                                                {data.history.map((h, i) => (
                                                    <div key={i} className="relative">
                                                        <span className="absolute -left-[41px] top-1 w-5 h-5 rounded-full border-4 border-white bg-slate-200 shadow-sm"></span>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div className="font-bold text-slate-700 text-sm">{h.Estado}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono">{new Date(h.Fecha).toLocaleString()}</div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 mx-[-0.5rem] px-2 py-1.5 rounded-lg border border-slate-100/50">
                                                            {h.Descripcion || 'Cambio de estado registrado.'}
                                                        </p>
                                                        {h.UsuarioID && <div className="text-[10px] text-slate-300 mt-1 text-right">Usuario: {h.UsuarioID}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activeTab === 'fails' && (
                                            <div className="space-y-3">
                                                {data.fails.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                                                        <i className="fa-regular fa-face-smile text-3xl"></i>
                                                        <span className="text-sm">Sin fallas reportadas.</span>
                                                    </div>
                                                ) : data.fails.map(f => (
                                                    <div key={f.FallaID} className="bg-red-50 p-4 rounded-2xl border border-red-100 flex gap-4">
                                                        <div className="text-red-500 text-xl"><i className="fa-solid fa-bug"></i></div>
                                                        <div>
                                                            <div className="font-bold text-red-800 text-sm">{f.TipoFallaTitulo}</div>
                                                            <p className="text-xs text-red-600 mt-1">{f.Observaciones}</p>
                                                            <div className="text-[10px] text-red-400 mt-2 font-mono">{new Date(f.FechaFalla).toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OrderTrackingModal;

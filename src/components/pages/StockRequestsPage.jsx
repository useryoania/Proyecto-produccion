import React, { useState, useEffect } from 'react';
import { stockService } from '../../services/api';

const StockRequestsPage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Pendiente'); // 'Todos', 'Pendiente', 'Entregado'

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await stockService.getAllRequests();
            setRequests(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await stockService.updateStatus(id, newStatus);
            loadRequests(); // Reload
        } catch (error) {
            alert("Error updating status");
        }
    };

    const filteredRequests = requests.filter(r => filter === 'Todos' || r.Estado === filter);

    if (loading) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Solicitudes de Insumos</h1>
                <div className="flex bg-white rounded-lg shadow-sm p-1">
                    {['Todos', 'Pendiente', 'Entregado'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === f ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4">
                {filteredRequests.map(req => (
                    <div key={req.SolicitudID} className={`bg-white p-4 rounded-xl shadow border-l-4 flex justify-between items-center ${req.Prioridad === 'Urgente' ? 'border-red-500' : 'border-slate-200'}`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg text-slate-800">{req.Item}</span>
                                {req.Prioridad === 'Urgente' && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold">URGENTE</span>}
                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">{req.AreaID}</span>
                            </div>
                            <div className="text-slate-500 text-sm">
                                <span className="font-semibold text-slate-700">{req.Cantidad} {req.Unidad}</span> - {req.Observaciones || 'Sin observaciones'}
                            </div>
                            <div className="text-xs text-slate-400 mt-2">
                                {new Date(req.FechaSolicitud).toLocaleString()}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {req.Estado === 'Pendiente' && (
                                <>
                                    <button
                                        onClick={() => handleStatusChange(req.SolicitudID, 'Entregado')}
                                        className="bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                                    >
                                        <i className="fa-solid fa-check"></i> Despachar
                                    </button>
                                </>
                            )}
                            <div className={`px-4 py-2 rounded-lg font-bold text-sm ${req.Estado === 'Entregado' ? 'bg-slate-100 text-slate-500' : 'bg-orange-50 text-orange-600'}`}>
                                {req.Estado}
                            </div>
                        </div>
                    </div>
                ))}
                {filteredRequests.length === 0 && <div className="text-center text-slate-400 py-10">No hay solicitudes en este estado.</div>}
            </div>
        </div>
    );
};

export default StockRequestsPage;

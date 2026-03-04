import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, AlertCircle, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import api from '../../services/api';

const ExcepcionesDeudaView = () => {
    const [excepciones, setExcepciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchExcepciones = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/web-retiros/excepciones');
            setExcepciones(res.data);
        } catch (err) {
            console.error(err);
            setError('Error al cargar la tabla de retiros excepcionales.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExcepciones();
    }, []);

    const handleMarcarGestionado = async (id, currentStatus) => {
        try {
            await api.put(`/web-retiros/excepciones/${id}/gestionar`, { gestionado: !currentStatus });
            fetchExcepciones();
        } catch (err) {
            alert('Error al actualizar el estado: ' + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 animate-in fade-in">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ENCABEZADO */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-100 flex justify-center items-center rounded-xl">
                            <AlertCircle className="text-rose-600" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Autorizaciones Excepcionales</h1>
                            <p className="text-sm font-medium text-slate-500">Retiros entregados con deuda pendientes de gestión o cobro administrativo.</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchExcepciones}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Refrescar
                    </button>
                </div>

                {error && (
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-200 font-bold">
                        {error}
                    </div>
                )}

                {/* TABLA O GRILLA */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                        <h2 className="text-lg font-bold text-slate-700">Historial de Excepciones</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                                    <th className="p-4">F. Registro</th>
                                    <th className="p-4">Orden / Cliente</th>
                                    <th className="p-4">Monto Aprox.</th>
                                    <th className="p-4">Motivo / Explicación</th>
                                    <th className="p-4">Usuario Aut.</th>
                                    <th className="p-4">Estado Cobro</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm font-medium">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="text-center p-8 text-slate-400">Cargando datos...</td>
                                    </tr>
                                ) : excepciones.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center p-8 text-slate-400 font-bold">No hay retiros excepcionales registrados.</td>
                                    </tr>
                                ) : (
                                    excepciones.map(item => (
                                        <tr key={item.Id} className={`hover:bg-slate-50 transition-colors ${item.Gestionado ? 'opacity-60 bg-slate-50/50' : ''}`}>
                                            <td className="p-4 text-slate-600">
                                                {new Date(item.Fecha).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-black text-slate-800">{item.OrdenRetiro}</div>
                                                <div className="text-xs text-slate-500">{item.NombreCliente || item.CodigoCliente}</div>
                                            </td>
                                            <td className="p-4 font-bold text-slate-700">
                                                ${Number(item.Monto || 0).toLocaleString()}
                                            </td>
                                            <td className="p-4 max-w-xs">
                                                <div className="text-slate-700 whitespace-pre-wrap">{item.Explicacion || '-'}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                                                    <ShieldCheck size={14} className="text-rose-500" /> Conf. Admin
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleMarcarGestionado(item.Id, item.Gestionado)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${item.Gestionado
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                                        }`}
                                                >
                                                    {item.Gestionado ? <CheckCircle size={16} /> : <Clock size={16} />}
                                                    {item.Gestionado ? 'Gestionado' : 'Pendiente Pago'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ExcepcionesDeudaView;

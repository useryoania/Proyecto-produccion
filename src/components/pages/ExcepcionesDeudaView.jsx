import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, CheckCircle, Clock, XCircle, ChevronDown, FileText, User, DollarSign, MessageSquare } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

const ESTADOS = ['Pendiente', 'Cobrado', 'Condonado'];

const ESTADO_CONFIG = {
    Pendiente: { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: <Clock size={14} />, label: 'Pendiente' },
    Cobrado: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle size={14} />, label: 'Cobrado' },
    Condonado: { color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <XCircle size={14} />, label: 'Condonado' },
};

const EstadoBadge = ({ estado }) => {
    const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.Pendiente;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
            {cfg.icon} {cfg.label}
        </span>
    );
};

const GestionModal = ({ item, onClose, onSaved }) => {
    const [estado, setEstado] = useState(item?.Estado || 'Pendiente');
    const [nota, setNota] = useState(item?.NotaGestion || '');
    const [loading, setLoading] = useState(false);

    const handleGuardar = async () => {
        setLoading(true);
        try {
            await api.put(`/web-retiros/excepciones/${item.Id}/gestionar`, { estado, nota });
            toast.success('Estado actualizado correctamente.');
            onSaved();
            onClose();
        } catch (err) {
            toast.error('Error al actualizar: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 rounded-t-2xl flex justify-between items-center">
                    <div>
                        <div className="text-white font-black text-lg">Gestionar Deuda</div>
                        <div className="text-slate-300 text-sm">{item?.OrdenRetiro} · {item?.NombreCliente || item?.CodigoCliente}</div>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-slate-300 text-2xl font-bold leading-none">&times;</button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                    {/* Info */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 gap-2 text-sm">
                        <div><span className="font-bold text-slate-500">Orden:</span> <span className="font-black">{item?.OrdenRetiro}</span></div>
                        <div><span className="font-bold text-slate-500">Monto:</span> <span className="font-black text-rose-600">$ {Number(item?.Monto || 0).toLocaleString()}</span></div>
                        <div className="col-span-2"><span className="font-bold text-slate-500">Motivo original:</span> <span className="text-slate-700">{item?.Explicacion}</span></div>
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Estado de Cobro</label>
                        <div className="flex gap-2">
                            {ESTADOS.map(e => {
                                const cfg = ESTADO_CONFIG[e];
                                return (
                                    <button
                                        key={e}
                                        onClick={() => setEstado(e)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${estado === e
                                                ? `${cfg.color} border-current scale-105 shadow-sm`
                                                : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                            }`}
                                    >
                                        {cfg.icon} {e}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Nota */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nota de gestión (opcional)</label>
                        <textarea
                            value={nota}
                            onChange={e => setNota(e.target.value)}
                            placeholder="Ej: Cobrado en efectivo el 10/03, transferencia #12345..."
                            rows={3}
                            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                        />
                    </div>

                    <div className="flex gap-3 mt-1">
                        <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={handleGuardar}
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-2.5 rounded-xl transition-colors shadow-md"
                        >
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExcepcionesDeudaView = () => {
    const [excepciones, setExcepciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [itemGestion, setItemGestion] = useState(null);

    const fetchExcepciones = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/web-retiros/excepciones');
            setExcepciones(res.data);
        } catch (err) {
            console.error(err);
            setError('Error al cargar la tabla de retiros con deuda.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchExcepciones(); }, []);

    const filtered = filtroEstado === 'todos'
        ? excepciones
        : excepciones.filter(e => e.Estado === filtroEstado);

    const resumen = {
        total: excepciones.length,
        pendiente: excepciones.filter(e => e.Estado === 'Pendiente').length,
        cobrado: excepciones.filter(e => e.Estado === 'Cobrado').length,
        condonado: excepciones.filter(e => e.Estado === 'Condonado').length,
        montoPendiente: excepciones.filter(e => e.Estado === 'Pendiente').reduce((a, e) => a + Number(e.Monto || 0), 0),
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ENCABEZADO */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-100 flex justify-center items-center rounded-xl">
                            <AlertCircle className="text-rose-600" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pagos con Deuda</h1>
                            <p className="text-sm font-medium text-slate-500">Retiros entregados con deuda pendiente · control de cobro administrativo.</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchExcepciones}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refrescar
                    </button>
                </div>

                {/* TARJETAS RESUMEN */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total registros', value: resumen.total, color: 'bg-slate-800', icon: <FileText size={20} className="text-white" /> },
                        { label: 'Pendientes', value: resumen.pendiente, color: 'bg-rose-500', icon: <Clock size={20} className="text-white" /> },
                        { label: 'Cobrados', value: resumen.cobrado, color: 'bg-emerald-500', icon: <CheckCircle size={20} className="text-white" /> },
                        { label: 'Monto pendiente', value: `$ ${resumen.montoPendiente.toLocaleString()}`, color: 'bg-orange-500', icon: <DollarSign size={20} className="text-white" /> },
                    ].map(c => (
                        <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-2 shadow-sm">
                            <div className={`w-10 h-10 ${c.color} rounded-xl flex items-center justify-center`}>{c.icon}</div>
                            <div className="text-2xl font-black text-slate-800">{c.value}</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{c.label}</div>
                        </div>
                    ))}
                </div>

                {/* FILTROS + TABLA */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h2 className="text-lg font-bold text-slate-700">Historial de Retiros con Deuda</h2>
                        <div className="flex gap-2">
                            {['todos', ...ESTADOS].map(e => (
                                <button
                                    key={e}
                                    onClick={() => setFiltroEstado(e)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border  ${filtroEstado === e
                                            ? 'bg-slate-800 text-white border-slate-800'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                        }`}
                                >
                                    {e === 'todos' ? '⭐ Todos' : e}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-rose-50 text-rose-600 p-4 m-4 rounded-xl border border-rose-200 font-bold">{error}</div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Orden / Cliente</th>
                                    <th className="p-4">Monto</th>
                                    <th className="p-4">Motivo</th>
                                    <th className="p-4">Autorizó</th>
                                    <th className="p-4">Estado Cobro</th>
                                    <th className="p-4">Nota Gestión</th>
                                    <th className="p-4 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {loading ? (
                                    <tr><td colSpan="8" className="text-center p-10 text-slate-400">Cargando datos...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center p-10 text-slate-400 font-bold">No hay registros con ese filtro.</td></tr>
                                ) : (
                                    filtered.map(item => (
                                        <tr key={item.Id} className={`hover:bg-slate-50 transition-colors ${item.Estado !== 'Pendiente' ? 'opacity-70' : ''}`}>
                                            <td className="p-4 text-slate-500 whitespace-nowrap text-xs">
                                                {new Date(item.Fecha).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-black text-slate-800">{item.OrdenRetiro}</div>
                                                <div className="text-xs text-slate-500">{item.NombreCliente || item.CodigoCliente || '—'}</div>
                                            </td>
                                            <td className="p-4 font-bold text-rose-600 whitespace-nowrap">
                                                $ {Number(item.Monto || 0).toLocaleString()}
                                            </td>
                                            <td className="p-4 max-w-[200px]">
                                                <div className="text-slate-700 text-xs whitespace-pre-wrap line-clamp-2">{item.Explicacion || '—'}</div>
                                            </td>
                                            <td className="p-4 text-xs">
                                                <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg font-bold">
                                                    <User size={12} /> {item.NombreAutorizador || `#${item.UsuarioAutorizador}`}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <EstadoBadge estado={item.Estado || 'Pendiente'} />
                                                {item.FechaGestion && (
                                                    <div className="text-[10px] text-slate-400 mt-1">
                                                        {new Date(item.FechaGestion).toLocaleDateString('es-UY')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 max-w-[160px]">
                                                <div className="text-xs text-slate-500 whitespace-pre-wrap line-clamp-2">{item.NotaGestion || '—'}</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => setItemGestion(item)}
                                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors"
                                                >
                                                    Gestionar
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

            {/* Modal de gestión */}
            {itemGestion && (
                <GestionModal
                    item={itemGestion}
                    onClose={() => setItemGestion(null)}
                    onSaved={fetchExcepciones}
                />
            )}
        </div>
    );
};

export default ExcepcionesDeudaView;

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/apiClient';

/**
 * Administración de diseñadores del portal (ruta /designers).
 * v1: aprobar / desactivar cuentas. Acá se irán sumando más herramientas
 * (vínculos con clientes, pedidos por diseñador, etc.).
 */
const DesignersAdminPage = () => {
    const [disenadores, setDisenadores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null); // DisenadorID en proceso
    const [searchTerm, setSearchTerm] = useState('');

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/web-designer/admin/lista');
            setDisenadores(res.data?.data || []);
        } catch (err) {
            console.error('Error cargando diseñadores', err);
            alert(err.response?.data?.error || 'Error cargando diseñadores');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const actualizar = async (d, cambios) => {
        setSaving(d.DisenadorID);
        try {
            await api.put(`/web-designer/admin/${d.DisenadorID}`, cambios);
            await cargar();
        } catch (err) {
            alert(err.response?.data?.error || 'Error actualizando el diseñador');
        } finally {
            setSaving(null);
        }
    };

    const filtrados = disenadores.filter(d => {
        const q = searchTerm.toLowerCase();
        return !q || (d.Nombre || '').toLowerCase().includes(q) || (d.Email || '').toLowerCase().includes(q);
    });

    const pendientes = filtrados.filter(d => !d.Aprobado);
    const aprobados = filtrados.filter(d => !!d.Aprobado);

    const DesignerCard = ({ d, pendiente }) => (
        <div className={`bg-white p-4 rounded-2xl shadow-sm border transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${pendiente ? 'border-amber-200 shadow-amber-100/50' : 'border-slate-100 hover:shadow-md'}`}>
            {pendiente && <div className="absolute top-0 right-0 bg-amber-100 text-amber-600 text-[10px] font-bold px-2 py-1 rounded-bl-xl uppercase tracking-wider">Pendiente</div>}
            {!pendiente && !d.Activo && <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-bl-xl uppercase tracking-wider">Inactivo</div>}

            <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl text-xl shadow-sm shrink-0 ${pendiente ? 'bg-amber-100 text-amber-600' : d.Activo ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}>
                    <i className="fa-solid fa-palette"></i>
                </div>
                <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-800 leading-tight truncate">{d.Nombre}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{d.Email}</p>
                </div>
            </div>

            <div className="space-y-2">
                {d.Telefono && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                        <i className="fa-solid fa-phone text-cyan-400 w-4 text-center"></i>
                        <span>{d.Telefono}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                    <i className="fa-solid fa-calendar text-cyan-400 w-4 text-center"></i>
                    <span>Alta: {d.FechaAlta ? new Date(d.FechaAlta).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                        <i className="fa-solid fa-users text-cyan-400 w-4 text-center"></i>
                        <span><b>{d.Clientes}</b> cliente{d.Clientes === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                        <i className="fa-solid fa-clipboard-list text-cyan-400 w-4 text-center"></i>
                        <span><b>{d.Pedidos}</b> pedido{d.Pedidos === 1 ? '' : 's'}</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 mt-4">
                {pendiente ? (
                    <button
                        onClick={() => actualizar(d, { aprobado: true })}
                        disabled={saving === d.DisenadorID}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving === d.DisenadorID
                            ? <i className="fa-solid fa-circle-notch fa-spin"></i>
                            : <><i className="fa-solid fa-check"></i> Aprobar</>}
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => actualizar(d, { activo: !d.Activo })}
                            disabled={saving === d.DisenadorID}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 ${d.Activo
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200'}`}
                            title={d.Activo ? 'Bloquea el ingreso del diseñador' : 'Vuelve a habilitar el ingreso'}
                        >
                            {saving === d.DisenadorID
                                ? <i className="fa-solid fa-circle-notch fa-spin"></i>
                                : d.Activo
                                    ? <><i className="fa-solid fa-ban"></i> Desactivar</>
                                    : <><i className="fa-solid fa-rotate-left"></i> Reactivar</>}
                        </button>
                        <button
                            onClick={() => window.confirm('¿Quitar la aprobación? El diseñador no va a poder ingresar hasta que lo apruebes de nuevo.') && actualizar(d, { aprobado: false })}
                            disabled={saving === d.DisenadorID}
                            className="w-11 flex items-center justify-center text-rose-500 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all disabled:opacity-50"
                            title="Quitar aprobación"
                        >
                            <i className="fa-solid fa-user-xmark"></i>
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
            <div className="max-w-6xl mx-auto">

                <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 flex items-center justify-center bg-cyan-600 rounded-2xl text-white shadow-lg shadow-cyan-200">
                            <i className="fa-solid fa-palette text-2xl"></i>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Diseñadores del Portal</h1>
                            <p className="text-slate-400 text-sm mt-1 font-medium italic">Aprobación y gestión de cuentas de diseñadores</p>
                        </div>
                    </div>
                    <div className="relative mt-4 md:mt-0 md:w-72">
                        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition-all"
                        />
                    </div>
                </header>

                {loading ? (
                    <div className="text-center py-20">
                        <i className="fa-solid fa-circle-notch fa-spin text-cyan-500 text-3xl"></i>
                    </div>
                ) : (
                    <div className="space-y-10 pb-20">
                        {/* Pendientes de aprobación */}
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 px-2">
                                <span className={`w-2 h-2 rounded-full ${pendientes.length ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'}`}></span>
                                Pendientes de aprobación
                                {pendientes.length > 0 && <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[10px]">{pendientes.length}</span>}
                            </h3>
                            {pendientes.length === 0 ? (
                                <div className="text-center py-8 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 text-sm font-medium">
                                    No hay registros esperando aprobación
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {pendientes.map(d => <DesignerCard key={d.DisenadorID} d={d} pendiente />)}
                                </div>
                            )}
                        </div>

                        {/* Aprobados */}
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 px-2">
                                <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                                Diseñadores aprobados
                                {aprobados.length > 0 && <span className="bg-cyan-100 text-cyan-600 px-2 py-0.5 rounded-full text-[10px]">{aprobados.length}</span>}
                            </h3>
                            {aprobados.length === 0 ? (
                                <div className="text-center py-8 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 text-sm font-medium">
                                    Todavía no hay diseñadores aprobados
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {aprobados.map(d => <DesignerCard key={d.DisenadorID} d={d} />)}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DesignersAdminPage;

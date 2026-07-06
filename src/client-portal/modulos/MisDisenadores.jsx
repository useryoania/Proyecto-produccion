import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';
import { Palette, Trash2, Plus } from 'lucide-react';

/**
 * Sección "Mis Diseñadores" del perfil del cliente.
 * El cliente autoriza acá a uno o varios diseñadores a crear pedidos en su nombre,
 * y decide con un toggle si esos pedidos requieren su aprobación (default: entran directo).
 */
export const MisDisenadores = () => {
    const [vinculados, setVinculados] = useState([]);
    const [directorio, setDirectorio] = useState([]);
    const [requiereAprobacion, setRequiereAprobacion] = useState(false);
    const [seleccion, setSeleccion] = useState('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [msg, setMsg] = useState(null);

    const cargar = async () => {
        try {
            const [mis, dir] = await Promise.all([
                apiClient.get('/web-designer/mis-disenadores'),
                apiClient.get('/web-designer/directorio'),
            ]);
            setVinculados(mis?.disenadores || []);
            setRequiereAprobacion(!!mis?.requiereAprobacion);
            setDirectorio(dir?.data || []);
        } catch (e) {
            console.warn('Error cargando diseñadores', e);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const disponibles = directorio.filter(d => !vinculados.some(v => v.DisenadorID === d.DisenadorID));

    const agregar = async () => {
        if (!seleccion) return;
        setGuardando(true); setMsg(null);
        try {
            await apiClient.post('/web-designer/vincular', { disenadorId: parseInt(seleccion) });
            setSeleccion('');
            await cargar();
            setMsg({ ok: true, text: 'Diseñador autorizado.' });
        } catch (e) {
            setMsg({ ok: false, text: 'No se pudo autorizar al diseñador.' });
        } finally { setGuardando(false); }
    };

    const quitar = async (disenadorId) => {
        setGuardando(true); setMsg(null);
        try {
            await apiClient.delete(`/web-designer/vincular/${disenadorId}`);
            await cargar();
            setMsg({ ok: true, text: 'Diseñador quitado. Ya no puede crear pedidos por vos.' });
        } catch (e) {
            setMsg({ ok: false, text: 'No se pudo quitar al diseñador.' });
        } finally { setGuardando(false); }
    };

    const toggleAprobacion = async () => {
        const nuevo = !requiereAprobacion;
        setRequiereAprobacion(nuevo); // optimista
        try {
            await apiClient.put('/web-designer/aprobacion', { requiere: nuevo });
        } catch (e) {
            setRequiereAprobacion(!nuevo); // revertir
        }
    };

    if (cargando) return null;

    return (
        <div className="p-4 bg-custom-dark rounded-xl mt-3">
            <div className="flex items-center gap-2 mb-3">
                <Palette size={18} className="text-brand-gold" />
                <h3 className="text-sm font-bold text-zinc-300 uppercase">Mis Diseñadores</h3>
            </div>
            <p className="text-[11px] text-zinc-500 mb-4">
                Los diseñadores que autorices acá van a poder crear pedidos en tu nombre
                (los pedidos quedan a tu nombre, con tus precios y tus retiros).
            </p>

            {/* Vinculados */}
            {vinculados.length > 0 ? (
                <div className="flex flex-col gap-2 mb-4">
                    {vinculados.map(d => (
                        <div key={d.DisenadorID} className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2">
                            <span className="text-xs font-bold text-zinc-200">{d.Nombre}</span>
                            <button
                                type="button"
                                onClick={() => quitar(d.DisenadorID)}
                                disabled={guardando}
                                className="text-zinc-500 hover:text-brand-magenta transition-colors"
                                title="Quitar autorización"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-[11px] text-zinc-600 mb-4 italic">No autorizaste ningún diseñador todavía.</p>
            )}

            {/* Agregar */}
            {disponibles.length > 0 && (
                <div className="flex gap-2 mb-4">
                    <select
                        value={seleccion}
                        onChange={e => setSeleccion(e.target.value)}
                        className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 outline-none focus:border-brand-cyan/40"
                    >
                        <option value="">Elegir diseñador...</option>
                        {disponibles.map(d => (
                            <option key={d.DisenadorID} value={d.DisenadorID}>{d.Nombre}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={agregar}
                        disabled={!seleccion || guardando}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-brand-cyan hover:border-brand-cyan/40 transition-colors disabled:opacity-40"
                    >
                        <Plus size={14} /> Autorizar
                    </button>
                </div>
            )}

            {/* Toggle aprobación */}
            <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5">
                <div className="pr-3">
                    <div className="text-xs font-bold text-zinc-300">Aprobar pedidos antes de producción</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                        {requiereAprobacion
                            ? 'Los pedidos de tus diseñadores esperan tu aprobación antes de producirse.'
                            : 'Los pedidos de tus diseñadores entran directo a producción.'}
                    </div>
                </div>
                <div
                    onClick={toggleAprobacion}
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors shrink-0 ${requiereAprobacion ? 'bg-brand-cyan' : 'bg-zinc-700'}`}
                >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${requiereAprobacion ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
            </div>

            {msg && (
                <div className={`mt-3 text-[11px] font-bold ${msg.ok ? 'text-green-400' : 'text-custom-magenta'}`}>{msg.text}</div>
            )}
        </div>
    );
};

export default MisDisenadores;

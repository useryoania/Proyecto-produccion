import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/apiClient';
import { SERVICES_LIST } from '../constants/services';
import { Palette, LogOut, Users, ShieldCheck, X, ClipboardList } from 'lucide-react';

// Chip de estado del pedido (versión resumida para el diseñador, sin datos internos)
const estadoChip = (pedido) => {
    const s = (pedido.Estado || '').toUpperCase();
    if (s.includes('CARGANDO')) {
        return pedido.AprobacionPendiente
            ? { label: 'Esperando aprobación del cliente', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
            : { label: 'Subiendo archivos', cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-600/40' };
    }
    if (s.includes('CANCELADO')) return { label: 'Cancelado', cls: 'bg-red-500/10 text-red-400 border-red-500/30' };
    if (s.includes('FINALIZADO') || s.includes('ENTREGADO') || s.includes('AVISADO') || s.includes('PRONTO'))
        return { label: 'Finalizado', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    if (s.includes('PENDIENTE')) return { label: 'Pendiente', cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-600/40' };
    return { label: 'En producción', cls: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' };
};

/**
 * Home del diseñador: lista los clientes que lo autorizaron y permite crear un pedido
 * en nombre de uno de ellos (elige cliente → elige servicio → OrderForm impersonado).
 * Layout propio (no usa MainLayout, que es del portal de clientes).
 */
export const DesignerHomeView = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [clientes, setClientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [clienteElegido, setClienteElegido] = useState(null); // abre el selector de servicio
    const [pedidos, setPedidos] = useState([]);
    const [cargandoPedidos, setCargandoPedidos] = useState(true);

    useEffect(() => {
        // Al volver al home se limpia el modo impersonado
        localStorage.removeItem('designer_cliente');
        apiClient.get('/web-designer/mis-clientes')
            .then(res => setClientes(res?.data || []))
            .catch(e => console.warn('Error cargando clientes del diseñador', e))
            .finally(() => setCargando(false));
        apiClient.get('/web-designer/mis-pedidos')
            .then(res => setPedidos(res?.data || []))
            .catch(e => console.warn('Error cargando pedidos del diseñador', e))
            .finally(() => setCargandoPedidos(false));
    }, []);

    // Servicios con formulario interno (los externos no aplican al flujo de diseñador)
    const servicios = SERVICES_LIST.filter(s => !s.externalUrl);

    const elegirServicio = (service) => {
        localStorage.setItem('designer_cliente', JSON.stringify({
            codCliente: clienteElegido.CodCliente,
            nombre: clienteElegido.NombreFantasia || clienteElegido.Nombre,
            idCliente: clienteElegido.IDCliente,
        }));
        navigate(`/portal/estudio/pedido/${service.id}`);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            {/* Header propio */}
            <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Palette size={22} className="text-cyan-400" />
                    <div>
                        <div className="text-sm font-black uppercase tracking-wide">Portal de Diseñador</div>
                        <div className="text-[11px] text-zinc-500">{user?.name || user?.nombre} · {user?.email || user?.usuario}</div>
                    </div>
                </div>
                <button onClick={logout} className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-brand-magenta transition-colors">
                    <LogOut size={14} /> Salir
                </button>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-8">
                <div className="flex items-center gap-2 mb-1">
                    <Users size={18} className="text-brand-gold" />
                    <h2 className="text-base font-black uppercase">Mis Clientes</h2>
                </div>
                <p className="text-xs text-zinc-500 mb-6">
                    Estos clientes te autorizaron a crear pedidos en su nombre (te agregan desde su perfil del portal).
                </p>

                {cargando ? (
                    <p className="text-sm text-zinc-500">Cargando...</p>
                ) : clientes.length === 0 ? (
                    <div className="border border-dashed border-zinc-800 rounded-2xl p-10 text-center text-zinc-500 text-sm">
                        Ningún cliente te autorizó todavía.<br />
                        <span className="text-[11px] text-zinc-600">Pedile a tu cliente que te agregue desde <b>Mi Perfil → Mis Diseñadores</b> en el portal.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {clientes.map(c => (
                            <div key={c.CodCliente} className="flex items-center justify-between bg-zinc-900/70 border border-zinc-800 rounded-2xl px-5 py-4">
                                <div>
                                    <div className="text-sm font-black">{c.NombreFantasia || c.Nombre}</div>
                                    <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                                        <span className="font-mono">{c.IDCliente}</span>
                                        {!!c.RequiereAprobacion && (
                                            <span className="inline-flex items-center gap-1 text-amber-400"><ShieldCheck size={11} /> aprueba sus pedidos</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setClienteElegido(c)}
                                    className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-colors"
                                >
                                    Crear pedido
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* F3 — Seguimiento de los pedidos creados por este diseñador (sin precios) */}
                <div className="flex items-center gap-2 mt-10 mb-1">
                    <ClipboardList size={18} className="text-brand-gold" />
                    <h2 className="text-base font-black uppercase">Mis Pedidos</h2>
                </div>
                <p className="text-xs text-zinc-500 mb-6">Estado de los pedidos que creaste en nombre de tus clientes.</p>

                {cargandoPedidos ? (
                    <p className="text-sm text-zinc-500">Cargando...</p>
                ) : pedidos.length === 0 ? (
                    <div className="border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
                        Todavía no creaste ningún pedido.
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {pedidos.map(p => {
                            const chip = estadoChip(p);
                            return (
                                <div key={p.OrdenID} className="flex items-center justify-between gap-3 bg-zinc-900/70 border border-zinc-800 rounded-2xl px-5 py-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black font-mono shrink-0">{p.CodigoOrden}</span>
                                            <span className="text-[11px] text-zinc-500 truncate">{p.DescripcionTrabajo || ''}</span>
                                        </div>
                                        <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                                            <span className="text-zinc-400 font-semibold">{p.Cliente}</span>
                                            {p.Material && <span className="truncate">· {p.Material}</span>}
                                            {p.FechaIngreso && (
                                                <span>· {new Date(p.FechaIngreso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border ${chip.cls}`}>
                                        {chip.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selector de servicio */}
            {clienteElegido && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setClienteElegido(null)}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black uppercase">Pedido para {clienteElegido.NombreFantasia || clienteElegido.Nombre}</h3>
                            <button onClick={() => setClienteElegido(null)} className="text-zinc-500 hover:text-zinc-200"><X size={16} /></button>
                        </div>
                        <p className="text-[11px] text-zinc-500 mb-4">Elegí el servicio del pedido.</p>
                        <div className="grid grid-cols-2 gap-2">
                            {servicios.map(s => {
                                const Icon = s.icon;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => elegirServicio(s)}
                                        className="text-left p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 hover:border-cyan-500/50 hover:bg-zinc-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            {Icon && <Icon size={14} className="text-cyan-400" />}
                                            <span className="text-xs font-black">{s.label}</span>
                                        </div>
                                        {s.desc && <div className="text-[10px] text-zinc-500 leading-tight">{s.desc}</div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DesignerHomeView;

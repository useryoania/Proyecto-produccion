import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { ChevronDown, Package, Clock, CheckCircle, XCircle, Truck, AlertCircle, History, MapPin, User } from 'lucide-react';

const ESTADO_MAP = {
    1: { label: 'Pendiente de Pago', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30', icon: Clock },
    3: { label: 'Pagado', color: 'text-green-400 bg-green-400/10 border-green-400/30', icon: CheckCircle },
    5: { label: 'Entregado', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: Package },
    6: { label: 'Cancelado', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: XCircle },
    7: { label: 'Disponible para retiro', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30', icon: Truck },
    8: { label: 'Pagado - Pronto', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', icon: CheckCircle },
};

const getEstado = (code) => ESTADO_MAP[code] || { label: `Estado ${code}`, color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30', icon: AlertCircle };

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
};

export const HistorialView = () => {
    const navigate = useNavigate();
    const [retiros, setRetiros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const [filtro, setFiltro] = useState('all');

    const FILTROS = [
        { key: 'all', label: 'Todas', active: 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/40' },
        { key: 'pendiente', label: 'Pendientes', estados: [1], active: 'bg-amber-400/20 text-amber-400 border-amber-400/40' },
        { key: 'pagado', label: 'Pagadas', estados: [3, 8], active: 'bg-green-400/20 text-green-400 border-green-400/40' },
        { key: 'entregado', label: 'Entregadas', estados: [5], active: 'bg-blue-400/20 text-blue-400 border-blue-400/40' },
        { key: 'cancelado', label: 'Canceladas', estados: [6], active: 'bg-red-400/20 text-red-400 border-red-400/40' },
    ];

    useEffect(() => {
        const fetchHistorial = async () => {
            try {
                const data = await apiClient.get('/web-retiros/mis-retiros/historial');
                setRetiros(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching historial:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistorial();
    }, []);

    const toggleExpand = (id) => {
        setExpanded(prev => prev[id] ? {} : { [id]: true });
    };

    const filtroActivo = FILTROS.find(f => f.key === filtro);
    const retirosFiltrados = filtro === 'all'
        ? retiros
        : retiros.filter(r => filtroActivo?.estados?.includes(r.Estado));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-lg md:max-w-none mx-auto space-y-3 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <History size={48} strokeWidth={1} className="text-brand-gold" />
                <div>
                    <h2 className="text-lg font-bold text-zinc-300 uppercase">Historial de <span className="text-custom-cyan">Pedidos</span></h2>
                    <p className="text-zinc-500 uppercase text-xs">Todos tus retiros.</p>
                </div>
            </div>

            {/* Filter - Mobile: select */}
            <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="md:hidden w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm font-semibold text-zinc-100 outline-none focus:border-brand-cyan transition-colors appearance-none cursor-pointer"
            >
                {FILTROS.map(f => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                ))}
            </select>

            {/* Filter - Desktop: badges */}
            <div className="hidden md:flex flex-wrap gap-2">
                {FILTROS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFiltro(f.key)}
                        className={`px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full border transition-all ${filtro === f.key
                            ? f.active
                            : 'bg-zinc-800/50 text-zinc-500 border-zinc-700 hover:text-zinc-300 hover:border-zinc-600'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {retirosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                    <Package size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No hay retiros con este filtro</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {retirosFiltrados.map(retiro => {
                        const estado = getEstado(retiro.Estado);
                        const EstadoIcon = estado.icon;
                        const isOpen = expanded[retiro.OrdIdRetiro];

                        return (
                            <div key={retiro.OrdIdRetiro} className="bg-brand-dark rounded-xl overflow-hidden">
                                {/* Retiro Header */}
                                <button
                                    onClick={() => toggleExpand(retiro.OrdIdRetiro)}
                                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-800/50 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2 gap-3">
                                            <span className="text-base font-black text-custom-cyan uppercase tracking-tight whitespace-nowrap shrink-0">{retiro.OrdIdRetiro}</span>
                                            <span className={`px-2 md:px-1.5 py-0.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full border mx-auto text-center ${estado.color}`}>
                                                {estado.label}
                                            </span>
                                            <span className="text-xs text-zinc-500 shrink-0 text-right">{formatDate(retiro.Fecha)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-zinc-500">
                                            {retiro.Ordenes?.length > 0 && (
                                                <span className="text-zinc-600">{retiro.Ordenes.length} orden{retiro.Ordenes.length !== 1 ? 'es' : ''}</span>
                                            )}
                                            {retiro.Monto != null && (
                                                <span className="flex flex-col items-end">
                                                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Total</span>
                                                    <span className="text-sm font-black text-zinc-100">
                                                        <span className="text-xs text-zinc-500 mr-0.5">{retiro.Moneda == 2 || String(retiro.Moneda).toUpperCase().includes('USD') ? 'US$' : '$'}</span>{Number(retiro.Monto).toLocaleString('es-UY', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronDown
                                        size={16}
                                        className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {/* Expanded Orders */}
                                <div
                                    className="overflow-hidden transition-all duration-300 ease-in-out"
                                    style={{
                                        maxHeight: isOpen ? '2000px' : '0px',
                                        opacity: isOpen ? 1 : 0,
                                    }}
                                >
                                    <div className="px-4 pb-3 pt-3 border-t border-zinc-800">
                                        {retiro.LugarRetiro && (
                                            <div className="flex flex-col gap-1 py-2">
                                                <p className="text-xs text-zinc-500">
                                                    <span className="text-zinc-400 font-medium">{retiro.LugarRetiro}</span>{retiro.AgenciaNombre ? ` (${retiro.AgenciaNombre})` : ''}
                                                </p>
                                                {(retiro.DireccionEnvio || retiro.LocalidadEnvio || retiro.ReceptorNombre) && (
                                                    <div className="flex flex-col gap-1.5 mt-1">
                                                        {retiro.ReceptorNombre && (
                                                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                                                                <User size={12} className="shrink-0 text-brand-gold" />
                                                                <span>Recibe: <span className="font-medium">{retiro.ReceptorNombre}</span></span>
                                                            </div>
                                                        )}
                                                        {(retiro.DireccionEnvio || retiro.LocalidadEnvio) && (
                                                            <div className="flex items-start gap-1.5 text-[11px] text-zinc-400">
                                                                <MapPin size={12} className="mt-0.5 shrink-0 text-brand-gold" />
                                                                <p>
                                                                    {retiro.DireccionEnvio && <span>{retiro.DireccionEnvio}</span>}
                                                                    {(retiro.LocalidadEnvio || retiro.DepartamentoEnvio) && (
                                                                        <span className="text-zinc-500">
                                                                            {retiro.DireccionEnvio ? ' • ' : ''}
                                                                            {retiro.LocalidadEnvio}{retiro.DepartamentoEnvio ? `, ${retiro.DepartamentoEnvio}` : ''}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {retiro.Ordenes?.length > 0 ? (
                                            <div className="space-y-1">
                                                {/* Header */}
                                                <div className="hidden md:grid grid-cols-[1fr_1.2fr_0.6fr_0.6fr] gap-2 px-3 py-1">
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Orden</span>
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Producto</span>
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">Cantidad</span>
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Importe</span>
                                                </div>
                                                {retiro.Ordenes.map((ord, i) => (
                                                    <div key={i} className="py-1.5 px-3 rounded-lg bg-zinc-800/50">
                                                        {/* Desktop: grid */}
                                                        <div className="hidden md:grid grid-cols-[1fr_1.2fr_0.6fr_0.6fr] gap-2 items-center">
                                                            <p className="text-sm font-semibold text-zinc-200 truncate">{ord.codigo}</p>
                                                            <p className="text-xs text-zinc-400 truncate">{ord.producto || '-'}</p>
                                                            <p className="text-xs text-zinc-400 text-center">{ord.cantidad || '-'}</p>
                                                            <span className="text-sm font-bold text-custom-cyan text-right">
                                                                {ord.moneda} {ord.costo.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                        {/* Mobile: stacked */}
                                                        <div className="md:hidden">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-sm font-semibold text-zinc-200 truncate">{ord.codigo}</p>
                                                                <span className="text-sm font-bold text-custom-cyan shrink-0 ml-3">
                                                                    {ord.moneda} {ord.costo.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                {ord.producto && <span className="text-[11px] text-zinc-400 truncate">{ord.producto}</span>}
                                                                {ord.cantidad && <span className="text-[11px] text-zinc-500 shrink-0">Cant: {ord.cantidad}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-zinc-600 py-2">Sin órdenes asociadas</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

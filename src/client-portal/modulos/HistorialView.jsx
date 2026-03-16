import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { ChevronDown, Package, Clock, CheckCircle, XCircle, Truck, AlertCircle, History } from 'lucide-react';

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
                            <div key={retiro.OrdIdRetiro} className="bg-custom-dark rounded-xl overflow-hidden">
                                {/* Retiro Header */}
                                <button
                                    onClick={() => toggleExpand(retiro.OrdIdRetiro)}
                                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-800/50 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="w-16 text-base font-black text-custom-cyan uppercase tracking-tight">{retiro.OrdIdRetiro}</span>
                                            <span className={`px-2 md:px-1.5 py-0.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full border ${estado.color}`}>
                                                {estado.label}
                                            </span>
                                            <span className="text-xs text-zinc-500">{formatDate(retiro.Fecha)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-zinc-500">
                                            {retiro.Ordenes?.length > 0 && (
                                                <span className="text-zinc-600">{retiro.Ordenes.length} orden{retiro.Ordenes.length !== 1 ? 'es' : ''}</span>
                                            )}
                                            {retiro.Monto != null && (
                                                <span className="flex flex-col items-end">
                                                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Total</span>
                                                    <span className="text-sm font-black text-zinc-100">
                                                        <span className="text-xs text-zinc-500 mr-0.5">$</span>{Number(retiro.Monto).toLocaleString('es-UY', { minimumFractionDigits: 2 })}
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
                                        maxHeight: isOpen ? `${(retiro.Ordenes?.length || 0) * 60 + 60}px` : '0px',
                                        opacity: isOpen ? 1 : 0,
                                    }}
                                >
                                    <div className="px-4 pb-3 pt-3 border-t border-zinc-800">
                                        {retiro.LugarRetiro && (
                                            <p className="text-xs text-zinc-500 py-2">
                                                <span className="text-zinc-400 font-medium">Retiro:</span> {retiro.LugarRetiro}
                                                {retiro.AgenciaNombre && ` — ${retiro.AgenciaNombre}`}
                                            </p>
                                        )}
                                        {retiro.Ordenes?.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {retiro.Ordenes.map((ord, i) => (
                                                    <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-zinc-800/50">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-zinc-200 truncate">{ord.codigo}</p>
                                                            <p className="text-xs text-zinc-500 truncate">{ord.nombre}</p>
                                                        </div>
                                                        <span className="text-sm font-bold text-custom-cyan shrink-0 ml-3">
                                                            {ord.moneda} {ord.costo.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
                                                        </span>
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

import React, { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, Phone, Clock, Filter, AlertCircle, Edit, Save, X,
    ExternalLink, Check, ChevronDown, Loader2, Users, MousePointerClick,
    TrendingUp, LogOut, BarChart3
} from 'lucide-react';
import { socket } from '../../../services/socketService';
import { Listbox, Transition } from '@headlessui/react';

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
const fmt = (ts) =>
    ts
        ? new Intl.DateTimeFormat('es-UY', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: false,
          }).format(new Date(ts.replace('Z', '')))
        : '—';

const formatOrigen = (o) => {
    if (!o) return 'Desconocido';
    if (o.toLowerCase() === 'catalogo_precios_modal') return 'Modal de Precios';
    return o;
};

const estados = [
    { id: 'NUEVO',             label: 'Nuevo',              color: 'text-custom-cyan',     bg: 'bg-custom-cyan/10' },
    { id: 'CONTACTADO',        label: 'Contactado',         color: 'text-brand-magenta',   bg: 'bg-brand-magenta/10' },
    { id: 'PEDIDO_INICIADO',   label: 'Pedido Iniciado',    color: 'text-custom-yellow',   bg: 'bg-custom-yellow/10' },
    { id: 'COMPRA_CONCRETADA', label: 'Compra Concretada',  color: 'text-green-500',       bg: 'bg-green-500/10' },
    { id: 'PERDIDO',           label: 'Perdido / Sin Interés', color: 'text-zinc-500',     bg: 'bg-zinc-500/10' },
];

// ────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, accent }) {
    return (
        <div className="bg-zinc-100 border border-zinc-200 shadow-sm rounded-xl p-5 flex items-start gap-4">
            <div className={`p-2.5 rounded-lg ${accent}`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-2xl font-bold text-zinc-900">{value}</p>
                {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

function FunnelBar({ label, value, max, color }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-zinc-700">{label}</span>
                <span className="text-sm font-bold text-zinc-900">{value}</span>
            </div>
            <div className="w-full h-3 bg-zinc-200 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className={`h-full rounded-full ${color}`}
                />
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────
// Analytics tab
// ────────────────────────────────────────────────
function AnalyticsDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetch_ = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/analytics/summary', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Error al obtener métricas');
            setData(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetch_();
        socket.on('leads:update', fetch_);
        socket.on('analytics:update', fetch_);
        return () => {
            socket.off('leads:update', fetch_);
            socket.off('analytics:update', fetch_);
        };
    }, []);

    if (loading)
        return (
            <div className="flex flex-col items-center justify-center min-h-[350px]">
                <Loader2 className="w-8 h-8 text-brand-cyan animate-spin mb-3" />
                <p className="text-zinc-400">Cargando métricas...</p>
            </div>
        );

    if (error)
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
            </div>
        );

    const max = data.modalOpen || 1;

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard icon={MousePointerClick} label="Aperturas del Modal" value={data.modalOpen} sub="sesiones únicas" accent="bg-brand-cyan" />
                <KpiCard icon={Users} label="Leads Generados" value={data.totalLeads} sub="enviaron sus datos" accent="bg-green-500" />
                <KpiCard icon={TrendingUp} label="Tasa de Conversión" value={`${data.conversionRate}%`} sub="aperturas → envío" accent="bg-custom-yellow" />
                <KpiCard icon={LogOut} label="Tasa de Abandono" value={`${data.abandonRate}%`} sub="cerraron sin enviar" accent="bg-brand-magenta" />
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
                {/* Embudo */}
                <div className="bg-zinc-100 border border-zinc-200 shadow-sm rounded-xl p-6 space-y-5">
                    <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wider">Embudo de Conversión</h2>
                    <FunnelBar label="Abrieron el modal" value={data.modalOpen} max={max} color="bg-brand-cyan" />
                    <FunnelBar label="Enviaron el formulario" value={data.formSubmit} max={max} color="bg-green-500" />
                    <FunnelBar label="Abandonaron" value={data.formAbandon} max={max} color="bg-brand-magenta" />
                </div>

                {/* Top categorías */}
                <div className="bg-zinc-100 border border-zinc-200 shadow-sm rounded-xl p-6">
                    <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-5">
                        Categorías más consultadas
                    </h2>
                    {data.topCategories.length === 0 ? (
                        <p className="text-zinc-400 text-sm italic">Sin clicks registrados aún.</p>
                    ) : (
                        <div className="space-y-4">
                            {data.topCategories.slice(0, 6).map(({ categoria, clicks }, i) => {
                                const maxClicks = data.topCategories[0].clicks;
                                const pct = (clicks / maxClicks) * 100;
                                return (
                                    <div key={categoria}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-zinc-700 truncate max-w-[70%]">{categoria}</span>
                                            <span className="text-sm font-bold text-brand-cyan">{clicks} clicks</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
                                                className="h-full rounded-full bg-brand-cyan"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ────────────────────────────────────────────────
// CRM tab
// ────────────────────────────────────────────────
function CRMTab({ leads, loading, filterStatus, setFilterStatus, editingLead, setEditingLead, handleUpdateStatus }) {
    const filteredLeads = filterStatus === 'ALL' ? leads : leads.filter(l => l.EstadoComercial === filterStatus);

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Filtro */}
            <div className="mb-6">
                <Listbox value={filterStatus} onChange={setFilterStatus}>
                    <div className="relative w-full sm:w-56 z-50">
                        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-zinc-100 border border-zinc-200 py-2.5 pl-4 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 text-sm font-medium text-zinc-800">
                            <span className="block truncate">
                                {filterStatus === 'ALL' ? 'Todos los estados' : estados.find(e => e.id === filterStatus)?.label}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500">
                                <Filter className="h-4 w-4" />
                            </span>
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-zinc-100 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-sm border border-zinc-200">
                                {[{ id: 'ALL', label: 'Todos los estados' }, ...estados].map((e) => (
                                    <Listbox.Option
                                        key={e.id}
                                        value={e.id}
                                        className={({ active }) =>
                                            `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-800'}`
                                        }
                                    >
                                        {({ selected }) => (
                                            <>
                                                <span className={`block truncate ${selected ? 'font-bold' : 'font-medium'}`}>{e.label}</span>
                                                {selected && (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand-cyan">
                                                        <Check className="h-4 w-4" />
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </Listbox.Option>
                                ))}
                            </Listbox.Options>
                        </Transition>
                    </div>
                </Listbox>
            </div>

            {/* Cards */}
            <div className="grid gap-4">
                {filteredLeads.map(lead => {
                    const statusObj = estados.find(e => e.id === lead.EstadoComercial) || estados[0];
                    const isEditing = editingLead?.LeadId === lead.LeadId;

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={lead.LeadId}
                            className="bg-zinc-100 border border-zinc-200 shadow-sm rounded-xl p-5"
                        >
                            <div className="flex flex-col sm:flex-row justify-between gap-6">
                                {/* Izq: Info */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${statusObj.bg} ${statusObj.color}`}>
                                            {statusObj.label}
                                        </div>
                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {fmt(lead.FechaCreacion)}
                                        </span>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2 text-zinc-800">
                                            <Mail className="w-4 h-4 text-zinc-400" />
                                            <span className="text-sm font-medium">{lead.Email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-zinc-800">
                                            <Phone className="w-4 h-4 text-zinc-400" />
                                            <a href={`https://wa.me/${lead.Celular?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                                className="text-sm font-medium hover:text-custom-cyan transition-colors flex items-center gap-1">
                                                {lead.Celular} <ExternalLink className="w-3 h-3 text-zinc-400" />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="text-xs text-zinc-500 tracking-widest font-semibold mt-2">
                                        ORIGEN: <span className="text-brand-magenta uppercase">{formatOrigen(lead.Origen)}</span>
                                    </div>
                                </div>

                                {/* Der: Edición */}
                                <div className="sm:w-72 flex-shrink-0 border-t sm:border-t-0 sm:border-l border-zinc-200 pt-4 sm:pt-0 sm:pl-6 flex flex-col justify-between">
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <Listbox value={editingLead.EstadoComercial} onChange={(val) => setEditingLead({ ...editingLead, EstadoComercial: val })}>
                                                <div className="relative z-40">
                                                    <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white border border-zinc-300 py-2 pl-3 pr-10 text-left text-zinc-900 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-cyan">
                                                        <span className="block truncate">{estados.find(e => e.id === editingLead.EstadoComercial)?.label || 'Seleccionar...'}</span>
                                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-zinc-500">
                                                            <ChevronDown className="h-4 w-4" />
                                                        </span>
                                                    </Listbox.Button>
                                                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                                        <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-sm border border-zinc-200">
                                                            {estados.map((e) => (
                                                                <Listbox.Option key={e.id} value={e.id}
                                                                    className={({ active }) =>
                                                                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-zinc-100 text-brand-cyan' : 'text-zinc-900'}`
                                                                    }
                                                                >
                                                                    {({ selected }) => (
                                                                        <>
                                                                            <span className={`block truncate ${selected ? 'font-bold' : 'font-medium'}`}>{e.label}</span>
                                                                            {selected && (
                                                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand-cyan">
                                                                                    <Check className="h-4 w-4" />
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </Listbox.Option>
                                                            ))}
                                                        </Listbox.Options>
                                                    </Transition>
                                                </div>
                                            </Listbox>
                                            <textarea
                                                className="w-full bg-white border border-zinc-300 text-zinc-900 text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan min-h-[60px] resize-none"
                                                placeholder="Añadir notas internas..."
                                                value={editingLead.NotasVentas || ''}
                                                onChange={(e) => setEditingLead({ ...editingLead, NotasVentas: e.target.value })}
                                            />
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleUpdateStatus(lead.LeadId, editingLead.EstadoComercial, editingLead.NotasVentas)}
                                                    className="flex-1 bg-brand-cyan hover:bg-brand-cyan/80 text-white text-xs font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-1 shadow-sm"
                                                >
                                                    <Save className="w-3 h-3" /> Guardar
                                                </button>
                                                <button onClick={() => setEditingLead(null)} className="px-3 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col">
                                            <div className="flex-1">
                                                <p className="text-xs text-zinc-500 mb-1 font-bold uppercase tracking-wider">Notas de venta:</p>
                                                <p className="text-sm text-zinc-700 italic line-clamp-3 leading-relaxed">{lead.NotasVentas || 'Sin notas.'}</p>
                                            </div>
                                            <button onClick={() => setEditingLead(lead)}
                                                className="mt-4 w-full bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-sm border border-zinc-300">
                                                <Edit className="w-3 h-3" /> Modificar Estado / Notas
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
                {filteredLeads.length === 0 && !loading && (
                    <div className="text-center py-12 text-zinc-500 bg-zinc-100 rounded-xl border border-zinc-200 border-dashed">
                        No hay leads en este estado.
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ────────────────────────────────────────────────
// Main View
// ────────────────────────────────────────────────
const TABS = [
    { id: 'crm', label: 'Gestión de Leads', icon: Users },
    { id: 'analytics', label: 'Analíticas', icon: BarChart3 },
];

export default function LeadsCRMView() {
    const [activeTab, setActiveTab] = useState('crm');
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [editingLead, setEditingLead] = useState(null);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/analytics/leads', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Error al obtener leads');
            setLeads(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
        socket.on('leads:update', fetchLeads);
        return () => socket.off('leads:update', fetchLeads);
    }, []);

    const handleUpdateStatus = async (leadId, newStatus, newNotes) => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`/api/analytics/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ estadoComercial: newStatus, notasVentas: newNotes }),
            });
            if (!res.ok) throw new Error('Error al actualizar lead');
            setLeads(leads.map(l =>
                l.LeadId === leadId
                    ? { ...l, EstadoComercial: newStatus, NotasVentas: newNotes, UltimaActualizacion: new Date().toISOString() }
                    : l
            ));
            setEditingLead(null);
        } catch (err) {
            alert('No se pudo actualizar: ' + err.message);
        }
    };

    if (loading)
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-brand-cyan animate-spin mb-4" />
                <p className="text-zinc-400">Cargando CRM de Leads...</p>
            </div>
        );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-brand-cyan mb-1">CRM de Leads</h1>
                <p className="text-sm text-zinc-500">Gestión comercial y seguimiento de contactos web</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-zinc-200 rounded-xl mb-8 w-fit">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            activeTab === id
                                ? 'bg-white text-brand-cyan shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Error banner (CRM tab only) */}
            {error && activeTab === 'crm' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Tab content */}
            <AnimatePresence mode="wait">
                {activeTab === 'crm' ? (
                    <CRMTab
                        key="crm"
                        leads={leads}
                        loading={loading}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        editingLead={editingLead}
                        setEditingLead={setEditingLead}
                        handleUpdateStatus={handleUpdateStatus}
                    />
                ) : (
                    <AnalyticsDashboard key="analytics" />
                )}
            </AnimatePresence>
        </div>
    );
}

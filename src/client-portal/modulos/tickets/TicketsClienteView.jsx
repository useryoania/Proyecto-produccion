import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../pautas/GlassCard';
import { CustomButton } from '../../pautas/CustomButton';
import { apiClient } from '../../api/apiClient';
import { Plus, MessageSquare, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CreateTicketModal from './CreateTicketModal';

export const TicketsClienteView = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/tickets');
            if (res.success) {
                setTickets(res.data || []);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const getStatusBadge = (statusId) => {
        const statuses = {
            1: { label: 'Abierto', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            2: { label: 'En Proceso', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            3: { label: 'Esperando tu respuesta', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
            4: { label: 'Resuelto', class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
            5: { label: 'Cerrado', class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
        };
        const st = statuses[statusId] || { label: 'Desconocido', class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${st.class}`}>{st.label}</span>;
    };

    return (
        <div className="animate-fade-in max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-zinc-300 uppercase flex items-center gap-2">
                        <MessageSquare className="text-brand-gold" size={24} />
                        Centro de <span className="text-custom-cyan">Ayuda</span>
                    </h2>
                    <p className="text-zinc-500 text-sm">Gestiona tus consultas y reclamos técnicos.</p>
                </div>
                <CustomButton onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={18} /> Nuevo Ticket
                </CustomButton>
            </div>

            <GlassCard className="p-0 overflow-hidden">
                {/* Vista Desktop (Tabla) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider">
                                <th className="p-4 border-b border-zinc-700/50 font-semibold rounded-tl-lg">ID</th>
                                <th className="p-4 border-b border-zinc-700/50 font-semibold">F. Actualización</th>
                                <th className="p-4 border-b border-zinc-700/50 font-semibold">Departamento</th>
                                <th className="p-4 border-b border-zinc-700/50 font-semibold">Asunto</th>
                                <th className="p-4 border-b border-zinc-700/50 font-semibold text-center">Estado</th>
                                <th className="p-4 border-b border-zinc-700/50 font-semibold text-right rounded-tr-lg">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-zinc-500">
                                        <div className="flex justify-center"><Clock className="w-6 h-6 animate-spin" /></div>
                                    </td>
                                </tr>
                            ) : tickets.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-zinc-500">
                                        No tenés tickets abiertos. ¡Todo marcha bien!
                                    </td>
                                </tr>
                            ) : (
                                tickets.map(t => (
                                    <tr key={t.TicIdTicket} className="border-b border-zinc-700/30 hover:bg-zinc-800/30 transition-colors">
                                        <td className="p-4 text-zinc-300 font-mono">#{t.TicIdTicket}</td>
                                        <td className="p-4 text-zinc-400">{new Date(t.TicFechaActualizacion).toLocaleDateString('es-UY')}</td>
                                        <td className="p-4 text-zinc-300">{t.Departamento || '-'}</td>
                                        <td className="p-4 text-zinc-200 font-medium">{t.TicAsunto}</td>
                                        <td className="p-4 text-center">{getStatusBadge(t.TicEstado)}</td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => navigate(`/portal/soporte/${t.TicIdTicket}`)}
                                                className="text-custom-cyan hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors"
                                            >
                                                Ver Chat
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Vista Mobile (Tarjetas) */}
                <div className="md:hidden flex flex-col">
                    {loading ? (
                        <div className="p-8 flex justify-center text-zinc-500">
                            <Clock className="w-6 h-6 animate-spin" />
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">
                            No tenés tickets abiertos. ¡Todo marcha bien!
                        </div>
                    ) : (
                        tickets.map(t => (
                            <div key={t.TicIdTicket} className="flex flex-col p-4 border-b border-zinc-800/60 last:border-0 gap-3 hover:bg-zinc-800/20 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-zinc-300 font-mono text-xs">#{t.TicIdTicket} • {new Date(t.TicFechaActualizacion).toLocaleDateString('es-UY')}</span>
                                        <span className="text-zinc-200 font-semibold">{t.TicAsunto}</span>
                                    </div>
                                    <div>{getStatusBadge(t.TicEstado)}</div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400 text-xs">{t.Departamento || '-'}</span>
                                    <button 
                                        onClick={() => navigate(`/portal/soporte/${t.TicIdTicket}`)}
                                        className="text-custom-cyan hover:text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                                    >
                                        Ver Chat <MessageSquare size={12} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </GlassCard>

            <CreateTicketModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onCreated={() => {
                    setIsCreateModalOpen(false);
                    fetchTickets();
                }}
            />
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import { apiClient, API_BASE_URL } from '../../../client-portal/api/apiClient';
import { socket } from '../../../services/socketService';
import { GlassCard } from '../../../client-portal/pautas/GlassCard';
import { CustomButton } from '../../../client-portal/pautas/CustomButton';
import { Search, Filter, MessageSquare, Clock, AlertCircle, FileText, Send, Lock, RotateCcw, CheckCircle, Package } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

export const HelpDeskAdminView = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [departamentos, setDepartamentos] = useState([]);

    // Filtros inbox
    const [filterDep, setFilterDep] = useState('ALL');
    const [filterEstado, setFilterEstado] = useState('OPEN'); // OPEN (1,2,3) o CLOSED (4,5)

    useEffect(() => {
        apiClient.get('/tickets/categorias').then(res => {
            if (res.success) setDepartamentos(res.data);
        }).catch(e => console.error(e));

        fetchTickets();

        // Unirse al room de admin para recibir actualizaciones en tiempo real
        socket.emit('join:helpdesk_admin');

        const handleInboxUpdate = () => fetchTickets();
        socket.on('ticket:new', handleInboxUpdate);
        socket.on('ticket:updated', handleInboxUpdate);

        return () => {
            socket.emit('leave:helpdesk_admin');
            socket.off('ticket:new', handleInboxUpdate);
            socket.off('ticket:updated', handleInboxUpdate);
        };
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await apiClient.get('/tickets');
            if (res.success) setTickets(res.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const displayTickets = tickets.filter(t => {
        let matchDep = filterDep === 'ALL' || t.DepIdDepartamento === parseInt(filterDep);
        let matchEst = filterEstado === 'ALL' ||
            (filterEstado === 'OPEN' && t.TicEstado < 4) ||
            (filterEstado === 'CLOSED' && t.TicEstado >= 4);
        return matchDep && matchEst;
    });

    const handleSelectTicket = (id) => {
        setSelectedTicketId(id);
    };

    const getStatusText = (statusId) => {
        const m = { 1: 'Abierto (Nuevo)', 2: 'En Proceso', 3: 'Esperando Respuesta Cli.', 4: 'Resuelto', 5: 'Cancelado' };
        return m[statusId] || 'Desconocido';
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-4 animate-fade-in p-4 lg:p-6 text-zinc-200">

            {/* INBOX PANEL (Left) */}
            <GlassCard className="w-full lg:w-1/3 flex flex-col p-4 rounded-xl overflow-hidden shadow-2xl border-zinc-700/50">
                <div className="mb-4 space-y-4">
                    <div>
                        <h2 className="text-xl font-bold uppercase tracking-wide flex items-center gap-2">
                            <MessageSquare className="text-custom-cyan" />
                            HelpDesk <span className="text-zinc-500 font-normal">Inbox</span>
                        </h2>
                    </div>

                    <div className="flex gap-2 text-sm">
                        <select
                            className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-2 py-1 flex-1 outline-none focus:border-custom-cyan"
                            value={filterDep}
                            onChange={(e) => setFilterDep(e.target.value)}
                        >
                            <option value="ALL">Todas las Áreas</option>
                            {departamentos.map(d => (
                                <option key={d.ID} value={d.ID}>{d.Nombre}</option>
                            ))}
                        </select>
                        <select
                            className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-2 py-1 outline-none focus:border-custom-cyan"
                            value={filterEstado}
                            onChange={(e) => setFilterEstado(e.target.value)}
                        >
                            <option value="OPEN">Abiertos</option>
                            <option value="CLOSED">Cerrados</option>
                            <option value="ALL">Todos</option>
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {loading && <div className="text-center py-4 text-zinc-500"><Clock className="animate-spin mx-auto mb-2" /> Cargando...</div>}
                    {!loading && displayTickets.length === 0 && <div className="text-center py-4 text-zinc-500">Bandeja limpia ✨</div>}

                    {displayTickets.map(t => (
                        <div
                            key={t.TicIdTicket}
                            onClick={() => handleSelectTicket(t.TicIdTicket)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${selectedTicketId === t.TicIdTicket
                                    ? 'bg-custom-cyan/10 border-custom-cyan/30 shadow-[0_0_15px_rgba(30,214,255,0.1)]'
                                    : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-500 hover:bg-zinc-800'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-custom-cyan font-mono text-xs font-bold">#{t.TicIdTicket}</span>
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${t.TicEstado >= 4 ? 'bg-zinc-700 text-zinc-400' : 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20'}`}>
                                    {getStatusText(t.TicEstado)}
                                </span>
                            </div>
                            <h4 className="font-semibold text-sm line-clamp-1 mb-1">{t.TicAsunto}</h4>
                            <div className="flex justify-between text-xs text-zinc-500 font-medium">
                                <span>{t.Departamento}</span>
                                <span>{new Date(t.TicFechaActualizacion).toLocaleDateString('es-UY')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            {/* MESSAGE THREAD PANEL (Right) */}
            <GlassCard className="hidden lg:flex flex-col flex-1 p-0 rounded-xl overflow-hidden shadow-2xl border-zinc-700/50 bg-zinc-950/80">
                {selectedTicketId ? (
                    <TicketAdminInterface
                        ticketId={selectedTicketId}
                        onUpdate={() => fetchTickets()}
                        departamentos={departamentos}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4">
                        <MessageSquare size={64} className="opacity-20" />
                        <p className="text-lg">Seleccioná un ticket del Inbox para ver los detalles.</p>
                    </div>
                )}
            </GlassCard>

            {/* TODO: Implementar version Mobile/Drawer para el Thread si es menor a lg viewport */}
        </div>
    );
};

// ==============================================================================
// SUB-COMPONENTE INTERFAZ DE ADMINISTRACION DE TICKET INDIVIDUAL
// ==============================================================================
const TicketAdminInterface = ({ ticketId, onUpdate, departamentos }) => {
    const [ticket, setTicket] = useState(null);
    const [mensajes, setMensajes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Reply State
    const [esNotaInterna, setEsNotaInterna] = useState(false);
    const [texto, setTexto] = useState('');
    const [archivos, setArchivos] = useState([]);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef(null);

    const fetchThread = async () => {
        try {
            const res = await apiClient.get(`/tickets/${ticketId}`);
            if (res.success) {
                setTicket(res.ticket);
                setMensajes(res.mensajes);
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => {
        setLoading(true);
        fetchThread();
        setEsNotaInterna(false);
        setTexto('');
        setArchivos([]);

        // Unirse al room del ticket seleccionado
        socket.emit('join:ticket', { ticketId: ticketId });

        const handleUpdate = (data) => {
            if (String(data.ticketId) === String(ticketId)) fetchThread();
        };
        socket.on('ticket:new_message', handleUpdate);
        socket.on('ticket:updated', handleUpdate);

        return () => {
            socket.emit('leave:ticket', { ticketId: ticketId });
            socket.off('ticket:new_message', handleUpdate);
            socket.off('ticket:updated', handleUpdate);
        };
    }, [ticketId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mensajes]);

    const handleSend = async () => {
        if (!texto.trim() && archivos.length === 0) return;
        setSending(true);
        try {
            const formData = new FormData();
            formData.append('texto', texto);
            formData.append('esNotaInterna', esNotaInterna);
            archivos.forEach(f => formData.append('evidencia', f));

            const res = await apiClient.postFormData(`/tickets/${ticketId}/responder`, formData);

            if (res.success) {
                toast.success(esNotaInterna ? "Nota Interna Guardada" : "Respuesta al cliente enviada.");
                setTexto('');
                setArchivos([]);
                fetchThread();
                onUpdate();
            } else {
                toast.error(res.error || 'No se pudo enviar la respuesta.');
            }
        } catch (e) {
            toast.error(e?.message || 'Error al enviar.');
        } finally {
            setSending(false);
        }
    };

    const changeStatus = async (nuevoEstado) => {
        try {
            const res = await apiClient.put(`/tickets/${ticketId}/estado`, { nuevoEstado });
            if (res.success) {
                toast.success("Estado actualizado.");
                fetchThread();
                onUpdate();
            }
        } catch (e) { toast.error("Error al cambiar estado."); }
    };

    const reasignarDep = async (depId) => {
        try {
            const res = await apiClient.put(`/tickets/${ticketId}/estado`, { departamentoId: depId });
            if (res.success) {
                toast.success("Ticket Reasignado a otra área.");
                fetchThread();
                onUpdate();
            }
        } catch (e) { toast.error("Error al reasignar."); }
    };

    if (loading || !ticket) return <div className="p-10 flex justify-center text-zinc-500"><Clock className="animate-spin" /></div>;

    const isClosed = ticket.TicEstado === 4 || ticket.TicEstado === 5;

    return (
        <div className="flex flex-col h-full relative">

            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-700/50 shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-bold font-mono text-white">#{ticket.TicIdTicket}</span>
                        <div className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                            {ticket.DepNombre}
                        </div>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-400">{ticket.TicAsunto}</h3>

                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {ticket.OrdIdOrden && (
                            <div className="flex items-center gap-1 text-xs text-brand-gold font-medium">
                                <Package size={14} /> Orden Asociada: {ticket.OrdIdOrden}
                            </div>
                        )}
                        {ticket.ClienteNombre && (
                            <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium border-l border-zinc-700 pl-3">
                                <span className="uppercase font-bold tracking-wide text-zinc-500">Cliente:</span> {ticket.ClienteNombre}
                                {ticket.ClienteCelular ? ` (${ticket.ClienteCelular})` : ''}
                            </div>
                        )}
                    </div>
                </div>

                {/* Admin Actions */}
                <div className="flex gap-2">
                    <select
                        className="bg-zinc-800 text-xs border border-zinc-700 rounded-lg p-2 text-zinc-300"
                        value={""}
                        onChange={(e) => e.target.value && reasignarDep(e.target.value)}
                    >
                        <option value="">-- Derivar a --</option>
                        {departamentos.map(d => <option key={d.ID} value={d.ID}>{d.Nombre}</option>)}
                    </select>

                    <select
                        className={`text-xs border rounded-lg p-2 font-bold uppercase ${isClosed ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}`}
                        value={ticket.TicEstado}
                        onChange={(e) => changeStatus(e.target.value)}
                    >
                        <option value="1">Abierto</option>
                        <option value="2">En Proceso</option>
                        <option value="3">Espera Cliente</option>
                        <option value="4">Resuelto</option>
                        <option value="5">Cancelado</option>
                    </select>
                </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {mensajes.map(msg => {
                    const isSystemStaff = msg.UsrIdAutor !== null;
                    const isInternalNote = msg.TMenEsNotaInterna;

                    return (
                        <div key={msg.TMenIdMensaje} className={`flex flex-col ${isSystemStaff ? 'items-end' : 'items-start'}`}>

                            <div className="text-[11px] text-zinc-500 font-bold mb-1 px-1 flex items-center gap-2">
                                {isSystemStaff ? (msg.EmpleadoNombre || 'Soporte') : (msg.ClienteNombre || 'Cliente')}
                                • {new Date(msg.TMenFecha).toLocaleString('es-UY', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                {isInternalNote && <span className="text-amber-500 flex items-center gap-1"><Lock size={12} /> Oculto al Cliente</span>}
                            </div>

                            <div className={`p-3 sm:p-4 rounded-xl max-w-[85%] text-sm 
                                ${!isSystemStaff ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-tl-sm' :
                                    isInternalNote ? 'bg-amber-500/10 text-amber-100 border border-amber-500/30 rounded-tr-sm' :
                                        'bg-custom-cyan/20 text-custom-cyan border border-custom-cyan/30 rounded-tr-sm'}
                            `}>
                                <div className="whitespace-pre-wrap">{msg.TMenTexto}</div>

                                {msg.adjuntos && msg.adjuntos.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {msg.adjuntos.map(adj => {
                                            const baseUrl = API_BASE_URL.replace(/\/api$/, '');
                                            const url = `${baseUrl}/uploads/${adj.TAdjRutaArchivo}`;
                                            return (
                                                <a key={adj.TAdjIdAdjunto} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-black/40 hover:bg-black/60 transition-colors text-white">
                                                    <FileText size={14} /> Adjunto
                                                </a>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Editor Area */}
            <div className="bg-zinc-900 border-t border-zinc-700/50 p-4 shrink-0 transition-colors data-[internal=true]:bg-amber-950/30" data-internal={esNotaInterna}>
                {isClosed ? (
                    <div className="text-center py-2 text-zinc-500 font-bold flex justify-center gap-2"><CheckCircle size={18} /> TICKET CERRADO</div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEsNotaInterna(false)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!esNotaInterna ? 'bg-custom-cyan text-zinc-900' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-700'}`}
                            >
                                Respuesta Pública
                            </button>
                            <button
                                onClick={() => setEsNotaInterna(true)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${esNotaInterna ? 'bg-amber-500 text-amber-950 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-700'}`}
                            >
                                <Lock size={12} /> Nota Interna
                            </button>
                        </div>

                        <div className="flex items-end gap-2">
                            <textarea
                                className={`flex-1 rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors border ${esNotaInterna ? 'bg-amber-950/20 text-amber-100 border-amber-500/30 focus:border-amber-500 placeholder-amber-500/50' : 'bg-zinc-800 text-white border-zinc-700 focus:border-custom-cyan'}`}
                                rows={Math.min(5, Math.max(2, texto.split('\n').length))}
                                placeholder={esNotaInterna ? "Esta nota solo la verá el equipo interno..." : "Escribe una respuesta para el cliente..."}
                                value={texto}
                                onChange={(e) => setTexto(e.target.value)}
                            />
                            <button
                                onClick={handleSend}
                                disabled={sending || !texto.trim()}
                                className={`p-4 rounded-xl font-bold transition-all disabled:opacity-50 ${esNotaInterna ? 'bg-amber-500 text-amber-950' : 'bg-custom-cyan text-zinc-900'}`}
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

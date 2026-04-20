import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/apiClient';
import { GlassCard } from '../../pautas/GlassCard';
import { CustomButton } from '../../pautas/CustomButton';
import { ArrowLeft, Send, UploadCloud, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export const TicketThreadWindow = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [ticket, setTicket] = useState(null);
    const [mensajes, setMensajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    const [archivos, setArchivos] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchDetail = async () => {
        try {
            const res = await apiClient.get(`/tickets/${id}`);
            if (res.success) {
                setTicket(res.ticket);
                setMensajes(res.mensajes);
            } else {
                setErrorMsg(res.error || 'No se pudo cargar el ticket.');
            }
        } catch (error) {
            console.error("Error loaded ticket thread:", error);
            setErrorMsg('Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
        
        // Simple polling just for thread freshness (every 30s)
        const interval = setInterval(() => {
            fetchDetail();
        }, 30000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [mensajes]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 5) {
            setErrorMsg('Máximo 5 archivos por mensaje.');
            return;
        }
        setErrorMsg('');
        setArchivos(files);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!nuevoMensaje.trim() && archivos.length === 0) return;
        
        setSending(true);
        setErrorMsg('');
        
        try {
            const formData = new FormData();
            formData.append('texto', nuevoMensaje);
            archivos.forEach(file => {
                formData.append('evidencia', file);
            });

            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tickets/${id}/responder`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                setNuevoMensaje('');
                setArchivos([]);
                fetchDetail(); // Reload chat
            } else {
                setErrorMsg(data.error || 'No se pudo enviar el mensaje.');
            }
        } catch (error) {
            console.error('Error reply:', error);
            setErrorMsg('Ups, algo falló al enviar.');
        } finally {
            setSending(false);
        }
    };

    const getStatusText = (statusId) => {
        const m = { 1: 'Abierto', 2: 'En Revisión del Equipo', 3: 'Esperando tu respuesta', 4: 'Resuelto', 5: 'Cancelado' };
        return m[statusId] || 'Desconocido';
    };

    if (loading) {
        return <div className="p-10 text-center text-zinc-400">Cargando ticket...</div>;
    }

    if (!ticket) {
        return (
            <div className="p-10 text-center space-y-4">
                <AlertCircle className="mx-auto text-red-500" size={48} />
                <p className="text-zinc-300">Ticket no encontrado o no tienes permisos.</p>
                <CustomButton onClick={() => navigate('/portal/soporte')}>Volver atras</CustomButton>
            </div>
        );
    }

    const isClosed = ticket.TicEstado === 4 || ticket.TicEstado === 5;

    return (
        <div className="animate-fade-in max-w-4xl mx-auto flex flex-col h-[85vh]">
            
            {/* Header del Ticket */}
            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-700/50 p-4 rounded-t-2xl shadow-lg shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/portal/soporte')} className="text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-zinc-200">Ticket #{ticket.TicIdTicket} <span className="text-custom-cyan font-normal uppercase text-xs px-2 py-1 bg-zinc-800 rounded ml-2">{ticket.DepNombre}</span></h2>
                        <p className="text-sm text-zinc-500 font-medium truncate max-w-sm sm:max-w-md">{ticket.TicAsunto}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs uppercase font-semibold text-zinc-500 mb-1">Estado actual</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isClosed ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {getStatusText(ticket.TicEstado)}
                    </span>
                </div>
            </div>

            {/* ZONA DE MENSAJES */}
            <GlassCard className="flex-1 overflow-y-auto rounded-none border-y-0 p-4 sm:p-6 space-y-6">
                {mensajes.map((msg, index) => {
                    const isMine = msg.CliIdAutor === user?.id;
                    const nameLabel = isMine ? 'Vos' : (msg.EmpleadoNombre || 'Soporte USER');
                    
                    return (
                        <div key={msg.TMenIdMensaje} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                            <div className="text-xs text-zinc-500 font-semibold mb-1 px-1">
                                {nameLabel} • {new Date(msg.TMenFecha).toLocaleString('es-UY', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                            </div>
                            <div className={`max-w-[85%] sm:max-w-[70%] p-3 sm:p-4 rounded-2xl ${isMine ? 'bg-custom-cyan text-zinc-900 rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 border border-zinc-700/50 rounded-tl-sm'}`}>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.TMenTexto}</p>
                                
                                {/* ADJUNTOS */}
                                {msg.adjuntos && msg.adjuntos.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {msg.adjuntos.map(adj => {
                                            const isPdf = adj.TAdjRutaArchivo.toLowerCase().endsWith('.pdf');
                                            const url = `/uploads/${adj.TAdjRutaArchivo}`;
                                            return (
                                                <a 
                                                    key={adj.TAdjIdAdjunto} 
                                                    href={url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity ${isMine ? 'bg-black/10' : 'bg-black/30'}`}
                                                >
                                                    {isPdf ? <FileText size={14} /> : <img src={url} alt="Evidencia" className="w-5 h-5 object-cover rounded" />}
                                                    Adjunto
                                                </a>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </GlassCard>

            {/* CAJA DE TEXTO (Input) */}
            <div className="bg-zinc-900 border border-zinc-700/50 p-4 rounded-b-2xl shrink-0">
                {isClosed ? (
                    <div className="text-center py-3 text-zinc-500 font-medium flex justify-center items-center gap-2">
                        <CheckCircle size={18} className="text-emerald-500" />
                        Este ticket ya fue resuelto/cerrado y no admite nuevas respuestas.
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="space-y-2">
                        {errorMsg && <div className="text-red-400 text-xs px-2">{errorMsg}</div>}
                        
                        <div className="flex items-end gap-2">
                            <label className="cursor-pointer p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-colors border border-zinc-700">
                                <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                                <UploadCloud size={20} />
                            </label>
                            
                            <textarea 
                                className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-custom-cyan outline-none resize-none"
                                rows={Math.min(4, Math.max(1, nuevoMensaje.split('\n').length))}
                                placeholder="Escribí tu respuesta acá..."
                                value={nuevoMensaje}
                                onChange={(e) => setNuevoMensaje(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend(e);
                                    }
                                }}
                            />
                            
                            <button 
                                type="submit"
                                disabled={sending || (!nuevoMensaje.trim() && archivos.length === 0)}
                                className="p-3 bg-custom-cyan text-zinc-900 disabled:opacity-50 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                        
                        {archivos.length > 0 && (
                            <div className="flex gap-2 px-2 pb-1 overflow-x-auto text-xs text-brand-gold">
                                Adjuntos cargados: {archivos.length} archivo(s).
                            </div>
                        )}
                    </form>
                )}
            </div>

        </div>
    );
};

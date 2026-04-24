import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X, UploadCloud, AlertCircle, Loader2 } from 'lucide-react';
import { GlassCard } from '../../pautas/GlassCard';
import { CustomButton } from '../../pautas/CustomButton';
import { apiClient } from '../../api/apiClient';

export default function CreateTicketModal({ isOpen, onClose, onCreated }) {
    const [loading, setLoading] = useState(false);
    const [departamentos, setDepartamentos] = useState([]);
    
    // Form state
    const [departamentoId, setDepartamentoId] = useState('');
    const [asunto, setAsunto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [ordenId, setOrdenId] = useState('');
    const [archivos, setArchivos] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setDepartamentoId('');
            setAsunto('');
            setDescripcion('');
            setOrdenId('');
            setArchivos([]);
            setErrorMsg('');
            
            // Cargar categorias dinamicamente
            apiClient.get('/tickets/categorias').then(res => {
                if (res.success) setDepartamentos(res.data);
            }).catch(err => console.error("Error cargando departamentos:", err));
        }
    }, [isOpen]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        // Validacion super rapida: max 5 archivos, max 5MB cada uno
        if (files.length > 5) {
            setErrorMsg('Máximo 5 archivos permitidos.');
            return;
        }
        const oversized = files.filter(f => f.size > 5 * 1024 * 1024);
        if (oversized.length > 0) {
            setErrorMsg('Algunos archivos superan los 5MB.');
            return;
        }
        setErrorMsg('');
        setArchivos(files);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!departamentoId || !asunto.trim() || !descripcion.trim()) {
            setErrorMsg('Por favor completa los campos obligatorios.');
            return;
        }
        
        // Categoria 1 es Prod/Calidad (según SQL base), si es así, recomendar poner orden
        if (departamentos.find(d => String(d.ID) === departamentoId)?.Nombre.toLowerCase().includes('calidad') && !ordenId) {
            if (!window.confirm("No ingresaste un ID de Orden para este Reclamo de Calidad. ¿Estás seguro que querés enviarlo sin asociarlo a un pedido? Va a demorar más en resolverse.")) {
                return;
            }
        }

        setLoading(true);
        setErrorMsg('');

        try {
            const formData = new FormData();
            formData.append('departamentoId', departamentoId);
            formData.append('asunto', asunto);
            formData.append('descripcion', descripcion);
            if (ordenId) formData.append('ordenId', ordenId);
            formData.append('prioridad', 2); // Default client priority

            archivos.forEach(file => {
                formData.append('evidencia', file);
            });

            const data = await apiClient.postFormData('/tickets', formData);

            if (data.success) {
                onCreated();
            } else {
                setErrorMsg(data.error || 'Error al crear el ticket.');
            }
        } catch (error) {
            console.error('Error post ticket:', error);
            setErrorMsg('Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={!loading ? onClose : () => {}} className="relative z-50">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-left align-middle shadow-2xl transition-all">
                    
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-zinc-100 uppercase">
                            Nueva <span className="text-custom-cyan">Consulta o Reclamo</span>
                        </Dialog.Title>
                        <button onClick={onClose} disabled={loading} className="text-zinc-500 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Departamento *</label>
                                <select 
                                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-3 text-sm focus:ring-1 focus:ring-custom-cyan outline-none"
                                    value={departamentoId}
                                    onChange={(e) => setDepartamentoId(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">-- Selecciona el área --</option>
                                    {departamentos.map(d => (
                                        <option key={d.ID} value={d.ID}>{d.Nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Orden Asociada (Opcional)</label>
                                <input 
                                    type="number"
                                    placeholder="Ej. ID Pedido (153820)"
                                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-3 text-sm focus:ring-1 focus:ring-custom-cyan outline-none"
                                    value={ordenId}
                                    onChange={(e) => setOrdenId(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Asunto / Resumen *</label>
                            <input 
                                type="text"
                                placeholder="Ej. Faltaron metros de tela en el pedido / Pago no verificado"
                                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-3 text-sm focus:ring-1 focus:ring-custom-cyan outline-none"
                                value={asunto}
                                onChange={(e) => setAsunto(e.target.value)}
                                disabled={loading}
                                maxLength={200}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Descripción Detallada *</label>
                            <textarea 
                                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-3 text-sm focus:ring-1 focus:ring-custom-cyan outline-none min-h-[120px] resize-y"
                                placeholder="Describí tu problema al detalle para que el equipo pueda resolverlo lo antes posible..."
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Evidencia Fotográfica (Opcional, Max 5)</label>
                            <div className="relative border-2 border-dashed border-zinc-700 rounded-lg p-6 hover:border-custom-cyan/50 transition-colors bg-zinc-800/30 text-center">
                                <input 
                                    type="file" 
                                    multiple
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={loading}
                                />
                                <UploadCloud className="mx-auto h-8 w-8 text-zinc-500 mb-2" />
                                <div className="text-sm text-zinc-400">
                                    <span className="font-semibold text-custom-cyan">Presioná para subir</span> o arrastrá
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">PNG, JPG o PDF hasta 5MB</p>
                            </div>
                            {archivos.length > 0 && (
                                <div className="mt-2 text-xs text-brand-gold font-medium">
                                    {archivos.length} archivo(s) seleccionado(s).
                                </div>
                            )}
                        </div>

                        {errorMsg && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
                                <AlertCircle size={16} /> {errorMsg}
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-zinc-800">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-5 py-2 rounded-lg text-sm font-semibold uppercase text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <CustomButton type="submit" disabled={loading} className="flex flex-row items-center justify-center gap-2">
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                {loading ? 'Enviando...' : 'Abrir Ticket'}
                            </CustomButton>
                        </div>
                    </form>

                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

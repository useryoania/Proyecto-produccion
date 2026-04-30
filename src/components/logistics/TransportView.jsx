import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { logisticsService } from '../../services/modules/logisticsService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Truck, RefreshCw, Search, Tag, Clock, Printer,
    ListChecks, Navigation, History, FileDown, FileImage,
    File, Camera, X, PackageCheck, Loader2, Plus, Trash2
} from 'lucide-react';

const TransportView = () => {
    const [transports, setTransports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ACTIVE'); // 'ACTIVE' | 'ALL'

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await logisticsService.getActiveTransports();
            setTransports(data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar transportes');
        } finally {
            setLoading(false);
        }
    };

    // MODAL STATE
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [modalFiles, setModalFiles] = useState([]); // [{ id, file }]
    const [bultoMappings, setBultoMappings] = useState({}); // { [bultoId]: { checked: boolean, fileId: string | 'none' } }
    const hiddenFileInputRef = useRef(null);

    const openUploadModal = async (transport) => {
        setLoading(true);
        try {
            const details = await logisticsService.getRemitoByCode(transport.CodigoRemito);
            setModalData({ transport, items: details.items });
            setModalFiles([]);

            const initialMap = {};
            details.items.forEach(i => {
                if (i.BultoEstado !== 'ENTREGADO') {
                    initialMap[i.BultoID] = { checked: false, fileId: 'none' };
                }
            });
            setBultoMappings(initialMap);
            setIsModalOpen(true);
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar detalle del remito');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelected = (e) => {
        const file = e.target.files[0];
        if (file) {
            const newFile = { id: Math.random().toString(36).substr(2, 9), file };
            setModalFiles(prev => [...prev, newFile]);
            
            // Asignar automÃ¡ticamente a bultos tildados sin archivo
            setBultoMappings(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(id => {
                    if (next[id].checked && next[id].fileId === 'none') {
                        next[id].fileId = newFile.id;
                    }
                });
                return next;
            });
        }
        e.target.value = null;
    };

    const removeModalFile = (id) => {
        setModalFiles(prev => prev.filter(f => f.id !== id));
        setBultoMappings(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(bid => {
                if (next[bid].fileId === id) next[bid].fileId = 'none';
            });
            return next;
        });
    };

    const handleConfirmDelivery = async () => {
        const checkedBultos = Object.entries(bultoMappings).filter(([k, v]) => v.checked);
        if (checkedBultos.length === 0) return toast.error('Debes seleccionar al menos un bulto');

        setLoading(true);
        try {
            const fileGroups = {}; 
            const bultosSinArchivo = [];

            checkedBultos.forEach(([id, map]) => {
                if (map.fileId === 'none') {
                    bultosSinArchivo.push(parseInt(id));
                } else {
                    if (!fileGroups[map.fileId]) fileGroups[map.fileId] = [];
                    fileGroups[map.fileId].push(parseInt(id));
                }
            });

            for (const [fId, bIds] of Object.entries(fileGroups)) {
                const fileObj = modalFiles.find(f => f.id === fId);
                const formData = new FormData();
                if (fileObj) formData.append('comprobante', fileObj.file);
                formData.append('bultosIds', JSON.stringify(bIds));
                await logisticsService.confirmDeliveryWithProof(modalData.transport.CodigoRemito, formData);
            }

            if (bultosSinArchivo.length > 0) {
                const formData = new FormData();
                formData.append('bultosIds', JSON.stringify(bultosSinArchivo));
                await logisticsService.confirmDeliveryWithProof(modalData.transport.CodigoRemito, formData);
            }

            toast.success('Entregas procesadas con Ã©xito âœ…');
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Error al procesar entregas');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async (transport) => {
        try {
            const resApi = await api.get('/apiordenesRetiro/remito/' + transport.CodigoRemito);
            const sel = resApi.data;
            if (!sel || sel.length === 0) return toast.warning('No se encontraron Ã³rdenes.');
            
            const remitoCode = transport.CodigoRemito;
            const fecha = new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo' });
            const grupos = {};
            sel.forEach(enc => {
                const agKey = enc.agenciaNombre || enc.lugarRetiro || 'Sin Agencia / Retiro Local';
                if (!grupos[agKey]) grupos[agKey] = [];
                grupos[agKey].push(enc);
            });

            const renderFila = (enc) => {
                const ordenesList = (enc.orders || []).map((o, i) =>
                    `<tr>
                        <td style="padding:5px 8px;font-size:12px;">${i + 1}</td>
                        <td style="padding:5px 8px;font-size:12px;font-weight:700;">${o.orderNumber || '-'}</td>
                        <td style="padding:5px 8px;font-size:12px;color:#475569;">${o.orderEstado || '-'}</td>
                        <td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:700;color:#0070bc;">${o.orderCosto || '-'}</td>
                    </tr>`).join('');
                
                const ordTable = enc.orders?.length > 0
                    ? `<table style="width:100%;border-collapse:collapse;margin-top:6px;">
                        <thead><tr style="background:#f8fafc;">
                            <th style="padding:5px 8px;font-size:11px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">#</th>
                            <th style="padding:5px 8px;font-size:11px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">CÃ³d. Orden</th>
                            <th style="padding:5px 8px;font-size:11px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">Estado</th>
                            <th style="padding:5px 8px;font-size:11px;text-align:right;color:#64748b;border-bottom:1px solid #e2e8f0;">Importe</th>
                        </tr></thead><tbody>${ordenesList}</tbody>
                    </table>`
                    : '<span style="font-size:12px;color:#aaa;">Sin Ã³rdenes registradas</span>';

                return `<tr style="border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    <td style="padding:10px 8px;font-size:13px;font-weight:900;color:#1e293b;white-space:nowrap;">${enc.ordenDeRetiro}</td>
                    <td style="padding:10px 8px;">
                        <div style="font-size:13px;font-weight:700;">${enc.CliNombre || '-'}</div>
                        <div style="font-size:11px;color:#64748b;">${enc.CliCodigoCliente || ''} &bull; ${enc.TClDescripcion || ''}</div>
                    </td>
                    <td style="padding:10px 8px;">
                        ${enc.localidadEnvio || ''} ${enc.direccionEnvio || '<span style="color:#aaa;">â€”</span>'}
                    </td>
                    <td style="padding:10px 8px;">${ordTable}</td>
                    <td style="padding:10px 8px;text-align:center;">
                        <span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;
                            border:1.5px solid ${enc.pagorealizado === 1 ? '#16a34a' : '#dc2626'};
                            color:${enc.pagorealizado === 1 ? '#16a34a' : '#dc2626'};">
                            ${enc.pagorealizado === 1 ? 'PAGADO' : 'PENDIENTE'}
                        </span>
                    </td>
                </tr>`;
            };

            const seccionesHtml = Object.entries(grupos).map(([agencia, ordenes]) => `
                <div style="margin-bottom:24px;page-break-inside:avoid;">
                    <div style="background:#0070bc;color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-size:13px;font-weight:900;">
                        &#128666; ${agencia} (${ordenes.length})
                    </div>
                    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;">
                        <thead><tr style="background:#f1f5f9;">
                            <th style="padding:7px 8px;font-size:11px;text-align:left;">Retiro</th>
                            <th style="padding:7px 8px;font-size:11px;text-align:left;">Cliente</th>
                            <th style="padding:7px 8px;font-size:11px;text-align:left;">Destino</th>
                            <th style="padding:7px 8px;font-size:11px;text-align:left;">Ã“rdenes</th>
                            <th style="padding:7px 8px;font-size:11px;text-align:center;">Pago</th>
                        </tr></thead>
                        <tbody>${ordenes.map(renderFila).join('')}</tbody>
                    </table>
                </div>`).join('');

            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte Despacho</title>
            <style>body{font-family:sans-serif;padding:20px;color:#1e293b;font-size:13px;} @media print{button{display:none;}}</style></head>
            <body>
                <div style="display:flex;justify-content:space-between;border-bottom:3px solid #0070bc;padding-bottom:10px;margin-bottom:20px;">
                    <h1 style="color:#0070bc;margin:0;">USER - Hoja de Despacho</h1>
                    <div style="text-align:right;">${fecha}</div>
                </div>
                ${seccionesHtml}
                <div style="text-align:center;margin-top:20px;"><button onclick="window.print()">Imprimir</button></div>
            </body></html>`;
            
            const win = window.open('', '_blank');
            win.document.write(html);
            win.document.close();
        } catch (err) { toast.error("Error al imprimir"); }
    };

    const filtered = transports.filter(t => {
        const matchesSearch = (t.CodigoRemito || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.Observaciones || '').toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (filterStatus === 'ACTIVE') {
            return ['EN_TRANSITO', 'EN_TRANSITO_PARCIAL', 'ESPERANDO_RETIRO'].includes(t.Estado);
        }
        return true;
    });

    return (
        <div className="p-4 md:p-6 h-full overflow-y-auto bg-slate-50/50">
            {/* Header */}
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center">
                        <Truck size={20} className="text-brand-cyan" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Transporte en Curso</h2>
                        <p className="text-slate-500 text-sm">MercaderÃ­a en poder de terceros</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-bold">
                        <button onClick={() => setFilterStatus('ACTIVE')} className={`px-3 py-1.5 rounded transition-all ${filterStatus === 'ACTIVE' ? 'bg-white shadow text-brand-cyan' : 'text-slate-500'}`}>En Viaje</button>
                        <button onClick={() => setFilterStatus('ALL')} className={`px-3 py-1.5 rounded transition-all ${filterStatus === 'ALL' ? 'bg-white shadow text-brand-cyan' : 'text-slate-500'}`}>Todos</button>
                    </div>
                    <button onClick={loadData} className="p-2 text-brand-cyan hover:bg-brand-cyan/10 rounded-lg">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6 relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                    type="text"
                    placeholder="Buscar por remito, chofer o agencia..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-cyan/20 outline-none text-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center gap-2 text-slate-400">
                        <Loader2 className="animate-spin" />
                        <span>Cargando datos...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                        <Navigation size={40} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-500 font-medium">Sin vehÃ­culos en ruta.</p>
                    </div>
                ) : (
                    filtered.map(t => (
                        <div key={t.EnvioID} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <span className="font-black text-brand-cyan bg-brand-cyan/5 px-3 py-1 rounded-lg border border-brand-cyan/10 text-base">
                                    {t.CodigoRemito}
                                </span>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase border ${t.Estado === 'ESPERANDO_RETIRO' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    {t.Estado.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <div className="space-y-2 mb-5">
                                <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Tag size={14} className="text-slate-400" /> {t.Observaciones || 'Sin detalles'}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                    <Clock size={14} className="text-slate-400" /> {new Date(t.Fecha).toLocaleDateString()} Â· {t.TotalBultos} bultos
                                </div>
                            </div>
                            <div className="flex gap-2 border-t pt-4">
                                <button onClick={() => handlePrint(t)} className="flex-1 text-xs font-bold py-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 flex items-center justify-center gap-2">
                                    <Printer size={14} /> Reporte
                                </button>
                                <button onClick={() => openUploadModal(t)} className="flex-1 text-xs font-bold py-2 bg-brand-cyan/10 text-brand-cyan rounded-xl hover:bg-brand-cyan/20 flex items-center justify-center gap-2">
                                    <ListChecks size={14} /> Entregas
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {createPortal(
                <AnimatePresence>
                {isModalOpen && modalData && (
                    <motion.div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="absolute inset-0 bg-slate-900/80" onClick={() => setIsModalOpen(false)} />
                        <motion.div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
                            
                            <div className="bg-gradient-to-r from-brand-cyan to-[#005080] px-6 py-5 flex justify-between items-center text-white">
                                <div className="flex items-center gap-3">
                                    <PackageCheck size={24} />
                                    <div>
                                        <h3 className="font-black text-lg leading-none">Confirmar Entregas</h3>
                                        <p className="opacity-70 text-xs mt-1">Remito: {modalData.transport.CodigoRemito}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2 uppercase tracking-tight">
                                        <Camera size={16} className="text-brand-cyan" /> Comprobantes Adjuntos
                                    </h4>
                                    <div className="flex flex-wrap gap-3">
                                        {modalFiles.map((f, i) => (
                                            <div key={f.id} className="bg-brand-cyan/5 border border-brand-cyan/10 rounded-2xl p-2 flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm text-brand-cyan"><FileImage size={16} /></div>
                                                <span className="text-xs font-black text-brand-cyan">Archivo {i+1}</span>
                                                <button onClick={() => removeModalFile(f.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                        <button onClick={() => hiddenFileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-brand-cyan hover:text-brand-cyan transition-all min-w-[100px]">
                                            <Plus size={20} />
                                            <span className="text-[10px] font-bold">Subir Foto</span>
                                        </button>
                                    </div>
                                    <input type="file" ref={hiddenFileInputRef} className="hidden" onChange={handleFileSelected} capture="environment" accept="image/*,application/pdf" />
                                </div>

                                <div className="space-y-3">
                                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Bultos a entregar</h4>
                                    {modalData.items.map(item => {
                                        if (item.BultoEstado === 'ENTREGADO') return null;
                                        const map = bultoMappings[item.BultoID] || { checked: false, fileId: 'none' };
                                        return (
                                            <div key={item.BultoID} className={`p-4 rounded-2xl border transition-all ${map.checked ? 'border-brand-cyan bg-brand-cyan/5 ring-1 ring-brand-cyan/10' : 'border-slate-100 hover:border-slate-200'}`}>
                                                <div className="flex items-center justify-between gap-4">
                                                    <label className="flex items-center gap-4 cursor-pointer flex-1">
                                                        <input type="checkbox" checked={map.checked} onChange={e => setBultoMappings(prev => ({ ...prev, [item.BultoID]: { ...map, checked: e.target.checked } }))} className="w-6 h-6 rounded-lg accent-brand-cyan border-slate-200" />
                                                        <div>
                                                            <p className={`font-black text-sm ${map.checked ? 'text-brand-cyan' : 'text-slate-800'}`}>{item.RetiroAsociado || item.CodigoEtiqueta}</p>
                                                            <p className="text-xs text-slate-500 font-medium">{item.Descripcion || 'Sin detalle'}</p>
                                                        </div>
                                                    </label>
                                                    {map.checked && (
                                                        <div className="flex flex-col gap-2">
                                                            <select value={map.fileId} onChange={e => setBultoMappings(prev => ({ ...prev, [item.BultoID]: { ...map, fileId: e.target.value } }))} className="text-[11px] font-black p-2 bg-white border-slate-200 rounded-xl focus:ring-brand-cyan outline-none w-40">
                                                                <option value="none">Sin Comprobante</option>
                                                                {modalFiles.map((f, i) => <option key={f.id} value={f.id}>Foto {i+1}</option>)}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="p-6 border-t bg-slate-50 flex gap-4">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all text-sm">Cerrar</button>
                                <button onClick={handleConfirmDelivery} disabled={loading || Object.values(bultoMappings).filter(m => m.checked).length === 0} className="flex-[2] bg-brand-cyan text-white font-black rounded-2xl py-3 shadow-lg hover:shadow-brand-cyan/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <PackageCheck size={20} />}
                                    Procesar {Object.values(bultoMappings).filter(m => m.checked).length} Bultos
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                </AnimatePresence>
            , document.body)}
        </div>
    );
};

export default TransportView;

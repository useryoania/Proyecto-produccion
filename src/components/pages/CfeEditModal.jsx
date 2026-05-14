import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Edit2, Trash2, RefreshCw, ChevronDown, AlertTriangle, Hash, Loader2, FileText, Lock } from 'lucide-react';
import api from '../../services/apiClient';
import { toast } from 'sonner';

const fmt = (n) => Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtFecha = (f) => f ? new Date(f).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// Detecta si una línea es de agrupación/subtotal (no editable)
const esLineaAgrupacion = (nom = '') => {
    const n = nom.toUpperCase();
    return n.startsWith('SUBTOTAL') || n.startsWith('TOTAL ORDEN') || n.startsWith('AGRUPACION');
};

// ── Fila de línea ─────────────────────────────────────────────────────────────
const LineaRow = ({ linea, idx, onChange, onDelete }) => {
    const bloqueada = esLineaAgrupacion(linea.DcdNomItem);

    const handle = (field, value) => {
        const updated = { ...linea, [field]: value };
        if (field === 'DcdCantidad' || field === 'DcdPrecioUnitario') {
            const c = field === 'DcdCantidad' ? parseFloat(value) || 0 : parseFloat(updated.DcdCantidad) || 0;
            const p = field === 'DcdPrecioUnitario' ? parseFloat(value) || 0 : parseFloat(updated.DcdPrecioUnitario) || 0;
            updated.DcdSubtotal = parseFloat((c * p).toFixed(4));
        }
        onChange(idx, updated);
    };

    if (bloqueada) {
        return (
            <tr className="bg-slate-50 border-b border-dashed border-slate-200">
                <td className="px-3 py-2 w-10 text-center">
                    <Lock size={12} className="text-slate-300 mx-auto" />
                </td>
                <td className="px-3 py-2 text-xs font-bold text-slate-500 italic" colSpan={3}>
                    {linea.DcdNomItem}
                </td>
                <td className="px-3 py-2 text-right">
                    <span className="text-xs font-black text-slate-600 bg-slate-200 px-2 py-1 rounded-lg">
                        {fmt(linea.DcdSubtotal)}
                    </span>
                </td>
                <td className="px-2 py-2 w-10" />
            </tr>
        );
    }

    return (
        <tr className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
            <td className="px-3 py-2 w-10 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
            <td className="px-2 py-2">
                <input
                    type="text"
                    value={linea.DcdNomItem || ''}
                    onChange={e => handle('DcdNomItem', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
                    placeholder="Descripción"
                />
            </td>
            <td className="px-2 py-2 w-24">
                <input
                    type="number"
                    value={linea.DcdCantidad ?? 1}
                    onChange={e => handle('DcdCantidad', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-right focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
                    min="0" step="0.0001"
                />
            </td>
            <td className="px-2 py-2 w-28">
                <input
                    type="number"
                    value={linea.DcdPrecioUnitario ?? 0}
                    onChange={e => handle('DcdPrecioUnitario', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-right focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
                    min="0" step="0.0001"
                />
            </td>
            <td className="px-2 py-2 w-28 text-right">
                <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg block text-right">
                    {fmt(linea.DcdSubtotal)}
                </span>
            </td>
            <td className="px-2 py-2 w-10 text-center">
                <button
                    onClick={() => onDelete(idx)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Eliminar línea"
                >
                    <Trash2 size={14} />
                </button>
            </td>
        </tr>
    );
};

// ── MODAL ─────────────────────────────────────────────────────────────────────
export default function CfeEditModal({ doc, onClose, onSuccess }) {
    const [loadingDetalle, setLoadingDetalle] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tiposDoc, setTiposDoc] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [lineas, setLineas] = useState([]);

    const [form, setForm] = useState({
        DocTipo: doc.DocTipo || '',
        CliIdCliente: doc.CliIdCliente || 1,
        MonIdMoneda: doc.MonIdMoneda || 1,
        DocObservaciones: doc.DocObservaciones || '',
        DocSubtotal: Number(doc.DocSubtotal) || 0,
        DocImpuestos: Number(doc.DocImpuestos) || 0,
        DocTotal: Number(doc.DocTotal) || 0,
    });

    // Cargar detalle + nomencladores
    const cargar = useCallback(async () => {
        setLoadingDetalle(true);
        try {
            const [detRes, nomRes, cliRes] = await Promise.all([
                api.get(`/contabilidad/cfe/documentos/${doc.DocIdDocumento}/detalle`),
                api.get('/contabilidad/cfe/nomencladores'),
                api.get('/contabilidad/clientes-activos?tipo=todos'),
            ]);

            if (detRes.data?.detalles?.length) setLineas(detRes.data.detalles.map(l => ({ ...l })));
            if (detRes.data?.doc) {
                const d = detRes.data.doc;
                setForm(prev => ({
                    ...prev,
                    DocSubtotal: Number(d.DocSubtotal) || prev.DocSubtotal,
                    DocImpuestos: Number(d.DocImpuestos) || prev.DocImpuestos,
                    DocTotal: Number(d.DocTotal) || prev.DocTotal,
                    DocObservaciones: d.DocObservaciones || '',
                    DocTipo: d.DocTipo || prev.DocTipo,
                }));
            }
            if (nomRes.data?.tiposDocumentos) setTiposDoc(nomRes.data.tiposDocumentos);
            const cliData = Array.isArray(cliRes.data) ? cliRes.data : (cliRes.data?.data || []);
            setClientes(cliData);
        } catch (err) {
            toast.error('Error cargando detalle: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoadingDetalle(false);
        }
    }, [doc.DocIdDocumento]);

    useEffect(() => { cargar(); }, [cargar]);

    // Recalcular totales desde líneas editables (excluye agrupaciones)
    useEffect(() => {
        if (!lineas.length) return;
        const editables = lineas.filter(l => !esLineaAgrupacion(l.DcdNomItem));
        const subtotal = parseFloat(editables.reduce((a, l) => a + (parseFloat(l.DcdSubtotal) || 0), 0).toFixed(2));
        const iva = parseFloat((subtotal * 0.22).toFixed(2));
        setForm(prev => ({ ...prev, DocSubtotal: subtotal, DocImpuestos: iva, DocTotal: parseFloat((subtotal + iva).toFixed(2)) }));
    }, [lineas]);

    const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleLineaChange = (idx, updated) => setLineas(prev => prev.map((l, i) => i === idx ? updated : l));
    const handleEliminar = (idx) => setLineas(prev => prev.filter((_, i) => i !== idx));

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/contabilidad/cfe/documentos/${doc.DocIdDocumento}`, {
                DocTipo: form.DocTipo,
                CliIdCliente: Number(form.CliIdCliente),
                MonIdMoneda: Number(form.MonIdMoneda),
                DocSubtotal: form.DocSubtotal,
                DocImpuestos: form.DocImpuestos,
                DocTotal: form.DocTotal,
                DocObservaciones: form.DocObservaciones,
                lineas: lineas.map(l => ({
                    DcdIdDetalle: l.DcdIdDetalle,
                    DcdNomItem: l.DcdNomItem,
                    DcdCantidad: parseFloat(l.DcdCantidad) || 1,
                    DcdPrecioUnitario: parseFloat(l.DcdPrecioUnitario) || 0,
                    DcdSubtotal: parseFloat(l.DcdSubtotal) || 0,
                    _agrupacion: esLineaAgrupacion(l.DcdNomItem),
                })),
            });
            toast.success('✅ Factura actualizada y asiento sincronizado');
            onSuccess();
        } catch (err) {
            toast.error('Error: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const simbolo = form.MonIdMoneda === 2 || form.MonIdMoneda === '2' ? 'U$S' : '$';
    const lineasEditables = lineas.filter(l => !esLineaAgrupacion(l.DcdNomItem)).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden"
                style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>

                {/* Header */}
                <div className="shrink-0 bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 px-7 py-5 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Edit2 size={14} className="text-indigo-200" />
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-200">Editar Documento CFE</span>
                        </div>
                        <h2 className="text-2xl font-black text-white">{doc.DocSerie}-{doc.DocNumero}
                            <span className="ml-3 text-sm font-semibold text-indigo-200 bg-white/10 px-3 py-1 rounded-full">{doc.DocTipo}</span>
                        </h2>
                        <p className="text-indigo-300 text-xs mt-1">{fmtFecha(doc.DocFechaEmision)} · {doc.CliNombreFantasia || doc.CliRazonSocial || 'Consumidor Final'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-indigo-200 hover:bg-white/10 transition-colors"><X size={18} /></button>
                </div>

                {/* Aviso */}
                <div className="shrink-0 mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">Solo documentos <strong>PENDIENTE</strong>. Los cambios actualizan el asiento en el Libro Mayor.</p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">

                    {/* ── Fila 1: Tipo Doc + Moneda ── */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                                <FileText size={11} className="inline mr-1" />Tipo de Documento
                            </label>
                            <div className="relative">
                                <select
                                    value={form.DocTipo}
                                    onChange={e => setField('DocTipo', e.target.value)}
                                    className="w-full text-sm border-2 border-indigo-200 rounded-xl px-3 py-2.5 pr-8 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none appearance-none font-semibold text-indigo-900"
                                >
                                    <option value="">— Seleccioná —</option>
                                    {/* Tipos fijos DGI Uruguay más comunes */}
                                    <option value="E-TICKET CONTADO">e-Ticket Contado</option>
                                    <option value="E-TICKET CREDITO">e-Ticket Crédito</option>
                                    <option value="FACTURA">e-Factura</option>
                                    <option value="NOTA_CREDITO">Nota de Crédito</option>
                                    {/* Adicionar los del backend si vienen */}
                                    {tiposDoc.filter(t => !['E-TICKET CONTADO','E-TICKET CREDITO','FACTURA','NOTA_CREDITO'].includes(t.label)).map(t => (
                                        <option key={t.value} value={t.label}>{t.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Moneda</label>
                            <div className="relative">
                                <select
                                    value={form.MonIdMoneda}
                                    onChange={e => setField('MonIdMoneda', parseInt(e.target.value))}
                                    className="w-full text-sm border-2 border-slate-200 rounded-xl px-3 py-2.5 pr-8 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none appearance-none font-semibold"
                                >
                                    <option value={1}>$ — Peso Uruguayo (UYU)</option>
                                    <option value={2}>U$S — Dólar (USD)</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* ── Fila 2: Cliente + Observaciones ── */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Cliente</label>
                            <div className="relative">
                                <select
                                    value={form.CliIdCliente}
                                    onChange={e => setField('CliIdCliente', parseInt(e.target.value))}
                                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 pr-8 bg-white focus:ring-2 focus:ring-indigo-400 outline-none appearance-none"
                                >
                                    <option value={1}>Consumidor Final</option>
                                    {clientes.map(c => (
                                        <option key={c.CodCliente} value={c.CodCliente}>
                                            [{c.IDCliente || c.CodCliente}] {c.NombreFantasia || c.Nombre}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Observaciones</label>
                            <input
                                type="text"
                                value={form.DocObservaciones}
                                onChange={e => setField('DocObservaciones', e.target.value)}
                                placeholder="Notas internas..."
                                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                            />
                        </div>
                    </div>

                    {/* ── Líneas de detalle ── */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Líneas de Detalle</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                                    {lineasEditables} editables
                                </span>
                                <span className="text-xs text-slate-400 font-medium bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                                    <Lock size={9} className="inline mr-1" />{lineas.length - lineasEditables} bloqueadas
                                </span>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            {loadingDetalle ? (
                                <div className="flex items-center justify-center py-10 gap-2 text-slate-500">
                                    <Loader2 size={18} className="animate-spin text-indigo-500" />
                                    <span className="text-sm">Cargando detalle...</span>
                                </div>
                            ) : lineas.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-sm">Sin líneas registradas.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-100 border-b border-slate-200">
                                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                <th className="px-3 py-3 w-10 text-center">#</th>
                                                <th className="px-2 py-3">Descripción</th>
                                                <th className="px-2 py-3 w-24 text-right">Cantidad</th>
                                                <th className="px-2 py-3 w-28 text-right">P. Unitario</th>
                                                <th className="px-2 py-3 w-28 text-right">Subtotal</th>
                                                <th className="px-2 py-3 w-10" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lineas.map((l, idx) => (
                                                <LineaRow
                                                    key={l.DcdIdDetalle || idx}
                                                    linea={l} idx={idx}
                                                    onChange={handleLineaChange}
                                                    onDelete={handleEliminar}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Totales ── */}
                    <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 rounded-2xl p-5">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Totales Calculados</h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            {[
                                { label: 'Subtotal Neto', val: form.DocSubtotal },
                                { label: 'IVA 22%', val: form.DocImpuestos },
                            ].map(f => (
                                <div key={f.label}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">{f.label}</p>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">{simbolo}</span>
                                        <input type="number" value={f.val} readOnly
                                            className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-xl px-3 py-2.5 pl-10 text-right text-sm cursor-not-allowed" />
                                    </div>
                                </div>
                            ))}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-1.5">Total con IVA</p>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600 text-sm font-black">{simbolo}</span>
                                    <input type="number" value={form.DocTotal} readOnly
                                        className="w-full bg-indigo-50 text-indigo-700 border-2 border-indigo-200 rounded-xl px-3 py-2.5 pl-10 text-right text-base font-black cursor-not-allowed" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end border-t border-slate-200 pt-3">
                            <p className="text-2xl font-black text-indigo-700">{simbolo} {fmt(form.DocTotal)}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between rounded-b-3xl">
                    <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                        <Hash size={11} />Doc ID: <strong className="text-slate-600">{doc.DocIdDocumento}</strong>
                        &nbsp;·&nbsp;<span className="text-amber-600 font-bold">PENDIENTE DGI</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} disabled={saving}
                            className="px-5 py-2.5 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-sm transition-colors disabled:opacity-50">
                            Cancelar
                        </button>
                        <button onClick={handleSave} disabled={saving || loadingDetalle}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 font-bold text-sm shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-colors">
                            {saving ? <><RefreshCw size={15} className="animate-spin" /> Guardando...</> : <><Save size={15} /> Guardar y Sincronizar</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

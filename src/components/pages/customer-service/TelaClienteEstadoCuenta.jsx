import React, { useState, useCallback, useEffect } from 'react';
import { Search, Loader2, FileText, ArrowDownCircle, ArrowUpCircle,
         MinusCircle, SlidersHorizontal, X, Download, RefreshCw, Package } from 'lucide-react';
import { jsPDF } from 'jspdf';
import api from '../../../services/apiClient';
import ClienteTelaMetros from '../../common/ClienteTelaMetros';

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
const fmtN  = (n) => Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('es-UY', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
};

const TIPO_CONFIG = {
    INGRESO:            { label: 'Ingreso',          icon: ArrowDownCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', sign: '+' },
    CONSUMO_PRODUCCION: { label: 'Consumo Prod.',    icon: ArrowUpCircle,   color: 'text-rose-600 bg-rose-50 border-rose-200',       sign: '-' },
    AJUSTE_DESECHO:     { label: 'Ajuste/Merma',     icon: MinusCircle,     color: 'text-amber-600 bg-amber-50 border-amber-200',     sign: '±' },
    AJUSTE_MANUAL:      { label: 'Ajuste Manual',    icon: MinusCircle,     color: 'text-amber-600 bg-amber-50 border-amber-200',     sign: '±' },
    RESERVA_ORDEN:      { label: 'Reserva',          icon: ArrowUpCircle,   color: 'text-indigo-600 bg-indigo-50 border-indigo-200',  sign: '→' },
    LIBERACION_RESERVA: { label: 'Lib. Reserva',     icon: ArrowDownCircle, color: 'text-teal-600 bg-teal-50 border-teal-200',        sign: '←' },
    MERMA_REIMPRESION:  { label: 'Merma Reimp.',     icon: MinusCircle,     color: 'text-orange-600 bg-orange-50 border-orange-200',  sign: '-' },
};
const getTipo = (t) => TIPO_CONFIG[t] || { label: t, icon: MinusCircle, color: 'text-slate-500 bg-slate-50 border-slate-200', sign: '?' };

// ─────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────
export default function TelaClienteEstadoCuenta() {
    // Cliente
    const [query,       setQuery]       = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [clienteSel,  setClienteSel]  = useState(null);
    const [searching,   setSearching]   = useState(false);

    // Datos
    const [movimientos, setMovimientos] = useState([]);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState(null);
    const [saldos,      setSaldos]      = useState([]);

    // Filtros
    const [showFiltros, setShowFiltros] = useState(false);
    const [filtros, setFiltros] = useState({ desde: '', hasta: '', tipo: '', insumoId: '' });

    // Búsqueda de clientes
    const searchClients = useCallback(async (q) => {
        if (!q || q.length < 2) { setSuggestions([]); return; }
        setSearching(true);
        try {
            const res = await api.get(`/clients/search?q=${encodeURIComponent(q)}&limit=8`);
            const list = res.data?.data || res.data || [];
            setSuggestions(list.slice(0, 8));
        } catch { setSuggestions([]); }
        finally { setSearching(false); }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => searchClients(query), 300);
        return () => clearTimeout(t);
    }, [query, searchClients]);

    const selectCliente = (c) => {
        setClienteSel(c);
        setQuery(c.Nombre || c.NombreFantasia || c.ClienteID || c);
        setSuggestions([]);
    };

    // Cargar datos del cliente seleccionado
    const loadData = useCallback(async () => {
        if (!clienteSel) return;
        setLoading(true);
        setError(null);
        try {
            const id = clienteSel.ClienteID || clienteSel.Nombre || clienteSel;
            const params = new URLSearchParams();
            if (filtros.desde)    params.set('desde',    filtros.desde);
            if (filtros.hasta)    params.set('hasta',    filtros.hasta);
            if (filtros.tipo)     params.set('tipo',     filtros.tipo);
            if (filtros.insumoId) params.set('insumoId', filtros.insumoId);

            const [resMov, resSaldo] = await Promise.all([
                api.get(`/tela-cliente/${encodeURIComponent(id)}/estado-cuenta?${params}`),
                api.get(`/tela-cliente/${encodeURIComponent(id)}/saldo`),
            ]);

            if (resMov.data.success)   setMovimientos(resMov.data.data   || []);
            if (resSaldo.data.success) setSaldos(resSaldo.data.data || []);
        } catch (err) {
            setError(err.message || 'Error cargando datos');
        } finally {
            setLoading(false);
        }
    }, [clienteSel, filtros]);

    useEffect(() => { loadData(); }, [loadData]);

    // Resumen de cabecera
    const totalIngresado  = movimientos.filter(m => m.TipoMovimiento === 'INGRESO').reduce((s, m) => s + Math.abs(parseFloat(m.Cantidad||0)), 0);
    const totalConsumido  = movimientos.filter(m => ['CONSUMO_PRODUCCION','MERMA_REIMPRESION','AJUSTE_DESECHO'].includes(m.TipoMovimiento)).reduce((s, m) => s + Math.abs(parseFloat(m.Cantidad||0)), 0);
    const totalDisponible = saldos.reduce((s, x) => s + parseFloat(x.MetrosLibres||0), 0);
    const totalEnProceso  = saldos.reduce((s, x) => s + parseFloat(x.MetrosEnProceso||0), 0);

    // Exportar PDF (estilo estado de cuenta contabilidad)
    const exportarPDF = () => {
        if (!clienteSel || movimientos.length === 0) return;
        const nombreCliente = clienteSel.Nombre || clienteSel.NombreFantasia || clienteSel;
        const pageHeight = Math.max(160, 80 + movimientos.length * 5.5 + 40);
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, pageHeight] });
        doc.setFont('courier', 'normal'); doc.setFontSize(7.5);
        let y = 10;
        const wr = (text, align='left', bold=false) => {
            doc.setFont('courier', bold ? 'bold' : 'normal');
            if (align === 'center') doc.text(String(text), 40, y, { align: 'center' });
            else doc.text(String(text), 5, y);
            y += 4;
        };
        wr('USER — Estado de Cuenta Tela', 'center', true);
        wr(`Cliente: ${nombreCliente}`, 'center');
        wr(`Emitido: ${new Date().toLocaleString('es-UY')}`, 'center');
        wr('----------------------------------', 'center');
        wr(`Ingresado : ${fmtN(totalIngresado)} m`, 'left', true);
        wr(`Disponible: ${fmtN(totalDisponible)} m`);
        wr(`En Proceso: ${fmtN(totalEnProceso)} m`);
        wr(`Consumido : ${fmtN(totalConsumido)} m`);
        wr('----------------------------------', 'center');
        movimientos.forEach(m => {
            const cfg = getTipo(m.TipoMovimiento);
            const cant = `${cfg.sign} ${fmtN(Math.abs(m.Cantidad))} m`;
            wr(`${fmtDt(m.FechaMovimiento).substring(0,10)} ${m.TipoTela?.substring(0,10)||''}`);
            wr(`  ${cant.padEnd(14)} ${(m.Bulto||'').substring(0,12)}`);
        });
        wr('----------------------------------', 'center');
        wr('USER ERP - Tela de Cliente', 'center');
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        doc.save(`estado-tela-${String(clienteSel.ClienteID || clienteSel.Nombre || 'cliente').replace(/\s+/g,'_')}.pdf`);
        // Guardar en servidor
        api.post('/reception/guardar-comprobante', {
            nombreDocumento: `TELA-${clienteSel.ClienteID || clienteSel.Nombre || 'CLI'}`,
            pdfBase64
        }).catch(console.warn);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">

            {/* ── Cabecera ── */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-xl bg-indigo-100">
                        <Package size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800">Estado de Cuenta — Tela de Cliente</h1>
                        <p className="text-xs text-slate-400 font-medium">Historial de ingresos, consumos y saldo disponible por tipo de tela</p>
                    </div>
                </div>
            </div>

            {/* ── Buscador de cliente ── */}
            <div className="relative mb-5 max-w-lg">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition-all">
                    <Search size={16} className="text-slate-400 shrink-0" />
                    <input
                        value={query}
                        onChange={e => { setQuery(e.target.value); if (!e.target.value) { setClienteSel(null); setMovimientos([]); setSaldos([]); } }}
                        placeholder="Buscar cliente..."
                        className="flex-1 bg-transparent text-sm font-medium text-slate-700 placeholder-slate-300 outline-none"
                    />
                    {searching && <Loader2 size={14} className="animate-spin text-indigo-400 shrink-0" />}
                    {clienteSel && (
                        <button onClick={() => { setClienteSel(null); setQuery(''); setMovimientos([]); setSaldos([]); }}>
                            <X size={14} className="text-slate-400 hover:text-slate-700" />
                        </button>
                    )}
                </div>

                {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                        {suggestions.map((c, i) => (
                            <button key={i}
                                onClick={() => selectCliente(c)}
                                className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0">
                                <p className="text-sm font-bold text-slate-700">{c.Nombre || c.NombreFantasia}</p>
                                <p className="text-[10px] text-slate-400">{c.ClienteID || c.RazonSocial || ''}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Widget de saldo actual ── */}
            {clienteSel && (
                <div className="mb-5 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saldo Actual por Tipo de Tela</p>
                    <ClienteTelaMetros
                        clienteId={clienteSel.ClienteID || clienteSel.Nombre}
                        clienteNombre={clienteSel.Nombre || clienteSel.NombreFantasia}
                    />
                </div>
            )}

            {/* ── Cards resumen ── */}
            {movimientos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {[
                        { label: 'Total Ingresado', valor: totalIngresado, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                        { label: 'Disponible',      valor: totalDisponible, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                        { label: 'En Proceso',      valor: totalEnProceso,  color: 'bg-amber-50 border-amber-200 text-amber-700' },
                        { label: 'Consumido',        valor: totalConsumido,  color: 'bg-rose-50 border-rose-200 text-rose-700' },
                    ].map(({ label, valor, color }) => (
                        <div key={label} className={`p-3 rounded-2xl border ${color} shadow-sm`}>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
                            <p className="text-lg font-black font-mono">{fmtN(valor)}<span className="text-[10px] ml-1 opacity-60">m</span></p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Barra de herramientas ── */}
            {clienteSel && (
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFiltros(p => !p)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${showFiltros ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                            <SlidersHorizontal size={13} />
                            Filtros
                        </button>
                        <button onClick={loadData}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 transition-all">
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            Actualizar
                        </button>
                    </div>
                    <button
                        onClick={exportarPDF}
                        disabled={movimientos.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-40">
                        <Download size={13} />
                        Exportar PDF
                    </button>
                </div>
            )}

            {/* ── Panel de filtros ── */}
            {showFiltros && (
                <div className="mb-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { key: 'desde', label: 'Desde', type: 'date' },
                        { key: 'hasta', label: 'Hasta', type: 'date' },
                    ].map(({ key, label, type }) => (
                        <div key={key}>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</label>
                            <input type={type} value={filtros[key]}
                                onChange={e => setFiltros(p => ({ ...p, [key]: e.target.value }))}
                                className="w-full text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300" />
                        </div>
                    ))}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tipo</label>
                        <select value={filtros.tipo} onChange={e => setFiltros(p => ({ ...p, tipo: e.target.value }))}
                            className="w-full text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300">
                            <option value="">Todos</option>
                            {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={() => setFiltros({ desde:'', hasta:'', tipo:'', insumoId:'' })}
                            className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 hover:border-rose-300 hover:text-rose-600 transition-all">
                            <X size={12} /> Limpiar
                        </button>
                    </div>
                </div>
            )}

            {/* ── Estado vacío / error ── */}
            {!clienteSel && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-4 bg-indigo-100 rounded-3xl mb-4">
                        <Package size={32} className="text-indigo-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-400">Selecciona un cliente para ver su estado de cuenta</p>
                </div>
            )}

            {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold mb-4">
                    ⚠ {error}
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={28} className="animate-spin text-indigo-400" />
                </div>
            )}

            {/* ── Tabla de extracto ── */}
            {!loading && movimientos.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    {['Fecha', 'Tipo', 'Tela', 'Bulto', 'Cantidad', 'Saldo Acum.', 'Referencia', 'Operario'].map(h => (
                                        <th key={h} className="px-3 py-2.5 text-left font-black text-[10px] uppercase tracking-widest">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {movimientos.map((m, i) => {
                                    const cfg = getTipo(m.TipoMovimiento);
                                    const Icon = cfg.icon;
                                    const isIngreso = m.TipoMovimiento === 'INGRESO';
                                    return (
                                        <tr key={m.MovimientoID || i}
                                            className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>

                                            {/* Fecha */}
                                            <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-500 text-[10px]">
                                                {fmtDt(m.FechaMovimiento)}
                                            </td>

                                            {/* Tipo */}
                                            <td className="px-3 py-2">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tight ${cfg.color}`}>
                                                    <Icon size={9} />
                                                    {cfg.label}
                                                </span>
                                            </td>

                                            {/* Tela */}
                                            <td className="px-3 py-2 font-bold text-slate-700 max-w-[120px] truncate">
                                                {m.TipoTela || '—'}
                                            </td>

                                            {/* Bulto */}
                                            <td className="px-3 py-2 font-mono text-slate-400 text-[10px]">
                                                {m.Bulto || '—'}
                                            </td>

                                            {/* Cantidad */}
                                            <td className={`px-3 py-2 font-black font-mono text-right whitespace-nowrap ${isIngreso ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {cfg.sign} {fmtN(Math.abs(m.Cantidad))} m
                                            </td>

                                            {/* Saldo acumulado */}
                                            <td className="px-3 py-2 font-black font-mono text-right text-indigo-700 whitespace-nowrap">
                                                {fmtN(m.SaldoAcumulado)} m
                                            </td>

                                            {/* Referencia */}
                                            <td className="px-3 py-2 text-slate-400 max-w-[160px] truncate text-[10px]">
                                                {m.Referencia || m.CodigoRecepcion || '—'}
                                            </td>

                                            {/* Operario */}
                                            <td className="px-3 py-2 text-slate-400 text-[10px]">
                                                {m.Operario || '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Ingresos
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Consumos
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Ajustes
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {!loading && clienteSel && movimientos.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText size={32} className="text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-400">Sin movimientos registrados para este cliente</p>
                    <p className="text-xs text-slate-300 mt-1">Aún no hay ingresos de tela o no coincide con los filtros</p>
                </div>
            )}
        </div>
    );
}

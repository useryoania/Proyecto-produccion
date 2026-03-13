import React, { useState, useRef, useEffect } from 'react';
import { ScanLine, CheckCircle2, AlertCircle, Loader2, RefreshCw, Send, Hash, User, FileText, Tag, Package, BarChart2, DollarSign, Edit3, X } from 'lucide-react';
import api from '../../services/api';

// ─── Definición de los 7 campos del QR ──────────────────────────────────────
const CAMPOS_QR = [
    { key: 'CodigoOrden',      label: 'Código de Orden',    icon: Hash,       pos: 0, desc: 'Identificador único de la orden (ej: PRO-99999)' },
    { key: 'CodigoClienteQR',  label: 'ID Cliente (QR)',    icon: User,       pos: 1, desc: 'Código del cliente codificado en el QR' },
    { key: 'NombreTrabajo',    label: 'Nombre del Trabajo', icon: FileText,   pos: 2, desc: 'Descripción o título del trabajo' },
    { key: 'IdModo',           label: 'Modo',               icon: Tag,        pos: 3, desc: 'Identificador del modo de producción' },
    { key: 'IdProductoQR',     label: 'ID Producto (QR)',   icon: Package,    pos: 4, desc: 'Código del producto codificado en el QR' },
    { key: 'Cantidad',         label: 'Cantidad',            icon: BarChart2,  pos: 5, desc: 'Cantidad de unidades' },
    { key: 'CostoFinal',       label: 'Costo Final',        icon: DollarSign, pos: 6, desc: 'Costo final del trabajo' },
];

const VerificarCodigoPage = () => {
    const [rawCode, setRawCode]     = useState('');
    const [loading, setLoading]     = useState(false);
    const [result, setResult]       = useState(null);   // { valid, data, error, rawParts }
    const [editando, setEditando]   = useState(false);
    const [editFields, setEditFields] = useState({});   // campos editados manualmente
    const [ingresando, setIngresando] = useState(false);
    const [ingresadoMsg, setIngresadoMsg] = useState(null);
    const inputRef = useRef(null);

    // Auto-foco al montar
    useEffect(() => { inputRef.current?.focus(); }, []);

    // ─── Parse local sin validar DB (solo estructura) ────────────────────────
    const parseLocal = (str) => {
        const parts = str.trim().split('$*');
        if (parts.length !== 7) return null;
        const obj = {};
        CAMPOS_QR.forEach(c => { obj[c.key] = parts[c.pos]; });
        return obj;
    };

    // ─── Validar contra DB ───────────────────────────────────────────────────
    const handleValidar = async (valor = rawCode) => {
        const code = valor.trim();
        if (!code) return;
        setLoading(true);
        setResult(null);
        setIngresadoMsg(null);
        setEditando(false);

        // Parse local para mostrar campos aunque falle DB
        const localParts = parseLocal(code);

        try {
            const res = await api.post('/apiordenes/parse-qr', { ordenString: code });
            const p = res.data;
            setResult({
                valid: p.valid,
                data: p.data || null,
                error: p.error || null,
                rawParts: localParts,
                raw: code
            });
            if (p.valid && p.data) {
                // Inicializar campos editables con valores del servidor
                setEditFields({
                    CodigoOrden:     p.data.CodigoOrden,
                    CodigoClienteQR: p.data.IDCliente,
                    NombreTrabajo:   p.data.NombreTrabajo,
                    IdModo:          p.data.IdModo,
                    IdProductoQR:    String(p.data.IdProducto),
                    Cantidad:        String(p.data.Cantidad),
                    CostoFinal:      String(p.data.CostoFinal),
                });
            } else if (localParts) {
                setEditFields({ ...localParts });
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Error de conexión al validar.';
            // Detectar si el error del parse-qr es de cliente o producto
            let labelError = msg;
            if (err.response?.status === 404) {
                const isCliente = msg.toLowerCase().includes('cliente');
                const isProducto = msg.toLowerCase().includes('producto');
                if (isCliente) labelError = `❌ Cliente no encontrado — ${msg}`;
                else if (isProducto) labelError = `❌ Producto no encontrado — ${msg}`;
            }
            setResult({ valid: false, error: labelError, rawParts: localParts, raw: code });
            if (localParts) setEditFields({ ...localParts });
        } finally {
            setLoading(false);
        }
    };

    // ─── Ingresar la orden (con campos posiblemente editados) ────────────────
    const handleIngresar = async () => {
        if (!editFields) return;
        setIngresando(true);
        setIngresadoMsg(null);

        // Reconstruir el string QR con los campos (editados o no)
        const ordered = CAMPOS_QR.map(c => editFields[c.key] || '');
        const ordenString = ordered.join('$*');

        try {
            const res = await api.post('/apiordenes/data', {
                ordenString,
                estado: 'Ingresado'
            });
            const msg = res.status === 202
                ? 'Orden reingresada exitosamente al depósito.'
                : 'Orden ingresada correctamente. Pendiente aviso WhatsApp.';
            setIngresadoMsg({ ok: true, text: msg });
        } catch (err) {
            const status = err.response?.status;
            const serverMsg = err.response?.data?.error || '';
            let msg = 'Error inesperado al ingresar.';
            if (status === 400) msg = 'La orden ya fue ingresada previamente en depósito.';
            if (status === 403) msg = 'El campo cliente está vacío en la etiqueta.';
            if (status === 404) msg = `❌ Cliente no encontrado — ID QR "${editFields.CodigoClienteQR}" no existe en el sistema local. Revisá y editá el campo "ID Cliente (QR)".`;
            if (status === 405) msg = `❌ Producto no encontrado — ID QR "${editFields.IdProductoQR}" no existe en el sistema local. Revisá y editá el campo "ID Producto (QR)".`;
            if (status === 500) msg = 'Falla interna del servidor.';
            setIngresadoMsg({ ok: false, text: msg });
        } finally {
            setIngresando(false);
        }
    };

    const handleLimpiar = () => {
        setRawCode('');
        setResult(null);
        setEditando(false);
        setEditFields({});
        setIngresadoMsg(null);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    // ─── Campo individual ────────────────────────────────────────────────────
    const CampoQR = ({ campo, validado }) => {
        const Icon = campo.icon;
        const rawVal   = result?.rawParts?.[campo.key] ?? '—';
        const validVal = validado?.[campo.key] ?? null;

        // Usar el valor validado del servidor si existe, o el raw
        const displayVal = validVal !== null ? validVal : rawVal;
        const isEmpty = !rawVal || rawVal.trim() === '';
        const isMissing = !result?.rawParts; // no se pudo parsear la estructura

        return (
            <div className={`rounded-xl border-2 p-3 transition-all ${
                isEmpty || isMissing
                    ? 'border-red-200 bg-red-50'
                    : 'border-slate-200 bg-white hover:border-blue-200'
            }`}>
                <div className="flex items-center gap-2 mb-1">
                    <Icon size={13} className={isEmpty ? 'text-red-400' : 'text-blue-400'} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{campo.label}</span>
                    <span className="text-[10px] text-slate-300 ml-auto">Campo {campo.pos + 1}/7</span>
                </div>

                {editando ? (
                    <input
                        className="w-full text-sm font-bold border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 bg-blue-50"
                        value={editFields[campo.key] ?? ''}
                        onChange={e => setEditFields(prev => ({ ...prev, [campo.key]: e.target.value }))}
                    />
                ) : (
                    <p className={`text-sm font-bold truncate ${isEmpty ? 'text-red-500' : 'text-slate-800'}`}>
                        {isEmpty ? '⚠ VACÍO' : String(displayVal)}
                    </p>
                )}

                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{campo.desc}</p>
            </div>
        );
    };

    // ─── Datos enriquecidos del servidor ─────────────────────────────────────
    const DatoServidor = ({ label, value, icon: Icon }) => (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <Icon size={13} className="text-emerald-500 shrink-0" />
            <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase">{label}</p>
                <p className="text-sm font-bold text-slate-800">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-full flex flex-col gap-5 p-4 lg:p-8 font-sans bg-[#f6f8fb]">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2.5 rounded-xl">
                    <ScanLine size={22} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Verificar Código de Barras</h1>
                    <p className="text-sm text-slate-400">Escanea o pegá un código QR para desglosar y validar sus 7 campos</p>
                </div>
            </div>

            {/* Input de escaneo */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Código de barras / QR</label>
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={rawCode}
                        onChange={e => setRawCode(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleValidar()}
                        placeholder="Escaneá aquí o pegá el código..."
                        className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-mono text-sm outline-none focus:border-blue-500 transition-colors"
                        autoComplete="off"
                    />
                    <button
                        onClick={() => handleValidar()}
                        disabled={loading || !rawCode.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-40 whitespace-nowrap"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
                        Validar
                    </button>
                    {(result || rawCode) && (
                        <button
                            onClick={handleLimpiar}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl transition-all"
                            title="Limpiar"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Estructura esperada */}
                <p className="text-[11px] text-slate-400 mt-2 font-mono">
                    Estructura: <span className="text-blue-400">CodOrden</span> $* <span className="text-blue-400">IDCliente</span> $* <span className="text-blue-400">NombreTrabajo</span> $* <span className="text-blue-400">Modo</span> $* <span className="text-blue-400">IDProducto</span> $* <span className="text-blue-400">Cantidad</span> $* <span className="text-blue-400">Costo</span>
                </p>
            </div>

            {/* Resultado */}
            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Panel izquierdo: 7 campos */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Desglose de los 7 Campos</h3>
                            {result.rawParts ? (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">7 campos detectados</span>
                            ) : (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                    {rawCode.split('$*').length} campos — se esperan 7
                                </span>
                            )}
                        </div>

                        {result.rawParts ? (
                            CAMPOS_QR.map(c => (
                                <CampoQR key={c.key} campo={c} validado={result.valid ? result.data : null} />
                            ))
                        ) : (
                            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center">
                                <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
                                <p className="text-sm font-bold text-red-700">Código malformado</p>
                                <p className="text-xs text-red-500 mt-1">No se encontraron 7 partes separadas por <code>$*</code>. El código tiene {rawCode.split('$*').length} partes.</p>
                            </div>
                        )}

                        {/* Botón editar */}
                        {result.rawParts && (
                            <button
                                onClick={() => setEditando(v => !v)}
                                className={`flex items-center justify-center gap-2 py-2 rounded-xl border-2 font-bold text-sm transition-all mt-1 ${
                                    editando
                                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                                }`}
                            >
                                <Edit3 size={14} />
                                {editando ? 'Editando campos...' : 'Editar campos manualmente'}
                            </button>
                        )}
                    </div>

                    {/* Panel derecho: resultado de validación + acción */}
                    <div className="flex flex-col gap-4">

                        {/* Estado de validación */}
                        <div className={`rounded-2xl border-2 p-4 ${result.valid ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                            <div className="flex items-start gap-3">
                                {result.valid
                                    ? <CheckCircle2 size={28} className="text-emerald-500 shrink-0 mt-0.5" />
                                    : <AlertCircle size={28} className="text-red-500 shrink-0 mt-0.5" />
                                }
                                <div>
                                    <p className={`font-black text-base ${result.valid ? 'text-emerald-700' : 'text-red-700'}`}>
                                        {result.valid ? '✓ Código válido' : '✗ Error de validación'}
                                    </p>
                                    {result.error && (
                                        <p className="text-sm text-red-600 mt-1">{result.error}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Datos resueltos del servidor */}
                        {result.valid && result.data && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Datos resueltos por el servidor</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <DatoServidor label="Código Orden" value={result.data.CodigoOrden}       icon={Hash} />
                                    <DatoServidor label="Cliente"      value={result.data.CodigoCliente}     icon={User} />
                                    <DatoServidor label="ID Cliente"   value={result.data.IDCliente}         icon={User} />
                                    <DatoServidor label="Tipo Cliente" value={result.data.TipoCliente}       icon={Tag} />
                                    <DatoServidor label="Producto"     value={result.data.ProductoNombre}    icon={Package} />
                                    <DatoServidor label="Modo"         value={result.data.IdModo}            icon={Tag} />
                                    <DatoServidor label="Cantidad"     value={`${result.data.Cantidad}`}     icon={BarChart2} />
                                    <DatoServidor label="Costo"        value={`${result.data.Moneda} ${result.data.CostoFinal}`} icon={DollarSign} />
                                </div>
                            </div>
                        )}

                        {/* Acción: re-validar o ingresar */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Acciones</h3>

                            {editando && (
                                <button
                                    onClick={() => {
                                        // Reconstruir código con campos editados y re-validar
                                        const newCode = CAMPOS_QR.map(c => editFields[c.key] || '').join('$*');
                                        setRawCode(newCode);
                                        handleValidar(newCode);
                                    }}
                                    className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all"
                                >
                                    <RefreshCw size={15} /> Re-validar con campos editados
                                </button>
                            )}

                            <button
                                onClick={handleIngresar}
                                disabled={ingresando || !editFields.CodigoOrden}
                                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all disabled:opacity-40"
                            >
                                {ingresando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                Ingresar al depósito
                            </button>

                            {ingresadoMsg && (
                                <div className={`rounded-xl p-3 text-sm font-bold flex items-center gap-2 ${ingresadoMsg.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                    {ingresadoMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                    {ingresadoMsg.text}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerificarCodigoPage;

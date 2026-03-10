import React, { useState, useEffect, useMemo } from 'react';
import './ClientsIntegration.css';
import { toast } from 'sonner';
import api from '../../services/apiClient';

// ─── Helper ───────────────────────────────────────────────────────────────────
const Sel = ({ label, name, value, onChange, options, idKey = 'ID', nameKey = 'Nombre', placeholder = '— Sin asignar —' }) => (
    <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
        <select
            name={name}
            value={value ?? ''}
            onChange={onChange}
            className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 text-sm bg-white"
        >
            <option value="">{placeholder}</option>
            {options.map(o => (
                <option key={o[idKey]} value={o[idKey]}>{o[nameKey]}</option>
            ))}
        </select>
    </div>
);

const Txt = ({ label, name, value, onChange, type = 'text', colSpan = '' }) => (
    <div className={colSpan}>
        <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
        <input
            type={type}
            name={name}
            value={value ?? ''}
            onChange={onChange}
            className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 text-sm"
        />
    </div>
);

// ─── Modal de Edición ─────────────────────────────────────────────────────────
const EditClientDialog = ({ isOpen, onClose, client, onSave, catalogs }) => {
    const [form, setForm] = useState({});

    useEffect(() => {
        if (client) {
            setForm({
                // Identificación
                Nombre: client.Nombre?.trim() || '',
                NombreFantasia: client.NombreFantasia?.trim() || '',
                IDCliente: client.IDCliente?.trim() || '',
                CioRuc: client.CioRuc?.trim() || '',
                CodReferencia: client.CodReferencia ?? '',
                IDReact: client.IDReact ?? '',
                // Contacto
                TelefonoTrabajo: client.TelefonoTrabajo?.trim() || '',
                Email: client.Email?.trim() || '',
                // Dirección
                DireccionTrabajo: client.DireccionTrabajo?.trim() || '',
                // Clasificación
                TClIdTipoCliente: client.TClIdTipoCliente ?? '',
                // Ubicación
                DepartamentoID: client.DepartamentoID ?? '',
                LocalidadID: client.LocalidadID ?? '',
                AgenciaID: client.AgenciaID ?? '',
                FormaEnvioID: client.FormaEnvioID ?? '',
                // Comercial
                VendedorID: client.VendedorID || '',
                // Estado / Web
                ESTADO: client.ESTADO?.trim() || '',
                WebActive: client.WebActive != null ? !!client.WebActive : true,
            });
        }
    }, [client]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const localidadesFiltradas = form.DepartamentoID
        ? (catalogs.localidades || []).filter(l => String(l.DepartamentoID) === String(form.DepartamentoID))
        : (catalogs.localidades || []);

    const Section = ({ label, color = 'indigo', children }) => (
        <section>
            <p className={`text-[10px] font-bold text-${color}-400 uppercase tracking-widest mb-3 border-b border-${color}-100 pb-1`}>{label}</p>
            {children}
        </section>
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-fade-in">

                {/* Cabecera */}
                <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <i className="fa-solid fa-pen-to-square text-indigo-600"></i>
                            Editar Cliente
                        </h3>
                        <p className="text-xs text-slate-400">
                            ID: <strong>{client?.CliIdCliente}</strong>
                            {' · '}Cód: <strong>{client?.CodCliente}</strong>
                            {client?.IDReact && <> · IDReact: <strong>{client.IDReact}</strong></>}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition">
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>

                <div className="px-6 py-4 space-y-5">

                    {/* ── IDENTIFICACIÓN ── */}
                    <Section label="Identificación" color="indigo">
                        <div className="grid grid-cols-2 gap-3">
                            <Txt label="Nombre / Razón Social *" name="Nombre" value={form.Nombre} onChange={handleChange} colSpan="col-span-2" />
                            <Txt label="Nombre Fantasía" name="NombreFantasia" value={form.NombreFantasia} onChange={handleChange} />
                            <Txt label="ID Cliente (código interno)" name="IDCliente" value={form.IDCliente} onChange={handleChange} />
                            <Txt label="RUC / C.I." name="CioRuc" value={form.CioRuc} onChange={handleChange} />
                            <Txt label="Cód. Referencia" name="CodReferencia" value={form.CodReferencia} onChange={handleChange} type="number" />
                        </div>
                    </Section>

                    {/* ── CONTACTO ── */}
                    <Section label="Contacto" color="sky">
                        <div className="grid grid-cols-2 gap-3">
                            <Txt label="Teléfono" name="TelefonoTrabajo" value={form.TelefonoTrabajo} onChange={handleChange} />
                            <Txt label="Email" name="Email" value={form.Email} onChange={handleChange} type="email" />
                            <Txt label="Dirección" name="DireccionTrabajo" value={form.DireccionTrabajo} onChange={handleChange} colSpan="col-span-2" />
                        </div>
                    </Section>

                    {/* ── UBICACIÓN ── */}
                    <Section label="Ubicación" color="teal">
                        <div className="grid grid-cols-2 gap-3">
                            <Sel
                                label="Departamento"
                                name="DepartamentoID"
                                value={form.DepartamentoID}
                                onChange={(e) => setForm(prev => ({ ...prev, DepartamentoID: e.target.value, LocalidadID: '' }))}
                                options={catalogs.departamentos || []}
                            />
                            <Sel
                                label="Localidad"
                                name="LocalidadID"
                                value={form.LocalidadID}
                                onChange={handleChange}
                                options={localidadesFiltradas}
                            />
                            <Sel
                                label="Agencia de Envío"
                                name="AgenciaID"
                                value={form.AgenciaID}
                                onChange={handleChange}
                                options={catalogs.agencias || []}
                            />
                            <Sel
                                label="Forma de Envío"
                                name="FormaEnvioID"
                                value={form.FormaEnvioID}
                                onChange={handleChange}
                                options={catalogs.formasEnvio || []}
                            />
                        </div>
                    </Section>

                    {/* ── CLASIFICACIÓN ── */}
                    <Section label="Clasificación" color="purple">
                        <div className="grid grid-cols-2 gap-3">
                            <Sel
                                label="Tipo de Cliente"
                                name="TClIdTipoCliente"
                                value={form.TClIdTipoCliente}
                                onChange={handleChange}
                                options={catalogs.tiposClientes || []}
                                idKey="TClIdTipoCliente"
                                nameKey="TClDescripcion"
                            />
                            <Sel
                                label="Vendedor"
                                name="VendedorID"
                                value={form.VendedorID}
                                onChange={handleChange}
                                options={catalogs.vendedores || []}
                                idKey="Cedula"
                                nameKey="Nombre"
                            />
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
                                <select name="ESTADO" value={form.ESTADO ?? ''} onChange={handleChange}
                                    className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400">
                                    <option value="">— Sin asignar —</option>
                                    <option value="ACTIVO">ACTIVO</option>
                                    <option value="INACTIVO">INACTIVO</option>
                                    <option value="BLOQUEADO">BLOQUEADO</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3 mt-5 bg-slate-50 rounded-lg p-3">
                                <input type="checkbox" id="wa-toggle" name="WebActive"
                                    checked={!!form.WebActive} onChange={handleChange}
                                    className="w-4 h-4 accent-indigo-600" />
                                <label htmlFor="wa-toggle" className="text-sm font-medium text-slate-700">Web Activo</label>
                            </div>
                        </div>
                    </Section>

                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-end gap-2 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancelar</button>
                    <button onClick={() => onSave(form)} className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold shadow flex items-center gap-2">
                        <i className="fa-solid fa-save"></i> Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};



// ─── Componente Principal ─────────────────────────────────────────────────────
const ClientsIntegration = () => {
    const [clientsLocal, setClientsLocal] = useState([]);
    const [clientsReact, setClientsReact] = useState([]);
    const [clientsMacrosoft, setClientsMacrosoft] = useState([]);
    const [catalogs, setCatalogs] = useState({ localidades: [], departamentos: [], agencias: [], formasEnvio: [], tiposClientes: [], vendedores: [] });

    const [loadingLocal, setLoadingLocal] = useState(true);
    const [loadingReact, setLoadingReact] = useState(true);
    const [loadingMacrosoft, setLoadingMacrosoft] = useState(true);

    // Vista: 'table' | 'cards'
    const [viewMode, setViewMode] = useState('table');

    // Búsquedas y filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [localFilter, setLocalFilter] = useState('all');
    const [reactSearch, setReactSearch] = useState('');

    // Ordenamiento tabla
    const [sortCol, setSortCol] = useState('Nombre');
    const [sortDir, setSortDir] = useState('asc');

    // Edición y vinculación
    const [editingClient, setEditingClient] = useState(null);
    const [selectedLocalClient, setSelectedLocalClient] = useState(null);

    useEffect(() => { loadAllData(); }, []);

    // Debounce búsqueda React
    useEffect(() => {
        const t = setTimeout(() => loadReactClients(reactSearch), 400);
        return () => clearTimeout(t);
    }, [reactSearch]);

    const loadAllData = () => {
        loadLocalClients();
        loadReactClients();
        loadMacrosoftClients();
        loadCatalogs();
    };

    const loadCatalogs = async () => {
        try {
            const res = await api.get('/clients/catalogs');
            setCatalogs(res.data || {});
        } catch (e) { console.error('Error cargando catálogos', e); }
    };

    const loadLocalClients = async () => {
        try {
            setLoadingLocal(true);
            const res = await api.get('/clients');
            setClientsLocal(res.data || []);
        } catch (e) { console.error('Error cargando locales', e); }
        finally { setLoadingLocal(false); }
    };

    const loadReactClients = async (q = '') => {
        try {
            setLoadingReact(true);
            const params = q ? `?q=${encodeURIComponent(q)}` : '';
            const res = await api.get(`/clients/react-list${params}&t=${Date.now()}`);
            setClientsReact(Array.isArray(res.data) ? res.data : []);
        } catch (e) { console.error('Error cargando React', e); }
        finally { setLoadingReact(false); }
    };

    const loadMacrosoftClients = async () => {
        try {
            setLoadingMacrosoft(true);
            const res = await api.get(`/clients/macrosoft-list?t=${Date.now()}`);
            setClientsMacrosoft(Array.isArray(res.data) ? res.data : []);
        } catch (e) { console.error('Error cargando Macrosoft', e); }
        finally { setLoadingMacrosoft(false); }
    };

    const handleUpdateClient = async (formData) => {
        try {
            if (!editingClient) return;
            await api.put(`/clients/${editingClient.CodCliente}`, formData);
            toast.success('Cliente actualizado correctamente');
            setClientsLocal(prev => prev.map(c =>
                c.CodCliente === editingClient.CodCliente ? { ...c, ...formData } : c
            ));
            setEditingClient(null);
        } catch (e) {
            console.error(e);
            toast.error('Error al actualizar cliente');
        }
    };

    const handleExportToReact = async (c) => { if (!confirm(`¿Crear "${c.Nombre}" en React?`)) return; try { const r = await api.post('/clients/export-react', c); if (r.data.success) { toast.success(r.data.message); loadAllData(); } } catch { toast.error('Error exportando a React'); } };
    const handleExportToMacrosoft = async (c) => { if (!confirm(`¿Crear "${c.Nombre}" en Macrosoft?`)) return; try { const r = await api.post('/clients/export-macrosoft', c); if (r.data.success) { toast.success(r.data.message); loadAllData(); } } catch { toast.error('Error exportando a Macrosoft'); } };

    const handleImportToLocal = async (ext, source) => {
        if (!confirm(`¿Importar "${ext.NombreCliente || ext.Nombre}" desde ${source}?`)) return;
        const payload = source === 'React'
            ? { nombre: ext.NombreCliente, nombreFantasia: ext.EmpresaCliente, ruc: ext.Rut, telefono: ext.Telefono, email: ext.Email, direccion: ext.Direccion, codReact: ext.CodigoCliente, idReact: ext.IdCliente }
            : { nombre: ext.Nombre, nombreFantasia: ext.NombreFantasia, ruc: ext.CioRuc, telefono: ext.TelefonoTrabajo, email: ext.Email, direccion: ext.DireccionParticular };
        try { await api.post('/clients', payload); toast.success('Importado!'); loadLocalClients(); }
        catch { toast.error('Error importando'); }
    };

    const handleLinkReact = async (local, react) => {
        if (!confirm(`¿Vincular "${local.Nombre}" con "${react.NombreCliente}"?`)) return;
        try {
            await api.put(`/clients/${local.CodCliente}/link`, { codigoReact: react.CodigoCliente, idReact: react.IdCliente });
            toast.success('Vinculado con React!'); setSelectedLocalClient(null); loadAllData();
        } catch { toast.error('Error vinculando'); }
    };

    const handleLinkMacrosoft = async (local, ms) => {
        if (!confirm(`¿Vincular "${local.Nombre}" con "${ms.Nombre || ms.CliNombreApellido}"?`)) return;
        try {
            await api.put(`/clients/${local.CodCliente}/link-macrosoft`, { codReferencia: ms.CodCliente || ms.IdCliente });
            toast.success('Vinculado con Macrosoft!'); setSelectedLocalClient(null); loadAllData();
        } catch { toast.error('Error vinculando'); }
    };

    // ── Filtrado / Búsqueda ────────────────────────────────────────────────
    const term = searchTerm.toLowerCase();

    const filterLocal = useMemo(() => clientsLocal.filter(c => {
        const hasReact = !!c.CodigoReact;
        const hasMS = !!c.CodReferencia;
        if (localFilter === 'no-react' && hasReact) return false;
        if (localFilter === 'no-macrosoft' && hasMS) return false;
        if (localFilter === 'no-both' && (hasReact || hasMS)) return false;
        if (!term) return true;
        return c.Nombre?.toLowerCase().includes(term)
            || String(c.CodCliente).includes(term)
            || c.CioRuc?.toLowerCase().includes(term)
            || c.Email?.toLowerCase().includes(term)
            || c.TelefonoTrabajo?.toLowerCase().includes(term);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [clientsLocal, localFilter, term]);

    // Ordenamiento para la tabla
    const sortedLocal = useMemo(() => {
        return [...filterLocal].sort((a, b) => {
            const av = a[sortCol] ?? '';
            const bv = b[sortCol] ?? '';
            const cmp = String(av).localeCompare(String(bv), 'es', { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filterLocal, sortCol, sortDir]);

    const toggleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };
    const SortIcon = ({ col }) => sortCol !== col ? <i className="fa-solid fa-sort text-slate-300 ml-1 text-[10px]"></i>
        : sortDir === 'asc' ? <i className="fa-solid fa-sort-up text-indigo-500 ml-1 text-[10px]"></i>
            : <i className="fa-solid fa-sort-down text-indigo-500 ml-1 text-[10px]"></i>;

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

            {/* ── Header ── */}
            <div className="bg-white px-4 py-3 shadow-sm border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between">
                <div className="relative flex-1 min-w-[220px] max-w-xl">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, RUC, email, teléfono..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 outline-none text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <select value={localFilter} onChange={e => setLocalFilter(e.target.value)}
                    className="text-xs p-2 border border-slate-200 rounded-xl outline-none bg-white text-slate-600 shadow-sm">
                    <option value="all">Todos los clientes</option>
                    <option value="no-react">⚠️ Sin vínculo React</option>
                    <option value="no-macrosoft">⚠️ Sin vínculo Macrosoft</option>
                    <option value="no-both">⚠️ Sin ningún vínculo</option>
                </select>

                {/* Toggle vista */}
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                    <button onClick={() => setViewMode('table')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'table' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <i className="fa-solid fa-table mr-1"></i> Tabla
                    </button>
                    <button onClick={() => setViewMode('cards')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'cards' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <i className="fa-solid fa-grip mr-1"></i> Integración
                    </button>
                </div>

                <a href="/admin/duplicate-clients" target="_blank"
                    className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-xl font-bold text-xs transition hover:bg-amber-100">
                    <i className="fa-solid fa-users-slash"></i> Duplicados
                </a>
            </div>

            {/* ── VISTA TABLA ── */}
            {viewMode === 'table' && (
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="px-4 pt-2 pb-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{sortedLocal.length}</span> clientes
                        {loadingLocal && <span><i className="fa-solid fa-spinner fa-spin mr-1"></i>cargando...</span>}
                    </div>
                    <div className="flex-1 overflow-auto px-4 pb-4">
                        <table className="w-full border-collapse text-sm">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-100 text-left">
                                    {[
                                        ['CodCliente', 'ID', 'w-16'],
                                        ['Nombre', 'Nombre', 'min-w-[180px]'],
                                        ['CioRuc', 'RUC', 'w-36'],
                                        ['TelefonoTrabajo', 'Teléfono', 'w-32'],
                                        ['Email', 'Email', 'min-w-[160px]'],
                                        ['TipoClienteNombre', 'Tipo', 'w-28'],
                                        ['VendedorNombre', 'Vendedor', 'w-32'],
                                        ['LocalidadNombre', 'Localidad', 'w-28'],
                                        ['ESTADO', 'Estado', 'w-24'],
                                    ].map(([col, lbl, w]) => (
                                        <th key={col} className={`${w} px-3 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap border-b border-slate-200 hover:bg-slate-200 transition`}
                                            onClick={() => toggleSort(col)}>
                                            {lbl}<SortIcon col={col} />
                                        </th>
                                    ))}
                                    <th className="w-24 px-3 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200">Vínculos</th>
                                    <th className="w-16 px-3 py-2.5 border-b border-slate-200"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedLocal.length === 0 && !loadingLocal && (
                                    <tr><td colSpan={11} className="text-center py-12 text-slate-400 text-sm">Sin resultados</td></tr>
                                )}
                                {sortedLocal.map((c, i) => {
                                    const hasReact = !!c.CodigoReact;
                                    const hasMS = !!c.CodReferencia;
                                    return (
                                        <tr key={c.CodCliente}
                                            onClick={() => setEditingClient(c)}
                                            className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-indigo-50/60 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                            <td className="px-3 py-2 text-slate-400 font-mono text-xs">{c.CodCliente}</td>
                                            <td className="px-3 py-2 font-medium text-slate-800 max-w-[220px] truncate">{c.Nombre}</td>
                                            <td className="px-3 py-2 text-slate-500 text-xs font-mono">{c.CioRuc || '—'}</td>
                                            <td className="px-3 py-2 text-slate-500 text-xs">{c.TelefonoTrabajo || '—'}</td>
                                            <td className="px-3 py-2 text-slate-500 text-xs truncate max-w-[180px]">{c.Email || '—'}</td>
                                            <td className="px-3 py-2 text-slate-500 text-xs">{c.TipoClienteNombre || '—'}</td>
                                            <td className="px-3 py-2 text-slate-500 text-xs">{c.VendedorNombre || '—'}</td>
                                            <td className="px-3 py-2 text-slate-500 text-xs">{c.LocalidadNombre || '—'}</td>
                                            <td className="px-3 py-2">
                                                {c.ESTADO ? (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.ESTADO === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>{c.ESTADO}</span>
                                                ) : <span className="text-slate-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex gap-1.5">
                                                    <span title="React" className={`text-[13px] ${hasReact ? 'text-purple-600' : 'text-slate-200'}`}><i className="fa-brands fa-react"></i></span>
                                                    <span title="Macrosoft" className={`text-[13px] ${hasMS ? 'text-emerald-600' : 'text-slate-200'}`}><i className="fa-solid fa-server"></i></span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setEditingClient(c)}
                                                    className="text-slate-400 hover:text-indigo-600 transition p-1 rounded hover:bg-indigo-50">
                                                    <i className="fa-solid fa-pen-to-square text-xs"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── VISTA CARDS / INTEGRACIÓN ── */}
            {viewMode === 'cards' && (
                <div className="flex-1 flex overflow-hidden p-4 gap-4">

                    {/* Columna 1: Locales */}
                    <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                    <i className="fa-solid fa-database text-blue-600"></i> Locales
                                </h2>
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{filterLocal.length}</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {loadingLocal ? <div className="text-center p-4 text-slate-400 text-sm"><i className="fa-solid fa-spinner fa-spin"></i> Cargando...</div> :
                                filterLocal.length === 0 ? <div className="text-center p-4 text-slate-400 text-xs">Sin resultados</div> :
                                    filterLocal.map(c => {
                                        const isSelected = selectedLocalClient?.CodCliente === c.CodCliente;
                                        const hasReact = !!c.CodigoReact;
                                        const hasMS = !!c.CodReferencia;
                                        return (
                                            <div key={c.CodCliente}
                                                onClick={() => { if (isSelected) { setSelectedLocalClient(null); setSearchTerm(''); } else { setSelectedLocalClient(c); setSearchTerm(c.CioRuc?.trim() || c.Nombre || ''); } }}
                                                className={`bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition group cursor-pointer ${isSelected ? 'border-2 border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-indigo-800' : 'text-slate-800'}`}>{c.Nombre}</h3>
                                                    <button onClick={e => { e.stopPropagation(); setEditingClient(c); }} className="text-slate-400 hover:text-indigo-600 transition shrink-0 ml-2">
                                                        <i className="fa-solid fa-pen-to-square text-xs"></i>
                                                    </button>
                                                </div>
                                                <div className="text-[11px] text-slate-500 grid grid-cols-2 gap-1">
                                                    <span><b>ID:</b> {c.CodCliente}</span>
                                                    <span className="truncate"><b>Doc:</b> {c.CioRuc || '—'}</span>
                                                    <span><b>Tel:</b> {c.TelefonoTrabajo || '—'}</span>
                                                    <span className="truncate"><b>Email:</b> {c.Email || '—'}</span>
                                                </div>
                                                <div className="mt-2 flex gap-3 text-xs">
                                                    <span className={`flex items-center gap-1 ${hasReact ? 'text-purple-600 font-bold' : 'text-slate-300'}`}><i className="fa-brands fa-react"></i></span>
                                                    <span className={`flex items-center gap-1 ${hasMS ? 'text-emerald-600 font-bold' : 'text-slate-300'}`}><i className="fa-solid fa-server"></i></span>
                                                </div>
                                                {isSelected && <div className="mt-2 text-center text-[10px] font-bold text-indigo-600 animate-pulse bg-indigo-100 rounded py-1">Seleccionado → elige a quién vincular ➡️</div>}
                                            </div>
                                        );
                                    })}
                        </div>
                    </div>

                    {/* Columna 2: API React (ClientesReact sin vincular) */}
                    <div className={`flex-1 flex flex-col bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${selectedLocalClient ? 'border-purple-300 ring-2 ring-purple-100' : 'border-slate-200'}`}>
                        <div className="p-4 border-b border-slate-100 bg-purple-50/50">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                    <i className="fa-brands fa-react text-purple-600"></i> API React
                                    <span className="text-[10px] font-normal text-purple-400">(sin vincular)</span>
                                </h2>
                                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">{clientsReact.length}</span>
                            </div>
                            <input type="text" placeholder="Buscar en ClientesReact..."
                                className="w-full text-xs p-1.5 border border-purple-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                                value={reactSearch} onChange={e => setReactSearch(e.target.value)} />
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {loadingReact ? <div className="text-center p-4 text-slate-400 text-sm"><i className="fa-solid fa-spinner fa-spin"></i></div> :
                                clientsReact.length === 0 ? <div className="text-center p-4 text-slate-400 text-xs">Sin resultados sin vincular</div> :
                                    clientsReact.map(c => (
                                        <div key={c.IdCliente} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-purple-300 transition group relative">
                                            <h3 className="font-bold text-slate-800 text-sm mb-1 truncate">{c.NombreCliente || c.EmpresaCliente || '—'}</h3>
                                            {c.EmpresaCliente && c.NombreCliente !== c.EmpresaCliente && <p className="text-[10px] text-slate-400 truncate mb-1">{c.EmpresaCliente}</p>}
                                            <div className="text-[11px] text-slate-600 space-y-0.5 bg-purple-50/30 p-2 rounded">
                                                <p><b>Cód:</b> {c.CodigoCliente || '—'}</p>
                                                <p><b>Doc:</b> {c.Rut || '—'}</p>
                                                <p><b>Tel:</b> {c.Telefono || '—'}</p>
                                            </div>
                                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                                                {selectedLocalClient
                                                    ? <button onClick={() => handleLinkReact(selectedLocalClient, c)} className="bg-purple-600 hover:bg-purple-700 shadow text-white px-2 py-1 rounded text-[10px] font-bold"><i className="fa-solid fa-link mr-1"></i>Vincular</button>
                                                    : <button onClick={() => handleImportToLocal(c, 'React')} className="bg-blue-600 hover:bg-blue-700 shadow text-white px-2 py-1 rounded text-[10px] font-bold"><i className="fa-solid fa-file-import mr-1"></i>A Local</button>
                                                }
                                            </div>
                                        </div>
                                    ))}
                        </div>
                    </div>

                    {/* Columna 3: Macrosoft */}
                    <div className={`flex-1 flex flex-col bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${selectedLocalClient ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
                        <div className="p-4 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-center">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-server text-emerald-600"></i> API Macrosoft
                            </h2>
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full">{clientsMacrosoft.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {loadingMacrosoft ? <div className="text-center p-4 text-slate-400 text-sm"><i className="fa-solid fa-spinner fa-spin"></i></div> :
                                clientsMacrosoft.length === 0 ? <div className="text-center p-4 text-slate-400 text-xs">Sin resultados</div> :
                                    clientsMacrosoft.map(c => {
                                        const nom = c.Nombre || c.CliNombreApellido;
                                        const cod = c.CodCliente || c.IdCliente;
                                        return (
                                            <div key={cod} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-emerald-300 transition group relative">
                                                <h3 className="font-bold text-slate-800 text-sm mb-1 truncate">{nom}</h3>
                                                <div className="text-[11px] text-slate-600 space-y-0.5 bg-emerald-50/30 p-2 rounded">
                                                    <p><b>ID MS:</b> {cod}</p>
                                                    <p><b>RUC:</b> {c.CioRuc || c.Rut || '—'}</p>
                                                    <p><b>Tel:</b> {c.TelefonoTrabajo || c.Telefono || '—'}</p>
                                                </div>
                                                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                                                    {selectedLocalClient
                                                        ? <button onClick={() => handleLinkMacrosoft(selectedLocalClient, c)} className="bg-emerald-600 hover:bg-emerald-700 shadow text-white px-2 py-1 rounded text-[10px] font-bold"><i className="fa-solid fa-link mr-1"></i>Vincular</button>
                                                        : <button onClick={() => handleImportToLocal(c, 'Macrosoft')} className="bg-blue-600 hover:bg-blue-700 shadow text-white px-2 py-1 rounded text-[10px] font-bold"><i className="fa-solid fa-file-import mr-1"></i>A Local</button>
                                                    }
                                                </div>
                                            </div>
                                        );
                                    })}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal edición */}
            <EditClientDialog
                isOpen={!!editingClient}
                onClose={() => setEditingClient(null)}
                client={editingClient}
                onSave={handleUpdateClient}
                catalogs={catalogs}
            />
        </div>
    );
};

export default ClientsIntegration;

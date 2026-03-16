import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './ClientsIntegration.css';
import { toast } from 'sonner';
import api from '../../services/apiClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#2563eb','#be185d'];
const getAvatarColor = (name) => { const s = String(name ?? ''); return AVATAR_COLORS[(s.charCodeAt(0) || 0) % AVATAR_COLORS.length]; };
const getInitials    = (name) => { const s = String(name ?? '').trim(); return s.split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('') || '?'; };

const DUP_COLORS = { Email:'#dc2626', TelefonoTrabajo:'#d97706', Nombre:'#7c3aed', IDCliente:'#0891b2', IDReact:'#059669', CodCliente:'#db2777' };

const statusColor = (s) => s === 'ACTIVO' ? 'green' : s === 'INACTIVO' ? 'red' : s === 'BLOQUEADO' ? 'amber' : 'slate';

function Badge({ children, color = 'slate' }) {
    return <span className={`ci-badge ${color}`}>{children}</span>;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 34 }) {
    const bg = getAvatarColor(name);
    return (
        <div className="ci-avatar" style={{ background: bg, width: size, height: size, fontSize: size * .36 }}>
            {getInitials(name)}
        </div>
    );
}

// ─── Modal ABM ────────────────────────────────────────────────────────────────
function ClientModal({ client, catalogs, onClose, onSaved }) {
    const isNew = !client?.CodCliente;
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        setForm(client ? { ...client } : { Nombre:'', NombreFantasia:'', IDCliente:'', CioRuc:'', TelefonoTrabajo:'', Email:'', DireccionTrabajo:'', TClIdTipoCliente:'', VendedorID:'', DepartamentoID:'', LocalidadID:'', AgenciaID:'', FormaEnvioID:'', ESTADO:'ACTIVO', WebActive:true });
    }, [client]);

    const set = f => e => setForm(p => ({...p, [f]: e.target.type==='checkbox' ? e.target.checked : e.target.value}));
    const locs = useMemo(() => form.DepartamentoID ? (catalogs.localidades||[]).filter(l=>String(l.DepartamentoID)===String(form.DepartamentoID)) : (catalogs.localidades||[]), [form.DepartamentoID, catalogs.localidades]);

    const handleSave = async () => {
        if (!form.Nombre?.trim()) return toast.error('El nombre es obligatorio');
        setSaving(true);
        try {
            if (isNew) await api.post('/clients', { nombre:form.Nombre, telefono:form.TelefonoTrabajo, email:form.Email, direccion:form.DireccionTrabajo, ruc:form.CioRuc, nombreFantasia:form.NombreFantasia });
            else await api.put(`/clients/${client.CodCliente}`, form);
            toast.success(isNew ? 'Cliente creado ✓' : 'Cliente actualizado ✓');
            onSaved(); onClose();
        } catch(e) { toast.error(e.response?.data?.error || 'Error guardando'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm(`¿Eliminar "${client.Nombre}"? Esta acción no se puede deshacer.`)) return;
        setDeleting(true);
        try {
            await api.delete(`/clients/${client.CodCliente}`);
            toast.success('Cliente eliminado');
            onSaved(); onClose();
        } catch(e) { toast.error(e.response?.data?.error || 'No se pudo eliminar'); }
        finally { setDeleting(false); }
    };

    const F = ({label, field, type='text', readOnly=false, cls=''}) => (
        <div className={`ci-field ${cls}`}>
            <label>{label}</label>
            <input type={type} value={form[field]??''} onChange={set(field)} readOnly={readOnly} />
        </div>
    );
    const S = ({label, field, options=[], idKey='ID', nameKey='Nombre', cls=''}) => (
        <div className={`ci-field ${cls}`}>
            <label>{label}</label>
            <select value={form[field]??''} onChange={set(field)}>
                <option value="">— Sin asignar —</option>
                {options.map(o=><option key={o[idKey]} value={o[idKey]}>{o[nameKey]}</option>)}
            </select>
        </div>
    );

    return (
        <div className="ci-overlay" onClick={onClose}>
            <div className="ci-modal" onClick={e=>e.stopPropagation()}>
                <div className="ci-modal-header">
                    <div>
                        <div className="ci-modal-title">{isNew ? '+ Nuevo Cliente' : `Editar: ${client.Nombre}`}</div>
                        {!isNew && <div className="ci-modal-sub">CodCliente: {client.CodCliente} · IDReact: {client.IDReact||'—'}</div>}
                    </div>
                    <button className="ci-modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="ci-modal-body">
                    <div>
                        <div className="ci-modal-section-title">Identificación</div>
                        <div className="ci-field-grid">
                            <F label="Nombre / Razón Social *" field="Nombre" cls="full"/>
                            <F label="Nombre Fantasía" field="NombreFantasia"/>
                            <F label="ID Cliente" field="IDCliente"/>
                            <F label="RUC / C.I." field="CioRuc"/>
                            <F label="IDReact" field="IDReact" readOnly={!isNew}/>
                            <F label="CodReferencia (Macrosoft)" field="CodReferencia"/>
                        </div>
                    </div>
                    <div>
                        <div className="ci-modal-section-title">Contacto</div>
                        <div className="ci-field-grid">
                            <F label="Teléfono" field="TelefonoTrabajo"/>
                            <F label="Email" field="Email" type="email"/>
                            <F label="Dirección" field="DireccionTrabajo" cls="full"/>
                        </div>
                    </div>
                    <div>
                        <div className="ci-modal-section-title">Clasificación</div>
                        <div className="ci-field-grid">
                            <S label="Tipo de Cliente" field="TClIdTipoCliente" options={catalogs.tiposClientes||[]}/>
                            <S label="Vendedor" field="VendedorID" options={catalogs.vendedores||[]} idKey="Cedula"/>
                            <div className="ci-field">
                                <label>Estado</label>
                                <select value={form.ESTADO??''} onChange={set('ESTADO')}>
                                    <option value="">— Sin asignar —</option>
                                    <option value="ACTIVO">ACTIVO</option>
                                    <option value="INACTIVO">INACTIVO</option>
                                    <option value="BLOQUEADO">BLOQUEADO</option>
                                </select>
                            </div>
                            <div className="ci-field" style={{display:'flex',alignItems:'center',gap:8,paddingTop:22}}>
                                <input type="checkbox" id="wa-chk" checked={!!form.WebActive} onChange={set('WebActive')} style={{width:16,height:16,accentColor:'#4f46e5'}}/>
                                <label htmlFor="wa-chk" style={{textTransform:'none',fontSize:13,fontWeight:600,color:'#374151',marginBottom:0}}>Web Activo</label>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="ci-modal-section-title">Ubicación</div>
                        <div className="ci-field-grid">
                            <S label="Departamento" field="DepartamentoID" options={catalogs.departamentos||[]} cls="" />
                            <S label="Localidad" field="LocalidadID" options={locs}/>
                            <S label="Agencia Envío" field="AgenciaID" options={catalogs.agencias||[]}/>
                            <S label="Forma de Envío" field="FormaEnvioID" options={catalogs.formasEnvio||[]}/>
                        </div>
                    </div>
                </div>
                <div className="ci-modal-footer">
                    {!isNew && (
                        <button onClick={handleDelete} disabled={deleting}
                            style={{marginRight:'auto',padding:'9px 16px',background:'none',border:'1.5px solid #fca5a5',borderRadius:8,color:'#dc2626',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6,transition:'all .15s'}}
                            onMouseEnter={e=>{e.currentTarget.style.background='#fee2e2';}}
                            onMouseLeave={e=>{e.currentTarget.style.background='none';}}
                        >
                            {deleting ? '🗑 Eliminando…' : '🗑 Eliminar cliente'}
                        </button>
                    )}
                    <button className="ci-btn-cancel" onClick={onClose}>Cancelar</button>
                    <button className="ci-btn-save" onClick={handleSave} disabled={saving}>{saving?'Guardando…':isNew?'Crear Cliente':'Guardar Cambios'}</button>
                </div>
            </div>
        </div>
    );
}

// ─── TAB 1: TABLA / KANBAN ────────────────────────────────────────────────────
function TabTabla({ catalogs }) {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterEstado, setFilterEstado] = useState('');
    const [filterTipo, setFilterTipo] = useState('');
    const [filterVinculo, setFilterVinculo] = useState('');
    const [viewMode, setViewMode] = useState('kanban');
    const [sortCol, setSortCol] = useState('Nombre');
    const [sortDir, setSortDir] = useState('asc');
    const [editing, setEditing] = useState(null);
    const [filterDup, setFilterDup] = useState('');   // '' | 'all' | campo específico
    const [focusDup, setFocusDup] = useState(null);   // { field, value } — ver solo hermanitos

    const load = useCallback(async () => {
        setLoading(true);
        try { const r = await api.get('/clients'); setClients(r.data||[]); }
        catch { toast.error('Error cargando clientes'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const dupSets = useMemo(() => {
        const dup = {};
        ['Email','TelefonoTrabajo','Nombre','IDCliente','IDReact'].forEach(f => {
            const vals = {};
            clients.forEach(c => { const v=String(c[f]??'').trim().toLowerCase(); if(!v)return; vals[v]=(vals[v]||0)+1; });
            Object.entries(vals).forEach(([v,cnt]) => { if(cnt>1) clients.filter(c=>String(c[f]??'').trim().toLowerCase()===v).forEach(c=>{ if(!dup[c.CodCliente])dup[c.CodCliente]=new Set(); dup[c.CodCliente].add(f); }); });
        });
        return dup;
    }, [clients]);

    // Manejador para click en etiqueta de duplicado: filtra hermanitos
    const handleDupTagClick = (e, c, field) => {
        e.stopPropagation();
        const val = String(c[field] ?? '').trim().toLowerCase();
        if (!val) return;
        setFocusDup(prev =>
            prev && prev.field === field && prev.value === val ? null
            : { field, value: val, label: c[field] }
        );
    };


    const filtered = useMemo(() => {
        const t = search.toLowerCase();
        return clients.filter(c => {
            // Modo hermanitos: mostrar solo los que comparten el mismo valor en el mismo campo
            if (focusDup) {
                return String(c[focusDup.field] ?? '').trim().toLowerCase() === focusDup.value;
            }
            if (filterEstado && c.ESTADO !== filterEstado) return false;
            if (filterTipo && String(c.TClIdTipoCliente) !== filterTipo) return false;
            if (filterVinculo === 'no-react' && c.IDReact) return false;
            if (filterVinculo === 'no-macrosoft' && c.CodReferencia) return false;
            if (filterDup === 'all' && !dupSets[c.CodCliente]) return false;
            if (filterDup && filterDup !== 'all') {
                const dups = dupSets[c.CodCliente];
                if (!dups || !dups.has(filterDup)) return false;
            }
            if (!t) return true;
            return [c.Nombre,c.Email,c.TelefonoTrabajo,c.CioRuc,String(c.CodCliente),c.IDCliente].some(v=>v?.toLowerCase().includes(t));
        });
    }, [clients, search, filterEstado, filterTipo, filterVinculo, filterDup, dupSets, focusDup]);

    const sorted = useMemo(() => [...filtered].sort((a,b)=>{
        const cmp=String(a[sortCol]??'').localeCompare(String(b[sortCol]??''),'es',{numeric:true});
        return sortDir==='asc'?cmp:-cmp;
    }), [filtered, sortCol, sortDir]);

    const toggleSort = col => { if(sortCol===col)setSortDir(d=>d==='asc'?'desc':'asc'); else{setSortCol(col);setSortDir('asc');} };

    const dupCount = Object.keys(dupSets).length;
    const activeCount = clients.filter(c=>c.ESTADO==='ACTIVO').length;
    const linkedCount = clients.filter(c=>c.IDReact).length;

    return (
        <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden',gap:0}}>
            {/* Stats */}
            <div className="ci-stats">
                <div className="ci-stat-card"><span className="ci-stat-num">{clients.length}</span><span className="ci-stat-label">Total</span></div>
                <div className="ci-stat-card success"><span className="ci-stat-num">{activeCount}</span><span className="ci-stat-label">Activos</span></div>
                <div className="ci-stat-card"><span className="ci-stat-num">{linkedCount}</span><span className="ci-stat-label">Con React</span></div>
                {dupCount > 0 && <div
                    className={`ci-stat-card danger`}
                    onClick={() => setFilterDup(f => f === 'all' ? '' : 'all')}
                    style={{cursor:'pointer', outline: filterDup==='all' ? '2px solid #dc2626' : 'none', outlineOffset:2}}>
                    <span className="ci-stat-num">{dupCount}</span>
                    <span className="ci-stat-label">{filterDup==='all' ? '✓ filtrado' : 'Duplicados'}</span>
                </div>}
                <span style={{marginLeft:'auto',fontSize:12,color:'#888',fontWeight:600,alignSelf:'center'}}>{sorted.length} visible{sorted.length!==1?'s':''}</span>
            </div>

            {/* Toolbar */}
            <div className="ci-toolbar">
                <input className="ci-search" type="text" placeholder="Buscar nombre, email, teléfono, RUC..." value={search} onChange={e=>setSearch(e.target.value)}/>
                <select className="ci-select" value={filterEstado} onChange={e=>setFilterEstado(e.target.value)}>
                    <option value="">Estado: Todos</option>
                    {['ACTIVO','INACTIVO','BLOQUEADO'].map(s=><option key={s}>{s}</option>)}
                </select>
                <select className="ci-select" value={filterTipo} onChange={e=>setFilterTipo(e.target.value)}>
                    <option value="">Tipo: Todos</option>
                    {(catalogs.tiposClientes||[]).map(t=><option key={t.ID} value={t.ID}>{t.Nombre}</option>)}
                </select>
                <select className="ci-select" value={filterVinculo} onChange={e=>setFilterVinculo(e.target.value)}>
                    <option value="">Vínculos: Todos</option>
                    <option value="no-react">⚠ Sin React</option>
                    <option value="no-macrosoft">⚠ Sin Macrosoft</option>
                </select>
                <select className="ci-select" value={filterDup} onChange={e=>setFilterDup(e.target.value)}
                    style={filterDup ? {borderColor:'#dc2626',color:'#dc2626',fontWeight:700} : {}}>
                    <option value="">Duplicados: Todos</option>
                    <option value="all">⚠ Solo duplicados</option>
                    {Object.keys(DUP_COLORS).map(f=><option key={f} value={f}>Dup por {f}</option>)}
                </select>
                <div className="ci-view-toggle">
                    <button className={`ci-view-btn ${viewMode==='kanban'?'active':''}`} onClick={()=>setViewMode('kanban')}>⊞ Tarjetas</button>
                    <button className={`ci-view-btn ${viewMode==='table'?'active':''}`} onClick={()=>setViewMode('table')}>☰ Tabla</button>
                </div>
                <button className="ci-btn-primary" onClick={()=>setEditing({})}>+ Nuevo Cliente</button>
            </div>

            {/* Banner modo hermanitos */}
            {focusDup && (
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 28px',background:'#1e1b4b',color:'#fff',fontSize:13,fontWeight:600,flexShrink:0}}>
                    <span style={{opacity:.7}}>Mostrando hermanitos de</span>
                    <span style={{background:`${DUP_COLORS[focusDup.field]}33`,border:`1px solid ${DUP_COLORS[focusDup.field]}`,borderRadius:6,padding:'2px 10px',color:DUP_COLORS[focusDup.field],fontWeight:800}}>
                        {focusDup.field}: &quot;{focusDup.label}&quot;
                    </span>
                    <span style={{opacity:.7,fontSize:11}}>({sorted.length} clientes)</span>
                    <button onClick={()=>setFocusDup(null)} style={{marginLeft:'auto',background:'rgba(255,255,255,.15)',border:'none',borderRadius:6,color:'#fff',padding:'4px 12px',cursor:'pointer',fontWeight:700,fontSize:12}}
                    >✕ Limpiar</button>
                </div>
            )}
            {/* Dup legend */}
            {!focusDup && dupCount > 0 && (
                <div className="ci-dup-legend">
                    <span>Duplicados detectados — hacé clic en una etiqueta para ver sus hermanitos:</span>
                    {Object.entries(DUP_COLORS).map(([f,c])=>(<span key={f} style={{display:'flex',alignItems:'center',gap:4}}><span className="ci-dup-dot" style={{background:c}}/>{f}</span>))}
                </div>
            )}

            {/* Content */}
            <div className="ci-content">
                {loading && <p style={{textAlign:'center',padding:40,color:'#888'}}>Cargando clientes…</p>}

                {/* KANBAN */}
                {!loading && viewMode==='kanban' && (
                    <div className="ci-kanban">
                        {sorted.length===0 && <p style={{gridColumn:'1/-1',textAlign:'center',padding:40,color:'#aaa'}}>Sin resultados</p>}
                        {sorted.map(c => {
                            const dups = dupSets[c.CodCliente];
                            const firstDupField = dups ? [...dups][0] : null;
                            return (
                                <div key={c.CodCliente} className={`ci-card ${dups?'dup-card':''}`}
                                    style={dups?{'--dup-color':DUP_COLORS[firstDupField]}:{}}
                                    onClick={()=>setEditing(c)}>
                                    <div className="ci-card-header">
                                        <Avatar name={c.Nombre} size={38}/>
                                        <div className="ci-card-info">
                                            <div className="ci-card-name">{c.Nombre}</div>
                                            <div className="ci-card-sub">{c.NombreFantasia || `Cód: ${c.CodCliente}`}</div>
                                        </div>
                                        {c.ESTADO && <Badge color={statusColor(c.ESTADO)}>{c.ESTADO}</Badge>}
                                    </div>
                                    {dups && (
                                        <div className="ci-dup-tags">
                                            {[...dups].map(f=>(
                                                <span key={f} className="ci-dup-tag"
                                                    onClick={e=>handleDupTagClick(e,c,f)}
                                                    style={{background:`${DUP_COLORS[f]}22`,color:DUP_COLORS[f],cursor:'pointer',border:`1px solid ${DUP_COLORS[f]}55`}}
                                                    title={`Clic para ver todos con el mismo ${f}`}>
                                                    🔍 {f}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="ci-card-body">
                                        {c.TelefonoTrabajo && <div className="ci-card-row"><span className="ci-card-row-icon">📞</span>{c.TelefonoTrabajo}</div>}
                                        {c.Email && <div className="ci-card-row"><span className="ci-card-row-icon">✉</span><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.Email}</span></div>}
                                        {c.TipoClienteNombre && <div className="ci-card-row"><span className="ci-card-row-icon">🏷</span>{c.TipoClienteNombre}</div>}
                                        {c.VendedorNombre && <div className="ci-card-row"><span className="ci-card-row-icon">👤</span>{c.VendedorNombre}</div>}
                                    </div>
                                    <div className="ci-card-footer">
                                        <div style={{display:'flex',gap:5}}>
                                            <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,
                                                background: c.IDReact ? '#dcfce7' : '#f1f5f9',
                                                color: c.IDReact ? '#15803d' : '#94a3b8',
                                                border: c.IDReact ? '1px solid #bbf7d0' : '1px dashed #cbd5e1'
                                            }}>📊 Planilla</span>
                                            <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,
                                                background: c.CodReferencia ? '#ede9fe' : '#f1f5f9',
                                                color: c.CodReferencia ? '#7c3aed' : '#94a3b8',
                                                border: c.CodReferencia ? '1px solid #ddd6fe' : '1px dashed #cbd5e1'
                                            }}>🖥 Macrosoft</span>
                                        </div>
                                        <span style={{fontSize:10,color:'#bbb',fontWeight:600}}>#{c.CodCliente}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* TABLE */}
                {!loading && viewMode==='table' && (
                    <div className="ci-table-wrap">
                        <table className="ci-table">
                            <thead>
                                <tr>
                                    {[['CodCliente','Cód','w-16'],['Nombre','Nombre',''],['IDCliente','ID Cliente',''],['CioRuc','RUC',''],['TelefonoTrabajo','Teléfono',''],['Email','Email',''],['TipoClienteNombre','Tipo',''],['VendedorNombre','Vendedor',''],['ESTADO','Estado','']].map(([col,lbl])=>(
                                        <th key={col} onClick={()=>toggleSort(col)}>{lbl}{sortCol===col?(sortDir==='asc'?' ↑':' ↓'):''}</th>
                                    ))}
                                    <th>Vínculos</th><th/>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.length===0 && <tr><td colSpan={11} style={{textAlign:'center',padding:40,color:'#aaa'}}>Sin resultados</td></tr>}
                                {sorted.map((c,i)=>{
                                    const dups=dupSets[c.CodCliente];
                                    const firstDup=dups?[...dups][0]:null;
                                    return (
                                        <tr key={c.CodCliente} onClick={()=>setEditing(c)}
                                            className={dups?'dup-row':''} style={dups?{'--dup-color':DUP_COLORS[firstDup]}:{background:i%2?'#fafafe':'#fff'}}>
                                            <td style={{color:'#999',fontFamily:'monospace',fontSize:11}}>{c.CodCliente}</td>
                                            <td>
                                                <div style={{display:'flex',alignItems:'center',gap:8}}>
                                                    <Avatar name={c.Nombre} size={28}/>
                                                    <div>
                                                        <div style={{fontWeight:600,fontSize:13}}>{c.Nombre}</div>
                                                        {dups && (
                                        <div className="ci-dup-tags">
                                            {[...dups].map(f=>(
                                                <span key={f} className="ci-dup-tag"
                                                    onClick={e=>handleDupTagClick(e,c,f)}
                                                    style={{background:`${DUP_COLORS[f]}22`,color:DUP_COLORS[f],cursor:'pointer',border:`1px solid ${DUP_COLORS[f]}55`}}
                                                    title={`Clic para ver todos con el mismo ${f}`}>
                                                    🔍 {f}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{fontSize:12,color:'#666'}}>{c.IDCliente||'—'}</td>
                                            <td style={{fontSize:12,color:'#666'}}>{c.CioRuc||'—'}</td>
                                            <td style={{fontSize:12,color:'#666'}}>{c.TelefonoTrabajo||'—'}</td>
                                            <td style={{fontSize:12,color:'#666',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.Email||'—'}</td>
                                            <td style={{fontSize:12}}>{c.TipoClienteNombre||'—'}</td>
                                            <td style={{fontSize:12}}>{c.VendedorNombre||'—'}</td>
                                            <td>{c.ESTADO?<Badge color={statusColor(c.ESTADO)}>{c.ESTADO}</Badge>:'—'}</td>
                                            <td><div style={{display:'flex',gap:4}}><span style={{fontSize:13,color:c.IDReact?'#7c3aed':'#e2e8f0'}} title="React">⚛</span><span style={{fontSize:13,color:c.CodReferencia?'#059669':'#e2e8f0'}} title="Macrosoft">🖧</span></div></td>
                                            <td onClick={e=>e.stopPropagation()}>
                                                <button onClick={async()=>{if(!confirm(`¿Eliminar "${c.Nombre}"?`))return;try{await api.delete(`/clients/${c.CodCliente}`);toast.success('Eliminado');load();}catch(e){toast.error(e.response?.data?.error||'No se pudo eliminar');}}} style={{background:'none',border:'none',cursor:'pointer',color:'#fca5a5',fontSize:14,padding:4}} title="Eliminar">🗑</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {editing!==null && <ClientModal client={Object.keys(editing).length===0?null:editing} catalogs={catalogs} onClose={()=>setEditing(null)} onSaved={load}/>}
        </div>
    );
}

// ─── TAB 2: ÁRBOL ─────────────────────────────────────────────────────────────
function TabArbol({ catalogs }) {
    const [groupBy, setGroupBy] = useState('vendedor');
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(new Set());
    const [search, setSearch] = useState('');
    const [quickEdit, setQuickEdit] = useState(null);
    const [quickVal, setQuickVal] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.get(`/clients/tree?group=${groupBy}`);
            setGroups(r.data.groups||[]);
            if(r.data.groups?.length) setExpanded(new Set([r.data.groups[0].label]));
        } catch { toast.error('Error cargando árbol'); }
        finally { setLoading(false); }
    }, [groupBy]);

    useEffect(() => { load(); }, [load]);

    const filteredGroups = useMemo(() => {
        if(!search) return groups;
        const t=search.toLowerCase();
        return groups.map(g=>({...g,clients:g.clients.filter(c=>[c.Nombre,c.Email,c.TelefonoTrabajo].some(v=>v?.toLowerCase().includes(t)))})).filter(g=>g.clients.length>0);
    }, [groups, search]);

    const toggle = label => setExpanded(p=>{ const n=new Set(p); n.has(label)?n.delete(label):n.add(label); return n; });

    const opts = groupBy==='vendedor' ? (catalogs.vendedores||[]).map(v=>({id:v.Cedula,label:v.Nombre})) : (catalogs.tiposClientes||[]).map(t=>({id:t.ID,label:t.Nombre}));

    const saveQuick = async () => {
        setSaving(true);
        try {
            await api.patch(`/clients/${quickEdit.CodCliente}/quick`, groupBy==='vendedor'?{VendedorID:quickVal}:{TClIdTipoCliente:quickVal});
            toast.success('Actualizado ✓'); setQuickEdit(null); load();
        } catch(e) { toast.error(e.response?.data?.error||'Error'); }
        finally { setSaving(false); }
    };

    const totalClients = groups.reduce((s,g)=>s+g.clients.length, 0);

    return (
        <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden',gap:0}}>
            <div className="ci-stats">
                <div className="ci-stat-card"><span className="ci-stat-num">{totalClients}</span><span className="ci-stat-label">Clientes</span></div>
                <div className="ci-stat-card"><span className="ci-stat-num">{groups.length}</span><span className="ci-stat-label">Grupos</span></div>
            </div>
            <div className="ci-toolbar">
                <div className="ci-view-toggle">
                    {[['vendedor','👤 Por Vendedor'],['tipo','🏷 Por Tipo']].map(([v,l])=>(
                        <button key={v} className={`ci-view-btn ${groupBy===v?'active':''}`} onClick={()=>setGroupBy(v)}>{l}</button>
                    ))}
                </div>
                <input className="ci-search" type="text" placeholder="Buscar cliente..." value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:280}}/>
                <button onClick={load} style={{background:'none',border:'1.5px solid #e2e8f0',borderRadius:8,padding:'7px 12px',cursor:'pointer',color:'#666',fontSize:13}} title="Recargar">↺ Recargar</button>
            </div>
            <div className="ci-content">
                <div className="ci-tree">
                    {loading && <p style={{textAlign:'center',padding:40,color:'#888'}}>Cargando…</p>}
                    {!loading && filteredGroups.map(g => (
                        <div key={g.label} className="ci-tree-group">
                            <div className={`ci-tree-header ${expanded.has(g.label)?'open':''}`} onClick={()=>toggle(g.label)}>
                                <div className="ci-tree-label">
                                    <span className={`ci-tree-arrow ${expanded.has(g.label)?'open':''}`}>▶</span>
                                    <Avatar name={g.label} size={30}/>
                                    {g.label}
                                </div>
                                <span className="ci-tree-count">{g.clients.length} clientes</span>
                            </div>
                            {expanded.has(g.label) && g.clients.map(c => (
                                <div key={c.CodCliente} className="ci-tree-client">
                                    <div className="ci-tree-client-info">
                                        <Avatar name={c.Nombre} size={32}/>
                                        <div>
                                            <div style={{fontWeight:600,fontSize:13,color:'#1e1b4b'}}>{c.Nombre}</div>
                                            <div style={{fontSize:11,color:'#888',display:'flex',gap:8,marginTop:2}}>
                                                {c.TelefonoTrabajo && <span>📞 {c.TelefonoTrabajo}</span>}
                                                {c.Email && <span>✉ {c.Email}</span>}
                                                {c.ESTADO && <Badge color={statusColor(c.ESTADO)}>{c.ESTADO}</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                    <button className="ci-tree-edit-btn" onClick={()=>{setQuickEdit(c);setQuickVal(groupBy==='vendedor'?(c.VendedorID||''):(c.TClIdTipoCliente||''));}}>
                                        ✏ Cambiar {groupBy==='vendedor'?'Vendedor':'Tipo'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {quickEdit && (
                <div className="ci-overlay" onClick={()=>setQuickEdit(null)}>
                    <div style={{background:'#fff',borderRadius:16,padding:28,width:340,boxShadow:'0 20px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
                        <div style={{fontWeight:800,fontSize:16,color:'#1e1b4b',marginBottom:4}}>Cambiar {groupBy==='vendedor'?'Vendedor':'Tipo'}</div>
                        <div style={{fontSize:12,color:'#888',marginBottom:16}}>{quickEdit.Nombre}</div>
                        <select value={quickVal} onChange={e=>setQuickVal(e.target.value)} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,marginBottom:16,outline:'none',fontFamily:'Inter,sans-serif'}}>
                            <option value="">— Sin asignar —</option>
                            {opts.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                            <button className="ci-btn-cancel" onClick={()=>setQuickEdit(null)}>Cancelar</button>
                            <button className="ci-btn-save" onClick={saveQuick} disabled={saving}>{saving?'…':'Guardar'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── TAB 3: PLANILLA ──────────────────────────────────────────────────────────
function TabPlanilla() {
    const [auth,      setAuth]      = useState(null);   // null=checking, true, false
    const [sheetRows, setSheetRows] = useState([]);
    const [loading,   setLoading]   = useState(false);
    const [q,         setQ]         = useState('');

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.get('/clients/sheets/all');
            setSheetRows(r.data || []);
        } catch(e) {
            const msg = e.response?.data?.error || 'Error cargando planilla';
            if (e.response?.status === 401) setAuth(false);
            else toast.error(msg);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        api.get('/google/status')
            .then(r => { setAuth(r.data.authorized); if (r.data.authorized) loadAll(); })
            .catch(() => setAuth(false));
    }, [loadAll]);

    const doAuth = async () => {
        const r = await api.get('/google/auth');
        window.open(r.data.authUrl, '_blank', 'width=600,height=700');
        toast.info('Autorizá en la ventana nueva, luego presioná ↺ Recargar.');
    };

    const filtered = useMemo(() => {
        if (!q) return sheetRows;
        const t = q.toLowerCase();
        return sheetRows.filter(r =>
            [r.IDCliente, r.Nombre, r.Telefono, r.Email, r.CioRuc, r.IDReact, r.Departamento, r.Localidad]
                .some(v => String(v || '').toLowerCase().includes(t))
        );
    }, [sheetRows, q]);

    // Stats
    const conEmail  = sheetRows.filter(r => r.Email).length;
    const conRuc    = sheetRows.filter(r => r.CioRuc).length;
    const conIDReact = sheetRows.filter(r => r.IDReact).length;

    if (auth === null) return <div style={{textAlign:'center',padding:60,color:'#888'}}>Verificando conexión Google…</div>;

    if (!auth) return (
        <div className="ci-auth-prompt">
            <div style={{fontSize:56}}>📊</div>
            <div style={{fontSize:18,fontWeight:800,color:'#1e1b4b'}}>Google Sheets no autorizado</div>
            <div style={{fontSize:13,color:'#888',maxWidth:340,textAlign:'center'}}>
                Necesitás autorizar el acceso para poder leer la planilla de clientes.
            </div>
            <button className="ci-btn-primary" style={{marginLeft:0}} onClick={doAuth}>
                🔐 Autorizar Google Sheets
            </button>
        </div>
    );

    return (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* Stats */}
            <div className="ci-stats">
                <div className="ci-stat-card">
                    <span className="ci-stat-num">{sheetRows.length}</span>
                    <span className="ci-stat-label">📋 Total filas</span>
                </div>
                <div className="ci-stat-card" style={{borderColor:'#bfdbfe',background:'#eff6ff'}}>
                    <span className="ci-stat-num" style={{color:'#1d4ed8'}}>{conIDReact}</span>
                    <span className="ci-stat-label">🔗 Con IDReact</span>
                </div>
                <div className="ci-stat-card" style={{borderColor:'#bbf7d0',background:'#f0fdf4'}}>
                    <span className="ci-stat-num" style={{color:'#15803d'}}>{conEmail}</span>
                    <span className="ci-stat-label">📧 Con Email</span>
                </div>
                <div className="ci-stat-card" style={{borderColor:'#fde68a',background:'#fefce8'}}>
                    <span className="ci-stat-num" style={{color:'#b45309'}}>{conRuc}</span>
                    <span className="ci-stat-label">🪪 Con RUC/CI</span>
                </div>
            </div>

            {/* Toolbar */}
            <div style={{display:'flex',gap:8,alignItems:'center',background:'#fff',borderRadius:12,padding:14,border:'1.5px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
                <input className="ci-search" value={q} onChange={e=>setQ(e.target.value)}
                    placeholder="Buscar nombre, teléfono, email, RUC, IDReact…"
                    style={{flex:1,maxWidth:'none'}}/>
                <span style={{fontSize:12,color:'#888',whiteSpace:'nowrap',fontWeight:600}}>
                    {filtered.length} / {sheetRows.length} filas
                </span>
                {!auth && (
                    <button onClick={doAuth} style={{background:'#fef9c3',border:'1.5px solid #fde68a',borderRadius:8,padding:'7px 14px',fontWeight:700,fontSize:12,color:'#b45309',cursor:'pointer'}}>
                        🔐 Re-autorizar
                    </button>
                )}
                <button onClick={loadAll} disabled={loading}
                    style={{background:'#f0eeff',border:'none',borderRadius:8,padding:'8px 14px',fontWeight:700,fontSize:13,color:'#4f46e5',cursor:'pointer',opacity:loading?.6:1}}>
                    {loading ? '…' : '↺ Recargar'}
                </button>
            </div>

            {loading ? (
                <div style={{textAlign:'center',padding:40,color:'#888'}}>Cargando planilla Google Sheets…</div>
            ) : (
                <div style={{background:'#fff',borderRadius:12,border:'1.5px solid #e2e8f0',overflow:'auto',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
                    <table className="ci-table">
                        <thead><tr>
                            <th>IDReact</th>
                            <th>ID Cliente</th>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Email</th>
                            <th>RUC/CI</th>
                            <th>Departamento</th>
                            <th>Localidad</th>
                            <th>Forma Envío</th>
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={9} style={{textAlign:'center',padding:30,color:'#aaa'}}>
                                    {sheetRows.length === 0 ? 'La planilla está vacía o no se cargaron los datos.' : 'Sin resultados para esa búsqueda.'}
                                </td></tr>
                            )}
                            {filtered.map((r, i) => (
                                <tr key={i} style={{background:i%2?'#fafafe':'#fff'}}>
                                    <td>
                                        <span style={{fontSize:11,fontFamily:'monospace',background:'#ede9fe',color:'#7c3aed',padding:'2px 7px',borderRadius:4,fontWeight:700}}>
                                            {r.IDReact || '—'}
                                        </span>
                                    </td>
                                    <td style={{fontSize:12,color:'#666'}}>{r.IDCliente || '—'}</td>
                                    <td style={{fontWeight:600,fontSize:13}}>
                                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                                            <div style={{width:28,height:28,borderRadius:7,background:AVATAR_COLORS[(r.Nombre?.charCodeAt(0)||0)%AVATAR_COLORS.length],display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:800,flexShrink:0}}>
                                                {r.Nombre?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            {r.Nombre || '—'}
                                        </div>
                                    </td>
                                    <td style={{fontSize:12,color:'#666'}}>{r.Telefono || '—'}</td>
                                    <td style={{fontSize:12,color:'#666',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                        {r.Email ? <a href={`mailto:${r.Email}`} style={{color:'#4f46e5',textDecoration:'none'}}>{r.Email}</a> : '—'}
                                    </td>
                                    <td style={{fontSize:12,color:'#666'}}>{r.CioRuc || '—'}</td>
                                    <td style={{fontSize:12,color:'#666'}}>{r.Departamento || '—'}</td>
                                    <td style={{fontSize:12,color:'#666'}}>{r.Localidad || '—'}</td>
                                    <td style={{fontSize:12,color:'#666'}}>
                                        {r.FormaEnvio
                                            ? <span style={{background:'#f0f9ff',color:'#0369a1',padding:'1px 6px',borderRadius:4,fontSize:11,fontWeight:600}}>{r.FormaEnvio}</span>
                                            : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── TAB 4: MACROSOFT ─────────────────────────────────────────────────────────
function TabMacrosoft({ msClients = [], loading = false, onReload }) {
    const [q,          setQ]          = useState('');
    const [moneda,     setMoneda]     = useState('all');   // 'all' | 'uy' | 'usd'
    const [vinculo,    setVinculo]    = useState('all');   // 'all' | 'si' | 'no'

    const filtered = useMemo(() => {
        let list = msClients;
        // Filtro moneda
        if (moneda === 'uy')  list = list.filter(c => c.Moneda === 1);
        if (moneda === 'usd') list = list.filter(c => c.Moneda === 2);
        // Filtro vínculo
        if (vinculo === 'si') list = list.filter(c =>  c.EsVinculado);
        if (vinculo === 'no') list = list.filter(c => !c.EsVinculado);
        // Filtro texto
        if (q) {
            const t = q.toLowerCase();
            list = list.filter(c =>
                [c.Nombre, c.NombreFantasia, c.CioRuc, c.TelefonoTrabajo, c.Email, String(c.CodCliente||''), String(c.CodClienteLocal||'')]
                    .some(v => String(v||'').toLowerCase().includes(t))
            );
        }
        return list;
    }, [msClients, q, moneda, vinculo]);

    // Campos de la API real
    const gn = c => c.Nombre || c.NombreFantasia || '—';
    const gr = c => c.CioRuc || '—';
    const gt = c => c.TelefonoTrabajo || '—';
    const gc = c => String(c.CodCliente || '');


    // Helper para botones pill
    const Pill = ({ active, onClick, children, color='#4f46e5', bg='#eef0ff', activeBg, activeColor }) => (
        <button onClick={onClick} style={{
            padding:'5px 13px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
            background: active ? (activeBg||color) : bg,
            color: active ? (activeColor||'#fff') : color,
            transition:'all .15s', boxShadow: active ? `0 2px 6px ${color}55` : 'none',
        }}>{children}</button>
    );

    return (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* Toolbar: buscador + filtros pill */}
            <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center',background:'#fff',borderRadius:12,padding:'12px 14px',border:'1.5px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
                <input className="ci-search" value={q} onChange={e=>setQ(e.target.value)}
                    placeholder="Buscar nombre, fantasía, RUC, teléfono…"
                    style={{flex:1,minWidth:200,maxWidth:'none'}}/>

                {/* Separador */}
                <div style={{width:1,height:22,background:'#e2e8f0',margin:'0 4px'}}/>

                {/* Filtro moneda */}
                <span style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:.5}}>Moneda:</span>
                <Pill active={moneda==='all'} onClick={()=>setMoneda('all')} color='#6366f1' bg='#f5f3ff'>Todos</Pill>
                <Pill active={moneda==='uy'}  onClick={()=>setMoneda('uy')}  color='#1d4ed8' bg='#eff6ff' activeBg='#1d4ed8'>🇺🇾 UY</Pill>
                <Pill active={moneda==='usd'} onClick={()=>setMoneda('usd')} color='#15803d' bg='#f0fdf4' activeBg='#15803d'>💵 USD</Pill>

                {/* Separador */}
                <div style={{width:1,height:22,background:'#e2e8f0',margin:'0 4px'}}/>

                {/* Filtro vínculo */}
                <span style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:.5}}>Vínculo:</span>
                <Pill active={vinculo==='all'} onClick={()=>setVinculo('all')} color='#6366f1' bg='#f5f3ff'>Todos</Pill>
                <Pill active={vinculo==='si'}  onClick={()=>setVinculo('si')}  color='#15803d' bg='#f0fdf4' activeBg='#15803d'>✓ Vinculados</Pill>
                <Pill active={vinculo==='no'}  onClick={()=>setVinculo('no')}  color='#dc2626' bg='#fff5f5' activeBg='#dc2626'>✗ Sin vínculo</Pill>

                <span style={{fontSize:12,color:'#888',whiteSpace:'nowrap',fontWeight:600}}>{filtered.length} / {msClients.length}</span>
            </div>
            {loading ? <div style={{textAlign:'center',padding:40,color:'#888'}}>Cargando clientes Macrosoft…</div> : (
                <div style={{background:'#fff',borderRadius:12,border:'1.5px solid #e2e8f0',overflow:'auto',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
                    <table className="ci-table">
                        <thead><tr><th>Cód MS</th><th>CodRef</th><th>Nombre</th><th style={{color:'#9ca3af'}}>Fantasía</th><th>RUC/CI</th><th>Teléfono</th><th>Email</th><th>Dirección</th></tr></thead>
                        <tbody>
                            {filtered.length===0 && <tr><td colSpan={8} style={{textAlign:'center',padding:30,color:'#aaa'}}>Sin resultados</td></tr>}
                            {filtered.map((c,i)=>(
                                <tr key={i} style={{background:i%2?'#fafafe':'#fff'}}>
                                    <td><span style={{fontSize:11,fontFamily:'monospace',color:'#999'}}>{gc(c)||'—'}</span></td>
                                    <td>
                                        {c.EsVinculado
                                            ? <span style={{fontSize:11,background:'#dcfce7',color:'#15803d',padding:'2px 8px',borderRadius:4,fontWeight:700}}>✓ local</span>
                                            : <span style={{fontSize:11,color:'#d1d5db',fontStyle:'italic'}}>sin vínculo</span>}
                                    </td>
                                    <td style={{fontWeight:600,fontSize:13}}>
                                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                                            <div style={{width:28,height:28,borderRadius:7,background:AVATAR_COLORS[(gn(c).charCodeAt(0)||0)%AVATAR_COLORS.length],display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:800,flexShrink:0}}>
                                                {gn(c)[0]?.toUpperCase()||'?'}
                                            </div>
                                            {gn(c)}
                                        </div>
                                    </td>
                                    <td style={{fontSize:11,color:'#9ca3af',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={c.NombreFantasia||''}>
                                        {c.NombreFantasia || <span style={{color:'#e5e7eb'}}>—</span>}
                                    </td>
                                    <td style={{fontSize:12,color:'#666'}}>{gr(c)}</td>
                                    <td style={{fontSize:12,color:'#666'}}>{gt(c)}</td>
                                    <td style={{fontSize:12,color:'#666',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.Email||'—'}</td>
                                    <td style={{fontSize:12,color:'#666',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.DireccionTrabajo||c.Direccion||'—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── PRINCIPAL ────────────────────────────────────────────────────────────────

export default function ClientsIntegration() {
    const [tab, setTab] = useState('tabla');
    const [catalogs, setCatalogs] = useState({ localidades:[], departamentos:[], agencias:[], formasEnvio:[], tiposClientes:[], vendedores:[] });
    const [msClients, setMsClients]   = useState([]);
    const [msLoading, setMsLoading]   = useState(true);
    const [msProgress, setMsProgress] = useState({ current: 0, total: 0 }); // para barra de progreso
    const msAbortRef = useRef(null);  // para cancelar si el usuario recarga

    const loadMacrosoft = useCallback(async () => {
        // Cancelar carga anterior si existe
        if (msAbortRef.current) msAbortRef.current = false;
        const runId = {};
        msAbortRef.current = runId;

        setMsLoading(true);
        setMsClients([]);
        setMsProgress({ current: 0, total: 0 });

        try {
            // Página 1 → saber cuántas páginas hay + mapa de vinculados locales
            const first = await api.get('/clients/macrosoft-page', { params: { page: 1 } });
            if (msAbortRef.current !== runId) return;

            const totalPages   = first.data.pages  || 1;
            const vinculadosMap = first.data.vinculadosMap || {};

            const enrich = (batch) => batch.map(c => ({
                ...c,
                EsVinculado:    vinculadosMap[String(c.CodCliente)] ? 1 : 0,
                CodClienteLocal: vinculadosMap[String(c.CodCliente)] || null,
            }));

            // Mostrar página 1 de inmediato
            setMsClients(enrich(first.data.data || []));
            setMsProgress({ current: 1, total: totalPages });

            // Resto de páginas: de 5 en 5 en paralelo
            const CONCURRENCY = 5;
            for (let start = 2; start <= totalPages; start += CONCURRENCY) {
                if (msAbortRef.current !== runId) return; // cancelado
                const end = Math.min(start + CONCURRENCY - 1, totalPages);
                const pages = [];
                for (let p = start; p <= end; p++) pages.push(p);

                const results = await Promise.all(
                    pages.map(p => api.get('/clients/macrosoft-page', { params: { page: p } })
                        .then(r => ({ p, data: r.data.data || [] }))
                        .catch(() => ({ p, data: [] }))
                    )
                );

                if (msAbortRef.current !== runId) return;

                results.sort((a, b) => a.p - b.p);
                setMsClients(prev => {
                    let acc = [...prev];
                    results.forEach(({ data }) => { acc = acc.concat(enrich(data)); });
                    return acc;
                });
                setMsProgress({ current: end, total: totalPages });
            }

        } catch(e) {
            toast.error('Error cargando clientes Macrosoft');
        } finally {
            if (msAbortRef.current === runId) {
                setMsLoading(false);
                msAbortRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        api.get('/clients/catalogs')
            .then(r => setCatalogs(r.data || {}))
            .catch(() => toast.error('Error cargando catálogos'));
        loadMacrosoft();
    }, [loadMacrosoft]);

    const msProgressPct = msProgress.total > 0 ? Math.round((msProgress.current / msProgress.total) * 100) : 0;

    const TABS = [
        { id:'tabla',     icon:'📋', label:'Clientes' },
        { id:'arbol',     icon:'👤', label:'Vendedores/Tipo' },
        { id:'planilla',  icon:'📊', label:'Planilla' },
        { id:'macrosoft', icon:'🖥', label: msLoading
            ? (msProgress.total > 0 ? `Macrosoft (${msClients.length}/~${msProgress.total * 30})` : 'Macrosoft…')
            : `Macrosoft (${msClients.length})` },
    ];

    // Stats rápidas para el header (Macrosoft)
    const msConVinculo = msClients.filter(c => c.EsVinculado).length;
    const msSinVinculo = msClients.length - msConVinculo;
    const msUY  = msClients.filter(c => c.Moneda === 1).length;
    const msUSD = msClients.filter(c => c.Moneda === 2).length;

    const MsBadge = ({ label, value, color, bg }) => (
        <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,
            background:bg||'#f3f4f6',color:color||'#374151',padding:'3px 10px',borderRadius:20,
            border:`1px solid ${color||'#d1d5db'}22`}}>
            <span style={{opacity:.7}}>{label}</span>
            <span style={{fontFamily:'monospace',fontSize:12}}>{value}</span>
        </span>
    );

    return (
        <div className="ci-root">
            <div className="ci-header">
                <div className="ci-header-top">
                    <span style={{fontSize:24}}>👥</span>
                    <span className="ci-title">Gestión de Clientes</span>
                    {/* Barra de progreso Macrosoft */}
                    {msLoading && (
                        <div style={{marginLeft:12,display:'flex',flexDirection:'column',gap:3,minWidth:200}}>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:'#7c3aed',animation:'pulse 1s infinite',flexShrink:0}}/>
                                <span style={{fontSize:11,color:'#7c3aed',fontWeight:700}}>
                                    {msProgress.total > 0
                                        ? `Macrosoft: ${msClients.length} clientes (pág ${msProgress.current}/${msProgress.total})`
                                        : 'Conectando Macrosoft…'}
                                </span>
                            </div>
                            {msProgress.total > 0 && (
                                <div style={{height:4,background:'#ede9fe',borderRadius:4,overflow:'hidden'}}>
                                    <div style={{height:'100%',background:'#7c3aed',borderRadius:4,width:`${msProgressPct}%`,transition:'width .3s ease'}}/>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="ci-tabs" style={{display:'flex',alignItems:'center',gap:0,flexWrap:'wrap'}}>
                    {TABS.map(t=>(
                        <button key={t.id} className={`ci-tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                    {/* Métricas + Recargar cuando tab=macrosoft */}
                    {tab === 'macrosoft' && (
                        <div style={{display:'flex',gap:6,marginLeft:'auto',paddingRight:4,flexWrap:'wrap',alignItems:'center'}}>
                            {!msLoading && msClients.length > 0 && <>
                                <MsBadge label="🇺🇾" value={msUY}        color="#1d4ed8" bg="#eff6ff" />
                                <MsBadge label="💵" value={msUSD}       color="#15803d" bg="#f0fdf4" />
                                <MsBadge label="✓"  value={msConVinculo} color="#15803d" bg="#dcfce7" />
                                <MsBadge label="✕"  value={msSinVinculo} color="#dc2626" bg="#fef2f2" />
                            </>}
                            <button onClick={loadMacrosoft} disabled={msLoading}
                                style={{background:'#f0eeff',border:'none',borderRadius:8,padding:'5px 13px',
                                    fontWeight:700,fontSize:12,color:'#4f46e5',cursor:'pointer',
                                    opacity:msLoading?.6:1,display:'flex',alignItems:'center',gap:4}}>
                                {msLoading ? '…' : '↺ Recargar'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
                {tab==='tabla'     && <TabTabla     catalogs={catalogs}/>}
                {tab==='arbol'     && <TabArbol     catalogs={catalogs}/>}
                {tab==='planilla'  && <div style={{flex:1,overflow:'auto',padding:'20px 28px'}}><TabPlanilla /></div>}
                {tab==='macrosoft' && <div style={{flex:1,overflow:'auto',padding:'20px 28px'}}><TabMacrosoft msClients={msClients} loading={msLoading} onReload={loadMacrosoft}/></div>}
            </div>
        </div>
    );
}

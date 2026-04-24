import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'sonner';

const PriceReports = ({ customers = [], onSearch }) => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('clients'); // 'clients' | 'profiles'
    const [filterCust, setFilterCust] = useState('');

    // Selected Data
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedProfile, setSelectedProfile] = useState(null);
    
    // Results
    const [clientReport, setClientReport] = useState(null);
    const [profileReport, setProfileReport] = useState(null);

    useEffect(() => {
        // Load initial basic lists to populate selects
        api.get('/profiles').then(res => setProfiles(res.data)).catch(console.error);
        
        // Initial search to load customers if needed
        if (customers.length === 0 && onSearch) {
             onSearch(''); 
        }
    }, [customers.length, onSearch]);

    const handleSearchClient = async (cliId) => {
        if (!cliId) return;
        setLoading(true);
        setProfileReport(null);
        setSelectedClient(cliId);
        try {
            const res = await api.get(`/reports/client/${cliId}`);
            setClientReport(res.data);
        } catch (e) {
            toast.error("Error cargando reporte del cliente");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchProfile = async (pId) => {
        if (!pId) return;
        setLoading(true);
        setClientReport(null);
        setSelectedProfile(pId);
        try {
            const res = await api.get(`/reports/profile/${pId}/clients`);
            // we also want to display profile name
            const profileMeta = profiles.find(p => p.ID.toString() === pId.toString());
            setProfileReport({
                profile: profileMeta,
                clients: res.data
            });
        } catch (e) {
            toast.error("Error buscando clientes del perfil");
        } finally {
            setLoading(false);
        }
    };

    // Filtrado Clientes
    const filteredCustomers = customers.filter(c => {
        if (!filterCust) return true;
        const lowerFilter = filterCust.toLowerCase();
        const cName = c.Nombre || c.NombreFantasia || '';
        return cName.toLowerCase().includes(lowerFilter) || String(c.CliIdCliente).includes(lowerFilter);
    });

    return (
        <div className="h-full flex gap-6 overflow-hidden">
            {/* SIDEBAR DE CONTROL */}
            <div className="w-[340px] bg-white rounded-lg shadow border border-slate-200 flex flex-col h-full flex-shrink-0">
                <div className="p-4 border-b bg-slate-50 space-y-4">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        <i className="fa-solid fa-microscope text-indigo-600"></i> Auditoría de Precios
                    </h2>
                    
                    {/* Switch Mode */}
                    <div className="flex bg-slate-200 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('clients')}
                            className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${viewMode === 'clients' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Visión Cliente
                        </button>
                        <button 
                            onClick={() => setViewMode('profiles')}
                            className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${viewMode === 'profiles' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Visión Perfil
                        </button>
                    </div>

                    {/* Searcher for Clients */}
                    {viewMode === 'clients' && (
                        <div className="relative">
                            <i className="fa-solid fa-search absolute left-3 top-2.5 text-slate-400 text-sm"></i>
                            <input
                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                                placeholder="Buscar por nombre o ID..."
                                value={filterCust}
                                onChange={e => {
                                    setFilterCust(e.target.value);
                                    if (onSearch) onSearch(e.target.value);
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar pb-6 bg-slate-50/50">
                    {viewMode === 'clients' ? (
                        <div>
                            {filteredCustomers.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">No se encontraron clientes.</div>
                            ) : (
                                filteredCustomers.map(c => {
                                    const cId = c.CliIdCliente;
                                    const cName = c.Nombre || c.NombreFantasia || `Cliente ${cId}`;
                                    const isSelected = selectedClient === cId;
                                    
                                    // Extract initials
                                    const words = cName.split(' ').filter(Boolean);
                                    let initials = '?';
                                    if (words.length > 1) {
                                        initials = (words[0][0] + words[1][0]).toUpperCase();
                                    } else if (words.length === 1) {
                                        initials = words[0].substring(0, 2).toUpperCase();
                                    }
                                    
                                    const AVATAR_COLORS = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16'];
                                    const charCode = cName.charCodeAt(0) || 0;
                                    const avatarColor = AVATAR_COLORS[charCode % AVATAR_COLORS.length];

                                    return (
                                        <div
                                            key={cId}
                                            onClick={() => handleSearchClient(cId)}
                                            className={`mx-3 my-2 rounded-xl p-4 cursor-pointer transition-all border ${isSelected ? 'bg-indigo-50 border-indigo-400 shadow-md transform scale-[1.02]' : 'bg-white border-slate-200 hover:shadow-md hover:border-indigo-300'}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div 
                                                    className="w-12 h-12 rounded-[14px] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm"
                                                    style={{ backgroundColor: avatarColor }}
                                                >
                                                    {initials}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center h-12">
                                                    <div className="font-bold text-[#1e1b4b] text-[14px] truncate" title={cName}>{cName}</div>
                                                    <div className="text-xs text-slate-400 font-medium font-mono mt-0.5">
                                                        ID: {cId}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        <div className="p-3 space-y-2">
                            {profiles.map(p => {
                                const isSelected = selectedProfile === p.ID;
                                return (
                                    <div
                                        key={p.ID}
                                        onClick={() => handleSearchProfile(p.ID)}
                                        className={`border rounded-xl cursor-pointer transition-all p-4 ${isSelected ? 'bg-blue-50 border-blue-400 shadow ring-1 ring-blue-400' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                                    >
                                        <div className="font-bold text-slate-800 flex justify-between items-center mb-1">
                                            {p.Nombre}
                                            {p.EsGlobal && <i className="fa-solid fa-earth-americas text-blue-400" title="Perfil Global"></i>}
                                        </div>
                                        <div className="text-xs text-slate-500 line-clamp-2">{p.Descripcion || 'Sin descripción'}</div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* RESULTS PANE */}
            <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm border border-slate-200 p-6 custom-scrollbar relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-indigo-600"></i>
                    </div>
                )}
                
                {!clientReport && !profileReport && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <i className="fa-solid fa-magnifying-glass-chart text-6xl mb-4 text-slate-300"></i>
                        <h3 className="text-xl font-bold">Panel Analítico</h3>
                        <p>Selecciona un elemento en el panel izquierdo para desplegar el reporte.</p>
                    </div>
                )}

                {/* REPORTE CLIENTE */}
                {clientReport && (
                    <div className="animate-fade-in">
                        <div className="mb-6 flex justify-between items-center bg-indigo-50 p-4 rounded border border-indigo-100">
                            <div>
                                <h3 className="text-2xl font-bold text-indigo-900">
                                    <i className="fa-solid fa-user-check text-indigo-500 mr-2"></i>
                                    Análisis de Cliente: {clientReport.cliente?.IDCliente || clientReport.cliente?.Nombre}
                                </h3>
                                <p className="text-indigo-600/80 font-mono text-sm mt-1">ID Interno: {clientReport.cliente?.CliIdCliente}</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {/* Nivel 1: Excepciones */}
                            <div>
                                <h4 className="font-bold text-lg text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                                    <div className="bg-red-100 text-red-600 w-6 h-6 rounded flex items-center justify-center text-xs">1</div>
                                    Excepciones Directas (Precios Especiales)
                                </h4>
                                {clientReport.excepciones.length === 0 ? (
                                    <p className="text-slate-400 italic text-sm">Este cliente no tiene precios fijos ni excepciones pisadas manualmente.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {clientReport.excepciones.map((ex, i) => (
                                            <div key={i} className="bg-white border border-red-200 rounded p-3 shadow-sm shadow-red-50">
                                                <div className="font-bold text-slate-700">{ex.CodArticulo}</div>
                                                <div className="text-sm font-mono text-red-600 mt-1">
                                                    {ex.TipoRegla === 'percentage' || ex.TipoRegla === 'percentage_discount' || ex.TipoRegla === 'percentage_surcharge' ? 
                                                        `${ex.TipoRegla.includes('surcharge')?'+':'-'}${ex.Valor}%` : 
                                                        `$${ex.Valor}`
                                                    }
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Nivel 2: Perfiles Asignados */}
                            <div>
                                <h4 className="font-bold text-lg text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                                    <div className="bg-indigo-100 text-indigo-600 w-6 h-6 rounded flex items-center justify-center text-xs">2</div>
                                    Perfiles y Convenios Aplicados
                                </h4>
                                {clientReport.perfilesAsignados.length === 0 ? (
                                    <p className="text-slate-400 italic text-sm">El cliente no pertenece a ningún grupo de precios especial.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {clientReport.perfilesAsignados.map(p => {
                                            const rules = clientReport.reglasPerfiles.filter(r => r.PerfilID === p.ID);
                                            return (
                                                <div key={p.ID} className="bg-indigo-50/50 border border-indigo-100 rounded overflow-hidden">
                                                    <div className="bg-white p-3 border-b flex justify-between items-center">
                                                        <span className="font-bold text-indigo-900"><i className="fa-solid fa-users text-indigo-400 mr-2"></i> {p.Nombre}</span>
                                                        <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">{rules.length} reglas</span>
                                                    </div>
                                                    <div className="p-3 overflow-x-auto">
                                                        {(() => {
                                                            // Agrupar por producto (CodArticulo)
                                                            const grouped = {};
                                                            rules.forEach(r => {
                                                                const key = r.CodArticulo || r.CodGrupo || 'TOTAL';
                                                                if (!grouped[key]) grouped[key] = { rows: [], desc: r.Descripcion };
                                                                grouped[key].rows.push(r);
                                                            });
                                                            const products = Object.keys(grouped);
                                                            const hasQty = rules.some(r => r.CantidadMinima > 1);
                                                            if (hasQty) {
                                                                const allQtys = [...new Set(rules.map(r => r.CantidadMinima || 1))].sort((a,b)=>a-b);
                                                                return (
                                                                    <table className="w-full text-xs border-collapse">
                                                                        <thead>
                                                                            <tr className="bg-slate-50">
                                                                                <th className="text-left p-2 font-semibold text-slate-600 border border-slate-200 min-w-[200px]">Producto / Grupo</th>
                                                                                {allQtys.map(q => (
                                                                                    <th key={q} className="p-2 font-semibold text-indigo-700 border border-slate-200 text-center min-w-[70px]">≥ {q} u.</th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {products.map(prod => {
                                                                                const g = grouped[prod];
                                                                                return (
                                                                                    <tr key={prod} className="hover:bg-indigo-50/30">
                                                                                        <td className="p-2 border border-slate-200">
                                                                                            <div className="font-bold text-slate-800">{prod}</div>
                                                                                            {g.desc && g.desc !== prod && <div className="text-[10px] text-slate-400 mt-0.5">{g.desc}</div>}
                                                                                        </td>
                                                                                        {allQtys.map(q => {
                                                                                            const match = g.rows.find(r => (r.CantidadMinima || 1) === q);
                                                                                            return (
                                                                                                <td key={q} className="p-2 text-center font-mono border border-slate-200">
                                                                                                    {match ? (
                                                                                                        <span className={`font-bold ${match.TipoRegla.includes('percent') ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                                                                                            {match.TipoRegla.includes('percent') ? `${match.Valor}%` : `$${match.Valor}`}
                                                                                                        </span>
                                                                                                    ) : <span className="text-slate-300">—</span>}
                                                                                                </td>
                                                                                            );
                                                                                        })}
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                );
                                                            }
                                                            // Sin cantidades: vista simple de chips
                                                            return (
                                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                                                    {rules.map((r, i) => (
                                                                        <div key={i} className="text-xs bg-white border rounded p-1.5 flex justify-between items-center">
                                                                            <span className="font-bold text-slate-600 truncate mr-2" title={r.CodArticulo}>{r.CodArticulo}</span>
                                                                            <span className="font-mono text-indigo-600 flex-shrink-0">
                                                                                {r.TipoRegla.includes('percent') ? `${r.Valor}%` : `$${r.Valor}`}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Nivel 3: Globales */}
                            <div>
                                <h4 className="font-bold text-lg text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                                    <div className="bg-slate-200 text-slate-600 w-6 h-6 rounded flex items-center justify-center text-xs">3</div>
                                    Políticas Globales Base
                                </h4>
                                {clientReport.perfilesGlobales.length === 0 ? (
                                    <p className="text-slate-400 italic text-sm">No hay perfiles globales activos en la red.</p>
                                ) : (
                                    <div className="space-y-4 opacity-80 mix-blend-multiply">
                                        {clientReport.perfilesGlobales.map(p => {
                                            const rules = clientReport.reglasGlobales.filter(r => r.PerfilID === p.ID);
                                            return (
                                                <div key={p.ID} className="bg-slate-50 border border-slate-200 rounded overflow-hidden">
                                                    <div className="bg-slate-100 p-2 border-b flex justify-between items-center">
                                                        <span className="font-bold text-slate-700 text-sm"><i className="fa-solid fa-earth-americas text-slate-400 mr-1"></i> {p.Nombre}</span>
                                                        <span className="text-[10px] bg-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded-full">{rules.length} items</span>
                                                    </div>
                                                    <div className="p-2 overflow-x-auto">
                                                        {(() => {
                                                            const grouped = {};
                                                            rules.forEach(r => {
                                                                const key = r.CodArticulo || r.CodGrupo || 'TOTAL';
                                                                if (!grouped[key]) grouped[key] = { rows: [], desc: r.Descripcion };
                                                                grouped[key].rows.push(r);
                                                            });
                                                            const products = Object.keys(grouped);
                                                            const hasQty = rules.some(r => r.CantidadMinima > 1);
                                                            if (hasQty) {
                                                                const allQtys = [...new Set(rules.map(r => r.CantidadMinima || 1))].sort((a,b)=>a-b);
                                                                return (
                                                                    <table className="w-full text-[11px] border-collapse">
                                                                        <thead>
                                                                            <tr className="bg-white">
                                                                                <th className="text-left p-2 font-semibold text-slate-600 border border-slate-200 min-w-[180px]">Producto</th>
                                                                                {allQtys.map(q => (
                                                                                    <th key={q} className="p-2 font-semibold text-slate-600 border border-slate-200 text-center min-w-[60px]">≥ {q}</th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {products.map(prod => {
                                                                                const g = grouped[prod];
                                                                                return (
                                                                                    <tr key={prod}>
                                                                                        <td className="p-2 border border-slate-200">
                                                                                            <div className="font-bold text-slate-700">{prod}</div>
                                                                                            {g.desc && g.desc !== prod && <div className="text-[10px] text-slate-400 mt-0.5">{g.desc}</div>}
                                                                                        </td>
                                                                                        {allQtys.map(q => {
                                                                                            const match = g.rows.find(r => (r.CantidadMinima || 1) === q);
                                                                                            return (
                                                                                                <td key={q} className="p-2 text-center font-mono border border-slate-200">
                                                                                                    {match ? (
                                                                                                        <span className="font-bold text-slate-700">
                                                                                                            {match.TipoRegla.includes('percent') ? `${match.Valor}%` : `$${match.Valor}`}
                                                                                                        </span>
                                                                                                    ) : <span className="text-slate-300">—</span>}
                                                                                                </td>
                                                                                            );
                                                                                        })}
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                );
                                                            }
                                                            return (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {rules.map((r, i) => (
                                                                        <span key={i} className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono text-slate-500">
                                                                            {r.CodArticulo}: {r.TipoRegla.includes('percent')?'%':'$'}{r.Valor}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* REPORTE PERFIL */}
                {profileReport && (
                    <div className="animate-fade-in h-full flex flex-col">
                        <div className="mb-6 flex justify-between items-center bg-indigo-50 p-4 rounded border border-indigo-100">
                            <div>
                                <h3 className="text-2xl font-bold text-indigo-900">
                                    <i className="fa-solid fa-users text-indigo-500 mr-2"></i>
                                    Perfil: {profileReport.profile?.Nombre}
                                </h3>
                                <p className="text-indigo-600/80 text-sm mt-1">{profileReport.clients.length} clientes asimilados registrados (exclusivo clientes en BDD).</p>
                            </div>
                            {profileReport.profile?.EsGlobal && (
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                                    <i className="fa-solid fa-earth-americas"></i> PERFIL GLOBAL (Afecta a todos)
                                </span>
                            )}
                        </div>

                        <div className="flex-1">
                            {profileReport.clients.length === 0 ? (
                                <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-lg">
                                    <i className="fa-solid fa-user-xmark text-4xl text-slate-300 mb-2"></i>
                                    <p className="text-slate-500 font-medium">Ningún cliente tiene asignado este perfil de manera cruzada explícita.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {profileReport.clients.map(c => (
                                        <div key={c.CliIdCliente} className="bg-white border hover:border-indigo-400 transition-colors rounded-lg p-4 shadow-sm">
                                            <div className="font-bold text-slate-800 text-sm mb-1.5 truncate" title={c.Nombre || c.NombreFantasia}>
                                                {c.Nombre || c.NombreFantasia || 'Desconocido'}
                                            </div>
                                            <div className="flex gap-3 text-[11px] font-mono">
                                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded" title="IDCliente (código sistema)">
                                                    IDCliente: {c.IDCliente || '—'}
                                                </span>
                                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded" title="CliIdCliente (ID interno)">
                                                    CliIdCliente: {c.CliIdCliente}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriceReports;

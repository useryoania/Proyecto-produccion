import React, { useState, useEffect } from 'react';
import './ClientsIntegration.css';
import { toast } from 'sonner';
import api from '../../services/apiClient';

const EditClientDialog = ({ isOpen, onClose, client, onSave }) => {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (client) {
            setFormData({
                Nombre: client.Nombre,
                NombreFantasia: client.NombreFantasia,
                CioRuc: client.CioRuc,
                Email: client.Email,
                TelefonoTrabajo: client.TelefonoTrabajo,
                CliDireccion: client.CliDireccion || client.Direccion
            });
        }
    }, [client]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => onSave(formData);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl w-[500px] p-6 animate-fade-in relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <i className="fa-solid fa-times"></i>
                </button>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-pen-to-square text-indigo-600"></i>
                    Editar Cliente Local
                </h3>
                <div className="space-y-3 text-sm">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nombre / Razón Social</label>
                        <input className="w-full p-2 border rounded outline-none" name="Nombre" value={formData.Nombre || ''} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Fantasía</label>
                        <input className="w-full p-2 border rounded outline-none" name="NombreFantasia" value={formData.NombreFantasia || ''} onChange={handleChange} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">RUC / CI</label>
                            <input className="w-full p-2 border rounded outline-none" name="CioRuc" value={formData.CioRuc || ''} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                            <input className="w-full p-2 border rounded outline-none" name="TelefonoTrabajo" value={formData.TelefonoTrabajo || ''} onChange={handleChange} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                        <input className="w-full p-2 border rounded outline-none" name="Email" value={formData.Email || ''} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Dirección</label>
                        <textarea rows="2" className="w-full p-2 border rounded outline-none resize-none" name="CliDireccion" value={formData.CliDireccion || ''} onChange={handleChange} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded text-sm font-medium">Cancelar</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded text-sm font-bold shadow-sm">
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

const ClientsIntegration = () => {
    // Listas maestras
    const [clientsLocal, setClientsLocal] = useState([]);
    const [clientsReact, setClientsReact] = useState([]);
    const [clientsMacrosoft, setClientsMacrosoft] = useState([]);

    // Estados de Carga
    const [loadingLocal, setLoadingLocal] = useState(true);
    const [loadingReact, setLoadingReact] = useState(true);
    const [loadingMacrosoft, setLoadingMacrosoft] = useState(true);

    // Buscador General y Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [localFilter, setLocalFilter] = useState('all');

    // Edición y Vinculación
    const [editingClient, setEditingClient] = useState(null);
    const [selectedLocalClient, setSelectedLocalClient] = useState(null);

    // Initial Load - Monta las listas solo una vez
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        loadLocalClients();
        loadReactClients();
        loadMacrosoftClients();
    };

    const loadLocalClients = async () => {
        try {
            setLoadingLocal(true);
            const res = await api.get('/clients');
            setClientsLocal(res.data || []);
        } catch (error) {
            console.error("Error cargando clientes Locales", error);
        } finally {
            setLoadingLocal(false);
        }
    };

    const loadReactClients = async () => {
        try {
            setLoadingReact(true);
            const res = await api.get(`/clients/react-list?t=${Date.now()}`);
            let list = [];
            if (Array.isArray(res.data)) {
                list = res.data;
            } else if (typeof res.data === 'object' && res.data !== null) {
                const values = Object.values(res.data);
                const foundArray = values.find(val => Array.isArray(val) && val.length > 0);
                if (foundArray) list = foundArray;
            }
            setClientsReact(list);
        } catch (error) {
            console.error("Error cargando clientes React", error);
        } finally {
            setLoadingReact(false);
        }
    };

    const loadMacrosoftClients = async () => {
        try {
            setLoadingMacrosoft(true);
            const res = await api.get(`/clients/macrosoft-list?t=${Date.now()}`);
            setClientsMacrosoft(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error cargando clientes Macrosoft", error);
        } finally {
            setLoadingMacrosoft(false);
        }
    };

    const handleUpdateClient = async (formData) => {
        try {
            if (!editingClient) return;
            await api.put(`/clients/${editingClient.CodCliente}`, formData);
            toast.success("Cliente local actualizado correctamente");

            setClientsLocal(prev => prev.map(c =>
                c.CodCliente === editingClient.CodCliente ? { ...c, ...formData } : c
            ));
            setEditingClient(null);
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar cliente local");
        }
    };

    const handleExportToReact = async (localClient) => {
        if (!confirm(`¿Crear "${localClient.Nombre}" en el sistema React?`)) return;
        try {
            toast.info("Exportando a React...");
            const res = await api.post('/clients/export-react', localClient);
            if (res.data.success) {
                toast.success(res.data.message);
                loadAllData(); // Recargamos para reflejar cambios y vinculaciones
            }
        } catch (error) {
            toast.error("Error al exportar a React");
        }
    };

    const handleExportToMacrosoft = async (localClient) => {
        if (!confirm(`¿Crear "${localClient.Nombre}" en el ERP Macrosoft?\n(Se asignará su ID Local técnico como Nombre Fantasía)`)) return;
        try {
            toast.info("Exportando a Macrosoft...");
            const res = await api.post('/clients/export-macrosoft', localClient);
            if (res.data.success) {
                toast.success(res.data.message);
                loadAllData();
            }
        } catch (error) {
            toast.error("Error al exportar a Macrosoft");
        }
    };

    const handleImportToLocal = async (externalClient, source) => {
        const confirmMsg = source === 'React'
            ? `¿Importar "${externalClient.NombreCliente}" desde React al sistema local?`
            : `¿Importar "${externalClient.Nombre}" desde Macrosoft al sistema local?`;

        if (!confirm(confirmMsg)) return;

        try {
            let payload = {};
            if (source === 'React') {
                // Estructura React -> Local
                payload = {
                    nombre: externalClient.NombreCliente || externalClient.Nombre,
                    nombreFantasia: externalClient.EmpresaCliente || externalClient.NombreCliente,
                    ruc: externalClient.DocumentoCliente || '',
                    telefono: externalClient.Celular || '',
                    email: externalClient.MailCliente || '',
                    direccion: externalClient.DireccionCliente || '',
                    codReact: externalClient.CodigoCliente || '',
                    idReact: externalClient.IdCliente || ''
                };
            } else if (source === 'Macrosoft') {
                // Estructura Macrosoft -> Local
                payload = {
                    nombre: externalClient.Nombre || externalClient.CliNombreApellido,
                    nombreFantasia: externalClient.NombreFantasia || externalClient.CliNombreEmpresa,
                    ruc: externalClient.CioRuc || externalClient.CliDocumento,
                    telefono: externalClient.TelefonoTrabajo || externalClient.CliCelular,
                    email: externalClient.Email || externalClient.CliMail,
                    direccion: externalClient.DireccionParticular || externalClient.CliDireccion,
                    codReact: null,
                    idReact: null,
                };
            }

            toast.info(`Importando desde ${source}...`);
            await api.post('/clients', payload);
            toast.success("Cliente importado localmente!");
            loadLocalClients();

        } catch (error) {
            toast.error(`Error al importar de ${source}`);
        }
    };

    const handleLinkReact = async (localClient, reactClient) => {
        if (!confirm(`¿Vincular "${localClient.Nombre}" con el cliente React "${reactClient.NombreCliente || reactClient.EmpresaCliente}"?`)) return;
        try {
            toast.info("Vinculando con React...");
            const payload = {
                codigoReact: reactClient.CodigoCliente,
                idReact: reactClient.IdCliente
            };
            await api.put(`/clients/${localClient.CodCliente}/link`, payload);
            toast.success("¡Vinculado a React correctamente!");
            setSelectedLocalClient(null); // Limpiar selección
            loadAllData();
        } catch (error) {
            console.error(error);
            toast.error("Error al vincular con React");
        }
    };

    const handleLinkMacrosoft = async (localClient, macrosoftClient) => {
        if (!confirm(`¿Vincular "${localClient.Nombre}" con el cliente Macrosoft "${macrosoftClient.Nombre || macrosoftClient.CliNombreApellido}"?`)) return;
        try {
            toast.info("Vinculando con Macrosoft...");
            const macrosoftId = macrosoftClient.CodCliente || macrosoftClient.IdCliente;
            await api.put(`/clients/${localClient.CodCliente}/link-macrosoft`, {
                codReferencia: macrosoftId
            });
            toast.success("¡Vinculado a Macrosoft correctamente!");
            setSelectedLocalClient(null); // Limpiar selección
            loadAllData();
        } catch (error) {
            console.error(error);
            toast.error("Error al vincular con Macrosoft");
        }
    };

    // Funciones de Filtrado Global
    const filterLocal = clientsLocal.filter(c => {
        const hasReactLink = !!c.CodigoReact;
        const hasMacrosoftLink = c.CodReferencia || clientsMacrosoft.some(m => m.CodCliente == c.CodCliente || m.IdCliente == c.CodCliente);

        if (localFilter === 'no-react' && hasReactLink) return false;
        if (localFilter === 'no-macrosoft' && hasMacrosoftLink) return false;
        if (localFilter === 'no-both' && (hasReactLink || hasMacrosoftLink)) return false;

        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return c.Nombre?.toLowerCase().includes(term) || String(c.CodCliente).includes(term) || c.CioRuc?.toLowerCase().includes(term);
    });

    const filterReact = clientsReact.filter(c => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return c.NombreCliente?.toLowerCase().includes(term) || c.EmpresaCliente?.toLowerCase().includes(term) || String(c.CodigoCliente).toLowerCase().includes(term);
    });

    const filterMacrosoft = clientsMacrosoft.filter(c => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return c.Nombre?.toLowerCase().includes(term) || c.NombreFantasia?.toLowerCase().includes(term) || String(c.CodCliente).toLowerCase().includes(term);
    });

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
            {/* Cabecera / Buscador General */}
            <div className="bg-white p-4 shadow-sm z-10 border-b border-slate-200">
                <div className="max-w-4xl mx-auto relative">
                    <i className="fa-solid fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 text-lg"></i>
                    <input
                        type="text"
                        placeholder="🔍 Búsqueda General en Sistemas simultáneos (Local, React, Macrosoft)..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 shadow-inner"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Paneles de 3 Columnas */}
            <div className="flex-1 flex overflow-hidden p-4 gap-4 relative">

                {/* --- COLUMNA 1: LOCALES --- */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-database text-blue-600"></i> Locales Principales
                            </h2>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{filterLocal.length}</span>
                        </div>
                        <select
                            value={localFilter}
                            onChange={(e) => setLocalFilter(e.target.value)}
                            className="w-full text-xs p-1.5 border border-blue-200 rounded-lg text-slate-600 outline-none focus:ring-1 focus:ring-blue-400 bg-white shadow-sm"
                        >
                            <option value="all">Ver Todos los locales</option>
                            <option value="no-react">⚠️ Sin Vínculo con React</option>
                            <option value="no-macrosoft">⚠️ Sin Vínculo con Macrosoft</option>
                            <option value="no-both">⚠️ Sin Ningún Vínculo (Ni MS ni React)</option>
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {loadingLocal ? <div className="text-center p-4 text-slate-400 text-sm"><i className="fa-solid fa-spinner fa-spin"></i> Cargando...</div> :
                            filterLocal.length === 0 ? <div className="text-center p-4 text-slate-400 text-xs">Sin resultados</div> :
                                filterLocal.map(c => {
                                    const isSelected = selectedLocalClient?.CodCliente === c.CodCliente;
                                    const hasReactLink = !!c.CodigoReact;
                                    // Comprobamos vínculo con Macrosoft (si CodCliente coincide o si CodReferencia lo tiene)
                                    const hasMacrosoftLink = c.CodReferencia || clientsMacrosoft.some(m => m.CodCliente == c.CodCliente || m.IdCliente == c.CodCliente);

                                    return (
                                        <div
                                            key={c.CodCliente}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedLocalClient(null);
                                                    setSearchTerm(''); // Limpia la búsqueda al deseleccionar
                                                } else {
                                                    setSelectedLocalClient(c);
                                                    // Rellena la búsqueda automática priorizando Documento, luego Nombre, y finalmente ID
                                                    setSearchTerm(String(c.CioRuc ? c.CioRuc.trim() : c.Nombre).trim() || String(c.CodCliente));
                                                }
                                            }}
                                            className={`bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition group cursor-pointer ${isSelected ? 'border-2 border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className={`font-bold text-sm ${isSelected ? 'text-indigo-800' : 'text-slate-800'}`}>{c.Nombre}</h3>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingClient(c); }} className="text-slate-400 hover:text-indigo-600 transition" title="Editar Local">
                                                    <i className="fa-solid fa-pen-to-square"></i>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 mb-2 bg-white/60 p-2 rounded">
                                                <p><span className="font-bold">ID Local:</span> {c.CodCliente}</p>
                                                <p className="truncate"><span className="font-bold">Doc:</span> {c.CioRuc || '-'}</p>
                                                <p><span className="font-bold">Tel:</span> {c.TelefonoTrabajo || '-'}</p>
                                                <p className="truncate"><span className="font-bold">Email:</span> {c.Email || '-'}</p>
                                            </div>

                                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                                <span className="text-slate-500 font-medium">Vínculos:</span>
                                                <div className="flex gap-3">
                                                    <span className={`flex items-center gap-1 ${hasReactLink ? 'text-purple-600 font-bold' : 'text-slate-300'}`} title={hasReactLink ? `Vinculado a React (${c.CodigoReact})` : 'Sin vínculo con React'}>
                                                        <i className="fa-brands fa-react"></i>
                                                        {hasReactLink && <i className="fa-solid fa-link text-[10px]"></i>}
                                                    </span>
                                                    <span className={`flex items-center gap-1 ${hasMacrosoftLink ? 'text-emerald-600 font-bold' : 'text-slate-300'}`} title={hasMacrosoftLink ? 'Vinculado a Macrosoft' : 'Sin vínculo con Macrosoft'}>
                                                        <i className="fa-solid fa-server"></i>
                                                        {hasMacrosoftLink && <i className="fa-solid fa-link text-[10px]"></i>}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Select message */}
                                            {isSelected && (
                                                <div className="mt-2 text-center text-[10px] font-bold text-indigo-600 animate-pulse bg-indigo-100 rounded-md py-1">
                                                    Seleccionado: Elige a quién vincular en los paneles ➡️
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                    </div>
                </div>

                {/* --- COLUMNA 2: REACT --- */}
                <div className={`flex-1 flex flex-col bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${selectedLocalClient ? 'border-purple-300 ring-2 ring-purple-100' : 'border-slate-200'}`}>
                    <div className="p-4 border-b border-slate-100 bg-purple-50/50 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <i className="fa-brands fa-react text-purple-600"></i> API React
                        </h2>
                        <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">{filterReact.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {loadingReact ? <div className="text-center p-4 text-slate-400 text-sm"><i className="fa-solid fa-spinner fa-spin"></i> Cargando...</div> :
                            filterReact.length === 0 ? <div className="text-center p-4 text-slate-400 text-xs">Sin resultados</div> :
                                filterReact.map(c => (
                                    <div key={c.IdCliente} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-purple-300 transition group relative">
                                        <h3 className="font-bold text-slate-800 text-sm mb-1">{c.NombreCliente || c.EmpresaCliente}</h3>
                                        <div className="text-[11px] text-slate-600 space-y-1 bg-purple-50/30 p-2 rounded">
                                            <p><span className="font-bold">ID React:</span> {c.CodigoCliente}</p>
                                            <p><span className="font-bold">Doc:</span> {c.DocumentoCliente || '-'}</p>
                                            <p><span className="font-bold">Tel:</span> {c.Celular || '-'}</p>
                                            <p className="truncate"><span className="font-bold">Email:</span> {c.MailCliente || '-'}</p>
                                        </div>

                                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                                            {selectedLocalClient ? (
                                                <button onClick={() => handleLinkReact(selectedLocalClient, c)} className="bg-purple-600 hover:bg-purple-700 shadow text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                                                    <i className="fa-solid fa-link"></i> Vincular aquí
                                                </button>
                                            ) : (
                                                <button onClick={() => handleImportToLocal(c, 'React')} className="bg-blue-600 hover:bg-blue-700 shadow text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                                                    <i className="fa-solid fa-file-import"></i> A Local
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                    </div>
                </div>

                {/* --- COLUMNA 3: MACROSOFT --- */}
                <div className={`flex-1 flex flex-col bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${selectedLocalClient ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
                    <div className="p-4 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <i className="fa-solid fa-server text-emerald-600"></i> API Macrosoft
                        </h2>
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full">{filterMacrosoft.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {loadingMacrosoft ? <div className="text-center p-4 text-slate-400 text-sm"><i className="fa-solid fa-spinner fa-spin"></i> Cargando...</div> :
                            filterMacrosoft.length === 0 ? <div className="text-center p-4 text-slate-400 text-xs">Sin resultados</div> :
                                filterMacrosoft.map(c => {
                                    const nom = c.Nombre || c.CliNombreApellido;
                                    const cod = c.CodCliente || c.IdCliente;
                                    return (
                                        <div key={cod} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-emerald-300 transition group relative">
                                            <h3 className="font-bold text-slate-800 text-sm mb-1">{nom}</h3>
                                            <div className="text-[11px] text-slate-600 space-y-1 bg-emerald-50/30 p-2 rounded">
                                                <p><span className="font-bold">ID MS:</span> {cod}</p>
                                                <p><span className="font-bold">RUC:</span> {c.CioRuc || '-'}</p>
                                                <p><span className="font-bold">Tel:</span> {c.TelefonoTrabajo || '-'}</p>
                                                <p className="truncate"><span className="font-bold">Email:</span> {c.Email || '-'}</p>
                                            </div>
                                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                                                {selectedLocalClient ? (
                                                    <button onClick={() => handleLinkMacrosoft(selectedLocalClient, c)} className="bg-emerald-600 hover:bg-emerald-700 shadow text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                                                        <i className="fa-solid fa-link"></i> Vincular aquí
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleImportToLocal(c, 'Macrosoft')} className="bg-blue-600 hover:bg-blue-700 shadow text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                                                        <i className="fa-solid fa-file-import"></i> A Local
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                    </div>
                </div>

            </div>

            <EditClientDialog
                isOpen={!!editingClient}
                onClose={() => setEditingClient(null)}
                client={editingClient}
                onSave={handleUpdateClient}
            />
        </div>
    );
};

export default ClientsIntegration;

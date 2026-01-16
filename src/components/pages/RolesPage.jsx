import React, { useState, useEffect, useCallback } from 'react';
import { rolesService, menuService } from '../../services/api';

const RolesPage = () => {
    const [roles, setRoles] = useState([]);
    const [modulos, setModulos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState(null);
    const [nuevoRol, setNuevoRol] = useState(null);
    const [permisosSeleccionados, setPermisosSeleccionados] = useState(new Set());

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const [dataRoles, dataModulos] = await Promise.all([
                rolesService.getAll(),
                menuService.getAll()
            ]);
            setRoles(Array.isArray(dataRoles) ? dataRoles : []);
            setModulos(Array.isArray(dataModulos) ? dataModulos : []);
        } catch (error) {
            console.error("Error cargando datos", error);
            setRoles([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // Cargar permisos al editar un rol
    useEffect(() => {
        if (editando) {
            const fetchPermissions = async () => {
                try {
                    const existingPermissions = await rolesService.getPermissions(editando.IdRol);
                    setPermisosSeleccionados(new Set(existingPermissions));
                } catch (error) {
                    console.error("Error cargando permisos del rol", error);
                    setPermisosSeleccionados(new Set());
                }
            };
            fetchPermissions();
        } else if (nuevoRol) {
            setPermisosSeleccionados(new Set());
        }
    }, [editando, nuevoRol]);

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const itemData = {
            NombreRol: formData.get('NombreRol'),
            Descripcion: formData.get('Descripcion')
        };

        try {
            let roleId;
            if (editando) {
                roleId = editando.IdRol;
                await rolesService.update(roleId, itemData);
            } else {
                const response = await rolesService.create(itemData);
                roleId = response.IdRol;
            }

            if (roleId) {
                await rolesService.updatePermissions(roleId, Array.from(permisosSeleccionados));
            }

            setEditando(null);
            setNuevoRol(null);
            cargarDatos();
        } catch (error) {
            alert("Error al guardar: " + (error.message || 'Error desconocido'));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Deseas eliminar este rol?')) {
            try {
                await rolesService.delete(id);
                cargarDatos();
            } catch (error) {
                alert("Error al eliminar: " + (error.message || 'Error desconocido'));
            }
        }
    };

    const togglePermiso = (idModulo) => {
        const nuevosPermisos = new Set(permisosSeleccionados);
        if (nuevosPermisos.has(idModulo)) {
            nuevosPermisos.delete(idModulo);
        } else {
            nuevosPermisos.add(idModulo);
        }
        setPermisosSeleccionados(nuevosPermisos);
    };

    const PermisoItem = ({ modulo, level = 0 }) => {
        const isSelected = permisosSeleccionados.has(modulo.IdModulo);
        const children = modulos.filter(m => m.IdPadre === modulo.IdModulo).sort((a, b) => (a.IndiceOrden || 0) - (b.IndiceOrden || 0));

        return (
            <div className="mb-1" style={{ marginLeft: level * 20 + 'px' }}>
                <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer group transition-colors">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePermiso(modulo.IdModulo)}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                        <i className={`fa-solid ${modulo.Icono || 'fa-circle'} text-sm`}></i>
                    </div>
                    <span className={`text-sm ${isSelected ? 'font-bold text-slate-700' : 'text-slate-600'}`}>
                        {modulo.Titulo || modulo.Nombre}
                    </span>
                    {modulo.Ruta && <span className="text-xs text-slate-400 ml-auto font-mono">{modulo.Ruta}</span>}
                </label>
                {children.map(child => <PermisoItem key={child.IdModulo} modulo={child} level={level + 1} />)}
            </div>
        );
    };

    const RoleCard = ({ item }) => (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-2">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-user-shield text-xl"></i>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => setEditando(item)}
                        className="w-8 h-8 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Editar"
                    >
                        <i className="fa-solid fa-pencil"></i>
                    </button>
                    <button
                        onClick={() => handleDelete(item.IdRol)}
                        className="w-8 h-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        title="Eliminar"
                    >
                        <i className="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">{item.NombreRol}</h3>
                <p className="text-sm text-slate-500 line-clamp-3">{item.Descripcion || 'Sin descripción'}</p>
            </div>
        </div>
    );

    const rootModules = modulos.filter(m => !m.IdPadre).sort((a, b) => (a.IndiceOrden || 0) - (b.IndiceOrden || 0));

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
            <div className="max-w-6xl mx-auto">

                <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                    <div className="mb-4 md:mb-0">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 flex items-center justify-center bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                                <i className="fa-solid fa-users-gear text-2xl"></i>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Gestión de Roles</h1>
                                <p className="text-slate-400 text-sm mt-1 font-medium italic">Administración de roles y permisos</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setNuevoRol(true)}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        <i className="fa-solid fa-plus"></i>
                        <span>Nuevo Rol</span>
                    </button>
                </header>

                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                            Listado de Roles
                        </h3>
                        {loading && <i className="fa-solid fa-circle-notch fa-spin text-indigo-500 text-lg"></i>}
                    </div>

                    {!loading && roles.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="fa-solid fa-user-shield text-slate-300 text-3xl"></i>
                            </div>
                            <p className="text-slate-500 font-bold text-lg">No hay roles registrados</p>
                            <p className="text-slate-400 text-sm">Crea el primer rol para comenzar</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                            {roles.map(rol => (
                                <RoleCard key={rol.IdRol} item={rol} />
                            ))}
                        </div>
                    )}
                </div>

                {(editando || nuevoRol) && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1200] animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                        {editando ? 'Editar Rol' : 'Nuevo Rol'}
                                    </h2>
                                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">Definición de Perfiles</p>
                                </div>
                                <button
                                    onClick={() => { setEditando(null); setNuevoRol(null); }}
                                    className="w-10 h-10 flex items-center justify-center hover:bg-white hover:text-rose-500 rounded-xl transition-all text-slate-400"
                                >
                                    <i className="fa-solid fa-xmark text-xl"></i>
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="flex-1 flex flex-col md:flex-row overflow-hidden">
                                {/* Left: Role Info */}
                                <div className="w-full md:w-1/3 p-8 border-r border-slate-100 space-y-5 overflow-y-auto">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nombre del Rol</label>
                                        <input
                                            name="NombreRol"
                                            required
                                            defaultValue={editando?.NombreRol || ''}
                                            placeholder="Ej: Admin"
                                            className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Descripción</label>
                                        <textarea
                                            name="Descripcion"
                                            rows="4"
                                            defaultValue={editando?.Descripcion || ''}
                                            placeholder="..."
                                            className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-slate-700 resize-none"
                                        />
                                    </div>

                                    <div className="pt-4 hidden md:block">
                                        <button
                                            type="submit"
                                            className="w-full relative group bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black text-base shadow-xl shadow-indigo-200 transition-all hover:-translate-y-0.5 active:scale-95 overflow-hidden"
                                        >
                                            <div className="flex items-center justify-center gap-2 relative z-10">
                                                <i className="fa-solid fa-floppy-disk group-hover:rotate-12 transition-transform"></i>
                                                <span>Guardar</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Right: Permissions */}
                                <div className="w-full md:w-2/3 bg-slate-50/50 flex flex-col">
                                    <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Permisos de Módulos</h3>
                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{permisosSeleccionados.size} seleccionados</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                        {rootModules.map(root => (
                                            <div key={root.IdModulo} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                <PermisoItem modulo={root} />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-4 md:hidden border-t border-slate-200 bg-white">
                                        <button
                                            type="submit"
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black text-base shadow-xl"
                                        >
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RolesPage;

import React, { useState, useEffect, useCallback } from 'react';
import { menuService } from '../../services/api';

// Mapeo de FontAwesome para visualización
const iconMap = {
    'fa-shield-halved': 'fa-shield-halved',
    'fa-industry': 'fa-industry',
    'fa-users': 'fa-users',
    'fa-key': 'fa-key',
    'fa-file-lines': 'fa-file-lines',
    'fa-layer-group': 'fa-layer-group',
    'fa-boxes-stacked': 'fa-boxes-stacked',
    'fa-home': 'fa-home',
    'fa-truck': 'fa-truck',
    'fa-screwdriver-wrench': 'fa-screwdriver-wrench',
    'fa-building': 'fa-building',
    'fa-database': 'fa-database',
    'fa-gear': 'fa-gear',
    'fa-chart-pie': 'fa-chart-pie',
    'fa-comments': 'fa-comments',
    'fa-print': 'fa-print',
    'fa-fire': 'fa-fire',
    'fa-vest': 'fa-vest',
    'fa-shirt': 'fa-shirt',
    'fa-circle-dot': 'fa-circle-dot',
    'fa-diagram-project': 'fa-diagram-project',
    'fa-table-columns': 'fa-table-columns'
};

const MenuAdmin = () => {
    const [modulos, setModulos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState(null);
    const [nuevoModulo, setNuevoModulo] = useState(null);
    const [expandidos, setExpandidos] = useState(new Set());
    const [draggedItem, setDraggedItem] = useState(null);

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            // Usamos el servicio real. Si falla el endpoint (porque no existe en backend aun), 
            // usaremos fallback vacío o lo que venga.
            const data = await menuService.getAll();
            setModulos(Array.isArray(data) ? data : []);

            // Auto expandir primeros niveles
            if (Array.isArray(data)) {
                const rootIds = data.filter(m => !m.IdPadre).map(m => m.IdModulo);
                setExpandidos(new Set(rootIds));
            }
        } catch (error) {
            console.error("Error cargando módulos", error);
            // Fallback visual si falla backend
            setModulos([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const construirArbol = useCallback((items, padreId = null) => {
        // Validar que items sea array
        if (!Array.isArray(items)) return [];

        return items
            .filter(item => item.IdPadre === padreId)
            .sort((a, b) => (a.IndiceOrden || 0) - (b.IndiceOrden || 0))
            .map(item => ({
                ...item,
                hijos: construirArbol(items, item.IdModulo)
            }));
    }, []);

    const toggleExpandir = (id) => {
        const nSet = new Set(expandidos);
        if (nSet.has(id)) nSet.delete(id);
        else nSet.add(id);
        setExpandidos(nSet);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const itemData = {
            IdModulo: editando?.IdModulo,
            Titulo: formData.get('Titulo'),
            Ruta: formData.get('Ruta') || null,
            Icono: formData.get('Icono') || null,
            IdPadre: formData.get('IdPadre') ? parseInt(formData.get('IdPadre')) : null,
            IndiceOrden: parseInt(formData.get('IndiceOrden')) || 0,
            Activo: true
        };

        try {
            if (editando) {
                await menuService.update(editando.IdModulo, itemData);
            } else {
                await menuService.create(itemData);
            }
            setEditando(null);
            setNuevoModulo(null);
            cargarDatos();
        } catch (error) {
            alert("Error al guardar: " + (error.message || 'Error desconocido'));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Deseas eliminar este elemento y sus referencias?')) {
            try {
                await menuService.delete(id);
                cargarDatos();
            } catch (error) {
                alert("Error al eliminar: " + (error.message || 'Error desconocido'));
            }
        }
    };

    const onDrop = async (e, targetItem) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.IdModulo === targetItem.IdModulo) return;

        // Actualización optimista local
        const nuevosModulos = modulos.map(m => {
            if (m.IdModulo === draggedItem.IdModulo) {
                return {
                    ...m,
                    IdPadre: targetItem.IdPadre,
                    IndiceOrden: (targetItem.IndiceOrden || 0) + 0.1
                };
            }
            return m;
        });

        setModulos(nuevosModulos.sort((a, b) => (a.IndiceOrden || 0) - (b.IndiceOrden || 0)));

        // Guardado en backend (reordenamiento simple)
        try {
            // Aquí llamaríamos a un endpoint de reordenamiento masivo o actualizaríamos el item arrastrado
            // Por simplicidad, actualizamos solo el movido
            await menuService.update(draggedItem.IdModulo, {
                ...draggedItem,
                IdPadre: targetItem.IdPadre,
                IndiceOrden: (targetItem.IndiceOrden || 0) + 0.1
            });
            // Luego recargamos para asegurar consistencia
            cargarDatos();
        } catch (err) {
            console.error("Error al mover", err);
            cargarDatos(); // Revertir
        }
    };

    const RenderNodo = ({ item, nivel = 0 }) => {
        const tieneHijos = item.hijos && item.hijos.length > 0;
        const isExpandido = expandidos.has(item.IdModulo);
        const esRaiz = nivel === 0;

        return (
            <div className="mb-2 animate-in fade-in slide-in-from-left-2 duration-300">
                <div
                    draggable
                    onDragStart={(e) => { setDraggedItem(item); e.target.style.opacity = '0.5'; }}
                    onDragEnd={(e) => { setDraggedItem(null); e.target.style.opacity = '1'; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, item)}
                    className={`
            group flex items-center p-3 rounded-2xl transition-all duration-200
            ${esRaiz ? 'bg-white shadow-sm border border-slate-200' : 'bg-slate-50/50 border border-transparent hover:border-indigo-200'}
            ${draggedItem?.IdModulo === item.IdModulo ? 'ring-2 ring-indigo-400 opacity-50' : ''}
          `}
                    style={{ marginLeft: `${nivel * 24}px` }}
                >
                    <div className="flex items-center gap-2 mr-3">
                        <i className="fa-solid fa-grip-vertical text-slate-300 cursor-grab hover:text-indigo-400 transition-colors text-sm"></i>
                        <button
                            onClick={() => toggleExpandir(item.IdModulo)}
                            className={`w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors ${!tieneHijos && 'invisible'}`}
                        >
                            <i className={`fa-solid fa-chevron-${isExpandido ? 'down' : 'right'} text-slate-500 text-xs`}></i>
                        </button>
                    </div>

                    <div className={`
            w-10 h-10 flex items-center justify-center rounded-xl mr-4 transition-transform group-hover:scale-110 shadow-sm
            ${esRaiz ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-100'}
          `}>
                        <i className={`fa-solid ${item.Icono || 'fa-layer-group'} text-lg`}></i>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`font-bold tracking-tight truncate ${esRaiz ? 'text-slate-800 text-base' : 'text-slate-600 text-sm'}`}>
                                {item.Titulo || item.Nombre}
                            </span>
                            {item.IdPadre && (
                                <span className="text-[9px] px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-full uppercase font-black tracking-widest border border-indigo-100 hidden sm:inline-block">
                                    Sub
                                </span>
                            )}
                        </div>
                        {item.Ruta && (
                            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5 truncate">
                                <i className="fa-solid fa-link text-[10px]"></i> {item.Ruta}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button
                            onClick={() => setEditando(item)}
                            className="w-8 h-8 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95"
                            title="Editar"
                        >
                            <i className="fa-solid fa-pencil"></i>
                        </button>
                        <button
                            onClick={() => handleDelete(item.IdModulo)}
                            className="w-8 h-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                            title="Eliminar"
                        >
                            <i className="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>

                {tieneHijos && isExpandido && (
                    <div className="mt-1 ml-8 border-l-2 border-dashed border-slate-200 pl-2 space-y-1">
                        {item.hijos.map(hijo => (
                            <RenderNodo key={hijo.IdModulo} item={hijo} nivel={nivel + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
            <div className="max-w-5xl mx-auto">

                {/* Cabecera */}
                <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                    <div className="mb-4 md:mb-0">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 flex items-center justify-center bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                                <i className="fa-solid fa-list-tree text-2xl"></i>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Menú del Sistema</h1>
                                <p className="text-slate-400 text-sm mt-1 font-medium italic">Gestión de jerarquía y accesos API</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setNuevoModulo({ IdPadre: null, Titulo: '', Ruta: '', Icono: '', IndiceOrden: modulos.length })}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        <i className="fa-solid fa-plus"></i>
                        <span>Nuevo Item</span>
                    </button>
                </header>

                {/* Contenedor del Menú */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                            Estructura Visual
                        </h3>
                        {loading && <i className="fa-solid fa-circle-notch fa-spin text-indigo-500 text-lg"></i>}
                    </div>

                    <div className="pb-20">
                        {modulos.length > 0 ? (
                            construirArbol(modulos).map(root => (
                                <RenderNodo key={root.IdModulo} item={root} />
                            ))
                        ) : !loading && (
                            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i className="fa-solid fa-folder-open text-slate-300 text-3xl"></i>
                                </div>
                                <p className="text-slate-500 font-bold text-lg">No se encontraron módulos</p>
                                <p className="text-slate-400 text-sm">Crea el primer elemento del menú</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Formulario */}
                {(editando || nuevoModulo) && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1200] animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                        {editando ? 'Editar Item' : 'Nuevo Registro'}
                                    </h2>
                                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">Sincronización de Base de Datos</p>
                                </div>
                                <button
                                    onClick={() => { setEditando(null); setNuevoModulo(null); }}
                                    className="w-10 h-10 flex items-center justify-center hover:bg-white hover:text-rose-500 rounded-xl transition-all text-slate-400"
                                >
                                    <i className="fa-solid fa-xmark text-xl"></i>
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-8 space-y-5 overflow-y-auto">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Etiqueta del Menú</label>
                                    <input
                                        name="Titulo"
                                        required
                                        defaultValue={editando?.Titulo || editando?.Nombre || ''}
                                        placeholder="Ej: Administración de Roles"
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Ruta Navegación</label>
                                        <input
                                            name="Ruta"
                                            defaultValue={editando?.Ruta || ''}
                                            placeholder="/admin/mod"
                                            className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Icono (FontAwesome)</label>
                                        <input
                                            name="Icono"
                                            defaultValue={editando?.Icono || ''}
                                            placeholder="fa-home"
                                            className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all text-sm font-semibold text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Jerarquía (Elemento Padre)</label>
                                    <select
                                        name="IdPadre"
                                        defaultValue={editando?.IdPadre || nuevoModulo?.IdPadre || ''}
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl outline-none font-bold text-slate-700 text-sm cursor-pointer"
                                    >
                                        <option value="">-- Nodo Raíz (Sin Padre) --</option>
                                        {modulos
                                            .filter(m => editando ? m.IdModulo !== editando.IdModulo : true)
                                            .sort((a, b) => (a.Titulo || a.Nombre).localeCompare(b.Titulo || b.Nombre))
                                            .map(m => (
                                                <option key={m.IdModulo} value={m.IdModulo}>{m.Titulo || m.Nombre}</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Orden (Índice)</label>
                                    <input
                                        name="IndiceOrden"
                                        type="number"
                                        step="1"
                                        defaultValue={editando?.IndiceOrden || nuevoModulo?.IndiceOrden || 0}
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all font-bold text-slate-700 text-sm"
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="w-full relative group bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black text-base shadow-xl shadow-indigo-200 transition-all hover:-translate-y-0.5 active:scale-95 overflow-hidden"
                                    >
                                        <div className="flex items-center justify-center gap-2 relative z-10">
                                            <i className="fa-solid fa-floppy-disk group-hover:rotate-12 transition-transform"></i>
                                            <span>Guardar Cambios</span>
                                        </div>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default MenuAdmin;

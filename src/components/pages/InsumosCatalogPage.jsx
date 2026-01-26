import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { inventoryService } from '../../services/modules/inventoryService';
import { areasService } from '../../services/modules/areasService';
import { MultiAreaSelector } from '../ui/MultiAreaSelector';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';

const InsumosCatalogPage = () => {
    const [insumos, setInsumos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterArea, setFilterArea] = useState('ALL'); // Nuevo filtro de area

    // Data lists
    const [areasList, setAreasList] = useState([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null); // ID en edición
    const [newItem, setNewItem] = useState({
        nombre: '',
        codRef: '',
        unidad: 'M',
        categoria: '',
        stockMinimo: 0,
        esProductivo: true,
        areas: [] // Para el selector
    });

    useEffect(() => {
        loadCommonData();
    }, []);

    const loadCommonData = async () => {
        setLoading(true);
        try {
            const [insumosData, areasData] = await Promise.all([
                inventoryService.getInsumos(),
                areasService.getAll({ productive: true, withStock: false }) // Traer todas las productivas
            ]);
            setInsumos(insumosData);
            setAreasList(areasData);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando datos");
        } finally {
            setLoading(false);
        }
    };

    const loadInsumos = async () => {
        try {
            const data = await inventoryService.getInsumos();
            setInsumos(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (item) => {
        // Parsear AreaIDs "A, B" => ["A", "B"]
        const itemAreas = item.AreaIDs ? item.AreaIDs.split(',').map(s => s.trim()) : [];

        setNewItem({
            nombre: item.Nombre,
            codRef: item.CodigoReferencia || '',
            unidad: item.UnidadDefault || 'M',
            categoria: item.Categoria || '',
            stockMinimo: item.StockMinimo || 0,
            esProductivo: item.EsProductivo,
            areas: itemAreas
        });
        setEditingId(item.InsumoID);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este insumo?")) return;
        try {
            await inventoryService.deleteInsumo(id);
            toast.success("Insumo eliminado");
            loadInsumos();
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar (puede tener stock asociado)");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Mapear al formato que espera el backend (codProd en vez de codRef)
        const payload = {
            nombre: newItem.nombre,
            codProd: newItem.codRef, // Backend espera codProd
            unidad: newItem.unidad,
            categoria: newItem.categoria,
            stockMinimo: newItem.stockMinimo,
            esProductivo: newItem.esProductivo,
            areas: newItem.areas
        };

        try {
            let res;
            if (editingId) {
                res = await inventoryService.updateInsumo(editingId, payload);
            } else {
                res = await inventoryService.createInsumo(payload);
            }

            if (res.success) {
                toast.success(editingId ? "Insumo actualizado" : "Insumo creado");
                handleCloseModal();
                loadInsumos();
            }
        } catch (error) {
            console.error(error);
            toast.error("Error en la operación");
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setNewItem({
            nombre: '',
            codRef: '',
            unidad: 'M',
            categoria: '',
            stockMinimo: 0,
            esProductivo: true,
            areas: []
        });
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Catálogo de Insumos</h1>
                    <p className="text-slate-500">Gestión de Tipos de Materiales y Referencias</p>
                </div>
                <Button onClick={() => { setEditingId(null); setIsModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Insumo
                </Button>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="flex gap-4 mb-4 bg-white p-4 rounded-lg shadow-sm border border-slate-100 items-center">
                <input
                    type="text"
                    placeholder="Buscar por nombre o referencia..."
                    className="border rounded p-2 flex-1 max-w-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <select
                    className="border rounded p-2 min-w-[150px]"
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                >
                    <option value="">Todas las Categorías</option>
                    {[...new Set(insumos.map(i => i.Categoria).filter(Boolean))].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <select
                    className="border rounded p-2 min-w-[150px]"
                    value={filterArea}
                    onChange={e => setFilterArea(e.target.value)}
                >
                    <option value="ALL">Todas las Áreas</option>
                    {areasList.map(a => <option key={a.AreaID} value={a.AreaID}>{a.Nombre}</option>)}
                </select>
                {(searchTerm || filterCategory || filterArea !== 'ALL') && (
                    <button
                        onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterArea('ALL'); }}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Limpiar Filtros
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 font-bold text-slate-600 text-sm">Nombre</th>
                            <th className="p-4 font-bold text-slate-600 text-sm">Ref. Orden</th>
                            <th className="p-4 font-bold text-slate-600 text-sm">Categoría</th>
                            <th className="p-4 font-bold text-slate-600 text-sm">Áreas</th>
                            <th className="p-4 font-bold text-slate-600 text-sm">Unidad</th>
                            <th className="p-4 font-bold text-slate-600 text-sm">Min</th>
                            <th className="p-4 font-bold text-slate-600 text-sm">Prod.</th>
                            <th className="p-4 font-bold text-slate-600 text-sm text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {insumos.filter(item => {
                            const matchText = (item.Nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
                                || (item.CodigoReferencia || '').toLowerCase().includes(searchTerm.toLowerCase());
                            const matchCat = filterCategory ? item.Categoria === filterCategory : true;
                            const matchArea = filterArea && filterArea !== 'ALL'
                                ? (item.AreaIDs && item.AreaIDs.includes(filterArea))
                                : true;
                            return matchText && matchCat && matchArea;
                        }).map(item => (
                            <tr key={item.InsumoID} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-slate-800 font-medium">{item.Nombre}</td>
                                <td className="p-4 text-slate-600 font-mono text-xs">{item.CodigoReferencia || '-'}</td>
                                <td className="p-4 text-slate-600 text-sm">{item.Categoria || '-'}</td>
                                <td className="p-4 text-slate-600 text-sm">
                                    {item.AreaIDs ? (
                                        <div className="flex flex-wrap gap-1">
                                            {item.AreaIDs.split(',').map(a => (
                                                <span key={a} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] border border-blue-100">{a}</span>
                                            ))}
                                        </div>
                                    ) : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="p-4 text-slate-600">{item.UnidadDefault}</td>
                                <td className="p-4 text-slate-600 text-sm">{item.StockMinimo}</td>
                                <td className="p-4 text-slate-600 text-center">
                                    {item.EsProductivo ? <span className="text-green-500 font-bold">✓</span> : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleEdit(item)} className="text-slate-400 hover:text-blue-600 mr-2" title="Editar"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(item.InsumoID)} className="text-slate-400 hover:text-red-600" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {insumos.length === 0 && !loading && (
                            <tr>
                                <td colSpan="8" className="p-8 text-center text-slate-400 italic">No hay insumos registrados.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        <h2 className="text-lg font-bold mb-4">{editingId ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre</label>
                                <input className="w-full border rounded p-2" required value={newItem.nombre} onChange={e => setNewItem({ ...newItem, nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Código Referencia (Ordenes.CodArt)</label>
                                <input className="w-full border rounded p-2" value={newItem.codRef} onChange={e => setNewItem({ ...newItem, codRef: e.target.value })} placeholder="Ej: VINILO_PREMIUM" />
                                <p className="text-xs text-slate-400 mt-1">Debe coincidir con la orden para asignación automática.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Categoría (ERP)</label>
                                <input className="w-full border rounded p-2" value={newItem.categoria} onChange={e => setNewItem({ ...newItem, categoria: e.target.value })} placeholder="Ej: VINILO, TELA, PAPEL" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Áreas Asignadas</label>
                                <MultiAreaSelector
                                    areas={areasList}
                                    selected={newItem.areas}
                                    onChange={(selected) => setNewItem({ ...newItem, areas: selected })}
                                    placeholder="Vincular Áreas..."
                                />
                                <p className="text-xs text-slate-400 mt-1">El insumo aparecerá disponible en estas áreas.</p>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Stock Mínimo</label>
                                    <input type="number" className="w-full border rounded p-2" value={newItem.stockMinimo} onChange={e => setNewItem({ ...newItem, stockMinimo: e.target.value })} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Unidad</label>
                                    <select className="w-full border rounded p-2" value={newItem.unidad} onChange={e => setNewItem({ ...newItem, unidad: e.target.value })}>
                                        <option value="M">Metros (M)</option>
                                        <option value="KG">Kilos (KG)</option>
                                        <option value="UN">Unidades (UN)</option>
                                        <option value="L">Litros (L)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="esProductivo"
                                    checked={newItem.esProductivo}
                                    onChange={e => setNewItem({ ...newItem, esProductivo: e.target.checked })}
                                />
                                <label htmlFor="esProductivo" className="text-sm font-medium">Es insumo productivo</label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                                <Button type="submit">{editingId ? 'Actualizar' : 'Guardar'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InsumosCatalogPage;

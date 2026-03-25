import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { MapPin, Truck, Plus, Edit2, Trash2, Search, Save, X } from 'lucide-react';

const NomenclatorsABM = () => {
    const [activeTab, setActiveTab] = useState('agencias'); // 'agencias' | 'localidades'
    const [agencias, setAgencias] = useState([]);
    const [localidades, setLocalidades] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filtroDepartamento, setFiltroDepartamento] = useState(''); // '' = Todos

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // null = nuevo
    const [formData, setFormData] = useState({ nombre: '', departamentoId: '' });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'agencias') {
                const res = await api.get('/nomenclators/agencies');
                setAgencias(res.data.data);
            } else {
                const [locRes, depRes] = await Promise.all([
                    api.get('/nomenclators/localities'),
                    api.get('/nomenclators/departments')
                ]);
                setLocalidades(locRes.data.data);
                setDepartamentos(depRes.data.data);
            }
        } catch (error) {
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData({
                nombre: item.Nombre,
                departamentoId: item.DepartamentoID || ''
            });
        } else {
            setFormData({ 
                nombre: '', 
                departamentoId: activeTab === 'localidades' ? filtroDepartamento : '' 
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({ nombre: '', departamentoId: '' });
    };

    const handleSave = async () => {
        if (!formData.nombre.trim()) {
            return toast.warning("El nombre es obligatorio");
        }
        if (activeTab === 'localidades' && !formData.departamentoId) {
            return toast.warning("Debes seleccionar un departamento");
        }

        const endpoint = activeTab === 'agencias' ? '/nomenclators/agencies' : '/nomenclators/localities';
        
        try {
            if (editingItem) {
                await api.put(`${endpoint}/${editingItem.ID}`, formData);
                toast.success(`${activeTab === 'agencias' ? 'Agencia' : 'Localidad'} actualizada`);
            } else {
                await api.post(endpoint, formData);
                toast.success(`${activeTab === 'agencias' ? 'Agencia' : 'Localidad'} creada`);
            }
            handleCloseModal();
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar");
        }
    };

    const handleDelete = async (item) => {
        const result = await Swal.fire({
            title: '¿Eliminar registro?',
            text: `Vas a eliminar "${item.Nombre}". Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#cbd5e1',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const endpoint = activeTab === 'agencias' ? '/nomenclators/agencies' : '/nomenclators/localities';
                await api.delete(`${endpoint}/${item.ID}`);
                toast.success("Eliminado correctamente");
                loadData();
            } catch (error) {
                toast.error("Error al eliminar. Puede estar en uso.");
            }
        }
    };

    const filteredItems = (activeTab === 'agencias' ? agencias : localidades).filter(item => {
        const matchText = item.Nombre.toLowerCase().includes(searchTerm.toLowerCase());
        if (activeTab === 'localidades' && filtroDepartamento) {
            return matchText && String(item.DepartamentoID) === String(filtroDepartamento);
        }
        return matchText;
    });

    return (
        <div className="flex flex-col h-full bg-slate-50 relative p-6 max-w-7xl mx-auto w-full font-sans">
            {/* Cabecera y Tabs */}
            <div className="mb-6">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">ABM Nomencladores</h1>
                <p className="text-slate-500 font-medium mt-1">Gestión rápida de Agencias de Envío y Localidades.</p>
                
                <div className="flex gap-4 border-b border-slate-200 mt-6 pb-2">
                    <button
                        onClick={() => setActiveTab('agencias')}
                        className={`font-bold pb-2 flex items-center gap-2 transition-colors border-b-2 px-2 ${
                            activeTab === 'agencias' ? 'border-[#0070bc] text-[#0070bc]' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Truck size={18} /> Agencias
                    </button>
                    <button
                        onClick={() => setActiveTab('localidades')}
                        className={`font-bold pb-2 flex items-center gap-2 transition-colors border-b-2 px-2 ${
                            activeTab === 'localidades' ? 'border-[#0070bc] text-[#0070bc]' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <MapPin size={18} /> Localidades
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-4 gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={`Buscar ${activeTab}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0070bc] transition-colors"
                        />
                    </div>

                    {activeTab === 'localidades' && (
                        <select
                            value={filtroDepartamento}
                            onChange={(e) => setFiltroDepartamento(e.target.value)}
                            className="w-64 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 outline-none focus:border-[#0070bc] transition-colors cursor-pointer"
                        >
                            <option value="">— Todos los Departamentos —</option>
                            {departamentos.map(dep => (
                                <option key={dep.ID} value={dep.ID}>{dep.Nombre}</option>
                            ))}
                        </select>
                    )}
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-[#0070bc] hover:bg-[#005a99] text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex-shrink-0"
                >
                    <Plus size={18} /> Nueva {activeTab === 'agencias' ? 'Agencia' : 'Localidad'}
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-32 text-slate-400">Cargando...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center text-slate-500 py-10 font-medium">No se encontraron registros.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="py-3 px-4 text-xs tracking-wider text-slate-400 uppercase font-black w-16">ID</th>
                                    <th className="py-3 px-4 text-xs tracking-wider text-slate-400 uppercase font-black">Nombre</th>
                                    {activeTab === 'localidades' && (
                                        <th className="py-3 px-4 text-xs tracking-wider text-slate-400 uppercase font-black">Departamento</th>
                                    )}
                                    <th className="py-3 px-4 text-xs tracking-wider text-slate-400 uppercase font-black text-right w-32">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(item => (
                                    <tr key={item.ID} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 px-4 text-sm text-slate-500 font-mono">{item.ID}</td>
                                        <td className="py-3 px-4 text-sm font-bold text-slate-800">{item.Nombre}</td>
                                        {activeTab === 'localidades' && (
                                            <td className="py-3 px-4 text-sm text-slate-600 font-medium">{item.DepartamentoNombre}</td>
                                        )}
                                        <td className="py-3 px-4 flex justify-end gap-2">
                                            <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-[#0070bc] bg-white border border-slate-200 hover:border-[#0070bc] rounded-lg transition-all" title="Editar">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(item)} className="p-2 text-slate-400 hover:text-red-500 bg-white border border-slate-200 hover:border-red-500 rounded-lg transition-all" title="Eliminar">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-800">
                                {editingItem ? 'Editar' : 'Nueva'} {activeTab === 'agencias' ? 'Agencia' : 'Localidad'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold text-slate-700">Nombre</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-700 font-medium outline-none focus:border-[#0070bc] focus:ring-1 focus:ring-[#0070bc]"
                                    autoFocus
                                />
                            </div>

                            {activeTab === 'localidades' && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-bold text-slate-700">Departamento</label>
                                    <select
                                        value={formData.departamentoId}
                                        onChange={e => setFormData({ ...formData, departamentoId: e.target.value })}
                                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-700 font-medium outline-none focus:border-[#0070bc] focus:ring-1 focus:ring-[#0070bc]"
                                    >
                                        <option value="">Seleccione...</option>
                                        {departamentos.map(dep => (
                                            <option key={dep.ID} value={dep.ID}>{dep.Nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-3 mt-4">
                                <button onClick={handleCloseModal} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={handleSave} className="flex-1 bg-[#0070bc] text-white font-black py-2.5 rounded-xl hover:bg-[#005a99] transition-colors flex items-center justify-center gap-2">
                                    <Save size={18} /> Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NomenclatorsABM;

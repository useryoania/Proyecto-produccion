import React, { useState, useEffect } from 'react';

import { Plus, Trash2, Loader2 } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { CustomSelect } from '../pautas/CustomSelect';
// import { toast } from 'react-hot-toast'; // Not used yet

const EcouvTerminacionesUI = ({ serviceInfo, value, onChange }) => {
    const [availableMaterials, setAvailableMaterials] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selectedMaterial, setSelectedMaterial] = useState('');
    const [quantity, setQuantity] = useState(1);

    // Value IS directly the array of items
    const items = Array.isArray(value) ? value : [];

    useEffect(() => {
        const fetchMaterials = async () => {
            if (!serviceInfo?.areaId) return;
            setLoading(true);
            try {
                // Fetch materials for variant 'Materiales Extra Gran Formato'
                const variantName = encodeURIComponent('Materiales Extra Gran Formato');
                const areaId = serviceInfo.areaId;
                const res = await apiClient.get(`/nomenclators/materials/${areaId}/${variantName}`);

                if (res.success) {
                    setAvailableMaterials(res.data);
                }
            } catch (error) {
                console.error("Error fetching extra materials", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMaterials();
    }, [serviceInfo?.areaId]);

    const handleAddItem = () => {
        if (!selectedMaterial) return;

        const newItem = {
            id: Date.now(),
            material: selectedMaterial,
            cantidad: parseInt(quantity) || 1
        };

        const newItems = [...items, newItem];
        onChange(newItems); // Return array

        // Reset inputs
        setSelectedMaterial('');
        setQuantity(1);
    };

    const handleRemoveItem = (id) => {
        const newItems = items.filter(it => it.id !== id);
        onChange(newItems); // Return array
    };

    return (
        <div className="mt-4 p-5 bg-zinc-900/40 rounded-2xl border border-zinc-700/50 animate-in slide-in-from-top-2">
            <h4 className="text-[10px] uppercase font-black text-zinc-100 mb-4 tracking-widest flex items-center gap-2">
                <Plus size={14} className="text-cyan-400" /> Selección de Materiales Extra
            </h4>

            {loading ? (
                <div className="flex items-center gap-3 text-zinc-500 text-xs py-6 justify-center">
                    <Loader2 className="animate-spin w-5 h-5 text-cyan-500" /> Cargando materiales...
                </div>
            ) : availableMaterials.length === 0 ? (
                <p className="text-zinc-500 text-xs italic py-4 text-center">No se encontraron materiales extra disponibles.</p>
            ) : (
                <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/30">
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black text-zinc-500 mb-2 uppercase tracking-widest">Material Extra</label>
                        <CustomSelect
                            value={selectedMaterial}
                            onChange={(val) => setSelectedMaterial(val)}
                            options={availableMaterials.map(m => ({
                                value: m.Material,
                                label: m.Material
                            }))}
                            placeholder="-- Seleccionar --"
                            variant="black"
                            size="small"
                        />
                    </div>
                    <div className="w-full md:w-24">
                        <label className="block text-[10px] font-black text-zinc-500 mb-2 uppercase tracking-widest">Cant.</label>
                        <input
                            type="number"
                            min="1"
                            className="w-full p-3 border border-zinc-700 rounded-xl text-xs bg-zinc-900/50 text-zinc-200 text-center outline-none focus:border-cyan-500/50 transition-all"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={!selectedMaterial}
                        className="h-[46px] w-full md:w-[46px] flex items-center justify-center bg-cyan-500 text-zinc-900 rounded-xl hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/10"
                        title="Agregar Material"
                    >
                        <Plus size={20} strokeWidth={3} />
                    </button>
                </div>
            )}

            {/* List of Added Items */}
            {items.length > 0 && (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {items.map((item, idx) => (
                        <div key={item.id || idx} className="flex items-center justify-between p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-xl group hover:border-cyan-500/30 transition-all">
                            <div className="flex items-center gap-4">
                                <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-black px-3 py-1 rounded-lg min-w-[36px] text-center border border-cyan-500/20">
                                    {item.cantidad}
                                </span>
                                <span className="text-xs font-bold text-zinc-300">{item.material}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-zinc-600 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-all opacity-100 md:opacity-0 group-hover:opacity-100"
                                title="Eliminar"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {items.length === 0 && !loading && availableMaterials.length > 0 && (
                <p className="text-center text-[10px] font-bold text-zinc-600 py-2 uppercase tracking-tighter">Agregue materiales a la lista si es necesario.</p>
            )}
        </div>
    );
};

export default EcouvTerminacionesUI;

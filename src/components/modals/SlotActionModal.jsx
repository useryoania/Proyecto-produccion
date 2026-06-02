import React, { useState, useEffect } from 'react';
import { machineControlService } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { Disc3, ArrowUpFromLine, Droplets, X, Info, Search, Barcode, AlertTriangle, Check, Loader2 } from 'lucide-react';

const SlotActionModal = ({ isOpen, onClose, slot, machineId, onSuccess }) => {
    const isMount = isOpen && slot && !slot.BobinaMontadaID && slot.Tipo === 'BOBINA';
    const isUnmount = isOpen && slot && slot.BobinaMontadaID && slot.Tipo === 'BOBINA';
    const isRefill = isOpen && slot && slot.Tipo === 'CONSUMIBLE';

    const [formData, setFormData] = useState({ bobinaId: '', cantidad: '', comment: '' });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFormData({ bobinaId: '', cantidad: '', comment: '' });
            setSearchTerm('');
        }
    }, [isOpen]);

    const { data: availableBobbins, isLoading: loadingBobbins } = useQuery({
        queryKey: ['availableBobbins', machineId],
        queryFn: () => machineControlService.getAvailableBobbins(machineId),
        enabled: !!(isOpen && isMount),
        staleTime: 1000 * 30
    });

    if (!isOpen || !slot) return null;

    const filteredBobbins = availableBobbins?.filter(b =>
        !searchTerm ||
        b.Material.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.CodigoEtiqueta.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let action = '';
            const payload = { ...formData };

            if (isMount) action = 'MOUNT';
            if (isUnmount) action = 'UNMOUNT';
            if (isRefill) action = 'REFILL';

            await machineControlService.executeAction(machineId, slot.SlotID, {
                action,
                ...payload
            });

            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-zinc-900/60 z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-zinc-200/50">

                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-zinc-100">
                    <h3 className="font-bold text-zinc-800 flex items-center gap-2.5">
                        {isMount && (
                            <><span className="w-8 h-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center"><Disc3 size={16} className="text-brand-cyan" /></span> Montar Bobina</>
                        )}
                        {isUnmount && (
                            <><span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><ArrowUpFromLine size={16} className="text-amber-600" /></span> Desmontar Bobina</>
                        )}
                        {isRefill && (
                            <><span className="w-8 h-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center"><Droplets size={16} className="text-brand-cyan" /></span> Recargar Insumo</>
                        )}
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">

                    {/* Slot Info */}
                    <div className="p-3 bg-brand-cyan/5 border border-brand-cyan/15 rounded-xl text-sm text-brand-cyan font-bold flex items-center gap-2">
                        <Info size={16} />
                        {slot.Nombre}
                    </div>

                    {isMount && (
                        <div>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase flex justify-between mb-1.5 tracking-wider">
                                Seleccionar Bobina
                                <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded-full text-zinc-400 font-medium normal-case tracking-normal">Escáner o Lista</span>
                            </label>

                            {/* Search */}
                            <div className="relative mb-3">
                                <Search size={14} className="absolute left-3 top-3 text-zinc-400" />
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-3 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan outline-none transition-all placeholder:text-zinc-300 font-bold text-zinc-700 text-sm"
                                    placeholder="Escanear etiqueta o buscar..."
                                    value={formData.bobinaId || searchTerm}
                                    onChange={e => {
                                        setSearchTerm(e.target.value);
                                        setFormData({ ...formData, bobinaId: e.target.value });
                                    }}
                                    autoFocus
                                />
                            </div>

                            {/* Bobbin List */}
                            <div className="border border-zinc-200 rounded-xl bg-zinc-50/50 max-h-60 overflow-y-auto custom-scrollbar">
                                {loadingBobbins ? (
                                    <div className="p-4 text-center text-xs text-zinc-400 animate-pulse">Cargando inventario...</div>
                                ) : filteredBobbins.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-zinc-400 italic">No se encontraron bobinas disponibles.</div>
                                ) : (
                                    <div className="divide-y divide-zinc-100">
                                        {filteredBobbins.map(b => (
                                            <div
                                                key={b.BobinaID}
                                                onClick={() => {
                                                    setFormData({ ...formData, bobinaId: b.CodigoEtiqueta });
                                                    setSearchTerm('');
                                                }}
                                                className={`p-3 cursor-pointer hover:bg-brand-cyan/5 transition-all group flex justify-between items-center ${formData.bobinaId === b.CodigoEtiqueta ? 'bg-brand-cyan/10 ring-1 ring-brand-cyan/30 ring-inset' : ''}`}
                                            >
                                                <div>
                                                    <div className="font-bold text-xs text-zinc-700 group-hover:text-brand-cyan transition-colors">{b.Material}</div>
                                                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
                                                        <Barcode size={10} className="text-zinc-300" />
                                                        {b.CodigoEtiqueta}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                                        {b.MetrosRestantes}m
                                                    </div>
                                                    <div className="text-[9px] text-zinc-400 mt-0.5">{new Date(b.FechaIngreso).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {isUnmount && (
                        <div className="text-sm bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
                            <h4 className="font-bold flex items-center gap-2 mb-2">
                                <AlertTriangle size={16} /> Confirmar Desmontaje
                            </h4>
                            <p className="opacity-90 leading-relaxed text-xs">
                                Vas a desmontar la bobina <b>{slot.CodigoEtiqueta || slot.BobinaMontadaID} ({slot.NombreInsumoMontado})</b>.
                                <br />Quedará marcada como <strong>Disponible</strong> con su metraje actual.
                            </p>
                        </div>
                    )}

                    {isRefill && (
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1.5 tracking-wider">Cantidad Recargada</label>
                            <div className="flex gap-2 relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full border border-zinc-200 rounded-xl p-3 pl-4 text-lg font-bold text-zinc-700 focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan outline-none transition-all"
                                    placeholder="0.00"
                                    value={formData.cantidad}
                                    onChange={e => setFormData({ ...formData, cantidad: e.target.value })}
                                    required
                                />
                                <div className="absolute right-3 top-3.5 text-zinc-400 font-bold text-sm pointer-events-none">Litros</div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="border-t border-zinc-100 pt-4 mt-1 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl font-bold text-sm transition-colors">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (isMount && !formData.bobinaId) || (isRefill && !formData.cantidad)}
                            className="px-6 py-2.5 bg-brand-cyan text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-cyan/20 hover:bg-brand-cyan/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Confirmar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SlotActionModal;

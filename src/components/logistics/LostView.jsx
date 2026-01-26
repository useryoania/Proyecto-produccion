import React, { useState, useEffect } from 'react';
import { logisticsService } from '../../services/modules/logisticsService';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Mock service call until implemented
const getLostItems = async () => {
    // LLAMADA REAL
    return logisticsService.getLostItems();
};

const LostView = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const queryClient = useQueryClient();

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getLostItems();
            setItems(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const recoverMutation = useMutation({
        mutationFn: logisticsService.recoverItem, // Needs implementation or reuse
        onSuccess: () => {
            toast.success("Item recuperado y puesto en stock");
            loadData();
        },
        onError: (err) => toast.error("Error: " + err.message)
    });

    const handleRecover = (item) => {
        if (confirm(`¿Recuperar item ${item.CodigoEtiqueta}? Pasará a estado EN_STOCK en ${item.UbicacionActual || 'RECEPCION'}`)) {
            recoverMutation.mutate({
                bultoId: item.BultoID,
                location: 'RECEPCION' // Default location for recovery, or ask user?
            });
        }
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 text-red-600 flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        Objetos Extraviados
                    </h2>
                    <p className="text-slate-500 text-sm">Bultos marcados como perdidos durante el transporte o recepción.</p>
                </div>
                <button onClick={loadData} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i>
                </button>
            </div>

            {items.length === 0 && !loading ? (
                <div className="text-center py-20 opacity-50">
                    <i className="fa-solid fa-check-circle text-6xl text-emerald-300 mb-4"></i>
                    <p className="font-bold text-slate-600">No hay bultos extraviados reportados.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(item => (
                        <div key={item.BultoID} className="bg-white p-4 rounded-xl shadow-sm border border-red-100 flex flex-col gap-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <i className="fa-solid fa-skull-crossbones text-6xl text-red-500"></i>
                            </div>

                            <div className="flex items-center gap-3 z-10">
                                <span className="bg-red-100 text-red-600 font-bold px-2 py-1 rounded text-sm">{item.CodigoEtiqueta}</span>
                                <span className="text-xs text-slate-400 font-mono">ID: {item.BultoID}</span>
                            </div>

                            <div className="z-10">
                                <p className="text-sm font-bold text-slate-700">{item.Descripcion}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    <i className="fa-solid fa-clock mr-1"></i>
                                    Perdido hace: {item.FechaUpdated ? Math.floor((new Date() - new Date(item.FechaUpdated)) / (1000 * 60 * 60 * 24)) + ' días' : 'Recientemente'}
                                </p>
                            </div>

                            <div className="mt-2 pt-3 border-t border-slate-100 z-10">
                                <button
                                    onClick={() => handleRecover(item)}
                                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-hand-holding-medical"></i>
                                    Recuperar / Reingresar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LostView;

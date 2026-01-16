import React from 'react';

const RollCard = ({ roll, onViewDetails, isSelected, onToggleSelect, isMachineView }) => {
    if (!roll) return null;

    return (
        <div className={`bg-white rounded-lg shadow-sm border p-3 hover:shadow-md transition-all relative group ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-slate-200'}`}>
            {/* Cabecera Lote */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    {onToggleSelect && (
                        <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={(e) => onToggleSelect(roll.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                    )}
                    <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <i className="fa-solid fa-layer-group"></i>
                    </div>
                    <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Lote</span>
                        <span className="font-bold text-slate-700 text-sm">{roll.name || roll.rollCode || roll.id}</span>
                    </div>
                </div>
                {roll.status && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase border ${roll.status.includes('En maquina') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        roll.status === 'Asignado' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-slate-50 text-slate-500 border-slate-100'
                        }`}>
                        {roll.status}
                    </span>
                )}
            </div>

            {/* Detalles Reestructurados */}
            <div className={`mb-2 ${onToggleSelect ? 'ml-6' : 'ml-1'}`}>
                {/* Material Completo */}
                <div className="text-xs font-bold text-slate-600 mb-3 leading-tight break-words" title={roll.material}>
                    {roll.material || 'Varios'}
                </div>

                {/* Métricas: Órdenes y Metros */}
                <div className="flex items-center gap-4 border-t border-slate-50 pt-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Órdenes</span>
                        <span className="font-black text-slate-700 text-sm">{roll.ordersCount || roll.orders?.length || 0}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-100"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Metros</span>
                        <span className="font-black text-indigo-600 text-sm">{roll.totalMeters || roll.usage || 0}m</span>
                    </div>
                </div>
            </div>

            {/* Footer Acciones */}
            <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 italic">
                    {roll.printer ? `Asignado: ${roll.printer}` : (!isMachineView ? 'Mesa de Armado' : 'Sin Asignar')}
                </span>

                {/* Botón Ojo */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onViewDetails) onViewDetails(roll);
                    }}
                    className="w-7 h-7 rounded-full bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer z-10"
                    title="Ver Detalle del Lote"
                >
                    <i className="fa-regular fa-eye text-xs"></i>
                </button>
            </div>
        </div>
    );
};

export default RollCard;

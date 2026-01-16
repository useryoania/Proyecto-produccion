import React, { useState } from 'react';

/**
 * BasketCard – componente genérico para mostrar información de un canasto y
 * permitir expandir la lista de órdenes que contiene.
 *
 * Props:
 *   - title:        Texto del encabezado del canasto.
 *   - description:  Descripción breve.
 *   - orders:       Array de órdenes del canasto.
 *   - metrics:      Texto con métricas (p.ej. "3 órdenes, 15 bultos").
 *   - icon:         Icono JSX a mostrar al lado del título.
 */
const BasketCard = ({ title, description, orders, metrics, icon, destination, onSelect }) => {
    const [open, setOpen] = useState(false);
    const toggle = () => setOpen(!open);
    const handleClick = () => {
        if (onSelect) onSelect();
        toggle();
    };

    return (
        <div className="border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition mb-4">
            <div className="flex items-center justify-between" onClick={handleClick}>
                <div className="flex items-center gap-3">
                    {icon}
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">{title}</h3>
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>
                </div>
                <div className="text-sm font-medium text-slate-600">{metrics}</div>
            </div>
            {open && (
                <div className="mt-4 border-t pt-2">
                    {orders && orders.length > 0 ? (
                        orders.map(o => (
                            <div key={o.id} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                                <span className="text-sm font-medium">{o.displayId || o.id}</span>
                                <span className="text-sm text-gray-600">{o.bultos} bultos</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-400">Sin órdenes.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default BasketCard;

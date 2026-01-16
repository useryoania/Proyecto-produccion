import React from 'react';
import BasketCard from './BasketCard';

/**
 * Canasto de Fallas
 * Props: { basket }
 */
const FailureBasket = ({ basket }) => {
    if (!basket) return null;
    const metrics = `${basket.ordenes?.length ?? 0} órdenes, ${basket.ordenes?.reduce((a, o) => a + (o.bultos ?? 0), 0)} bultos`;
    return (
        <BasketCard
            title={basket.nombre ?? 'Canasto de Fallas'}
            description={basket.descripcion ?? 'Órdenes con fallas'}
            metrics={metrics}
            orders={basket.ordenes}
            icon={<i className="fa-solid fa-triangle-exclamation text-red-600"></i>}
        />
    );
};

export default FailureBasket;

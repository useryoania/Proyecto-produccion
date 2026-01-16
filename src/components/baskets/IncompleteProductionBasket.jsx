import React from 'react';
import BasketCard from './BasketCard';

/**
 * Canasto de Producción Incompleta
 * Props: { basket }
 */
const IncompleteProductionBasket = ({ basket }) => {
    if (!basket) return null;
    const metrics = `${basket.ordenes?.length ?? 0} órdenes, ${basket.ordenes?.reduce((a, o) => a + (o.bultos ?? 0), 0)} bultos`;
    return (
        <BasketCard
            title={basket.nombre ?? 'Producción Incompleta'}
            description={basket.descripcion ?? 'Órdenes con producción parcial'}
            metrics={metrics}
            orders={basket.ordenes}
            icon={<i className="fa-solid fa-box-open text-amber-600"></i>}
        />
    );
};

export default IncompleteProductionBasket;

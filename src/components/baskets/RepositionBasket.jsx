import React from 'react';
import BasketCard from './BasketCard';

/**
 * Canasto de Reposiciones (Transito)
 * Props: { basket }
 */
const RepositionBasket = ({ basket }) => {
    if (!basket) return null;
    const metrics = `${basket.ordenes?.length ?? 0} órdenes, ${basket.ordenes?.reduce((a, o) => a + (o.bultos ?? 0), 0)} bultos`;
    return (
        <BasketCard
            title={basket.nombre ?? 'Canasto de Reposiciones'}
            description={basket.descripcion ?? 'Órdenes en tránsito'}
            metrics={metrics}
            orders={basket.ordenes}
            icon={<i className="fa-solid fa-truck-fast text-blue-600"></i>}
        />
    );
};

export default RepositionBasket;

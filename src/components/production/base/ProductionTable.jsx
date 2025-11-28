import React from 'react';
import { AREA_CONFIG, getFieldRenderer } from '../../utils/renderers/fieldRenderers';
import styles from './ProductionTable.module.css';

const ProductionTable = ({ 
  areaConfig, 
  orders, 
  selectedOrders, 
  onToggleSelection,
  filters 
}) => {
  const { table } = areaConfig;
  
  // Combinar campos comunes + únicos para DTF
  const allFields = [
    ...table.fields.common,
    ...table.fields.unique.map(field => field.key)
  ];

  const renderTableCell = (order, fieldKey, index) => {
    const renderer = getFieldRenderer(areaConfig.key, fieldKey);
    
    if (!renderer) {
      console.warn(`No renderer found for field: ${fieldKey}`);
      return <div className={styles.gridCell}>-</div>;
    }

    const isSelected = selectedOrders.includes(order.id);
    
    return (
      <div key={fieldKey} className={styles.gridCell}>
        {renderer(order, isSelected, onToggleSelection, index)}
      </div>
    );
  };

  if (orders.length === 0) {
    return (
      <div className={styles.emptyState}>
        <i className="fa-solid fa-inbox"></i>
        <p>No hay órdenes para mostrar</p>
        <small>Utilice los filtros o cree una nueva orden</small>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      {/* Header */}
      <div 
        className={styles.tableHeader}
        style={{ gridTemplateColumns: table.gridTemplate }}
      >
        {table.headers.map((header, index) => (
          <div key={index} className={styles.headerCell}>
            {header}
          </div>
        ))}
      </div>
      
      {/* Body */}
      <div className={styles.tableBody}>
        {orders.map((order, index) => (
          <div
            key={order.id}
            className={`${styles.tableRow} ${
              selectedOrders.includes(order.id) ? styles.selectedRow : ''
            }`}
            style={{ gridTemplateColumns: table.gridTemplate }}
          >
            {allFields.map(fieldKey => 
              renderTableCell(order, fieldKey, index)
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductionTable;
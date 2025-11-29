import React from 'react';
import styles from './ProductionTable.css';

const ProductionTable = ({ areaConfig, orders = [], selectedOrders = [], onToggleSelection }) => {

  console.log("📊 [ProductionTable] areaConfig:", areaConfig);

  if (!areaConfig) {
    console.error("❌ [ProductionTable] areaConfig es undefined");
    return <div>❌ No se pudo cargar la tabla</div>;
  }

  return (
    <div style={{ background: "white" }}>

      {/* HEADER */}
      <div 
        style={{ 
          display: "grid",
          gridTemplateColumns: areaConfig.gridTemplate,
          background: "#f1f5f9",
          fontWeight: "bold",
          padding: "6px"
        }}
      >
        {areaConfig.headers.map((header, i) => (
          <div key={i}>{header}</div>
        ))}
      </div>

      {/* FILAS */}
      {orders.map((order, index) => {
        console.log("🧵 Fila:", order);

        return (
          <div 
            key={order.id} 
            style={{
              display: "grid",
              gridTemplateColumns: areaConfig.gridTemplate,
              borderBottom: "1px solid #e2e8f0",
              padding: "4px"
            }}
          >
            {areaConfig.renderRowCells
              ? areaConfig.renderRowCells(order, index)
              : <div style={{ gridColumn: "1 / -1", color: "red" }}>
                  ⚠ Falta renderRowCells en esta área
                </div>
            }
          </div>
        );
      })}

      {orders.length === 0 && (
        <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
          No hay órdenes para mostrar.
        </div>
      )}
    </div>
  );
};

export default ProductionTable;

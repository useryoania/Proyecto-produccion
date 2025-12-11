import React from 'react';
import styles from './RollSidebar.module.css';

const RollSidebar = ({ orders, currentFilter, onFilterChange, onClose, title = "LOTES" }) => {
  
  // 1. Agrupamos las órdenes (Igual que antes)
  const itemsMap = orders.reduce((acc, order) => {
    const key = order.rollId || 'Sin Asignar';
    
    if (!acc[key]) {
        acc[key] = { id: key, count: 0 };
    }
    acc[key].count += 1;
    return acc;
  }, {});

  // 2. Convertimos a Array y ORDENAMOS
  const sortedItems = Object.values(itemsMap).sort((a, b) => {
      // Regla 1: "Sin Asignar" debe ir PRIMERO
      if (a.id === 'Sin Asignar') return -1;
      if (b.id === 'Sin Asignar') return 1;

      // Regla 2: El resto se ordena alfanuméricamente (para que Rollo 1, Rollo 2... salgan en orden)
      return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div className={styles.sidebar} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Encabezado */}
      <div className={styles.sidebarHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#475569', fontWeight: '700' }}>{title}</h3>
        <i 
            className="fa-solid fa-angles-left" 
            style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
            onClick={onClose} 
            title="Ocultar panel"
        ></i>
      </div>
      
      <div className={styles.sidebarContent} style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        
        {/* Opción TODOS (Siempre fija arriba) */}
        <div
          className={`${styles.rollItem} ${currentFilter === 'ALL' ? styles.active : ''}`}
          onClick={() => onFilterChange('ALL')}
        >
          <div className={styles.rollHeader}>
             <span className={styles.rollName}>Todos</span>
             <span className={styles.orderCount}>{orders.length}</span>
          </div>
        </div>
        
        {/* Lista Ordenada (Sin Asignar va primero) */}
        {sortedItems.map(item => (
          <div
            key={item.id}
            className={`${styles.rollItem} ${currentFilter === item.id ? styles.active : ''}`}
            onClick={() => onFilterChange(item.id)}
          >
             <div className={styles.rollHeader}>
                <span className={styles.rollName} style={{ color: item.id === 'Sin Asignar' ? '#dc2626' : '#6366f1', fontWeight: '500' }}>
                    {item.id === 'Sin Asignar' ? '⚠️ Sin Asignar' : item.id}
                </span>
                
                <span className={styles.orderCount} style={{background:'#f1f5f9', color:'#64748b', fontSize:'0.7rem', padding:'2px 6px', borderRadius:'10px'}}>
                    {item.count}
                </span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RollSidebar;
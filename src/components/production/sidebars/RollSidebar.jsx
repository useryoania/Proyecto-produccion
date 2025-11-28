import React from 'react';
import styles from './RollSidebar.module.css';

const RollSidebar = ({ orders, currentFilter, onFilterChange }) => {
  // Agrupar órdenes por rollo (específico de DTF)
  const rolls = orders.reduce((acc, order) => {
    if (order.rollId) {
      if (!acc[order.rollId]) {
        acc[order.rollId] = {
          id: order.rollId,
          orders: [],
          totalMeters: 0
        };
      }
      acc[order.rollId].orders.push(order);
      acc[order.rollId].totalMeters += order.meters || 0;
    }
    return acc;
  }, {});

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h3>Lotes / Rollos</h3>
      </div>
      
      <div className={styles.sidebarContent}>
        {/* Filtro Todos */}
        <div
          className={`${styles.rollItem} ${
            currentFilter === 'ALL' ? styles.active : ''
          }`}
          onClick={() => onFilterChange('ALL')}
        >
          <span className={styles.rollName}>Todos</span>
          <span className={styles.orderCount}>{orders.length}</span>
        </div>
        
        {/* Lista de Rollos */}
        {Object.values(rolls).map(roll => (
          <div
            key={roll.id}
            className={`${styles.rollItem} ${
              currentFilter === roll.id ? styles.active : ''
            }`}
            onClick={() => onFilterChange(roll.id)}
          >
            <span className={styles.rollName}>{roll.id}</span>
            <div className={styles.rollInfo}>
              <span className={styles.orderCount}>
                {roll.orders.length} ord
              </span>
              <span className={styles.meters}>
                {roll.totalMeters}m
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RollSidebar;
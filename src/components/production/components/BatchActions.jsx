import React from 'react';
import styles from './BatchActions.module.css';

const BatchActions = ({ 
  selectedCount, 
  onDeselectAll, 
  onCreateRoll,
  onAssignPrinter,
  onChangeStatus,
  area 
}) => {
  const handleCreateRoll = () => {
    if (selectedCount > 0) {
      onCreateRoll();
    }
  };

  const handleAssignPrinter = () => {
    if (selectedCount > 0) {
      onAssignPrinter();
    }
  };

  const handleChangeStatus = (newStatus) => {
    if (selectedCount > 0) {
      onChangeStatus(newStatus);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className={styles.batchActionBar}>
      <div className={styles.actionInfo}>
        <span className={styles.selectedCount}>
          {selectedCount} seleccionados
        </span>
        <div className={styles.separator}></div>
        
        {/* Create Roll Button - Solo para áreas de impresión */}
        {(area === 'DTF' || area === 'SUB' || area === 'UV') && (
          <button 
            className={styles.actionButton}
            onClick={handleCreateRoll}
          >
            <i className="fa-solid fa-scroll"></i>
            Crear Rollo
          </button>
        )}
        
        {/* Assign Printer */}
        <button 
          className={styles.actionButton}
          onClick={handleAssignPrinter}
        >
          <i className="fa-solid fa-print"></i>
          Asignar Impresora
        </button>
        
        {/* Status Change Dropdown */}
        <div className={styles.dropdown}>
          <button className={styles.actionButton}>
            <i className="fa-solid fa-flag"></i>
            Cambiar Estado
            <i className="fa-solid fa-chevron-down ml-1"></i>
          </button>
          <div className={styles.dropdownContent}>
            <button onClick={() => handleChangeStatus('Pendiente')}>
              Pendiente
            </button>
            <button onClick={() => handleChangeStatus('Imprimiendo')}>
              Imprimiendo
            </button>
            <button onClick={() => handleChangeStatus('Finalizado')}>
              Finalizado
            </button>
            <button onClick={() => handleChangeStatus('Entregado')}>
              Entregado
            </button>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <button 
            className={styles.quickAction}
            onClick={() => handleChangeStatus('Imprimiendo')}
            title="Marcar como Imprimiendo"
          >
            <i className="fa-solid fa-play text-green-500"></i>
          </button>
          <button 
            className={styles.quickAction}
            onClick={() => handleChangeStatus('Finalizado')}
            title="Marcar como Finalizado"
          >
            <i className="fa-solid fa-check text-blue-500"></i>
          </button>
          <button 
            className={styles.quickAction}
            onClick={() => handleChangeStatus('Pendiente')}
            title="Marcar como Pendiente"
          >
            <i className="fa-solid fa-pause text-yellow-500"></i>
          </button>
        </div>
      </div>
      
      <button 
        className={styles.deselectButton}
        onClick={onDeselectAll}
        title="Deseleccionar todos"
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
};

export default BatchActions;
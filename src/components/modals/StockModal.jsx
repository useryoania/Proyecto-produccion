import React from 'react';
import styles from './Modals.module.css';

const StockModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Solicitud de Insumos</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.formGroup}>
            <label>Insumo</label>
            <select>
              <option>Film DTF</option>
              <option>Polvo DTF</option>
              <option>Tinta Cyan</option>
              <option>Tinta Magenta</option>
              <option>Tinta Amarilla</option>
              <option>Tinta Negra</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Cantidad</label>
            <input type="number" placeholder="Ej: 5" />
          </div>
          <div className={styles.formGroup}>
            <label>Urgencia</label>
            <select>
              <option>Normal</option>
              <option>Urgente</option>
              <option>Crítico</option>
            </select>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
          <button className={styles.saveButton}>Solicitar</button>
        </div>
      </div>
    </div>
  );
};

export default StockModal;
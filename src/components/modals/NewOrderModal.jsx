import React from 'react';
import styles from './Modals.module.css';

const NewOrderModal = ({ isOpen, onClose, area }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Nueva Orden - {area}</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.formGroup}>
            <label>Cliente</label>
            <input type="text" placeholder="Nombre del cliente" />
          </div>
          <div className={styles.formGroup}>
            <label>Descripción del Trabajo</label>
            <textarea placeholder="Descripción detallada del trabajo..." rows="3"></textarea>
          </div>
          <div className={styles.formGroup}>
            <label>Cantidad</label>
            <input type="number" placeholder="Ej: 100" />
          </div>
          <div className={styles.formGroup}>
            <label>Prioridad</label>
            <select>
              <option>Normal</option>
              <option>Alta</option>
              <option>Urgente</option>
            </select>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
          <button className={styles.saveButton}>Crear Orden</button>
        </div>
      </div>
    </div>
  );
};

export default NewOrderModal;
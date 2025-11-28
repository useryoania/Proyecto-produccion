import React from 'react';
import styles from './Modals.module.css';

const ReportModal = ({ isOpen, onClose, machineId }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Reportar Falla Técnica</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.formGroup}>
            <label>Máquina</label>
            <select>
              <option>DTF-01</option>
              <option>DTF-02</option>
              <option>DTF-03</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Tipo de Falla</label>
            <select>
              <option>Atascamiento</option>
              <option>Problema de cabezal</option>
              <option>Error de software</option>
              <option>Problema eléctrico</option>
              <option>Otro</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Descripción</label>
            <textarea placeholder="Describe el problema en detalle..." rows="4"></textarea>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
          <button className={styles.saveButton}>Reportar</button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
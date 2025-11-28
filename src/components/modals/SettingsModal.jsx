import React from 'react';
import styles from './Modals.module.css';

const SettingsModal = ({ isOpen, onClose, area }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Configuración - {area}</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.settingGroup}>
            <label>Notificaciones</label>
            <select>
              <option>Activas</option>
              <option>Silenciosas</option>
            </select>
          </div>
          <div className={styles.settingGroup}>
            <label>Auto-refresh</label>
            <select>
              <option>30 segundos</option>
              <option>1 minuto</option>
              <option>5 minutos</option>
            </select>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
          <button className={styles.saveButton}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
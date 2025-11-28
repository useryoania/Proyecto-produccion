import React from 'react';
import styles from './Planilla.module.css';

const areas = [
  { key: 'planilla-dtf', name: 'DTF', icon: 'fa-print', color: '#2563eb' },
  { key: 'planilla-bordado', name: 'Bordado', icon: 'fa-needle', color: '#7c3aed' },
  { key: 'planilla-uv', name: 'ECO UV', icon: 'fa-sun', color: '#ea580c' },
  { key: 'planilla-tpu-uv', name: 'TPU UV', icon: 'fa-cube', color: '#0ea5e9' },
  { key: 'planilla-directa', name: 'Impresión Directa', icon: 'fa-spray-can', color: '#10b981' },
  { key: 'planilla-estampado', name: 'Estampado', icon: 'fa-shirt', color: '#ec4899' },
  { key: 'planilla-laser', name: 'Láser', icon: 'fa-bolt-lightning', color: '#facc15' },
  { key: 'planilla-costura', name: 'Costura', icon: 'fa-scissors', color: '#ef4444' },
  { key: 'planilla-terminacion', name: 'Terminación UV', icon: 'fa-check', color: '#14b8a6' },
  { key: 'planilla-coordinacion', name: 'Coordinación', icon: 'fa-people-group', color: '#6366f1' },
  { key: 'planilla-deposito', name: 'Depósito', icon: 'fa-boxes-stacked', color: '#4b5563' },
  { key: 'planilla-sublimacion', name: 'Sublimación', icon: 'fa-fire', color: '#dc2626' },
];

const Planilla = ({ onSwitchTab }) => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Planillas de Área</h1>
      <p className={styles.subtitle}>Selecciona un área para gestionar su producción.</p>

      <div className={styles.grid}>
        {areas.map(area => (
          <div 
            key={area.key}
            className={styles.card}
            style={{ borderColor: area.color }}
            onClick={() => onSwitchTab(area.key)}
          >
            <div className={styles.icon} style={{ color: area.color }}>
              <i className={`fa-solid ${area.icon}`}></i>
            </div>
            <h3>{area.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Planilla;

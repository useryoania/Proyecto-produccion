import React from 'react';
import styles from './ActivityFeed.module.css';

// Ejemplo de actividad, luego puedes pasarla como prop si quieres
const activityLog = [
  { type: 'start', text: 'Carlos inició corte en #1050', time: 'Hace 10m' },
  { type: 'error', text: 'Reporte retraso en Área UV', time: 'Hace 1h' }
];

const ActivityFeed = ({ activities = activityLog }) => {
  return (
    <div className={styles.activityCard}>
      <div className={styles.activityHeader}>
        <h3 className={styles.activityTitle}>
          <i className="fa-solid fa-bolt" style={{ color: '#eab308' }}></i>
          Actividad Reciente
        </h3>
      </div>
      <div className={styles.activityList}>
        {activities.map((item, idx) => (
          <div key={idx} className={styles.activityItem}>
            <span
              className={`${styles.activityDot} ${item.type === 'error' ? styles.error : styles.start}`}
            ></span>
            <p className={styles.activityTime}>{item.time}</p>
            <p className={styles.activityText}>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;

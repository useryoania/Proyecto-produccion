// src/components/dashboard/PlantStatus.jsx
import React from "react";
import styles from "./PlantStatus.module.css";

const PlantStatus = ({ statusCounts }) => {
  // statusCounts = { ok: number, delayed: number, support: number }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Estado de Planta en Tiempo Real</h3>
        <div className={styles.badges}>
          <span className={styles.badgeOk}>{statusCounts.ok} Áreas OK</span>
          <span className={styles.badgeDelayed}>{statusCounts.delayed} Retraso</span>
          <span className={styles.badgeSupport}>{statusCounts.support} Soporte</span>
        </div>
      </div>
    </div>
  );
};

export default PlantStatus;

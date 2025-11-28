// src/components/dashboard/DashboardKPIs.jsx
import React from "react";
import styles from "./DashboardKPIs.module.css";
import { mockOrders } from "../../data/mockData.js";
import useDashboardKPIs from "../hooks/useDashboardKPIs";

const DashboardKPIs = () => {
  const { active, delayed, messages } = useDashboardKPIs(mockOrders);

  return (
    <div className={styles.kpiGrid}>
      <div className={styles.kpiCard}>
        <p className={styles.label}>Órdenes Activas</p>
        <h3 className={styles.value}>{active}</h3>
      </div>

      <div className={`${styles.kpiCard} ${styles.red}`}>
        <p className={styles.label}>Retrasadas</p>
        <h3 className={styles.value}>{delayed}</h3>
      </div>

      <div className={`${styles.kpiCard} ${styles.yellow}`}>
        <p className={styles.label}>Mensajes</p>
        <h3 className={styles.value}>{messages}</h3>
      </div>
    </div>
  );
};

export default DashboardKPIs;

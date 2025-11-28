import React, { useState } from 'react';
import styles from './Metricas.module.css';

const dataByTab = {
  general: {
    kpis: [
      { label: "A TIEMPO", value: "88%", subtitle: "200 Órdenes", colorClass: styles.kpiGreen },
      { label: "RETRASOS", value: "6.8%", subtitle: "15 Órdenes", colorClass: styles.kpiRed },
      { label: "REHECHOS", value: "5.2%", subtitle: "15 Órdenes", colorClass: styles.kpiOrange }
    ],
    productivity: 85,
    alert: "Balanceado"
  },
  dtf: {
    kpis: [
      { label: "DTF OK", value: "90%", subtitle: "180 Órdenes", colorClass: styles.kpiGreen },
      { label: "DTF Retrasos", value: "7.0%", subtitle: "20 Órdenes", colorClass: styles.kpiRed },
      { label: "DTF Reproceso", value: "3.0%", subtitle: "10 Órdenes", colorClass: styles.kpiOrange }
    ],
    productivity: 80,
    alert: "Requiere atención"
  },
  // Podés agregar más tabs como "sub", "uv", "bordado" con su propia data
};

const Metricas = ({ currentView, onSwitchTab }) => {
  const [activeTab, setActiveTab] = useState("general");

  const { kpis, productivity, alert } = dataByTab[activeTab] || dataByTab.general;

  return (
    <div className={styles.metricsPage}>
      
      {/* HEADER */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Métricas</h1>
        <p className={styles.pageSubtitle}>KPIs y Rendimiento</p>
      </div>

      {/* TABS */}
      <div className={styles.tabs}>
        {Object.keys(dataByTab).map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        {kpis.map(({ label, value, subtitle, colorClass }, index) => (
          <div key={index} className={styles.kpiCard}>
            <h4>{label}</h4>
            <span className={`${styles.kpiValue} ${colorClass}`}>{value}</span>
            {subtitle && <p className={styles.kpiSubtitle}>{subtitle}</p>}
          </div>
        ))}
      </div>

      {/* PRODUCTIVITY AND ALERT */}
      <div className={styles.gridTwo}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Carga y Productividad</h3>
          <div className={styles.progressBar}>
            <div className={styles.progressFillGreen} style={{ width: `${productivity}%` }}></div>
          </div>
          <div>{productivity}%</div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Alertas</h3>
          <div className={styles.alertBox}>{alert}</div>
        </div>
      </div>
    </div>
  );
};

export default Metricas;

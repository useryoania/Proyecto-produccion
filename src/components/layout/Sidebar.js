// src/components/layout/Sidebar.jsx
import React from 'react';
import styles from './Sidebar.module.css'; // tu CSS existente
import '@fortawesome/fontawesome-free/css/all.min.css'; // asegúrate de importar Font Awesome

const Sidebar = ({ onNavigateToArea }) => {
  const areasOperativas = [
    {
      categoria: 'Impresión',
      areas: [
        { key: 'planilla-dtf', name: 'DTF Textil', icon: 'fa-print', color: 'blue' },
        { key: 'planilla-sublimacion', name: 'Sublimación', icon: 'fa-shirt', color: 'purple' },
        { key: 'planilla-uv', name: 'ECO UV', icon: 'fa-lightbulb', color: 'orange' },
        { key: 'planilla-tpu-uv', name: 'TPU UV', icon: 'fa-layer-group', color: 'green' },
        { key: 'planilla-directa', name: 'Directa 3.20', icon: 'fa-scroll', color: 'cyan' }
      ]
    },
    {
      categoria: 'Procesos', 
      areas: [
        { key: 'planilla-bordado', name: 'Bordado', icon: 'fa-screwdriver', color: 'pink' },
        { key: 'planilla-estampado', name: 'Estampado', icon: 'fa-stamp', color: 'red' },
        { key: 'planilla-laser', name: 'Corte Láser', icon: 'fa-scissors', color: 'teal' },
        { key: 'planilla-costura', name: 'Costura', icon: 'fa-vest', color: 'rose' },
        { key: 'planilla-terminacion', name: 'Terminación UV', icon: 'fa-brush', color: 'yellow' }
      ]
    },
    {
      categoria: 'Logística & Gestión',
      areas: [
        { key: 'planilla-coordinacion', name: 'Coordinación', icon: 'fa-network-wired', color: 'indigo' },
        { key: 'despacho', name: 'Despacho', icon: 'fa-truck-fast', color: 'green' },
        { key: 'planilla-deposito', name: 'Depósito', icon: 'fa-boxes-stacked', color: 'gray' }
      ]
    },
    {
      categoria: 'Soporte',
      areas: [
        { key: 'servicio', name: 'Servicio Técnico', icon: 'fa-screwdriver-wrench', color: 'gray' },
        { key: 'infraestructura', name: 'Infraestructura', icon: 'fa-helmet-safety', color: 'amber' }
      ]
    }
  ];

  const handleAreaClick = (areaKey) => {
    if (onNavigateToArea) {
      onNavigateToArea(areaKey);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Áreas Operativas</h2>
        <p className={styles.sidebarSubtitle}>Seleccione para gestionar</p>
      </div>
      
      <nav className={styles.sidebarNav}>
        {areasOperativas.map(grupo => (
          <div key={grupo.categoria} className={styles.navGroup}>
            <h3 className={styles.navCategory}>{grupo.categoria}</h3>
            <div className={styles.navAreas}>
              {grupo.areas.map(area => (
                <button
                  key={area.key}
                  onClick={() => handleAreaClick(area.key)}
                  className={`${styles.areaButton} ${styles[area.color]}`}
                >
                  <div className={`${styles.areaIcon} ${styles[area.color]}`}>
                    <i className={`fa-solid ${area.icon}`}></i>
                  </div>
                  <span className={styles.areaName}>{area.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;

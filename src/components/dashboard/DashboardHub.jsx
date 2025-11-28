// src/components/dashboard/DashboardHub.jsx
import React from "react";
import PlantStatus from "./PlantStatus";
import ActivityFeed from "./ActivityFeed";
import DashboardKPIs from "./DashboardKPIs"; // si lo usás
import styles from "./DashboardHub.module.css";

const DashboardHub = ({ orders, machines /* o lo que uses para estado */ }) => {
  // Calculo simple de estado: por ejemplo:
  const statusCounts = {
    ok: 2,
    delayed: 1,
    support: 1
  };

  return (
    <div className={styles.hubContainer}>
      <PlantStatus statusCounts={statusCounts} />

      {/* Grid: por ejemplo KPI cards y Feed */}
      <div className={styles.lowerGrid}>
        <div className={styles.kpiSection}>
          <DashboardKPIs orders={orders} />
        </div>
        <div className={styles.activitySection}>
          <ActivityFeed /* props si las necesita */ />
        </div>
      </div>
    </div>
  );
};

export default DashboardHub;

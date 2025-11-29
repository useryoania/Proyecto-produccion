import React from "react";
import styles from "../../../styles/DTFRow.module.css";

const dtfRowRenderer = (order) => {
  return [
    <div key="pos" className={`${styles.cell} ${styles.center}`}>
      {order.position || "-"}
    </div>,

    <div key="order" className={styles.cell}>
      <strong>{order.id}</strong>
    </div>,

    <div key="entryDate" className={styles.cell}>
      {order.entryDate ? new Date(order.entryDate).toLocaleString() : "--"}
    </div>,

    <div key="client" className={styles.cell}>{order.client}</div>,
    <div key="job" className={styles.cell}>{order.job || order.desc}</div>,
    <div key="notes" className={styles.cell}>{order.notes || "--"}</div>,

    <div key="mode" className={styles.cell}>{order.mode || "--"}</div>,

    <div key="meters" className={`${styles.cell} ${styles.center}`}>
      {order.meters || "-"}
    </div>,

    <div key="status" className={`${styles.cell}`}>
      <span className={`${styles.status} ${styles[`status${order.status}`]}`}>
        {order.status}
      </span>
    </div>,

    <div key="printer" className={styles.cell}>{order.printer || "--"}</div>,
  ];
};

export default dtfRowRenderer;

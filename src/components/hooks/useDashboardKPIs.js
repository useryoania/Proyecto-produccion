// src/components/hooks/useDashboardKPIs.js
import { useMemo } from "react";

export default function useDashboardKPIs(orders = []) {
  return useMemo(() => {
    const total = orders.length;

    const active = orders.filter(o => 
      o.status !== "completada" && o.status !== "cancelada"
    ).length;

    const delayed = orders.filter(o => {
      if (!o.estimatedDate) return false;
      const est = new Date(o.estimatedDate);
      return est < new Date() && o.status !== "completada";
    }).length;

    const messages = orders.filter(o => o.hasMessages).length;

    return {
      total,
      active,
      delayed,
      messages
    };
  }, [orders]);
}

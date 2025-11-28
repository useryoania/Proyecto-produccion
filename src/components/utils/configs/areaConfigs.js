import React from "react";

// src/components/utils/configs/areaConfigs.js
export const areaConfigs = {
  DTF: {
    name: "DTF",

    filters: [
      { key: "status", label: "Estado", type: "select", options: ["Pendiente", "En Proceso", "Terminado"] },
      { key: "priority", label: "Prioridad", type: "select", options: ["Alta", "Media", "Baja"] }
    ],

    table: {
      columns: [
        { key: "id", label: "ID" },
        { key: "client", label: "Cliente" },
        { key: "design", label: "Diseño" },
        { key: "qty", label: "Cant." },
        { key: "status", label: "Estado" }
      ]
    },

    sidebar: {
      enabled: true,
      reducer: (orders) => {
        return orders.reduce(
          (acc, o) => {
            acc.total += o.qty || 0;
            return acc;
          },
          { total: 0 }
        );
      }
    }
  },

  Bordado: {
    name: "Bordado",

    filters: [
      { key: "status", label: "Estado", type: "select", options: ["Pendiente", "En Proceso", "Terminado"] },
      { key: "machine", label: "Máquina", type: "select", options: ["Tajima 1", "Tajima 2", "Tajima 3"] }
    ],

    table: {
      columns: [
        { key: "id", label: "ID" },
        { key: "client", label: "Cliente" },
        { key: "design", label: "Diseño" },
        { key: "stitches", label: "Puntadas" },
        { key: "status", label: "Estado" }
      ]
    },

    sidebar: {
      enabled: true,
      reducer: (orders) => {
        return orders.reduce(
          (acc, o) => {
            acc.puntadas += o.stitches || 0;
            return acc;
          },
          { puntadas: 0 }
        );
      }
    }
  }
};


// ------------------ RENDERERS DTF -------------------
export const dtfRenderers = {
  rollRenderer: (order) => <span>{order.rollId || "-"}</span>,
  metersRenderer: (order) => <span>{order.meters || 0}m</span>,
  inkTypeRenderer: (order) => <span>{order.inkType || "Standard"}</span>,
  resolutionRenderer: (order) => <span>{order.resolution || "300dpi"}</span>,
  printerRenderer: (order) => <span>{order.printer || "DTF-01"}</span>,
  filesRenderer: (order) => (
    <button>Archivos ({order.filesData?.length || 0})</button>
  ),
};

export const applyDtfFilters = (orders, filters) => [...orders];

export const getDtfMockOrders = () => AREA_CONFIGS.DTF.mockData.orders;

// ------------------ RENDERERS BORDADO -------------------
export const bordadoRenderers = {
  machine: (o) => <span>{o.machine || "-"}</span>,
  thread: (o) => <span>{o.thread || "-"}</span>,
  stitches: (o) => <span>{o.stitches || 0}</span>,
};

// ------------------ COMMON RENDERERS -------------------
export const commonRenderers = {
  id: (o) => <span>{o.id}</span>,
  client: (o) => <span>{o.client}</span>,
  date: (o) => <span>{o.date}</span>,
};

// ------------------ SELECTOR GENERAL -------------------
export function getFieldRenderer(areaKey) {
  switch (areaKey) {
    case "DTF":
      return dtfRenderers;
    case "BORDADO":
      return bordadoRenderers;
    default:
      return commonRenderers;
  }
}

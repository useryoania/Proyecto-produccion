// src/components/utils/configs/areaConfigs.js
import { dtfRowRenderer } from "../renderers/dtfRowRenderer.jsx";

export const areaConfigs = {
  // ---------------------------------------------------------------
  // 🟦 DTF
  // ---------------------------------------------------------------
  DTF: {
    name: "Impresión DTF",

    gridTemplate:
      "40px 40px 60px 80px 80px 80px 100px 220px 150px 80px 60px 70px 90px 120px 50px",

    headers: [
      "",
      "Pos",
      "Orden",
      "Ingreso",
      "Tiempo",
      "Rollo",
      "Cliente",
      "Trabajo",
      "Nota",
      "Modo",
      "Arch.",
      "Metros",
      "Estado",
      "Impresora",
      "Chat",
    ],

    printers: ["DTF-01", "M-DTF-01"],

    filters: {
      common: ["status"],

      unique: [
        {
          key: "printer",
          label: "Impresora",
          options: [
            { value: "ALL", label: "Todas" },
            { value: "DTF-01", label: "DTF-01" },
            { value: "M-DTF-01", label: "M-DTF-01" },
          ],
        },
      ],
    },

    table: { enableActions: true },

    theme: "dtf",

    // ----------------------------------------------------
    // 🧩 renderRowCells — evita error en ProductionTable
    // ----------------------------------------------------
    renderRowCells: (order) => {
      return [
        <div key="c0" />,
        <div key="c1">{order.pos ?? "-"}</div>,
        <div key="c2" className="font-bold">ORD-{order.id}</div>,
        <div key="c3">{order.ingreso ?? "-"}</div>,
        <div key="c4">{order.time ?? "-"}</div>,
        <div key="c5">{order.rollId ?? "-"}</div>,
        <div key="c6">{order.client ?? "-"}</div>,
        <div key="c7" className="truncate">{order.job ?? "-"}</div>,
        <div key="c8" className="truncate">{order.note ?? "-"}</div>,
        <div key="c9">{order.mode ?? "-"}</div>,
        <div key="c10" style={{ textAlign: "center" }}>
          {order.filesData?.length ?? 0}
        </div>,
        <div key="c11" style={{ textAlign: "center" }}>
          {order.meters ?? "-"}
        </div>,
        <div key="c12" style={{ textAlign: "center" }}>
          <span className="status-badge">{order.status ?? "-"}</span>
        </div>,
        <div key="c13">
          <select value={order.printer || ""}>
            <option>{order.printer || "-"}</option>
          </select>
        </div>,
        <div key="c14" style={{ textAlign: "center" }}>
          <button>💬</button>
        </div>,
      ];
    },
  },

  // ---------------------------------------------------------------
  // 🟩 BORDADO
  // ---------------------------------------------------------------
  BORD: {
    name: "Bordado Industrial",

    gridTemplate:
      "40px 40px 60px 80px 80px 80px 100px 220px 150px 70px 70px 80px 80px 90px 120px 50px",

    headers: [
      "",
      "Pos",
      "Orden",
      "Ingreso",
      "Tiempo",
      "Rollo",
      "Cliente",
      "Trabajo",
      "Nota",
      "Logo",
      "Matriz",
      "Pts",
      "Unid.",
      "Estado",
      "Máquina",
      "Chat",
    ],

    printers: ["Tajima 6", "Brother 4"],

    filters: {
      common: ["status"],
      unique: [
        {
          key: "machine",
          label: "Máquina",
          options: [
            { value: "ALL", label: "Todas" },
            { value: "TAJIMA6", label: "Tajima 6" },
            { value: "BROTHER4", label: "Brother 4" },
          ],
        },
      ],
    },

    table: { enableActions: true },

    theme: "bordado",

    // ----------------------------------------------------
    // 🧩 renderRowCells — evita error en ProductionTable
    // ----------------------------------------------------
    renderRowCells: (order) => {
      return [
        <div key="c0" />,
        <div key="c1">{order.pos ?? "-"}</div>,
        <div key="c2" className="font-bold">ORD-{order.id}</div>,
        <div key="c3">{order.ingreso ?? "-"}</div>,
        <div key="c4">{order.time ?? "-"}</div>,
        <div key="c5">{order.rollId ?? "-"}</div>,
        <div key="c6">{order.client ?? "-"}</div>,
        <div key="c7" className="truncate">{order.job ?? "-"}</div>,
        <div key="c8" className="truncate">{order.note ?? "-"}</div>,
        <div key="c9" style={{ textAlign: "center" }}>
          {order.logos?.length ?? 0}
        </div>,
        <div key="c10" style={{ textAlign: "center" }}>
          {order.matrixStatus ?? "-"}
        </div>,
        <div key="c11" style={{ textAlign: "center" }}>
          {order.stitches?.toLocaleString() ?? "-"}
        </div>,
        <div key="c12" style={{ textAlign: "center" }}>
          {order.quantity ?? "-"}
        </div>,
        <div key="c13" style={{ textAlign: "center" }}>
          <span className="status-badge">{order.status ?? "-"}</span>
        </div>,
        <div key="c14">{order.machine ?? "-"}</div>,
        <div key="c15" style={{ textAlign: "center" }}>
          <button>💬</button>
        </div>,
      ];
    },
  },
};

// src/components/utils/configs/areaConfigs.js

export const areaConfigs = {
  // --- ÁREAS ORIGINALES DE LA MAQUETA ---
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
          { value: "M-DTF-01", label: "M-DTF-01" }
        ]
      }
    ]
  },

  table: { enableActions: true },

  theme: "dtf"     // Necesario porque AreaFilters usa areaConfig.theme
},

  SUB: {
    name: "Sublimación",
    gridTemplate:
      "40px 40px 60px 80px 80px 80px 100px 220px 150px 80px 100px 60px 70px 90px 120px 120px 50px",
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
      "Tela",
      "Arch.",
      "Metros",
      "Estado",
      "Impresora",
      "Calandra",
      "Chat",
    ],
    printers: ["Epson F9470", "M-SUB-01"],
  },

  UV: {
    name: "ECO UV",
    gridTemplate:
      "40px 40px 60px 80px 80px 80px 100px 220px 150px 80px 100px 60px 70px 90px 120px 50px",
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
      "Material",
      "Arch.",
      "Unid.",
      "Estado",
      "Impresora",
      "Chat",
    ],
    printers: ["Roland LEF"],
  },

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
          { value: "BROTHER4", label: "Brother 4" }
        ]
      }
    ]
  },

  table: { enableActions: true },    // 👈 NECESARIO

  theme: "bordado"
},


  // --- NUEVAS ÁREAS COMPLETAS (Modo b: inventadas coherentes) ---

  DIRECT: {
    name: "Impresión Directa",
    gridTemplate:
      "40px 40px 60px 80px 80px 100px 200px 150px 80px 80px 100px 120px 50px",
    headers: [
      "",
      "Pos",
      "Orden",
      "Ingreso",
      "Tiempo",
      "Cliente",
      "Trabajo",
      "Nota",
      "Color",
      "Arch.",
      "Unid.",
      "Estado",
      "Impresora",
      "Chat",
    ],
    printers: ["Direct-01", "Direct-02"],
  },

  TPU_UV: {
    name: "TPU UV",
    gridTemplate:
      "40px 40px 60px 80px 80px 100px 200px 150px 80px 100px 120px 120px 50px",
    headers: [
      "",
      "Pos",
      "Orden",
      "Ingreso",
      "Tiempo",
      "Cliente",
      "Trabajo",
      "Nota",
      "Material",
      "Arch.",
      "Unid.",
      "Estado",
      "Máquina",
      "Chat",
    ],
    printers: ["TPU-UV-01"],
  },

  DTF_STAMP: {
    name: "Estampado post DTF",
    gridTemplate:
      "40px 40px 60px 80px 80px 100px 220px 150px 80px 100px 120px 50px",
    headers: [
      "",
      "Pos",
      "Orden",
      "Ingreso",
      "Tiempo",
      "Cliente",
      "Trabajo",
      "Nota",
      "Placa",
      "Unid.",
      "Estado",
      "Máquina",
      "Chat",
    ],
    printers: ["Stamp-Press-01"],
  },

  UV_FINISH: {
    name: "Terminación UV",
    gridTemplate:
      "40px 40px 60px 80px 80px 100px 220px 150px 80px 100px 120px 50px",
    headers: [
      "",
      "Pos",
      "Orden",
      "Ingreso",
      "Tiempo",
      "Cliente",
      "Trabajo",
      "Nota",
      "Barniz",
      "Unid.",
      "Estado",
      "Máquina",
      "Chat",
    ],
    printers: ["UV-Finish-01"],
  },

  LASER: {
    name: "Corte Láser",
    gridTemplate:
      "40px 40px 60px 80px 100px 200px 150px 100px 80px 100px 120px 50px",
    headers: [
      "",
      "Pos",
      "Orden",
      "Ingreso",
      "Tiempo",
      "Cliente",
      "Trabajo",
      "Nota",
      "Material",
      "Unid.",
      "Estado",
      "Corte",
      "Chat",
    ],
    printers: ["Laser-CO2-01", "Laser-Fiber-02"],
  },

  SEWING: {
    name: "Costura",
    gridTemplate:
      "40px 40px 60px 80px 120px 200px 150px 100px 80px 100px 120px 50px",
    headers: [
      "",
      "Pos",
      "Orden",
      "Ingreso",
      "Cliente",
      "Trabajo",
      "Nota",
      "Técnica",
      "Unid.",
      "Estado",
      "Máquina",
      "Chat",
    ],
    printers: ["Singer-01", "Juki-02"],
  },

  LOG: {
    name: "Logística",
    gridTemplate:
      "40px 40px 100px 200px 150px 100px 100px 120px 50px",
    headers: [
      "",
      "Pos",
      "Movimiento",
      "Descripción",
      "Origen/Destino",
      "Usuario",
      "Estado",
      "Fecha",
      "Chat",
    ],
    printers: [],
  },

  WAREHOUSE: {
    name: "Depósito",
    gridTemplate:
      "40px 40px 100px 200px 150px 100px 100px 50px",
    headers: [
      "",
      "Pos",
      "Código",
      "Descripción",
      "Stock",
      "Ubicación",
      "Estado",
      "Chat",
    ],
    printers: [],
  },

  COORD: {
    name: "Coordinación",
    gridTemplate:
      "40px 40px 60px 200px 200px 100px 120px 50px",
    headers: [
      "",
      "Pos",
      "Orden",
      "Cliente",
      "Trabajo",
      "Estado",
      "Progreso",
      "Chat",
    ],
    printers: [],
  },
};

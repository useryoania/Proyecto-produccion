const fs = require('fs');
const file = 'c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\controllers\\logisticsController.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix LTRIM(RTRIM)
content = content.replace(
  "CAST(NoDocERP AS VARCHAR) FROM Ordenes WITH(NOLOCK) WHERE OrdenID = @OID",
  "LTRIM(RTRIM(CAST(NoDocERP AS VARCHAR))) FROM Ordenes WITH(NOLOCK) WHERE OrdenID = @OID"
);

// 2. Add RECIBIDO_PARCIAL
content = content.replace(
  /IN \('ESPERANDO_RETIRO', 'EN_TRANSITO', 'EN_TRANSITO_PARCIAL', 'DESPACHADO'\)/g,
  "IN ('ESPERANDO_RETIRO', 'EN_TRANSITO', 'EN_TRANSITO_PARCIAL', 'DESPACHADO', 'RECIBIDO_PARCIAL')"
);

fs.writeFileSync(file, content);
console.log("Fixed!");

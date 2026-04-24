const fs = require('fs');
const f = 'C:/Integracion/User-Macrosoft/Proyecto-produccion/backend/controllers/logisticsController.js';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(/console\.log\(\[CONTABILIDAD-WMS\] Orden : Encontrado PedidoCobranza =, pcReq\.recordset\.length > 0\);/g, "console.log(`[CONTABILIDAD-WMS] Orden ${L_OrdenID}: Encontrado PedidoCobranza =`, pcReq.recordset.length > 0);");

c = c.replace(/console\.log\(\[CONTABILIDAD-WMS\] Orden : Reversa=, Adelante=, totalMetros=, currentMonto=, mContado=, metContado=\);/g, "console.log(`[CONTABILIDAD-WMS] Orden ${L_OrdenID}: Reversa=${triggerReversal}, Adelante=${triggerForward}, totalMetros=${totalMetros}, currentMonto=${currentMonto}, mContado=${mContado}, metContado=${metContado}`);");

fs.writeFileSync(f, c, 'utf8');
console.log('Syntax Fixed');

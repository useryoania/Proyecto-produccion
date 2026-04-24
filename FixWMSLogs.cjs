const fs = require('fs');
const file = 'C:/Integracion/User-Macrosoft/Proyecto-produccion/backend/controllers/logisticsController.js';
let content = fs.readFileSync(file, 'utf8');

const regexToReplace = /\/\/ 1\. Conseguir la orden([\s\S]*?)(if \(triggerReversal \|\| triggerForward\) \{)/g;

const replacement = `// 1. Conseguir la orden
                        const reqOrd = await poolLocal.request().input('BID', require('mssql').Int, item.bultoId)
                            .query("SELECT OrdenID, CodigoEtiqueta FROM Logistica_Bultos WHERE BultoID = @BID");
                        
                        if (reqOrd.recordset.length === 0 || !reqOrd.recordset[0].OrdenID) continue;
                        const L_OrdenID = reqOrd.recordset[0].OrdenID;
                        
                        const oData = await poolLocal.request().input('OID', require('mssql').Int, L_OrdenID).query("SELECT Cliente, CodCliente, CliIdCliente, CodigoOrden, DescripcionTrabajo FROM Ordenes WHERE OrdenID = @OID");
                        if (oData.recordset.length === 0) continue;
                        const oRow = oData.recordset[0];
                        const logPrefix = \`[CONTABILIDAD-WMS] [\${oRow.CodigoOrden}] \${oRow.DescripcionTrabajo.substring(0,30)}\`;

                        // 2. Buscar en PedidosCobranza
                        const pcReq = await poolLocal.request().input('OID', require('mssql').Int, L_OrdenID)
                            .query("SELECT ID, MontoTotal, NoDocERP, MontoContabilizado, MetrosContabilizados FROM PedidosCobranza WHERE NoDocERP = (SELECT TOP 1 CAST(NoDocERP AS VARCHAR) FROM Ordenes WHERE OrdenID = @OID)");

                        console.log(\`\${logPrefix} -> Encontrado PedidoCobranza =\`, pcReq.recordset.length > 0);
if (pcReq.recordset.length > 0) {
                            const pc = pcReq.recordset[0];
                            const currentMonto = parseFloat(pc.MontoTotal) || 0;
                            const mContado = parseFloat(pc.MontoContabilizado) || 0;
                            const metContado = parseFloat(pc.MetrosContabilizados) || 0;

                            const detReq = await poolLocal.request().input('PID', require('mssql').Int, pc.ID)
                                .query("SELECT SUM(CASE WHEN Cantidad IS NULL THEN 0 ELSE Cantidad END) as Metros FROM PedidosCobranzaDetalle WHERE PedidoCobranzaID = @PID");
                            const totalMetros = detReq.recordset.length > 0 ? (parseFloat(detReq.recordset[0].Metros) || 0) : 0;

                            let triggerReversal = false;
                            let triggerForward = false;

                            if (mContado === 0) {
                                // Nuevo
                                if (currentMonto > 0) triggerForward = true;
                            } else {
                                if (mContado !== currentMonto || metContado !== totalMetros) {
                                    triggerReversal = true;
                                    triggerForward = true;
                                }
                            }

                            console.log(\`\${logPrefix} -> Reversa=\${triggerReversal}, Adelante=\${triggerForward}, totalMetros=\${totalMetros}, currentMonto=\${currentMonto}, mContado=\${mContado}, metContado=\${metContado}\`);
$2`;

content = content.replace(regexToReplace, replacement);


const regexToReplace2 = /console\.log\(`\[CONTABILIDAD-WMS\] Reversando orden \$\{L_OrdenID\}/g;
content = content.replace(regexToReplace2, 'console.log(`${logPrefix} -> Reversando orden por diferencia`); //');

const regexToReplace3 = /console\.log\(`\[CONTABILIDAD-WMS\] Generando nuevo cargo orden \$\{L_OrdenID\}/g;
content = content.replace(regexToReplace3, 'console.log(`${logPrefix} -> Generando nuevo cargo`); //');

const regexToReplace4 = /const oData = await poolLocal\.request\(\)\.input\('OID', require\('mssql'\)\.Int, L_OrdenID\)\.query\("SELECT Cliente, CodCliente, CliIdCliente, CodigoOrden, DescripcionTrabajo FROM Ordenes WHERE OrdenID = @OID"\);\s*if \(oData\.recordset\.length > 0\) \{\s*const oRow = oData\.recordset\[0\];/g;
content = content.replace(regexToReplace4, '// oData is fetched above');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed WMS logs');

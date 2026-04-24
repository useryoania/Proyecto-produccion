const fs = require('fs');
const path = require('path');

const targetFile = 'C:/Integracion/User-Macrosoft/Proyecto-produccion/backend/controllers/logisticsController.js';

let content = fs.readFileSync(targetFile, 'utf8');

// 1. Añadir el contabilidadService al principio si no existe
if (!content.includes('contabilidadService')) {
    content = "const contabilidadService = require('../services/contabilidadService');\n" + content;
}

// 2. Inyectar en receiveDispatch la logica contable despues del transaction.commit()
const injectionMarker = 'await transaction.commit();\n            res.json({ success: true, status: newStatus });';

// Como el res.json era variable (ej. `res.json({ success: true, processed: receivedCount });` en algunos lados)
// Busquemos el inicio del bloque catch de receiveDispatch.
const splitPoints = content.split('exports.receiveDispatch = async (req, res) => {');
if (splitPoints.length < 2) {
    console.error("No se encontró receiveDispatch");
    process.exit(1);
}

let fnBody = splitPoints[1];
const targetCatchIdx = fnBody.indexOf('catch (inner) {');

if (targetCatchIdx === -1) {
    console.error("No se encontró catch(inner)");
    process.exit(1);
}

// Vamos a buscar el `await transaction.commit();` justo antes del catch (inner) {
const textBeforeCatch = fnBody.substring(0, targetCatchIdx);
const commitIdx = textBeforeCatch.lastIndexOf('await transaction.commit();');

if (commitIdx === -1) {
     console.error("No se encontró await transaction.commit");
     process.exit(1);
}

// Inyección literal
const injectionCode = `
            // ==========================================
            // LOGICA CONTABLE WMS (PUNTO DE CHECKING)
            // ==========================================
            if (areaReceptora === 'DEPOSITO') {
                try {
                    const poolLocal = await getPool(); // Fuera de la transaccion WMS
                    for (const item of itemsRecibidos) {
                        if (item.estado !== 'ESCANEADO') continue;

                        // 1. Conseguir la orden
                        const reqOrd = await poolLocal.request().input('BID', require('mssql').Int, item.bultoId)
                            .query("SELECT OrdenID, CodigoEtiqueta FROM Logistica_Bultos WHERE BultoID = @BID");
                        
                        if (reqOrd.recordset.length === 0 || !reqOrd.recordset[0].OrdenID) continue;
                        const L_OrdenID = reqOrd.recordset[0].OrdenID;
                        
                        // 2. Buscar en PedidosCobranza
                        const pcReq = await poolLocal.request().input('OID', require('mssql').Int, L_OrdenID)
                            .query("SELECT ID, MontoTotal, NoDocERP, MontoContabilizado, MetrosContabilizados FROM PedidosCobranza WHERE OrdenID = @OID OR NoDocERP = (SELECT TOP 1 CAST(NoDocERP AS VARCHAR) FROM Ordenes WHERE OrdenID = @OID)");

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

                            if (triggerReversal || triggerForward) {
                                const oData = await poolLocal.request().input('OID', require('mssql').Int, L_OrdenID).query("SELECT Cliente, CodCliente, CliIdCliente, CodigoOrden, DescripcionTrabajo FROM Ordenes WHERE OrdenID = @OID");
                                if (oData.recordset.length > 0) {
                                    const oRow = oData.recordset[0];
                                    const finalMonId = 1; 

                                    // Para la REVERSA vamos a simular el mismo cargo pero NEGATIVO
                                    if (triggerReversal && mContado !== 0) {
                                        console.log(\`[CONTABILIDAD-WMS] Reversando orden \${L_OrdenID} por diferencia en Checking.\`);
                                        await contabilidadService.procesarEventoContable('ENTREGA', {
                                            OrdIdOrden: L_OrdenID,
                                            CliIdCliente: oRow.CliIdCliente || oRow.CodCliente,
                                            Cantidad: -metContado,
                                            Importe: -mContado,
                                            CodigoOrden: oRow.CodigoOrden,
                                            NombreTrabajo: \`[REVERSA AUT.] \${oRow.DescripcionTrabajo}\`,
                                            UsuarioAlta: usuarioId || 1,
                                            MonIdMoneda: finalMonId
                                        });
                                    }

                                    // Adicion Nueva
                                    if (triggerForward && currentMonto !== 0) {
                                        console.log(\`[CONTABILIDAD-WMS] Generando nuevo cargo orden \${L_OrdenID} por \${currentMonto}\`);
                                        const details = await poolLocal.request().input('PID', require('mssql').Int, pc.ID).query("SELECT Cantidad, TotalLinea, IDProdReact FROM PedidosCobranzaDetalle WHERE PedidoCobranzaID = @PID");
                                        
                                        for (const d of details.recordset) {
                                            const lineImp = parseFloat(d.TotalLinea) || 0;
                                            const lineQty = parseFloat(d.Cantidad) || 0;
                                            
                                            // TODO: Detectar si el cliente tiene plan, aqui lo hacemos fijo por ENTREGA que soporta el motor unificado de deuda para ambos flujos
                                            if (lineImp > 0) {
                                                await contabilidadService.procesarEventoContable('ENTREGA', {
                                                    OrdIdOrden: L_OrdenID,
                                                    CliIdCliente: oRow.CliIdCliente || oRow.CodCliente,
                                                    ProIdProducto: d.IDProdReact || null,
                                                    Cantidad: lineQty,
                                                    CodigoOrden: oRow.CodigoOrden,
                                                    NombreTrabajo: oRow.DescripcionTrabajo,
                                                    UsuarioAlta: usuarioId || 1,
                                                    Importe: lineImp,
                                                    MonIdMoneda: finalMonId
                                                });
                                            }
                                        }

                                        // Update PedidosCobranza Marca
                                        await poolLocal.request()
                                            .input('M', require('mssql').Decimal(18,2), currentMonto)
                                            .input('Met', require('mssql').Decimal(18,2), totalMetros)
                                            .input('PID', require('mssql').Int, pc.ID)
                                            .query("UPDATE PedidosCobranza SET MontoContabilizado = @M, MetrosContabilizados = @Met WHERE ID = @PID");
                                    }
                                }
                            }
                        }
                    }
                } catch (eCont) {
                    console.error("[CONTABILIDAD-WMS] Error al procesar evento en DEPOSITO:", eCont);
                }
            }
`;

const resLineContent = textBeforeCatch.substring(commitIdx + 28); 
// 28 = length of "await transaction.commit();\n" aprox

const newTextBeforeCatch = textBeforeCatch.substring(0, commitIdx + 27) + injectionCode + textBeforeCatch.substring(commitIdx + 27);

const finalFileContent = splitPoints[0] + 'exports.receiveDispatch = async (req, res) => {' + newTextBeforeCatch + '        catch (inner) {' + fnBody.substring(targetCatchIdx + 15);

fs.writeFileSync(targetFile, finalFileContent, 'utf8');

console.log("Inyección exitosa en receiveDispatch!");

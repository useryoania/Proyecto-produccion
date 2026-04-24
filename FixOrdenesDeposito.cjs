const fs = require('fs');
const file = 'C:/Integracion/User-Macrosoft/Proyecto-produccion/backend/controllers/logisticsController.js';
let content = fs.readFileSync(file, 'utf8');

const regexToReplace = /const details = await poolLocal\.request\(\)\.input\('PID', require\('mssql'\)\.Int, pc\.ID\)\.query\("SELECT Cantidad, Subtotal as TotalLinea, ProIdProducto as IDProdReact FROM PedidosCobranzaDetalle WHERE PedidoCobranzaID = @PID"\);/g;

const replacement = `const details = await poolLocal.request().input('PID', require('mssql').Int, pc.ID).query("SELECT Cantidad, Subtotal as TotalLinea, ProIdProducto as IDProdReact FROM PedidosCobranzaDetalle WHERE PedidoCobranzaID = @PID");
                                          
                                          // --- EN ESTE PUNTO LA ORDEN YA LLAMÓ AL CHECKIN WMS, INSERTAMOS EN ORDENESDEPOSITO SI FALTA ---
                                          const cliPKForDep = oRow.CliIdCliente || oRow.CodCliente;
                                          const depCheck = await poolLocal.request().input('Cod', require('mssql').VarChar, oRow.CodigoOrden)
                                              .query("SELECT OrdIdOrden FROM OrdenesDeposito WITH(NOLOCK) WHERE OrdCodigoOrden = @Cod");
                                          
                                          if (depCheck.recordset.length === 0 && details.recordset.length > 0) {
                                              const dTop = details.recordset[0];
                                              const lugarReq = await poolLocal.request().input('CID', require('mssql').Int, cliPKForDep).query("SELECT FormaEnvioID FROM Clientes WITH(NOLOCK) WHERE CliIdCliente = @CID");
                                              const lugarRetiro = lugarReq.recordset[0]?.FormaEnvioID ? parseInt(lugarReq.recordset[0].FormaEnvioID) : null;
                                              
                                              const insertResult = await poolLocal.request()
                                                  .input('Cod', require('mssql').VarChar, oRow.CodigoOrden)
                                                  .input('Cant', require('mssql').Float, totalMetros)
                                                  .input('Cli', require('mssql').Int, cliPKForDep)
                                                  .input('Trab', require('mssql').VarChar, oRow.DescripcionTrabajo)
                                                  .input('Prod', require('mssql').Int, dTop.IDProdReact || null)
                                                  .input('Mon', require('mssql').Int, finalMonId)
                                                  .input('Costo', require('mssql').Float, currentMonto)
                                                  .input('Usr', require('mssql').Int, usuarioId || 1)
                                                  .input('Lugar', require('mssql').Int, lugarRetiro)
                                                  .query(\`
                                                      INSERT INTO OrdenesDeposito (
                                                          OrdCodigoOrden, OrdCantidad, CliIdCliente, OrdNombreTrabajo,
                                                          MOrIdModoOrden, ProIdProducto, MonIdMoneda, OrdCostoFinal,
                                                          OrdFechaIngresoOrden, OrdUsuarioAlta, OrdEstadoActual, OrdFechaEstadoActual, LReIdLugarRetiro
                                                      )
                                                      OUTPUT INSERTED.OrdIdOrden
                                                      VALUES (
                                                          @Cod, @Cant, @Cli, @Trab, 1, @Prod, @Mon, @Costo,
                                                          GETDATE(), @Usr, 1, GETDATE(), @Lugar
                                                      )
                                                  \`);
                                              if (insertResult.recordset[0]?.OrdIdOrden) {
                                                  await poolLocal.request()
                                                      .input('OID', require('mssql').Int, insertResult.recordset[0].OrdIdOrden)
                                                      .input('Usr', require('mssql').Int, usuarioId || 1)
                                                      .query("INSERT INTO HistoricoEstadosOrdenes (OrdIdOrden, EOrIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta) VALUES (@OID, 1, GETDATE(), @Usr)");
                                              }
                                              console.log(\`[WMS-INTERNAL] Creado OrdenesDeposito para \${oRow.CodigoOrden}\`);
                                          }
                                          // ------------------------------------------------------------------------------------------------`;

content = content.replace(regexToReplace, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed OrdenesDeposito Checkin');

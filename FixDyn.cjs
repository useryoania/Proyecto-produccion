const fs = require('fs');
const file = 'C:/Integracion/User-Macrosoft/Proyecto-produccion/backend/controllers/logisticsController.js';
let content = fs.readFileSync(file, 'utf8');

const regexToReplace = /\/\/ TODO: Detectar si el cliente tiene plan([\s\S]*?)await contabilidadService\.procesarEventoContable\('ENTREGA', \{[\s\S]*?MonIdMoneda: finalMonId\n[\s\S]*?\}\);/g;

const replacement = `// Detectar dinamicamente si el cliente tiene un plan activo para este producto
                                              let eventoContable = 'ORDEN'; // Por defecto genera deuda
                                              const cliPK = oRow.CliIdCliente || oRow.CodCliente;
                                              if (d.IDProdReact) {
                                                  const planQuery = await poolLocal.request()
                                                      .input('Cli', require('mssql').Int, cliPK)
                                                      .input('Pro', require('mssql').Int, d.IDProdReact)
                                                      .query(\`SELECT TOP 1 PlaIdPlan FROM PlanesMetros WITH(NOLOCK) WHERE CliIdCliente = @Cli AND ProIdProducto = @Pro AND PlaActivo = 1 AND (PlaFechaVencimiento IS NULL OR PlaFechaVencimiento >= CAST(GETDATE() AS DATE))\`);
                                                  if (planQuery.recordset.length > 0) {
                                                      eventoContable = 'ENTREGA'; // Consume del prepago
                                                  }
                                              }

                                              if (lineImp > 0) {
                                                  await contabilidadService.procesarEventoContable(eventoContable, {
                                                      OrdIdOrden: L_OrdenID,
                                                      CliIdCliente: cliPK,
                                                      ProIdProducto: d.IDProdReact || null,
                                                      Cantidad: lineQty,
                                                      CodigoOrden: oRow.CodigoOrden,
                                                      NombreTrabajo: oRow.DescripcionTrabajo,
                                                      UsuarioAlta: usuarioId || 1,
                                                      Importe: lineImp,
                                                      MonIdMoneda: finalMonId
                                                  });`;

content = content.replace(regexToReplace, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Dynamic Event');

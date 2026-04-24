const fs = require('fs');
const file = 'C:/Integracion/User-Macrosoft/Proyecto-produccion/backend/controllers/logisticsController.js';
let content = fs.readFileSync(file, 'utf8');

const regexToReplaceRev = /await contabilidadService\.procesarEventoContable\('ENTREGA', \{\s*OrdIdOrden: L_OrdenID,\s*CliIdCliente: oRow\.CliIdCliente \|\| oRow\.CodCliente,\s*Cantidad: -metContado,\s*Importe: -mContado,\s*CodigoOrden: oRow\.CodigoOrden,\s*NombreTrabajo: `\[REVERSA AUT\.\] \$\{oRow\.DescripcionTrabajo\}`,\s*UsuarioAlta: usuarioId \|\| 1,\s*MonIdMoneda: finalMonId\s*\}\);/g;

const replacementRev = `const cliPKRev = oRow.CliIdCliente || oRow.CodCliente;
                                          let revEvento = 'ORDEN';
                                          const prevPl = await poolLocal.request().input('Cli', require('mssql').Int, cliPKRev).query("SELECT TOP 1 PlaIdPlan FROM PlanesMetros WITH(NOLOCK) WHERE CliIdCliente = @Cli");
                                          if(prevPl.recordset.length > 0) revEvento = 'ENTREGA';

                                          await contabilidadService.procesarEventoContable(revEvento, {
                                              OrdIdOrden: L_OrdenID,
                                              CliIdCliente: cliPKRev,
                                              Cantidad: -metContado,
                                              Importe: -mContado,
                                              CodigoOrden: oRow.CodigoOrden,
                                              NombreTrabajo: \`[REVERSA AUT.] \${oRow.DescripcionTrabajo}\`,
                                              UsuarioAlta: usuarioId || 1,
                                              MonIdMoneda: finalMonId
                                          });`;

content = content.replace(regexToReplaceRev, replacementRev);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Reversal Event');

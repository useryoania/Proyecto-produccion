const contabilidadService = require('./services/contabilidadService');
const { getPool } = require('./config/db');

async function run() {
  try {
    const pool = await getPool();
    // Simulate the exact call
    await contabilidadService.procesarEventoContable('ENTREGA', {
        OrdIdOrden: 17981, // DF-101083
        CliIdCliente: 2394, // 1564
        ProIdProducto: 47,
        Cantidad: 0.19,
        Importe: 0,
        CodigoOrden: 'DF-101083',
        NombreTrabajo: 'romina272 pedido 1',
        UsuarioAlta: 1,
        MonIdMoneda: 2
    });
    console.log("Success!");
  } catch (e) {
    console.error("Error in procesarEventoContable:", e);
  }
  process.exit(0);
}
run();

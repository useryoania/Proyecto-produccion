const { getPool, sql } = require('./config/db');

async function run() {
  const pool = await getPool();
  try {
    const transaction = pool.transaction();
    await transaction.begin();

    // Renames
    await transaction.request().query("UPDATE MetodosPagos SET MPaDescripcionMetodo = 'Efectivo' WHERE MPaIdMetodoPago = 1");
    await transaction.request().query("UPDATE MetodosPagos SET MPaDescripcionMetodo = 'Transferencia BROU' WHERE MPaIdMetodoPago = 2");
    await transaction.request().query("UPDATE MetodosPagos SET MPaDescripcionMetodo = 'Tarjeta de Débito' WHERE MPaIdMetodoPago = 3");
    await transaction.request().query("UPDATE MetodosPagos SET MPaDescripcionMetodo = 'Tarjeta de Crédito' WHERE MPaIdMetodoPago = 4");
    
    // Check columns for INSERT
    const r = await transaction.request().query('SELECT TOP 1 * FROM MetodosPagos');
    const cols = Object.keys(r.recordset[0]);
    
    let insertQuery = '';
    if (cols.includes('MPaAfectaCaja')) {
        insertQuery = `
          INSERT INTO MetodosPagos (MPaIdMetodoPago, MPaDescripcionMetodo, MPaAfectaCaja)
          VALUES (10, 'Transferencia Santander', 1), (11, 'Cheques', 1)
        `;
    } else {
        insertQuery = `
          INSERT INTO MetodosPagos (MPaIdMetodoPago, MPaDescripcionMetodo)
          VALUES (10, 'Transferencia Santander'), (11, 'Cheques')
        `;
    }

    await transaction.request().query(insertQuery);

    await transaction.commit();
    console.log("Actualización completada.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}
run();

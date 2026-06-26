const { getPool } = require('./config/db');

async function checkSupFlia() {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT ProIdProducto, Descripcion, SupFlia
        FROM Articulos
        WHERE ProIdProducto IN (41, 460, 461)
    `);
    console.log('Articulos:', result.recordset);
    process.exit(0);
}

checkSupFlia();

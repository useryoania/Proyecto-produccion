const { getPool, sql } = require('./backend/config/db');

async function test() {
    try {
        const pool = await getPool();
        const res = await pool.request().query(`
            SELECT TOP 1 OrdenID, CodigoOrden, AreaID, Estado, EstadoLogistica, ISNULL((SELECT Top 1 Nombre FROM Clientes WHERE ClienteID = Ordenes.ClienteID), '') as Cliente
            FROM Ordenes
        `);
        console.log("SUCCESS:", res.recordset);
    } catch(err) {
        console.error("ERROR:", err.message);
    }
    process.exit();
}

test();

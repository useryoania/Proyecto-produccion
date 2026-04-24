const { getPool, sql } = require('./backend/config/db');

async function check() {
    try {
        const pool = await getPool();
        const r1 = await pool.request().query("SELECT TOP 3 ClienteID, NombreCliente FROM PreciosEspeciales");
        console.table(r1.recordset);
        const r2 = await pool.request().query(`
            SELECT TOP 3 C.CliIdCliente, C.CodCliente, C.IDCliente, C.IDReact, C.Nombre 
            FROM Clientes C
            INNER JOIN PreciosEspeciales PE ON PE.ClienteID = C.IDReact
        `);
        console.log("Joined by IDReact:");
        console.table(r2.recordset);

        const r3 = await pool.request().query(`
            SELECT TOP 3 C.CliIdCliente, C.CodCliente, C.IDCliente, C.IDReact, C.Nombre 
            FROM Clientes C
            INNER JOIN PreciosEspeciales PE ON PE.ClienteID = C.CodCliente
        `);
        console.log("Joined by CodCliente:");
        console.table(r3.recordset);

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();

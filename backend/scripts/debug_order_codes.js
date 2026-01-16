const { getPool } = require('./config/db');

async function run() {
    try {
        const pool = await getPool();
        // Buscar órdenes que parezcan tener el formato "X (Y/Z)"
        const res = await pool.request().query("SELECT TOP 5 OrdenID, NoDocERP, CodigoOrden, AreaID, Estado FROM Ordenes WHERE NoDocERP LIKE '%(%)%' OR CodigoOrden LIKE '%(%)%'");

        console.log("Orders with parenthesis:");
        console.table(res.recordset);

        // Buscar si hay órdenes relacionadas por un "prefijo" común
        // Tomamos el primer NoDocERP y buscamos parecidos
        if (res.recordset.length > 0) {
            const sample = res.recordset[0];
            const val = sample.NoDocERP || sample.CodigoOrden;
            if (val) {
                const base = val.split('(')[0].trim();
                console.log(`\nSearching for matches with base '${base}':`);
                const matches = await pool.request().query(`SELECT OrdenID, NoDocERP, CodigoOrden, AreaID, Estado FROM Ordenes WHERE NoDocERP LIKE '${base}%' OR CodigoOrden LIKE '${base}%'`);
                console.table(matches.recordset);
            }
        }

    } catch (err) {
        console.error(err);
    }
}

run();

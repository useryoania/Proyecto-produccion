const { getPool, sql } = require('./config/db');

async function run() {
    try {
        const pool = await getPool();
        const ref = '25 (1/1)'; // The problematic value

        console.log("Testing with Ref:", ref);

        const ordenesQuery = `
            SELECT OrdenID, Avance 
            FROM Ordenes 
            WHERE 
                (NoDocERP IS NOT NULL AND NoDocERP = @Ref)
                OR (CodigoOrden IS NOT NULL AND CodigoOrden = @Ref)
                OR (CAST(OrdenID AS VARCHAR) = @Ref)
            AND Estado != 'CANCELADO'
        `;

        const ordenesRes = await pool.request()
            .input('Ref', sql.NVarChar, ref)
            .query(ordenesQuery);

        console.log("Orders found:", ordenesRes.recordset.length);
        console.log(ordenesRes.recordset);

    } catch (err) {
        console.error("SQL Error:", err);
    }
}

run();

const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function analyze() {
    try {
        let pool = await sql.connect(config);
        console.log('--- ANALYSIS ORDER 166 ---');

        // 1. Get Main Orders
        const ordRes = await pool.request()
            .input('Pattern', sql.VarChar, '%166%')
            .query("SELECT OrdenID, CodigoOrden, CodArticulo, Material, Magnitud, Cliente, Prioridad, NoDocERP FROM Ordenes WHERE CodigoOrden LIKE @Pattern");

        console.log('MAIN ORDERS FOUND:', JSON.stringify(ordRes.recordset, null, 2));

        if (ordRes.recordset.length > 0) {
            const firstOrd = ordRes.recordset[0];
            const ordenId = firstOrd.OrdenID;

            // 2. Get Services
            const srvRes = await pool.request()
                .input('OID', sql.Int, ordenId)
                .query("SELECT * FROM ServiciosExtraOrden WHERE OrdenID = @OID");
            console.log('SERVICES FOR ORD ' + ordenId + ':', JSON.stringify(srvRes.recordset, null, 2));

            // 3. Get Article details for the main article
            const artRes = await pool.request()
                .input('Cod', sql.VarChar, firstOrd.CodArticulo)
                .query("SELECT * FROM Articulos WHERE CodArticulo = @Cod");
            console.log('ARTICLE INFO:', JSON.stringify(artRes.recordset, null, 2));

            // 4. Get Price Base
            const priceRes = await pool.request()
                .input('Cod', sql.VarChar, firstOrd.CodArticulo)
                .query("SELECT * FROM PreciosBase WHERE CodArticulo = @Cod");
            console.log('PRICE BASE:', JSON.stringify(priceRes.recordset, null, 2));
        }

        await sql.close();
    } catch (err) {
        console.error('Analysis error:', err);
    }
}

analyze();

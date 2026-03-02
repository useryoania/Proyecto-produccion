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
        console.log('--- DETAILED ANALYSIS FOR NODOCERP 166 ---');

        const ordRes = await pool.request()
            .input('Doc', sql.VarChar, '166')
            .query("SELECT OrdenID, CodigoOrden, CodArticulo, Material, Magnitud, Cliente, Prioridad FROM Ordenes WHERE NoDocERP = @Doc OR CodigoOrden LIKE 'ORD-166%'");

        for (let ord of ordRes.recordset) {
            console.log(`ORDEN: ${ord.CodigoOrden} | ID: ${ord.OrdenID} | ART: ${ord.CodArticulo} | MAG: ${ord.Magnitud} | CLI: ${ord.Cliente}`);

            const srvRes = await pool.request()
                .input('OID', sql.Int, ord.OrdenID)
                .query("SELECT * FROM ServiciosExtraOrden WHERE OrdenID = @OID");
            if (srvRes.recordset.length > 0) {
                console.log(`  -> SERVICIOS:`, srvRes.recordset.map(s => s.Descripcion + ' (CodArt:' + s.CodArt + ')').join(', '));
            }
        }

        const artRes = await pool.request()
            .input('Cod', sql.VarChar, '12')
            .query("SELECT * FROM Articulos WHERE CodArticulo = '12'");
        console.log('ART 12 INFO:', artRes.recordset[0]);

        const priceRes = await pool.request()
            .input('Cod', sql.VarChar, '12')
            .query("SELECT * FROM PreciosBase WHERE CodArticulo = '12'");
        console.log('ART 12 PRICE:', priceRes.recordset[0]);

        await sql.close();
    } catch (err) {
        console.error('Analysis error:', err);
    }
}

analyze();

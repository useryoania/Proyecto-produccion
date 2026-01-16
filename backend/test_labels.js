require('dotenv').config();
const { getPool, sql } = require('./config/db');

async function testLabels() {
    try {
        const pool = await getPool();

        // 1. Find an order with labels
        const res1 = await pool.request().query("SELECT TOP 1 OrdenID FROM Etiquetas");
        if (res1.recordset.length === 0) {
            console.log("No labels found in DB using Etiquetas table.");
            return;
        }
        const testOrderId = res1.recordset[0].OrdenID;
        console.log("Testing with OrderID:", testOrderId);

        // 2. Simulate Controller Logic
        const safeIds = [testOrderId];
        const query = `
            SELECT 
                E.EtiquetaID, E.CodigoEtiqueta, E.OrdenID, 
                O.CodigoOrden, O.Cliente, O.Material, O.DescripcionTrabajo,
                (SELECT COUNT(*) FROM Etiquetas E2 WHERE E2.OrdenID = O.OrdenID) as TotalBultos,
                ROW_NUMBER() OVER(PARTITION BY E.OrdenID ORDER BY E.EtiquetaID) as BultoIndex
            FROM Etiquetas E
            INNER JOIN Ordenes O ON E.OrdenID = O.OrdenID
            WHERE E.OrdenID IN (${safeIds.join(',')})
            ORDER BY O.OrdenID, E.EtiquetaID
        `;

        const res2 = await pool.request().query(query);
        console.log("Labels Result Count:", res2.recordset.length);
        console.log("First Label:", res2.recordset[0]);

    } catch (e) {
        console.error("Test failed:", e);
    }
}
testLabels();

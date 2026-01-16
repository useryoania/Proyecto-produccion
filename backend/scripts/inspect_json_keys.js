
const { sql, getPool } = require('../config/db');

async function checkOrdenesOutput() {
    try {
        const pool = await getPool();
        console.log("Checking keys returned by getOrdenes...");

        // Usamos la MISMA query que el controlador
        const query = `
            SELECT 
                O.OrdenID, 
                O.CodigoOrden, 
                O.Cliente AS Cliente, 
                O.Material, 
                O.Estado, 
                O.Prioridad,
                O.DescripcionTrabajo AS Descripcion,
                (SELECT COUNT(*) FROM Etiquetas E WHERE E.OrdenID = O.OrdenID) as CantidadEtiquetas,
                (SELECT COUNT(*) FROM ArchivosOrden AO WHERE AO.OrdenID = O.OrdenID AND AO.EstadoArchivo IN ('FALLA', 'Falla')) as CantidadFallas
            FROM Ordenes O
        `;

        const result = await pool.request().query(query);

        if (result.recordset.length > 0) {
            console.log("First record keys:", Object.keys(result.recordset[0]));
            console.log("First record sample:", result.recordset[0]);
        } else {
            console.log("No orders found.");
        }

    } catch (err) {
        console.error("Query Failed:", err.message);
    }
}

checkOrdenesOutput();

const { getPool } = require('./config/db');

async function cleanPending() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT OrdenID, CodigoOrden, Estado, FechaIngreso FROM Ordenes WHERE Estado = 'Cargando...'");
        console.log("Pedidos cargando:", result.recordset);

        if (result.recordset.length > 0) {
            console.log("Limpiando pedidos en estado 'Cargando...'... (SIMULACIÓN)");
            // Opcional: Borrar de verdad
            // const del = await pool.request().query("DELETE FROM Ordenes WHERE Estado = 'Cargando...'");
            // console.log(`Eliminados ${del.rowsAffected[0]} pedidos.`);
            console.log(`Se eliminarían ${result.recordset.length} pedidos.`);
        } else {
            console.log("No hay pedidos pendientes de limpieza.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

cleanPending();

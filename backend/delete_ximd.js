const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query("SELECT OrdenID FROM Ordenes WHERE NoDocERP = 'XIMD-73'");
        if(res.recordset.length > 0) {
            for (const row of res.recordset) {
                const oid = row.OrdenID;
                await pool.request().query(`
                    DELETE FROM ArchivosOrden WHERE OrdenID = ${oid};
                    DELETE FROM ArchivosReferencia WHERE OrdenID = ${oid};
                    DELETE FROM ServiciosExtraOrden WHERE OrdenID = ${oid};
                    DELETE FROM PedidosCobranzaDetalle WHERE OrdenID = ${oid};
                    DELETE FROM Ordenes WHERE OrdenID = ${oid};
                `);
                console.log('✅ Borrada exitosamente la orden XIMD-73 (OrdenID: ' + oid + ')');
            }
        } else {
            console.log('No se encontro la orden XIMD-73.');
        }
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
});

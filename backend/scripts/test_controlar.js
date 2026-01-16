require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');
const sql = require('mssql');

async function testControl() {
    const archivoId = 6; // Usar el ID obtenido
    const estado = 'FALLA';
    const motivo = 'Test Falla Script';
    const tipoFalla = 'Mancha de Tinta';
    const usuario = 'TestUser';

    let transaction;
    try {
        console.log("Iniciando Test Control...");
        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. Obtener Datos
        const pRequest = new sql.Request(transaction);
        const fileData = await pRequest
            .input('ArchivoID', sql.Int, archivoId)
            .query(`
                SELECT AO.OrdenID, O.AreaID 
                FROM ArchivosOrden AO
                JOIN Ordenes O ON AO.OrdenID = O.OrdenID
                WHERE AO.ArchivoID = @ArchivoID
            `);

        const ordenId = fileData.recordset[0]?.OrdenID;
        let areaId = fileData.recordset[0]?.AreaID;

        console.log(`OrdenID: ${ordenId}, AreaID: ${areaId}`);

        if (!ordenId) throw new Error("Archivo no encontrado");

        // Sanitize
        if (!areaId) areaId = 'General';
        if (areaId.length > 20) areaId = areaId.substring(0, 20);

        // 2. Insertar Falla
        const fRequest = new sql.Request(transaction);
        await fRequest
            .input('OrdenID', sql.Int, ordenId)
            .input('ArchivoID', sql.Int, archivoId)
            .input('AreaID', sql.VarChar, areaId) // VarChar
            .input('EquipoID', sql.Int, null)
            .input('TipoFalla', sql.VarChar, (tipoFalla || 'General').substring(0, 100))
            .input('Observaciones', sql.NVarChar, motivo)
            .query(`
                INSERT INTO FallasProduccion (OrdenID, ArchivoID, AreaID, EquipoID, FechaFalla, TipoFalla, Observaciones)
                VALUES (@OrdenID, @ArchivoID, @AreaID, @EquipoID, GETDATE(), @TipoFalla, @Observaciones);
                
                UPDATE Ordenes SET falla = 1 WHERE OrdenID = @OrdenID;
            `);

        console.log("Insertado en FallasProduccion y Orden Actualizada");

        // Rollback siempre para no ensuciar DB de verdad
        await transaction.rollback();
        console.log("Rollback exitoso (Test OK)");

    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch (e) { }
        }
        console.error("ERROR EN TEST:", err);
    }
}

testControl();

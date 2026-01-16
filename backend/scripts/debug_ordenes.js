
const { sql, getPool } = require('../config/db');

async function testOrdenesQuery() {
    try {
        const pool = await getPool();
        console.log("Testing getOrdenes Query...");

        // Parámetros de prueba que fallaron
        const search = null;
        const roll = '';
        const area = 'DTF';

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
            WHERE 
                (@RolloID = '' OR CAST(O.RolloID AS NVARCHAR(50)) = @RolloID OR @RolloID IS NULL)
                AND (@Area = '' OR O.AreaID = @Area)
                AND (LTRIM(RTRIM(O.Estado)) != 'PRONTO SECTOR') 
                AND (
                    @Search IS NULL 
                    OR O.NoDocERP LIKE @Search 
                    OR O.Cliente LIKE @Search 
                    OR O.Material LIKE @Search
                    OR O.CodigoOrden LIKE @Search
                    OR EXISTS (SELECT 1 FROM ArchivosOrden AO WHERE AO.OrdenID = O.OrdenID AND AO.NombreArchivo LIKE @Search)
                )
            ORDER BY 
                CASE WHEN O.Prioridad = 'ALTA' THEN 1 ELSE 2 END ASC,
                O.OrdenID DESC
        `;

        await pool.request()
            .input('Search', sql.NVarChar, search)
            .input('RolloID', sql.NVarChar, roll)
            .input('Area', sql.NVarChar, area)
            .query(query);

        console.log("Query OK!");

    } catch (err) {
        console.error("Query Failed:", err.message);
        if (err.originalError) console.error("SQL Error:", err.originalError.info.message);
    }
}


async function testRollosQuery() {
    try {
        const pool = await getPool();
        console.log("Testing testRollosQuery...");

        const query = `
                SELECT 
                    RolloID as id, 
                    Nombre as nombre, 
                    ColorHex as color,
                    MetrosTotales,
                    0 as MetrosUsados,
                    Estado,
                    MaquinaID
                FROM Rollos 
                WHERE Estado != 'CERRADO' 
        `;

        await pool.request().query(query);
        console.log("Rollos Query OK!");

    } catch (err) {
        console.error("Rollos Query Failed:", err.message);
    }
}

// Ejecutar ambas
(async () => {
    await testOrdenesQuery();
    await testRollosQuery();
})();


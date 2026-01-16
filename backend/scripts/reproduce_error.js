const sql = require('mssql');
require('dotenv').config({ path: 'c:\\Integracion\\User-Macrosoft\\backend\\.env' });
const { getPool } = require('c:\\Integracion\\User-Macrosoft\\backend\\config\\db');

async function testQuery() {
    try {
        const pool = await getPool();
        const search = null;
        const cleanedRolloId = null;
        const areaId = 'DTF';

        const query = `
            SELECT
                O.OrdenID,
                O.NoDocERP AS CodigoPedido,
                O.Cliente AS ClienteNombre,
                O.DescripcionTrabajo,
                R.Nombre AS NombreRollo,
                O.RolloID,
                O.Estado,
                O.Material,
                ISNULL((SELECT COUNT(*) FROM ArchivosOrden WHERE OrdenID = O.OrdenID AND EstadoArchivo = 'OK') * 100 /
                       NULLIF((SELECT COUNT(*) FROM ArchivosOrden WHERE OrdenID = O.OrdenID), 0), 0) as AvanceCalculado
            FROM [dbo].[Ordenes] O
            INNER JOIN [dbo].[Rollos] R ON O.RolloID = R.RolloID
            WHERE
                (@AreaID IS NULL OR O.AreaID = @AreaID)
                AND (@RolloID IS NULL OR @RolloID = '' OR O.RolloID = @RolloID)
                AND (
                    @Search IS NULL 
                    OR O.NoDocERP LIKE '%' + @Search + '%' 
                    OR O.Cliente LIKE '%' + @Search + '%'
                )
                AND O.Estado NOT IN ('ENTREGADO', 'CANCELADO')
            ORDER BY O.FechaIngreso DESC
        `;

        console.log("Testing Query...");
        const result = await pool.request()
            .input('Search', sql.NVarChar, search)
            .input('RolloID', sql.NVarChar, cleanedRolloId)
            .input('AreaID', sql.NVarChar, areaId)
            .query(query);

        console.log("Success! Rows:", result.recordset.length);

    } catch (err) {
        console.error("Query Failed:", err);
    }
}

testQuery();

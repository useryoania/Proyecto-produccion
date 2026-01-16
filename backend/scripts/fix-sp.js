const { getPool } = require('./config/db');

const alterSpScript = `
ALTER PROCEDURE [dbo].[sp_GetOrdenesControl_V2]
    @Search NVARCHAR(100) = NULL,
    @RolloID NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        O.OrdenID,
        O.NoDocERP AS CodigoPedido,
        O.Cliente AS ClienteNombre,
        O.DescripcionTrabajo,
        ISNULL(R.Nombre, 'SIN ROLLO') AS NombreRollo,
        O.Estado,
        O.Material,
        -- Cálculo de avance
        ISNULL((SELECT COUNT(*) FROM ArchivosOrden WHERE OrdenID = O.OrdenID AND EstadoArchivo = 'OK') * 100 / 
        NULLIF((SELECT COUNT(*) FROM ArchivosOrden WHERE OrdenID = O.OrdenID), 0), 0) as Avance
    FROM [dbo].[Ordenes] O
    LEFT JOIN [dbo].[Rollos] R ON O.RolloID = R.RolloID
    WHERE
        -- FILTRO DE ROLLO ACTUALIZADO PARA NVARCHAR
        (@RolloID IS NULL OR @RolloID = '' OR O.RolloID = @RolloID)
        
        -- FILTRO DE BÚSQUEDA (Texto)
        AND (
            @Search IS NULL 
            OR O.NoDocERP LIKE '%' + @Search + '%' 
            OR O.Cliente LIKE '%' + @Search + '%'
        )
        
        -- FILTRO DE ESTADOS
        AND O.Estado NOT IN ('ENTREGADO', 'CANCELADO')
    ORDER BY O.FechaIngreso DESC;
END
`;

async function runFix() {
    try {
        console.log("Aplicando corrección al SP sp_GetOrdenesControl_V2...");
        const pool = await getPool();
        await pool.request().query(alterSpScript);
        console.log("✅ SP actualizado correctamente a NVARCHAR.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error actualizando SP:", err);
        process.exit(1);
    }
}

runFix();

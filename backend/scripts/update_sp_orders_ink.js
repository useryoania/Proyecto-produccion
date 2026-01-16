const { getPool, sql } = require('../config/db');

async function updateSP() {
    try {
        const pool = await getPool();
        console.log("🛠️ Actualizando sp_ObtenerOrdenesArea para incluir Tinta...");

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE sp_ObtenerOrdenesArea
                @Area VARCHAR(20) = NULL,
                @Mode VARCHAR(20) = 'active', 
                @Q NVARCHAR(100) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;

                -- Normalización de estados "Finales"
                DECLARE @EstadosFinales TABLE (Estado VARCHAR(50));
                INSERT INTO @EstadosFinales VALUES ('Entregado'), ('Finalizado'), ('Cancelado');

                SELECT 
                    o.OrdenID, o.CodigoOrden, o.IdCabezalERP, o.Cliente, o.DescripcionTrabajo,
                    o.AreaID, o.Estado, o.EstadoenArea, o.Prioridad, o.FechaIngreso, o.FechaEstimadaEntrega,
                    o.Magnitud, o.Material, o.Variante, o.RolloID, o.Nota, o.Observaciones,
                    o.meta_data, o.ArchivosCount, o.ProximoServicio, o.Tinta, -- << TINTA AGREGADA
                    m.Nombre as NombreMaquina,
                    r.Nombre as NombreRollo,
                    (
                        SELECT ArchivoID, NombreArchivo as nombre, RutaAlmacenamiento as link,
                               TipoArchivo as tipo, Copias as copias, Metros as metros, DetalleLinea
                        FROM dbo.ArchivosOrden 
                        WHERE OrdenID = o.OrdenID 
                        FOR JSON PATH
                    ) as files_data
                FROM dbo.Ordenes o
                LEFT JOIN dbo.ConfigEquipos m ON o.MaquinaID = m.EquipoID
                LEFT JOIN dbo.Rollos r ON o.RolloID = r.RolloID
                WHERE (@Area IS NULL OR o.AreaID = @Area)
                  AND (
                      (@Mode = 'history' AND o.Estado IN (SELECT Estado FROM @EstadosFinales))
                      OR
                      (@Mode != 'history' AND o.Estado NOT IN (SELECT Estado FROM @EstadosFinales))
                  )
                  AND (
                      @Q IS NULL 
                      OR o.Cliente LIKE '%' + @Q + '%' 
                      OR o.CodigoOrden LIKE '%' + @Q + '%' 
                      OR CAST(o.OrdenID AS VARCHAR) LIKE '%' + @Q + '%'
                  )
                ORDER BY o.Prioridad DESC, o.FechaIngreso ASC;
            END
        `);
        console.log("✅ sp_ObtenerOrdenesArea Actualizado.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error actualizando SP:", err);
        process.exit(1);
    }
}

updateSP();

const { getPool, sql } = require('../config/db');

async function setupAutoParcelSP() {
    try {
        const pool = await getPool();
        console.log("🛠️ Creando/Actualizando sp_GenerarBultosAutomaticos...");

        // Este SP generará bultos automáticamente basados en la cantidad de archivos/copias
        // O por defecto 1 si no hay info.
        // Solo genera si NO EXISTEN bultos previos para esa orden.
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE sp_GenerarBultosAutomaticos
                @OrdenID INT,
                @UsuarioID INT
            AS
            BEGIN
                SET NOCOUNT ON;

                -- 1. Verificar si ya existen bultos para esta orden
                IF EXISTS (SELECT 1 FROM Logistica_Bultos WHERE OrdenID = @OrdenID)
                BEGIN
                    -- Si ya existen, NO hacemos nada (o podríamos lanzar error si fuera estricto, pero queremos ser idempotentes)
                    RETURN;
                END

                -- 2. Obtener información de la orden
                DECLARE @CodigoOrden NVARCHAR(50);
                DECLARE @Descripcion NVARCHAR(255);
                DECLARE @Ubicacion NVARCHAR(50) = 'PRODUCCION_TERMINADO';
                
                SELECT @CodigoOrden = CodigoOrden, @Descripcion = ISNULL(DescripcionTrabajo, Material)
                FROM Ordenes WHERE OrdenID = @OrdenID;

                -- 3. Determinar cantidad de bultos a generar
                -- Lógica: 1 bulto por defecto. 
                -- (Futuro: se puede leer de una columna 'CantidadBultos' si existiera)
                DECLARE @Cantidad INT = 1;

                -- 4. Generar Bultos
                DECLARE @i INT = 1;
                WHILE @i <= @Cantidad
                BEGIN
                    DECLARE @CodigoEtiqueta NVARCHAR(50);
                    -- Formato: ORDEN-B1, ORDEN-B2...
                    SET @CodigoEtiqueta = @CodigoOrden + '-B' + CAST(@i AS NVARCHAR);

                    -- Insertar
                    INSERT INTO Logistica_Bultos (
                        CodigoEtiqueta, Tipocontenido, OrdenID, Descripcion, 
                        UbicacionActual, Estado, UsuarioCreador, FechaCreacion
                    )
                    VALUES (
                        @CodigoEtiqueta, 
                        'PROD_TERMINADO', 
                        @OrdenID, 
                        @Descripcion + ' (Auto ' + CAST(@i AS NVARCHAR) + '/' + CAST(@Cantidad AS NVARCHAR) + ')',
                        @Ubicacion, 
                        'CREADO', 
                        @UsuarioID, 
                        GETDATE()
                    );

                    SET @i = @i + 1;
                END
                
                SELECT @Cantidad as BultosGenerados;
            END
        `);
        console.log("✅ sp_GenerarBultosAutomaticos creado exitosamente.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error creando SP:", err);
        process.exit(1);
    }
}

setupAutoParcelSP();

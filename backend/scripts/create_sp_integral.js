const { getPool, sql } = require('../config/db');

async function createSpIntegral() {
    try {
        const pool = await getPool();

        const query = `
        CREATE OR ALTER PROCEDURE sp_ObtenerDetalleIntegralPedido
            @Ref NVARCHAR(50)
        AS
        BEGIN
            SET NOCOUNT ON;

            -- 1. IDENTIFICAR RAIZ
            DECLARE @BaseRef NVARCHAR(50) = @Ref;
            DECLARE @Idx INT = CHARINDEX(' (', @Ref);
            
            IF @Idx > 0 
                SET @BaseRef = LEFT(@Ref, @Idx - 1);
            
            -- Tabla para guardar IDs de Ordenes afectadas
            DECLARE @OrdenesTbl TABLE (OrdenID INT, CodigoOrden NVARCHAR(50), AreaID NVARCHAR(20), Estado NVARCHAR(50));

            -- Intentamos buscar por NoDocERP si existe la columna, si no, solo Codigo
            -- Para evitar errores, omitimos NoDocERP hasta confirmar.
            INSERT INTO @OrdenesTbl (OrdenID, CodigoOrden, AreaID, Estado)
            SELECT OrdenID, CodigoOrden, AreaID, Estado FROM Ordenes
            WHERE CodigoOrden = @BaseRef 
               OR CodigoOrden LIKE @BaseRef + ' (%';
            
            IF NOT EXISTS (SELECT 1 FROM @OrdenesTbl)
            BEGIN
                RETURN; -- Retorna sin result sets
            END

            -- RS 1: HEADER
            -- Tomamos un ejemplo representativo (el primero, o el padre si coincidiera)
            SELECT TOP 1
                @BaseRef as PedidoRef,
                O.Cliente,
                O.DescripcionTrabajo as Descripcion,
                O.FechaIngreso,
                (SELECT COUNT(*) FROM @OrdenesTbl) as TotalOrdenes,
                (SELECT COUNT(*) FROM @OrdenesTbl WHERE Estado IN ('ENTREGADA', 'FINALIZADA', 'TERMINADO')) as Terminadas,
                (SELECT COUNT(*) FROM Logistica_Bultos WHERE OrdenID IN (SELECT OrdenID FROM @OrdenesTbl)) as BultosTotal
            FROM Ordenes O
            WHERE O.OrdenID = (SELECT TOP 1 OrdenID FROM @OrdenesTbl);

            -- RS 2: RUTA (Resumen por Area)
            SELECT 
                AreaID as Area,
                COUNT(*) as Total,
                SUM(CASE WHEN Estado IN ('ENTREGADA', 'FINALIZADA', 'TERMINADO', 'PRONTO SECTOR') THEN 1 ELSE 0 END) as Completados,
                SUM(CASE WHEN Estado NOT IN ('ENTREGADA', 'FINALIZADA', 'TERMINADO', 'PRONTO SECTOR') THEN 1 ELSE 0 END) as Activos
            FROM @OrdenesTbl 
            GROUP BY AreaID;

            -- RS 3: ORDENES (Detalle)
            SELECT 
                O.OrdenID, O.CodigoOrden, O.AreaID, O.Material, O.Estado, O.FechaIngreso, O.Magnitud,
                (SELECT COUNT(*) FROM FallasProduccion WHERE OrdenID = O.OrdenID) as FallasCount
            FROM Ordenes O
            WHERE O.OrdenID IN (SELECT OrdenID FROM @OrdenesTbl)
            ORDER BY O.CodigoOrden;

            -- RS 4: LOGISTICA (Bultos)
            SELECT B.*, O.CodigoOrden 
            FROM Logistica_Bultos B
            JOIN Ordenes O ON B.OrdenID = O.OrdenID
            WHERE B.OrdenID IN (SELECT OrdenID FROM @OrdenesTbl);

            -- RS 5: INCIDENCIAS
            SELECT F.*, O.CodigoOrden, TF.Titulo as TipoFalla
            FROM FallasProduccion F
            JOIN Ordenes O ON F.OrdenID = O.OrdenID
            LEFT JOIN TiposFallas TF ON F.FallaID = TF.FallaID
            WHERE F.OrdenID IN (SELECT OrdenID FROM @OrdenesTbl);

            -- RS 6: HISTORIAL
            SELECT TOP 50 
                H.OrdenID, 
                H.Estado, 
                H.FechaInicio as Fecha, 
                H.Detalle, 
                O.CodigoOrden
            FROM HistorialOrdenes H
            JOIN Ordenes O ON H.OrdenID = O.OrdenID
            WHERE H.OrdenID IN (SELECT OrdenID FROM @OrdenesTbl)
            ORDER BY H.FechaInicio DESC;
        END
        `;

        await pool.request().query(query);
        console.log("✅ SP sp_ObtenerDetalleIntegralPedido creado/actualizado correctamente.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error creando SP:", err);
        process.exit(1);
    }
}

createSpIntegral();

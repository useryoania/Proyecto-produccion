const { getPool, sql } = require('../config/db');

async function updateSP() {
    try {
        const pool = await getPool();
        console.log("Updating sp_PredecirProximoServicio...");

        const query = `
CREATE OR ALTER PROCEDURE [dbo].[sp_PredecirProximoServicio]
    @OrdenID INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AreaOrigen VARCHAR(20);
    DECLARE @NoDocERP VARCHAR(50);
    DECLARE @CodigoOrden VARCHAR(50);
    DECLARE @SiguienteServicio VARCHAR(100) = NULL;

    -- 1. Obtener Datos de la Orden Actual
    SELECT 
        @AreaOrigen = AreaID,
        @NoDocERP = NoDocERP,
        @CodigoOrden = CodigoOrden
    FROM dbo.Ordenes
    WHERE OrdenID = @OrdenID;

    -- 2. Lógica Algorítmica (Configurable)
    -- Busca la ruta de MAYOR PRIORIDAD (Menor int) asignada a este origen (SB, TWC, etc)
    
    SELECT TOP 1 @SiguienteServicio = R.AreaDestino
    FROM dbo.ConfiguracionRutas R
    WHERE R.AreaOrigen = @AreaOrigen
    AND (
        -- A. Ruta Incondicional (Si RequiereExistencia = 0, pasa siempre)
        R.RequiereExistencia = 0
        OR
        -- B. Ruta Condicional (Solo si existe otro servicio hermanada con el mismo NoDocERP)
        (
            R.RequiereExistencia = 1 
            AND EXISTS (
                SELECT 1 
                FROM dbo.Ordenes O
                WHERE 
                  (
                    -- Coincidencia por Documento ERP
                    (O.NoDocERP IS NOT NULL AND O.NoDocERP = @NoDocERP AND O.NoDocERP <> '')
                    OR
                    -- Coincidencia por Raíz de Código (Backup si falta ERP)
                    (
                       LTRIM(RTRIM(LEFT(O.CodigoOrden, CHARINDEX('(', O.CodigoOrden + '(') - 1)))
                       = 
                       LTRIM(RTRIM(LEFT(@CodigoOrden, CHARINDEX('(', @CodigoOrden + '(') - 1)))
                    )
                  )
                  AND O.OrdenID <> @OrdenID
                  AND O.AreaID = R.AreaDestino 
                  AND O.Estado NOT IN ('Cancelado', 'Anulado') -- IMPORTANTE: Ignorar cancelados
            )
        )
    )
    ORDER BY R.Prioridad ASC;

    -- 3. Fallbacks
    IF @SiguienteServicio IS NULL
    BEGIN
        SET @SiguienteServicio = 'Punto Logístico';
    END
    
    -- Normalización
    IF @SiguienteServicio = 'LOGISTICA' SET @SiguienteServicio = 'Punto Logístico';

    -- 4. Actualizar Orden
    UPDATE dbo.Ordenes
    SET ProximoServicio = @SiguienteServicio
    WHERE OrdenID = @OrdenID;

    SELECT @SiguienteServicio AS Prediccion;
END
        `;

        await pool.request().query(query);
        console.log("✅ SP updated successfully.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error updating SP:", err);
        process.exit(1);
    }
}

updateSP();

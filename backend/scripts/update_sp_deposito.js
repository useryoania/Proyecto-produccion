const { getPool, sql } = require('../config/db');

async function updateSP() {
    try {
        const pool = await getPool();
        console.log("Updating sp_PredecirProximoServicio to default to DEPOSITO...");

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
    -- Busca la ruta de MAYOR PRIORIDAD (Menor int) asignada a este origen
    
    SELECT TOP 1 @SiguienteServicio = R.AreaDestino
    FROM dbo.ConfiguracionRutas R
    WHERE R.AreaOrigen = @AreaOrigen
    AND (
        -- A. Ruta Incondicional (RequiereExistencia = 0)
        R.RequiereExistencia = 0
        OR
        -- B. Ruta Condicional (RequiereExistencia = 1)
        (
            R.RequiereExistencia = 1 
            AND EXISTS (
                SELECT 1 
                FROM dbo.Ordenes O
                WHERE 
                  (
                    (O.NoDocERP IS NOT NULL AND O.NoDocERP = @NoDocERP AND O.NoDocERP <> '')
                    OR
                    (
                       LTRIM(RTRIM(LEFT(O.CodigoOrden, CHARINDEX('(', O.CodigoOrden + '(') - 1)))
                       = 
                       LTRIM(RTRIM(LEFT(@CodigoOrden, CHARINDEX('(', @CodigoOrden + '(') - 1)))
                    )
                  )
                  AND O.OrdenID <> @OrdenID
                  AND O.AreaID = R.AreaDestino 
                  AND O.Estado NOT IN ('Cancelado', 'Anulado') 
            )
        )
    )
    ORDER BY R.Prioridad ASC;

    -- 3. Fallbacks
    -- Si no se encuentra ruta (o si Depósito no está explícito en rutas), forzar DEPOSITO
    IF @SiguienteServicio IS NULL
    BEGIN
        SET @SiguienteServicio = 'DEPOSITO';
    END
    
    -- Normalización OLD -> NEW
    IF @SiguienteServicio = 'Punto Logístico' SET @SiguienteServicio = 'DEPOSITO';
    IF @SiguienteServicio = 'LOGISTICA' SET @SiguienteServicio = 'DEPOSITO';

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

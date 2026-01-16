-- =============================================
-- 0. PREPARACIÓN: Asegurar que existe la columna en la tabla Ordenes
-- (Esto se ejecuta antes de crear el SP para evitar errores de compilación)
-- =============================================
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'ProximoServicio' AND Object_ID = Object_ID(N'dbo.Ordenes'))
BEGIN
    ALTER TABLE dbo.Ordenes ADD ProximoServicio VARCHAR(100) NULL;
    PRINT 'Columna ProximoServicio agregada a tabla Ordenes.';
END
GO

-- =============================================
-- TABLA: ConfiguracionRutas
-- Descripción: Define los flujos posibles entre áreas.
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ConfiguracionRutas]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ConfiguracionRutas](
        [RutaID] [int] IDENTITY(1,1) NOT NULL,
        [AreaOrigen] [varchar](20) NOT NULL,
        [AreaDestino] [varchar](50) NOT NULL,
        [Prioridad] [int] DEFAULT 1,
        [RequiereExistencia] [bit] DEFAULT 0,
        CONSTRAINT [PK_ConfiguracionRutas] PRIMARY KEY CLUSTERED ([RutaID] ASC)
    );

    -- Limpiar e Insertar Reglas dadas por el usuario (Prioridad: Menor número = Mayor prioridad)
    TRUNCATE TABLE dbo.ConfiguracionRutas;

    INSERT INTO dbo.ConfiguracionRutas (AreaOrigen, AreaDestino, Prioridad, RequiereExistencia) VALUES 
    -- Origen SB
    ('SB', 'TWC', 1, 1), -- Priority 1: Check TWC first
    ('SB', 'TWT', 2, 1), -- Priority 2: Check TWT
    ('SB', 'EMB', 3, 1),
    ('SB', 'EST', 4, 1),
    
    -- Origen DF
    ('DF', 'EST', 1, 1),
    
    -- Origen TWC
    ('TWC', 'TWT', 1, 1),
    ('TWC', 'EMB', 2, 1),
    ('TWC', 'EST', 3, 1),
    
    -- Origen TWT
    ('TWT', 'EMB', 1, 1),
    ('TWT', 'EST', 2, 1),
    
    -- Origen EMB
    ('EMB', 'EST', 1, 1),
    
    -- Origen EST
    ('EST', 'EMB', 1, 1);
END
GO

-- =============================================
-- PROCEDURE: sp_PredecirProximoServicio
-- Descripción: Analiza el "Pedido Completo" (CabezalERP) para determinar el próximo paso.
-- =============================================
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
        SET @SiguienteServicio = 'DEPOSITO';
    END
    
    -- Normalización de texto visual
    IF @SiguienteServicio = 'Punto Logístico' SET @SiguienteServicio = 'DEPOSITO';
    IF @SiguienteServicio = 'LOGISTICA' SET @SiguienteServicio = 'DEPOSITO';

    -- 4. Actualizar Orden
    UPDATE dbo.Ordenes
    SET ProximoServicio = @SiguienteServicio
    WHERE OrdenID = @OrdenID;

    SELECT @SiguienteServicio AS Prediccion;
END
GO

-- =============================================
-- TABLA: ConfiguracionTiemposEntrega
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ConfiguracionTiemposEntrega]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ConfiguracionTiemposEntrega](
        [ConfigID] [int] IDENTITY(1,1) NOT NULL,
        [AreaID] [varchar](20) NOT NULL,
        [Prioridad] [varchar](20) NOT NULL,
        [Horas] [int] DEFAULT 0,
        [Dias] [int] DEFAULT 0,
        CONSTRAINT [PK_ConfiguracionTiemposEntrega] PRIMARY KEY CLUSTERED ([ConfigID] ASC)
    );
    INSERT INTO dbo.ConfiguracionTiemposEntrega (AreaID, Prioridad, Horas, Dias) VALUES 
    ('DTF', 'Normal', 0, 2), ('DTF', 'Urgente', 4, 0),
    ('SUB', 'Normal', 0, 3), ('SUB', 'Urgente', 6, 0),
    ('GRAN', 'Normal', 0, 4), ('GRAN', 'Urgente', 12, 0);
END
GO

-- =============================================
-- TABLA: CalendarioFeriados
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CalendarioFeriados]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CalendarioFeriados] (
        [Fecha] DATE PRIMARY KEY,
        [Descripcion] VARCHAR(100)
    );
    INSERT INTO dbo.CalendarioFeriados (Fecha, Descripcion) VALUES 
    ('2024-01-01', 'Año Nuevo'), ('2024-05-01', 'Día del Trabajo'), ('2024-12-25', 'Navidad');
END
GO

-- =============================================
-- TABLA: ConfiguracionGlobal (Nueva)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ConfiguracionGlobal]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ConfiguracionGlobal] (
        [ConfigID] INT IDENTITY(1,1) PRIMARY KEY,
        [Clave] VARCHAR(50) NOT NULL,
        [AreaID] VARCHAR(20) DEFAULT 'ADMIN',
        [Valor] VARCHAR(255)
    );
    -- Insertar configuración de corte por defecto
    INSERT INTO dbo.ConfiguracionGlobal (Clave, AreaID, Valor) VALUES ('CORTEURGENTE', 'ADMIN', '12:00');
END
GO

-- =============================================
-- PROCEDURE: sp_CalcularFechaEntrega
-- Descripción: Calcula fecha entrega usando Lógica de Corte y Días Hábiles
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_CalcularFechaEntrega]
    @OrdenID INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AreaID VARCHAR(20);
    DECLARE @Prioridad VARCHAR(20);
    DECLARE @FechaBase DATETIME; -- Fecha de Ingreso original
    DECLARE @FechaInicioCalculo DATETIME; -- Fecha ajustada por corte
    
    DECLARE @DiasASumar INT = 0;
    DECLARE @HorasASumar INT = 0;
    
    DECLARE @HoraCorteStr VARCHAR(50);
    DECLARE @HoraCorteInt INT;
    
    DECLARE @FechaCalculada DATETIME;
    DECLARE @DiasContados INT = 0;

    -- 1. Obtener Datos Orden
    SELECT 
        @AreaID = AreaID, 
        @Prioridad = Prioridad, 
        @FechaBase = ISNULL(FechaIngreso, GETDATE())
    FROM dbo.Ordenes 
    WHERE OrdenID = @OrdenID;

    -- 2. Obtener Hora de Corte (CORTEURGENTE)
    -- Intenta buscar específico del Area, sino usa ADMIN
    SELECT TOP 1 @HoraCorteStr = Valor
    FROM dbo.ConfiguracionGlobal
    WHERE Clave = 'CORTEURGENTE' 
      AND (AreaID = @AreaID OR AreaID = 'ADMIN') -- Busca Area o Default
    ORDER BY CASE WHEN AreaID = @AreaID THEN 1 ELSE 2 END ASC; -- Prioriza Area

    -- Parsear Hora (Asumiendo formato 'HH:mm' o solo entero 'HH')
    SET @HoraCorteStr = ISNULL(@HoraCorteStr, '12:00');
    IF CHARINDEX(':', @HoraCorteStr) > 0
        SET @HoraCorteInt = CAST(SUBSTRING(@HoraCorteStr, 1, CHARINDEX(':', @HoraCorteStr) - 1) AS INT);
    ELSE
        SET @HoraCorteInt = TRY_CAST(@HoraCorteStr AS INT);

    SET @HoraCorteInt = ISNULL(@HoraCorteInt, 12); -- Default fallback 12

    -- 3. Lógica de Corte: Ajustar Fecha Inicio
    IF DATEPART(HOUR, @FechaBase) >= @HoraCorteInt
    BEGIN
        -- Pasó el corte: El día "0" empieza mañana
        SET @FechaInicioCalculo = DATEADD(DAY, 1, @FechaBase);
        -- Resetear hora a inicio de jornada (opcional, aqui mantenemos la hora original o 00:00?
        -- El user sugiere: SET @FechaInicio = CAST(DATEADD(DAY, 1, @FechaOrden) AS DATE); -> Lo cual resetea la hora a 00:00
        SET @FechaInicioCalculo = CAST(@FechaInicioCalculo AS DATE); 
    END
    ELSE
    BEGIN
        -- Antes del corte: Empieza hoy
        SET @FechaInicioCalculo = CAST(@FechaBase AS DATE);
    END

    -- 4. Obtener Días/Horas a Sumar (SLA)
    SELECT TOP 1 
        @DiasASumar = Dias, 
        @HorasASumar = Horas
    FROM dbo.ConfiguracionTiemposEntrega
    WHERE AreaID = @AreaID AND Prioridad = @Prioridad;

    -- Defaults SLA si no config
    IF @@ROWCOUNT = 0
    BEGIN
        IF @Prioridad = 'Urgente' 
            SET @HorasASumar = 24; 
        ELSE 
            SET @DiasASumar = 3;   
    END
    -- Convertir horas a días (simple) si Dias=0
    IF @DiasASumar = 0 AND @HorasASumar > 0
    BEGIN
        SET @DiasASumar = CEILING(@HorasASumar / 24.0);
    END

    -- 5. Bucle Suma Días Hábiles
    SET @FechaCalculada = @FechaInicioCalculo;
    
    WHILE @DiasContados < @DiasASumar
    BEGIN
        -- Avanzar un día
        SET @FechaCalculada = DATEADD(DAY, 1, @FechaCalculada);

        -- Verificar Habilidad (Lunes-Viernes y No Feriado)
        -- Ajuste: (DATEPART(dw, @Date) + @@DATEFIRST - 1) % 7 + 1 -> 1=DOM, 7=SAB
        DECLARE @DiaSemana INT;
        SET @DiaSemana = (DATEPART(dw, @FechaCalculada) + @@DATEFIRST - 1) % 7 + 1;

        -- Loop interno para saltar dias no habiles hasta encontrar uno habil
        WHILE @DiaSemana IN (1, 7) -- Domingo o Sabado
           OR EXISTS (SELECT 1 FROM dbo.CalendarioFeriados WHERE Fecha = CAST(@FechaCalculada AS DATE))
        BEGIN
             SET @FechaCalculada = DATEADD(DAY, 1, @FechaCalculada);
             SET @DiaSemana = (DATEPART(dw, @FechaCalculada) + @@DATEFIRST - 1) % 7 + 1;
        END

        SET @DiasContados = @DiasContados + 1;
    END

    -- 6. Actualizar
    UPDATE dbo.Ordenes
    SET FechaEstimadaEntrega = @FechaCalculada
    WHERE OrdenID = @OrdenID;
    
    SELECT @FechaCalculada AS NuevaFechaEntrega;
END
GO

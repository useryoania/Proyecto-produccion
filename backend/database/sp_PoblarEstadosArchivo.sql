CREATE OR ALTER PROCEDURE sp_PoblarEstadosArchivo
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================
    -- Configuración
    -- Usuario solicitó AreaID = 'admin'. 
    -- Si la columna AreaID es INT, buscamos el ID del área 'admin'.
    -- Si la columna es VARCHAR, insertamos 'admin'.
    -- =============================================
    
    DECLARE @AreaVal INT; -- Asumiendo INT por consistencia con otras tablas
    DECLARE @AreaName NVARCHAR(50) = 'admin';

    -- Intentar buscar ID si existe tabla Areas
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Areas')
    BEGIN
        SELECT TOP 1 @AreaVal = AreaID FROM Areas WHERE Nombre LIKE 'Admin%';
    END

    -- Fallback si no se encuentra o no existe tabla Areas
    IF @AreaVal IS NULL SET @AreaVal = 1; -- Default a 1

    -- Estados a Insertar
    -- Nombre, Color (Tailwind approx), Orden
    DECLARE @Estados TABLE (Nombre NVARCHAR(50), Color NVARCHAR(20), Orden INT);
    INSERT INTO @Estados VALUES 
    ('OK', '#10b981', 1),         -- Emerald-500
    ('FALLA', '#ef4444', 2),      -- Red-500
    ('CANCELADO', '#94a3b8', 3),  -- Slate-400
    ('EN PROCESO', '#3b82f6', 4); -- Blue-500

    -- Insertar
    -- Nota: Se asume que ConfigEstados tiene estructura compatible.
    
    INSERT INTO ConfigEstados (AreaID, Nombre, ColorHex, Orden, EsFinal, TipoEstado)
    SELECT 
        @AreaVal, 
        E.Nombre, 
        E.Color, 
        E.Orden, 
        CASE WHEN E.Nombre IN ('OK', 'CANCELADO') THEN 1 ELSE 0 END, -- EsFinal
        'Archivo' -- TipoEstado solicitado
    FROM @Estados E
    WHERE NOT EXISTS (SELECT 1 FROM ConfigEstados WHERE Nombre = E.Nombre AND TipoEstado = 'Archivo');

    SELECT 'Estados insertados correctamente' as Mensaje, * FROM ConfigEstados WHERE TipoEstado = 'Archivo';
END
GO

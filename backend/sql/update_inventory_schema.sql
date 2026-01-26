USE [SecureAppDB];
GO

-- 1. Agregar columna Referencia (para guardar el código original PRE-...)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InventarioBobinas]') AND name = 'Referencia')
BEGIN
    ALTER TABLE [dbo].[InventarioBobinas] ADD [Referencia] NVARCHAR(100) NULL;
    PRINT 'Columna Referencia agregada.';
END

-- 2. Agregar columna ClienteID (Nombre o ID del cliente)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InventarioBobinas]') AND name = 'ClienteID')
BEGIN
    ALTER TABLE [dbo].[InventarioBobinas] ADD [ClienteID] NVARCHAR(200) NULL;
    PRINT 'Columna ClienteID agregada.';
END

-- 3. Agregar columna OrdenID (Vinculo con tabla Ordenes)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InventarioBobinas]') AND name = 'OrdenID')
BEGIN
    ALTER TABLE [dbo].[InventarioBobinas] ADD [OrdenID] INT NULL;
    PRINT 'Columna OrdenID agregada.';
END

-- 4. Crear índice para búsquedas rápidas por Referencia
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InventarioBobinas_Referencia' AND object_id = OBJECT_ID('InventarioBobinas'))
BEGIN
    CREATE INDEX [IX_InventarioBobinas_Referencia] ON [dbo].[InventarioBobinas] ([Referencia]);
    PRINT 'Índice IX_InventarioBobinas_Referencia creado.';
END

PRINT 'Actualización de esquema completada exitosamente.';
GO

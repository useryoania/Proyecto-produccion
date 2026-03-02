-- SQL Migración: Agregar Controlcopias a ServiciosExtraOrden
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ServiciosExtraOrden]') AND name = 'Controlcopias')
BEGIN
    ALTER TABLE [dbo].[ServiciosExtraOrden] ADD [Controlcopias] INT DEFAULT 0;
END
GO

-- Asegurar que Estado, FechaControl, UsuarioControl, Observaciones y TipoFalla existan (por si la anterior no se ejecutó)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ServiciosExtraOrden]') AND name = 'Estado')
BEGIN
    ALTER TABLE [dbo].[ServiciosExtraOrden] ADD [Estado] NVARCHAR(50) DEFAULT 'PENDIENTE';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ServiciosExtraOrden]') AND name = 'FechaControl')
BEGIN
    ALTER TABLE [dbo].[ServiciosExtraOrden] ADD [FechaControl] DATETIME NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ServiciosExtraOrden]') AND name = 'UsuarioControl')
BEGIN
    ALTER TABLE [dbo].[ServiciosExtraOrden] ADD [UsuarioControl] NVARCHAR(100) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ServiciosExtraOrden]') AND name = 'Observaciones')
BEGIN
    ALTER TABLE [dbo].[ServiciosExtraOrden] ADD [Observaciones] NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ServiciosExtraOrden]') AND name = 'TipoFalla')
BEGIN
    ALTER TABLE [dbo].[ServiciosExtraOrden] ADD [TipoFalla] NVARCHAR(100) NULL;
END
GO

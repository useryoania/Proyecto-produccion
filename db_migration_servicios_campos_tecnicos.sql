-- SQL Migración: Agregar campos técnicos a ServiciosExtraOrden
-- Puntadas (para Bordado), Bajadas (para Estampado)

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ServiciosExtraOrden]') AND name = 'Puntadas')
BEGIN
    ALTER TABLE [dbo].[ServiciosExtraOrden] ADD [Puntadas] INT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ServiciosExtraOrden]') AND name = 'Bajadas')
BEGIN
    ALTER TABLE [dbo].[ServiciosExtraOrden] ADD [Bajadas] INT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ServiciosExtraOrden]') AND name = 'BajadasAdicionales')
BEGIN
    ALTER TABLE [dbo].[ServiciosExtraOrden] ADD [BajadasAdicionales] INT NULL;
END
GO

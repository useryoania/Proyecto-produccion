-- =============================================
-- Script para crear tablas de Control Logístico (Despachos y Manifiestos)
-- =============================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Despachos]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Despachos](
        [DespachoID] [int] IDENTITY(1,1) NOT NULL,
        [Codigo] [varchar](50) NOT NULL, -- QR Maestro (ej: DSP-10045)
        [AreaOrigenID] [varchar](20) NULL,
        [AreaDestinoID] [varchar](20) NULL,
        [UsuarioEmisorID] [int] NULL,
        [FechaCreacion] [datetime] DEFAULT GETDATE(),
        [Estado] [varchar](20) DEFAULT 'EN_TRANSITO', -- EN_TRANSITO, RECIBIDO, RECIBIDO_PARCIAL, CANCELADO
        [UsuarioReceptorID] [int] NULL,
        [FechaRecepcion] [datetime] NULL,
        [Observaciones] [nvarchar](255) NULL,
        CONSTRAINT [PK_Despachos] PRIMARY KEY CLUSTERED ([DespachoID] ASC)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DespachoItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DespachoItems](
        [ItemID] [int] IDENTITY(1,1) NOT NULL,
        [DespachoID] [int] NOT NULL,
        [OrdenID] [int] NOT NULL, -- Referencia a la tabla Ordenes
        [EstadoItem] [varchar](20) DEFAULT 'EN_TRANSITO', -- EN_TRANSITO, RECIBIDO, FALTANTE
        [FechaEscaneo] [datetime] NULL, -- Momento exacto del escaneo en recepción
        CONSTRAINT [PK_DespachoItems] PRIMARY KEY CLUSTERED ([ItemID] ASC),
        CONSTRAINT [FK_DespachoItems_Despachos] FOREIGN KEY([DespachoID]) REFERENCES [dbo].[Despachos] ([DespachoID]),
        CONSTRAINT [FK_DespachoItems_Ordenes] FOREIGN KEY([OrdenID]) REFERENCES [dbo].[Ordenes] ([OrdenID])
    );
END
GO

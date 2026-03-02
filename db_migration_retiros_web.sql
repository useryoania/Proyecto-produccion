USE [SecureAppDB];
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RetirosWeb]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[RetirosWeb](
        [IdRetWeb] [int] IDENTITY(1,1) NOT NULL,
        [Fecha] [datetime] NOT NULL DEFAULT (getdate()),
        [OrdIdRetiro] [nvarchar](50) NOT NULL,
        [ReferenciaPago] [nvarchar](100) NULL,
        [Monto] [decimal](18, 2) NULL,
        [Moneda] [nvarchar](10) NULL,
        [Estado] [int] NOT NULL DEFAULT ((1)),
        [UbicacionEstante] [nvarchar](50) NULL, -- Referencia al casillero asignado durante el empaquetado
     CONSTRAINT [PK_RetirosWeb] PRIMARY KEY CLUSTERED 
    (
        [IdRetWeb] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]

    -- Añadir comentario descriptivo a la tabla
    EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Registro interno de retiros provenientes de la web. Estados: 1:Ingresada, 3:Abonada, 7:Empaquetada s/abonar, 8:Empaquetada abonada, 5:Entregada' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'RetirosWeb'
END
GO

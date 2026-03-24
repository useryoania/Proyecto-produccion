-- ============================================================
-- ciclos_setup.sql
-- Script de configuración del sistema de ciclos de crédito
-- Ejecutar en SQL Server Management Studio sobre la BD principal
-- ============================================================

-- ── 1. Tabla DocumentosContables (si no existe) ───────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DocumentosContables]') AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[DocumentosContables] (
        DocIdDocumento      INT IDENTITY(1,1)   NOT NULL,
        CueIdCuenta         INT                  NOT NULL,
        CliIdCliente        INT                  NOT NULL,
        DocTipo             VARCHAR(20)          NOT NULL, -- 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'RECIBO'
        DocNumero           VARCHAR(50)          NOT NULL,
        DocSerie            VARCHAR(10)          NOT NULL DEFAULT 'A',
        DocIdDocumentoRef   INT                  NULL,
        DocMotivoRef        NVARCHAR(300)        NULL,
        DocFechaDesde       DATE                 NULL,
        DocFechaHasta       DATE                 NULL,
        DocSubtotal         DECIMAL(18,4)        NOT NULL DEFAULT 0,
        MonIdMoneda         INT                  NOT NULL DEFAULT 1,
        DocTotalDescuentos  DECIMAL(18,4)        NOT NULL DEFAULT 0,
        DocTotalRecargos    DECIMAL(18,4)        NOT NULL DEFAULT 0,
        DocTotal            DECIMAL(18,4)        NOT NULL,
        DocEstado           VARCHAR(20)          NOT NULL DEFAULT 'BORRADOR',
        DocFechaEmision     DATETIME             NOT NULL DEFAULT GETDATE(),
        DocFechaVencimiento DATE                 NULL,
        DocUsuarioAlta      INT                  NOT NULL,
        DocObservaciones    NVARCHAR(500)        NULL,
        CicIdCiclo          INT                  NULL,

        CONSTRAINT PK_DocumentosContables PRIMARY KEY CLUSTERED (DocIdDocumento),
        CONSTRAINT UQ_DocNumeroSerie UNIQUE (DocNumero, DocSerie),

        CONSTRAINT FK_Doc_Cuenta
            FOREIGN KEY (CueIdCuenta) REFERENCES [dbo].[CuentasCliente] (CueIdCuenta),

        CONSTRAINT FK_Doc_Ciclo
            FOREIGN KEY (CicIdCiclo) REFERENCES [dbo].[CiclosCredito] (CicIdCiclo),

        CONSTRAINT FK_Doc_Ref
            FOREIGN KEY (DocIdDocumentoRef) REFERENCES [dbo].[DocumentosContables] (DocIdDocumento)
    );

    CREATE INDEX IX_Doc_Cliente_Tipo ON [dbo].[DocumentosContables] (CliIdCliente, DocTipo, DocEstado);
    CREATE INDEX IX_Doc_Fecha ON [dbo].[DocumentosContables] (DocFechaEmision DESC);

    PRINT '[OK] Tabla DocumentosContables creada.';
END
ELSE
    PRINT '[SKIP] Tabla DocumentosContables ya existe.';
GO

-- ── 2. Tabla CiclosCredito (si no existe) ────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CiclosCredito]') AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[CiclosCredito] (
        CicIdCiclo          INT IDENTITY(1,1)   NOT NULL,
        CueIdCuenta         INT                  NOT NULL,
        CliIdCliente        INT                  NOT NULL,
        CicFechaInicio      DATE                 NOT NULL,
        CicFechaCierre      DATE                 NOT NULL,
        CicDiasAprobados    INT                  NOT NULL,
        CicTotalOrdenes     DECIMAL(18,4)        NOT NULL DEFAULT 0,
        CicTotalPagos       DECIMAL(18,4)        NOT NULL DEFAULT 0,
        CicSaldoFacturar    DECIMAL(18,4)        NULL,
        CicEstado           VARCHAR(20)          NOT NULL DEFAULT 'ABIERTO',
            -- 'ABIERTO' | 'VENCIDO' | 'CERRADO' | 'COBRADO'
        CicNumeroFactura    VARCHAR(100)         NULL,
        CicFechaFactura     DATETIME             NULL,
        CicFechaCobro       DATETIME             NULL,
        CicUsuarioApertura  INT                  NOT NULL,
        CicUsuarioCierre    INT                  NULL,
        CicObservaciones    NVARCHAR(500)        NULL,

        CONSTRAINT PK_CiclosCredito PRIMARY KEY CLUSTERED (CicIdCiclo),

        CONSTRAINT FK_Ciclo_Cuenta
            FOREIGN KEY (CueIdCuenta) REFERENCES [dbo].[CuentasCliente] (CueIdCuenta)
    );

    CREATE INDEX IX_Ciclo_Cuenta_Estado ON [dbo].[CiclosCredito] (CueIdCuenta, CicEstado, CicFechaCierre);
    CREATE INDEX IX_Ciclo_Fecha ON [dbo].[CiclosCredito] (CicFechaCierre, CicEstado);

    PRINT '[OK] Tabla CiclosCredito creada.';
END
ELSE
    PRINT '[SKIP] Tabla CiclosCredito ya existe.';
GO

-- ── 3. Columna CueDiasCiclo en CuentasCliente (si no existe) ─────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.CuentasCliente') AND name = 'CueDiasCiclo'
)
BEGIN
    ALTER TABLE dbo.CuentasCliente ADD CueDiasCiclo INT NULL DEFAULT 7;
    PRINT '[OK] Columna CueDiasCiclo agregada a CuentasCliente.';
END
ELSE
    PRINT '[SKIP] CueDiasCiclo ya existe.';
GO

-- ── 4. Configuración del CRON de ciclos en ConfiguracionGlobal ───────────────
IF NOT EXISTS (SELECT 1 FROM ConfiguracionGlobal WHERE Clave = 'CICLOS_CRON_HORA')
    INSERT INTO ConfiguracionGlobal (Clave, Valor, AreaID) VALUES ('CICLOS_CRON_HORA', '23:55', 'ADMIN');
ELSE
    PRINT '[SKIP] CICLOS_CRON_HORA ya existe.';

IF NOT EXISTS (SELECT 1 FROM ConfiguracionGlobal WHERE Clave = 'CICLOS_CRON_ENABLE')
    INSERT INTO ConfiguracionGlobal (Clave, Valor, AreaID) VALUES ('CICLOS_CRON_ENABLE', '1', 'ADMIN');
ELSE
    PRINT '[SKIP] CICLOS_CRON_ENABLE ya existe.';
GO

-- ── 5. Configurar cuenta de prueba como SEMANAL (7 días) ─────────────────────
-- Ajustar CueIdCuenta según el ID real de la cuenta de MoreggiT
-- UPDATE dbo.CuentasCliente SET CueDiasCiclo = 7, CuePuedeNegativo = 1 WHERE CueIdCuenta = <ID>;

PRINT '==================================================================';
PRINT 'SETUP CICLOS DE CRÉDITO COMPLETADO';
PRINT 'Para abrir el primer ciclo de un cliente:';
PRINT '  POST /api/contabilidad/ciclos';
PRINT '  Body: { "CueIdCuenta": X, "CliIdCliente": Y }';
PRINT '';
PRINT 'Para cerrar manualmente:';
PRINT '  POST /api/contabilidad/ciclos/{CicIdCiclo}/cerrar';
PRINT '';
PRINT 'Para cerrar todos los vencidos:';
PRINT '  POST /api/contabilidad/ciclos/cerrar-vencidos';
PRINT '==================================================================';
GO

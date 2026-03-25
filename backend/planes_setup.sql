-- ================================================================
-- planes_setup.sql
-- Setup de Planes de Recursos (PlanesMetros)
-- Ejecutar una sola vez en la base de datos de producción.
-- ================================================================

-- 1. Tabla PlanesMetros
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PlanesMetros')
BEGIN
  CREATE TABLE dbo.PlanesMetros (
    PlaIdPlan            INT            IDENTITY(1,1) PRIMARY KEY,
    CueIdCuenta          INT            NOT NULL,          -- FK CuentasCliente (tipo METROS/KG)
    ProIdProducto        INT            NOT NULL,          -- Artículo/rollo al que aplica
    PlaCantidadTotal     DECIMAL(18,4)  NOT NULL,          -- Total comprado (metros, kg, etc.)
    PlaCantidadUsada     DECIMAL(18,4)  NOT NULL DEFAULT 0,-- Consumido hasta hoy
    PlaUnidad            NVARCHAR(20)   NOT NULL DEFAULT 'M',-- 'M', 'KG', 'UN'
    PlaImportePagado     DECIMAL(18,4)  NULL,              -- Cuánto pagó por el plan
    PlaFechaInicio       DATE           NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    PlaFechaVencimiento  DATE           NULL,              -- NULL = no vence
    PlaActivo            BIT            NOT NULL DEFAULT 1,
    PlaObservacion       NVARCHAR(500)  NULL,
    PlaFechaAlta         DATETIME       NOT NULL DEFAULT GETDATE(),
    PlaUsuarioAlta       INT            NOT NULL DEFAULT 1,
    PlaFechaBaja         DATETIME       NULL,
    PlaUsuarioBaja       INT            NULL,

    CONSTRAINT FK_PlanesMetros_Cuenta  FOREIGN KEY (CueIdCuenta)   REFERENCES dbo.CuentasCliente(CueIdCuenta),
    CONSTRAINT FK_PlanesMetros_Artculo FOREIGN KEY (ProIdProducto) REFERENCES dbo.Articulos(ProIdProducto)
  );
  PRINT 'Tabla PlanesMetros creada.';
END
ELSE PRINT 'Tabla PlanesMetros ya existe.';

-- 2. Índices
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_PlanesMetros_Cuenta_Activo')
  CREATE INDEX IX_PlanesMetros_Cuenta_Activo ON dbo.PlanesMetros (CueIdCuenta, PlaActivo);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_PlanesMetros_Producto_Activo')
  CREATE INDEX IX_PlanesMetros_Producto_Activo ON dbo.PlanesMetros (ProIdProducto, PlaActivo);

-- 3. Columna CueTipo = 'METROS' o 'KG' en CuentasCliente
--    (ya soportado por el CHECK si existe, de lo contrario dejamos pasar)
--    Verificamos que el CueTipo acepte esos valores:
IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID('dbo.CuentasCliente')
    AND name = 'CK_CuentasCliente_Tipo'
)
BEGIN
  -- No existe constraint, los tipos se validan en la aplicación
  PRINT 'Sin constraint de tipo en CuentasCliente (ok, validado por app).';
END;

PRINT '================================================================';
PRINT 'SETUP PLANES DE RECURSOS COMPLETADO';
PRINT '';
PRINT 'Para crear un plan de metros para un cliente:';
PRINT '  POST /api/contabilidad/planes';
PRINT '  Body: { CueIdCuenta, ProIdProducto, PlaCantidadTotal, PlaImportePagado, PlaUnidad }';
PRINT '';
PRINT 'Para ver los planes de un cliente:';
PRINT '  GET /api/contabilidad/planes/:CliIdCliente';
PRINT '================================================================';

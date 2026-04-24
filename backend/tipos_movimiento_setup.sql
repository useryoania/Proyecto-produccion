-- =====================================================================
-- tipos_movimiento_setup.sql
-- Tabla catálogo de Tipos de Movimiento Contable.
-- Define si el tipo SUMA (+1), RESTA (-1) o es NEUTRO (0) en el saldo.
-- El sistema consulta esta tabla para saber qué hacer al registrar un movimiento.
-- =====================================================================

-- 1. CREAR TABLA
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TiposMovimiento')
BEGIN
  CREATE TABLE dbo.TiposMovimiento (
    TmoId            VARCHAR(30)    NOT NULL CONSTRAINT PK_TiposMovimiento PRIMARY KEY,
    TmoNombre        NVARCHAR(100)  NOT NULL,
    TmoDescripcion   NVARCHAR(500)  NULL,
    TmoPrefijo       VARCHAR(5)     NOT NULL DEFAULT '',
    TmoSecuencia     VARCHAR(30)    NULL,
    TmoAfectaSaldo   SMALLINT       NOT NULL DEFAULT 0,
    TmoGeneraDeuda   BIT            NOT NULL DEFAULT 0,
    TmoAplicaRecurso BIT            NOT NULL DEFAULT 0,
    TmoRequiereDoc   BIT            NOT NULL DEFAULT 0,
    TmoActivo        BIT            NOT NULL DEFAULT 1,
    TmoOrden         INT            NOT NULL DEFAULT 99,
    TmoFechaAlta     DATETIME       NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Tabla TiposMovimiento creada.';
END
ELSE PRINT 'Tabla TiposMovimiento ya existe.';
GO

-- 2. SEED: Tipos de movimiento del sistema (idempotente)
MERGE dbo.TiposMovimiento AS T
USING (VALUES
  ('ORDEN',         'Orden ingresada',               'Debito por una orden de plazo. Resta el saldo del cliente.',        '',   NULL,            -1, 1, 0, 0, 1,  10),
  ('PAGO',          'Pago recibido',                 'Acreditacion de un pago en efectivo, transferencia, etc.',          '',   NULL,            +1, 0, 0, 0, 1,  20),
  ('ANTICIPO',      'Anticipo / Pago anticipado',    'Saldo a favor aplicado antes del vencimiento.',                     '',   NULL,            +1, 0, 0, 0, 1,  30),
  ('SALDO_INICIAL', 'Saldo inicial',                 'Saldo de apertura de una cuenta nueva.',                            '',   NULL,            +1, 0, 0, 0, 1,  40),
  ('NOTA_CREDITO',  'Nota de credito',               'Credito a favor por pago en exceso o ajuste.',                      '',   NULL,            +1, 0, 0, 0, 1,  50),
  ('AJUSTE',        'Ajuste manual',                 'Correccion manual de saldo autorizada por administrador.',           '',   NULL,             0, 0, 0, 0, 1,  60),
  ('REPOSICION',    'Reposicion sin cargo',          'Orden de reposicion. No genera debito ni consume recursos.',         '',   NULL,             0, 0, 0, 0, 1,  70),
  ('FIADO',         'Entregado sin cobro (fiado)',   'Retiro autorizado sin pago. Deuda pasa a EN_GESTION. Solo trazabilidad.','',NULL,           0, 0, 0, 0, 1,  75),
  ('CIERRE_CICLO',  'Cierre de ciclo semanal',       'Marca de cierre de ciclo. Importe neutro, solo trazabilidad.',       '',   NULL,             0, 0, 0, 1, 1,  80),
  -- Inventario de recursos
  ('ENTRADA',       'Entrada de recursos',           'Ingreso al inventario de metros / unidades (compra de plan).',       '',   NULL,            +1, 0, 1, 0, 1, 110),
  ('ENTREGA',       'Entrega de recursos',           'Salida del inventario al entregar una orden.',                       '',   NULL,            -1, 0, 1, 0, 1, 120),
  -- Documentos contables emitidos
  ('FACTURA',       'Factura de venta',              'Factura de venta de plan de recursos.',                             'FC', 'FACTURA_PLAN',  -1, 1, 0, 1, 1, 210),
  ('FACTURA_CICLO', 'Factura de ciclo semanal',      'Factura emitida al cerrar un ciclo de credito semanal.',            'FC', 'FACTURA_CICLO', -1, 1, 0, 1, 1, 220),
  ('RECIBO',        'Recibo de pago',                'Constancia de cobro inmediato. No genera deuda pendiente.',         'RC', 'RECIBO_PLAN',   +1, 0, 0, 1, 1, 230),
  ('TICKET',        'Ticket / Comprobante interno',  'Comprobante interno sin efecto contable. Solo trazabilidad.',       'TK', NULL,             0, 0, 0, 0, 1, 240)
) AS S (TmoId, TmoNombre, TmoDescripcion, TmoPrefijo, TmoSecuencia, TmoAfectaSaldo, TmoGeneraDeuda, TmoAplicaRecurso, TmoRequiereDoc, TmoActivo, TmoOrden)
ON T.TmoId = S.TmoId
WHEN MATCHED THEN
  UPDATE SET
    T.TmoNombre        = S.TmoNombre,
    T.TmoDescripcion   = S.TmoDescripcion,
    T.TmoPrefijo       = S.TmoPrefijo,
    T.TmoSecuencia     = S.TmoSecuencia,
    T.TmoAfectaSaldo   = S.TmoAfectaSaldo,
    T.TmoGeneraDeuda   = S.TmoGeneraDeuda,
    T.TmoAplicaRecurso = S.TmoAplicaRecurso,
    T.TmoRequiereDoc   = S.TmoRequiereDoc,
    T.TmoActivo        = S.TmoActivo,
    T.TmoOrden         = S.TmoOrden
WHEN NOT MATCHED THEN
  INSERT (TmoId, TmoNombre, TmoDescripcion, TmoPrefijo, TmoSecuencia,
          TmoAfectaSaldo, TmoGeneraDeuda, TmoAplicaRecurso, TmoRequiereDoc, TmoActivo, TmoOrden)
  VALUES (S.TmoId, S.TmoNombre, S.TmoDescripcion, S.TmoPrefijo, S.TmoSecuencia,
          S.TmoAfectaSaldo, S.TmoGeneraDeuda, S.TmoAplicaRecurso, S.TmoRequiereDoc, S.TmoActivo, S.TmoOrden);

PRINT 'Tipos de movimiento sincronizados.';
GO

-- 3. Verificar
SELECT TmoId, TmoNombre, TmoPrefijo,
       CASE TmoAfectaSaldo WHEN 1 THEN '+1 (suma)' WHEN -1 THEN '-1 (resta)' ELSE '0 (neutro)' END AS Efecto,
       CASE TmoGeneraDeuda   WHEN 1 THEN 'Si' ELSE 'No' END AS Deuda,
       CASE TmoAplicaRecurso WHEN 1 THEN 'Si' ELSE 'No' END AS Recurso
FROM dbo.TiposMovimiento
ORDER BY TmoOrden;

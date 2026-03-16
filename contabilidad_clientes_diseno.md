# 📒 Módulo de Contabilidad de Clientes — Diseño Completo
**Sistema:** USER - Gestión de Producción
**Fecha de diseño:** 2026-03-16
**Estado:** DISEÑO APROBADO — Pendiente implementación

---

## 1. Decisiones de Diseño Tomadas

| # | Decisión | Valor |
|---|---|---|
| 1 | ¿Cuándo nace la deuda? | Al **ingreso de la orden** (OrdenDeposito creada) |
| 2 | Imputación de pagos | **Automática FIFO** (documento más antiguo primero) |
| 3 | Clientes de metros | Condición única: **Contado** (sin plazo) |
| 4 | Multi-moneda | Sí — cuentas separadas por moneda (UYU / USD) |
| 5 | Inmutabilidad del libro mayor | Nunca se borra — las anulaciones son asientos espejo |
| 6 | Saldo mantenido en tiempo real | Sí — `CueSaldoActual` en `CuentasCliente` se actualiza con cada movimiento |
| 7 | Saldo posterior por movimiento | Sí — `MovSaldoPosterior` para reconstrucción histórica sin full-scan |

---

## 2. Modelo de Base de Datos

### 2.1 `CondicionesPago`
Define los plazos de pago disponibles. Una condición se asigna a cada cliente.

```sql
CREATE TABLE CondicionesPago (
    CPaIdCondicion      INT IDENTITY(1,1) PRIMARY KEY,
    CPaNombre           NVARCHAR(100) NOT NULL,  -- "Contado", "30 días", "30/60 días"
    CPaDiasVencimiento  INT DEFAULT 0,           -- días hasta 1ra cuota
    CPaPermiteCuotas    BIT DEFAULT 0,           -- si genera múltiples documentos
    CPaCantidadCuotas   INT DEFAULT 1,
    CPaDiasEntreCuotas  INT DEFAULT 0,           -- días entre vencimiento de cuotas
    CPaActiva           BIT DEFAULT 1
);

-- Datos iniciales obligatorios:
INSERT INTO CondicionesPago VALUES ('Contado',        0,  0, 1, 0,  1);
INSERT INTO CondicionesPago VALUES ('15 días',       15,  0, 1, 0,  1);
INSERT INTO CondicionesPago VALUES ('30 días',       30,  0, 1, 0,  1);
INSERT INTO CondicionesPago VALUES ('30/60 días',    30,  1, 2, 30, 1);
INSERT INTO CondicionesPago VALUES ('30/60/90 días', 30,  1, 3, 30, 1);
```

### 2.2 `CuentasCliente`
Una o más cuentas por cliente. Separadas por tipo de unidad.

```sql
CREATE TABLE CuentasCliente (
    CueIdCuenta         INT IDENTITY(1,1) PRIMARY KEY,
    CliIdCliente        INT NOT NULL,            -- FK → Clientes
    CPaIdCondicion      INT NOT NULL DEFAULT 1,  -- FK → CondicionesPago
    CueTipo             VARCHAR(20) NOT NULL,
        -- 'DINERO_UYU' | 'DINERO_USD' | 'METROS' | 'KG' | 'CREDITO_ESPECIAL'
    MonIdMoneda         INT NULL,                -- FK → Monedas (NULL para METROS/KG)
    CueSaldoActual      DECIMAL(18,4) DEFAULT 0,
        -- Positivo = cliente tiene crédito a favor
        -- Negativo = cliente debe
    CueLimiteCredito    DECIMAL(18,4) DEFAULT 0, -- máximo deuda permitida (0 = no permite negativo)
    CuePuedeNegativo    BIT DEFAULT 0,           -- ¿puede quedar en rojo?
    CueActiva           BIT DEFAULT 1,
    CueFechaAlta        DATETIME DEFAULT GETDATE(),
    CueUsuarioAlta      INT,
    CueObservaciones    NVARCHAR(500) NULL,

    CONSTRAINT UQ_CuentaCliente UNIQUE (CliIdCliente, CueTipo) -- una por tipo activa
);
```

### 2.3 `MovimientosCuenta` ← Libro Mayor
El registro contable inmutable. Cada evento del sistema genera una línea aquí.

```sql
CREATE TABLE MovimientosCuenta (
    MovIdMovimiento     INT IDENTITY(1,1) PRIMARY KEY,
    CueIdCuenta         INT NOT NULL,            -- FK → CuentasCliente

    -- Tipo de asiento
    MovTipo             VARCHAR(30) NOT NULL,
        -- 'ORDEN'       → ingreso orden         → DÉBITO (importe negativo)
        -- 'PAGO'        → pago recibido          → CRÉDITO (importe positivo)
        -- 'ANTICIPO'    → prepago / carga saldo  → CRÉDITO (importe positivo)
        -- 'ENTREGA'     → entrega material/metros → DÉBITO (importe negativo)
        -- 'AJUSTE_POS'  → ajuste manual +        → CRÉDITO
        -- 'AJUSTE_NEG'  → ajuste manual -        → DÉBITO
        -- 'DEVOLUCION'  → devolución             → CRÉDITO
        -- 'ANULACION'   → asiento espejo de otro → invierte el importe

    MovConcepto         NVARCHAR(500) NOT NULL,  -- texto legible: "Orden SB-12345", "Pago Débito R-478"
    MovImporte          DECIMAL(18,4) NOT NULL,  -- + crédito / - débito
    MovSaldoPosterior   DECIMAL(18,4) NOT NULL,  -- saldo de la cuenta después de este movimiento

    -- Referencias a documentos fuente (solo el que aplica, resto NULL)
    OrdIdOrden          INT NULL,                -- FK → OrdenesDeposito
    OReIdOrdenRetiro    INT NULL,                -- FK → OrdenesRetiro
    PagIdPago           INT NULL,                -- FK → Pagos
    MovRefExterna       VARCHAR(100) NULL,       -- Handy TransactionId u otro externo

    -- Control
    MovFecha            DATETIME DEFAULT GETDATE(),
    MovUsuarioAlta      INT NOT NULL,
    MovAnulado          BIT DEFAULT 0,
    MovIdAnula          INT NULL,               -- FK → MovimientosCuenta (el que anula)
    MovObservaciones    NVARCHAR(500) NULL
);

CREATE INDEX IX_Mov_Cuenta_Fecha ON MovimientosCuenta (CueIdCuenta, MovFecha DESC);
CREATE INDEX IX_Mov_Orden ON MovimientosCuenta (OrdIdOrden) WHERE OrdIdOrden IS NOT NULL;
CREATE INDEX IX_Mov_Pago  ON MovimientosCuenta (PagIdPago)  WHERE PagIdPago IS NOT NULL;
```

### 2.4 `DeudaDocumento`
Cada orden genera uno o más documentos de deuda con fecha de vencimiento.

```sql
CREATE TABLE DeudaDocumento (
    DDeIdDocumento      INT IDENTITY(1,1) PRIMARY KEY,
    CueIdCuenta         INT NOT NULL,            -- FK → CuentasCliente
    OrdIdOrden          INT NULL,                -- FK → OrdenesDeposito
    OReIdOrdenRetiro    INT NULL,                -- FK → OrdenesRetiro

    -- Importes
    DDeImporteOriginal  DECIMAL(18,4) NOT NULL,
    DDeImportePendiente DECIMAL(18,4) NOT NULL,  -- se actualiza con cada imputación

    -- Vencimiento
    DDeFechaEmision     DATE NOT NULL,
    DDeFechaVencimiento DATE NOT NULL,
    DDeCuotaNumero      INT DEFAULT 1,
    DDeCuotaTotal       INT DEFAULT 1,

    -- Estado
    DDeEstado           VARCHAR(20) DEFAULT 'PENDIENTE',
        -- 'PENDIENTE' | 'VENCIDO' | 'PARCIAL' | 'COBRADO' | 'ANULADO'
    DDeFechaCobro       DATETIME NULL,

    DDeObservaciones    NVARCHAR(500) NULL
);

CREATE INDEX IX_Dde_Cuenta_Estado ON DeudaDocumento (CueIdCuenta, DDeEstado, DDeFechaVencimiento);
```

### 2.5 `ImputacionPago`
Registro de qué pago canceló qué deuda. Permite pagos parciales y multi-deuda.

```sql
CREATE TABLE ImputacionPago (
    ImpIdImputacion     INT IDENTITY(1,1) PRIMARY KEY,
    PagIdPago           INT NOT NULL,            -- FK → Pagos
    DDeIdDocumento      INT NOT NULL,            -- FK → DeudaDocumento
    CueIdCuenta         INT NOT NULL,            -- FK → CuentasCliente (desnormalizado para queries)
    ImpImporte          DECIMAL(18,4) NOT NULL,  -- cuánto de este pago fue a esta deuda
    ImpFecha            DATETIME DEFAULT GETDATE(),
    ImpUsuarioAlta      INT NOT NULL,
    ImpObservaciones    NVARCHAR(500) NULL
);
```

### 2.6 `PlanesMetros`
Para clientes que pre-compran material en metros o unidades.

```sql
CREATE TABLE PlanesMetros (
    PlaIdPlan           INT IDENTITY(1,1) PRIMARY KEY,
    CliIdCliente        INT NOT NULL,
    CueIdCuenta         INT NOT NULL,            -- FK → CuentasCliente (tipo METROS)
    -- Unidades
    PlaCantidadTotal    DECIMAL(18,4) NOT NULL,  -- metros / unidades compradas
    PlaCantidadUsada    DECIMAL(18,4) DEFAULT 0, -- consumido
    -- Precio pactado
    PlaPrecioUnitario   DECIMAL(18,4) NULL,      -- precio/metro (si aplica para facturación)
    MonIdMoneda         INT NULL,
    -- Vigencia
    PlaFechaInicio      DATE NOT NULL,
    PlaFechaVencimiento DATE NULL,               -- NULL = sin vencimiento
    PlaActivo           BIT DEFAULT 1,
    PlaObservaciones    NVARCHAR(500) NULL,
    -- Control
    PlaFechaAlta        DATETIME DEFAULT GETDATE(),
    PlaUsuarioAlta      INT
);
```

---

## 3. Diagrama de Relaciones

```
CondicionesPago
    │
    └── CuentasCliente (1 por tipo por cliente)
            │
            ├── MovimientosCuenta ←──── OrdenesDeposito
            │       (libro mayor)  ←──── Pagos
            │                      ←──── OrdenesRetiro
            │
            ├── DeudaDocumento ←──── OrdenesDeposito
            │       │
            │       └── ImputacionPago ←──── Pagos
            │
            └── PlanesMetros (solo tipo METROS)
```

---

## 4. Reglas de Negocio

### 4.1 Generación de Asientos (Triggers de Negocio)

| Evento | Tabla origen | Acción contable |
|---|---|---|
| Orden creada | `OrdenesDeposito` | `MovimientosCuenta` ORDEN, importe = `-OrdCostoFinal` |
| Orden cancelada | `OrdenesDeposito` | `MovimientosCuenta` ANULACION, asiento espejo de la ORDEN |
| Pago manual | [Pagos](file:///c:/Integracion/User-Macrosoft/src/components/pages/VerificarPagosOnlineView.jsx#56-66) | `MovimientosCuenta` PAGO, importe = `+PagMontoPago` + imputación FIFO |
| Pago Handy | Webhook | `MovimientosCuenta` PAGO, importe = `+TotalAmount` + imputación FIFO |
| Anticipo cargado | Manual/Admin | `MovimientosCuenta` ANTICIPO, importe = `+Monto` |
| Entrega metros | `marcarPronto()` | `MovimientosCuenta` ENTREGA, importe = `-OrdCantidad` (metros) |

### 4.2 Generación de DeudaDocumento al Ingreso de Orden

```
Pseudocódigo: generarDeudaDocumento(ordIdOrden)
  1. Leer OrdCostoFinal, CliIdCliente, fecha de la orden
  2. Obtener CuentasCliente del cliente (tipo = moneda de la orden)
  3. Obtener CPaIdCondicion de CuentasCliente
  4. Leer CondicionesPago: CPaDiasVencimiento, CPaCantidadCuotas, CPaDiasEntreCuotas
  5. Para cada cuota i = 1..CPaCantidadCuotas:
       importeCuota = OrdCostoFinal / CPaCantidadCuotas
       fechaVto = FechaOrden + CPaDiasVencimiento + (i-1) * CPaDiasEntreCuotas
       INSERT DeudaDocumento (importe, vencimiento, cuota i/total)
```

**Excepción:** Si el cliente es de tipo METROS, no se genera `DeudaDocumento` (condición siempre Contado y se descuenta del plan).

### 4.3 Imputación FIFO Automática al Recibir Pago

```
Pseudocódigo: imputarPagoFIFO(pagIdPago, montoDisponible, cueIdCuenta)
  1. Obtener documentos PENDIENTE o PARCIAL de la cuenta
     ORDER BY DDeFechaVencimiento ASC, DDeIdDocumento ASC  ← FIFO estricto
  2. Para cada documento:
       aplicar = MIN(montoDisponible, DDeImportePendiente)
       INSERT ImputacionPago (aplicar)
       DDeImportePendiente -= aplicar
       IF DDeImportePendiente = 0 → DDeEstado = 'COBRADO', DDeFechaCobro = ahora
       ELSE                       → DDeEstado = 'PARCIAL'
       montoDisponible -= aplicar
       IF montoDisponible = 0 → salir
  3. Si montoDisponible > 0 al terminar → saldo a favor (crédito en CuentasCliente)
```

### 4.4 Actualización de Saldo en Tiempo Real

```sql
-- Stored Procedure: SP_RegistrarMovimiento
-- Ejecutar dentro de una transacción para garantizar consistencia
BEGIN TRANSACTION
  -- 1. Calcular nuevo saldo
  UPDATE CuentasCliente
     SET CueSaldoActual = CueSaldoActual + @MovImporte
   WHERE CueIdCuenta = @CueIdCuenta;

  -- 2. Leer saldo actualizado
  SELECT @NuevoSaldo = CueSaldoActual FROM CuentasCliente WHERE CueIdCuenta = @CueIdCuenta;

  -- 3. Insertar movimiento con saldo posterior
  INSERT INTO MovimientosCuenta (..., MovImporte, MovSaldoPosterior)
  VALUES (..., @MovImporte, @NuevoSaldo);
COMMIT
```

### 4.5 Job Diario — Marcar Vencidos

```sql
-- Ejecutar todos los días (CRON o SQL Agent Job)
UPDATE DeudaDocumento
   SET DDeEstado = 'VENCIDO'
 WHERE DDeEstado = 'PENDIENTE'
   AND DDeFechaVencimiento < CAST(GETDATE() AS DATE);
```

---

## 5. Carga Inicial (Saldos Históricos)

Este es el punto más delicado. Al activar el módulo, los clientes ya tienen historia.

### Estrategia: "Fecha de Corte"

Se elige una **fecha de corte** (ej: primer día del mes en que se activa). Antes de esa fecha, se carga un saldo inicial. Después, todos los eventos nuevos generan movimientos automáticos.

```
FASE A — Relevamiento (semana previa a la activación)
  ├── Para cada cliente: calcular saldo actual real
  │     = Suma de órdenes no pagadas - pagos realizados
  │     Fuente: cruzar Pagos + OrdenesDeposito de los últimos N meses
  └── Exportar a Excel para validación con el equipo

FASE B — Creación de cuentas
  ├── Crear CuentasCliente para cada cliente activo
  ├── Asignar CondicionesPago según política comercial
  └── Para clientes de metros: crear PlanesMetros con saldo actual

FASE C — Asiento de apertura ("saldo inicial")
  Para cada cliente con saldo pendiente:
    IF saldo < 0 (cliente debe):
        INSERT MovimientosCuenta (MovTipo='APERTURA_DEUDA', MovImporte=saldo_negativo)
        INSERT DeudaDocumento (vencimiento = fecha_corte → ya vencido → 'VENCIDO')
    IF saldo > 0 (tiene crédito a favor):
        INSERT MovimientosCuenta (MovTipo='APERTURA_CREDITO', MovImporte=saldo_positivo)

FASE D — Activación
  ├── Desde la fecha de corte todos los nuevos eventos generan movimientos
  ├── Monitor de diferencias: correr conciliación semanal por 1 mes
  └── Ajustes manuales si hay discrepancias (MovTipo='AJUSTE_POS'/'AJUSTE_NEG')
```

**Herramienta de carga inicial a construir:**
- Pantalla admin: "Carga de Saldo Inicial por Cliente"
- Import desde Excel (para cargar el relevamiento masivo)
- Log de apertura separado para auditoría

---

## 6. Reportes Clave

### 6.1 Estado de Cuenta por Cliente
```
Cliente: Grillito Store | Cód: GrillitoStore | Tipo: Común
Cuenta: DINERO_USD | Condición: 30 días
Saldo actual: USD -1.523,50 (DEUDOR)
─────────────────────────────────────────────────────────────
Fecha       │ Concepto              │ Débito    │ Crédito   │ Saldo
────────────┼───────────────────────┼───────────┼───────────┼──────────
2026-03-01  │ Orden SB-12341        │ 480,00    │           │ -480,00
2026-03-05  │ Orden SB-12398        │ 320,00    │           │ -800,00
2026-03-08  │ Pago Handy R-478      │           │ 480,00    │ -320,00
2026-03-12  │ Orden SB-12501        │ 1.203,50  │           │ -1.523,50
```

### 6.2 Aging — Antigüedad de Deuda
```
Cliente         │ Por vencer │ 1-30 días │ 31-60 días │ +60 días │ Total
────────────────┼────────────┼───────────┼────────────┼──────────┼────────
Grillito Store  │    0,00    │  1.203,50 │   320,00   │    0,00  │ 1.523,50
Entre-telas     │  800,00    │     0,00  │     0,00   │  520,00  │ 1.320,00
Simple Inc      │    0,00    │     0,00  │   180,00   │  890,00  │ 1.070,00
```

### 6.3 Resumen de Saldos (Dashboard gerencial)
- Total deudores vs total créditos a favor
- % cobrado en término vs vencido
- Top 10 deudores
- Alertas de clientes con deuda > límite de crédito

---

## 7. Vistas de Frontend a Crear

| Ruta | Vista | Descripción |
|---|---|---|
| `/caja/cuentas` | `CuentasCorrientesView` | Lista de clientes con saldo actual |
| `/caja/cuentas/:id` | `EstadoCuentaClienteView` | Movimientos + documentos por cliente |
| `/caja/aging` | `AgingView` | Tabla de antigüedad de deuda |
| `/caja/anticipos` | `AnticipoCargaView` | Carga de anticipos y prepagos |
| `/caja/ajustes` | `AjustesContablesView` | Ajustes manuales con autorización |
| `/caja/carga-inicial` | `CargaInicialView` | Solo admin — carga de saldos de apertura |

---

## 8. Fases de Implementación

### Fase 1 — Infraestructura de BD (1-2 días)
- [ ] Crear 5 tablas nuevas con índices
- [ ] Insertar datos iniciales de `CondicionesPago`
- [ ] Stored Procedure `SP_RegistrarMovimiento` (transaccional)
- [ ] Stored Procedure `SP_ImputarPagoFIFO`
- [ ] Job diario para marcar vencidos

### Fase 2 — Backend: Hooks automáticos (2-3 días)
- [ ] [crearRetiro()](file:///c:/Integracion/User-Macrosoft/backend/controllers/webRetirosController.js#9-45) → genera MovimientosCuenta ORDEN + DeudaDocumento
- [ ] [realizarPago()](file:///c:/Integracion/User-Macrosoft/backend/controllers/pagosController.js#15-165) → genera Mov PAGO + imputación FIFO
- [ ] Webhook Handy → genera Mov PAGO + imputación FIFO
- [ ] Endpoints de lectura: estado de cuenta, aging, saldo

### Fase 3 — Frontend básico (2-3 días)
- [ ] `CuentasCorrientesView` — lista de saldos
- [ ] `EstadoCuentaClienteView` — movimientos + documentos
- [ ] `AgingView` + exportar PDF

### Fase 4 — Gestión manual (1-2 días)
- [ ] `AnticipoCargaView` — carga de anticipos
- [ ] `AjustesContablesView` — ajustes con contraseña autorizadora
- [ ] Anulación de movimientos (asiento espejo)

### Fase 5 — Carga inicial (1 día + validación)
- [ ] `CargaInicialView` — import Excel + carga masiva
- [ ] Script de relevamiento de saldos históricos
- [ ] Proceso de conciliación y validación

---

## 9. Notas de Implementación

- **Concurrencia**: `SP_RegistrarMovimiento` debe usar `WITH (UPDLOCK)` en el UPDATE de saldo para evitar condiciones de carrera en pagos simultáneos.
- **Clientes de metros**: su `CuentasCliente.CPaIdCondicion` siempre apunta a "Contado". No generan `DeudaDocumento` — solo `MovimientosCuenta`.
- **Multi-moneda**: un cliente con órdenes en UYU y USD tiene dos cuentas. Los pagos se imputan a la cuenta de la moneda correspondiente.
- **Retroactividad**: los movimientos históricos se cargan como `MovTipo='APERTURA_*'` con fecha igual a la fecha de corte. Nunca se insertan con fechas retroactivas en el flujo automático.
- **Auditoría**: ningún movimiento se elimina (WITHOUT DELETE). Las anulaciones generan asientos espejo con referencia al original via `MovIdAnula`.

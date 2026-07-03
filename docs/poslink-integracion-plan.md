# Plan: Integración POSLink — cobro con POS (tarjetas) integrado a la Caja

**Estado:** 🟡 Propuesta para revisión (nada implementado)
**Fuente:** "Especificación POSLink 1.50" (junio 2026, escritorio) — Resonet/Geocom
**Fecha del análisis:** 2026-07-03

---

## 1. Qué es y qué nos da

POSLink conecta nuestro **sistema de caja (SCA)** con los **pinpads POS** físicos vía el **servidor POSLink (PLS)** de Resonet. Hoy el cobro con tarjeta es manual: el cajero tipea el monto en el POS, cobra, y después registra el pago en la caja a mano — dos sistemas sin hablar, con riesgo de diferencias (typos de monto, pagos registrados que nunca se cobraron y viceversa).

Integrado: el cajero confirma el cobro en la caja → **el monto aparece solo en el POS** → el cliente pasa la tarjeta → la caja recibe el resultado (aprobada/denegada) con código de autorización, ticket, tarjeta enmascarada → **el pago se registra solo**, con la conciliación garantizada.

- **Protocolo:** REST (JSON) contra PLS. SOAP existe pero es legacy — usamos REST.
- **URL homologación:** `https://poslink.hm.opos.com.uy/itdServer/` (producción se entrega al homologar).
- **Modelo:** asíncrono con **polling**: la caja inicia la transacción y consulta el estado cada **2–3 segundos** hasta el resultado final.

## 2. Flujo core (venta simple, fase 1)

Usamos el flujo **sin promociones** (`NeedToReadCard = false`, el default) — el más simple y robusto:

```
Caja                    Backend                  PLS                    POS
 |--- cobrar $X ---------->|                       |                      |
 |                         |-- processFinancialPurchase -->|              |
 |                         |<- ResponseCode 0 + TransactionId             |
 |<-- transactionId -------|                       |                      |
 |                         |                       |<--- POS levanta la venta
 |--- polling c/2.5s ----->|-- processFinancialPurchaseQuery -->|         |
 |<-- RC 10 "aguardando POS"                       |     (cliente pasa tarjeta,
 |<-- RC 12 "procesando"   |                       |      PIN, va al adquirente)
 |<-- RC 0 + PosResponseCode 00 (APROBADA) + AuthorizationCode/Ticket/...  |
 |--- registra el Pago en la caja (flujo actual) --|                      |
```

**Códigos que gobiernan el estado** (Anexo 1/2 de la spec):
- `ResponseCode`: `10` = esperando que el POS capture · `12` = POS procesando · `0` = **finalizada** (el resultado real viene en `PosResponseCode`) · `111` = ya finalizada (re-consulta).
- `PosResponseCode`: `00`/`11`/`08` = **aprobada** · resto = denegada con motivo (mapa completo en Anexo 2: "TARJETA INVALIDA", "DENEGADA", "RETENER TARJETA"...).
- `RemainingExpirationTime`: segundos restantes — **es la referencia oficial para timeouts y reversas**.

**Datos clave del request** (`processFinancialPurchase`):
- `PosID` (terminal), `SystemId` (nos lo asigna Resonet), `Branch`, `ClientAppId` (id de caja), `UserId` (cajero).
- `Amount`/`InvoiceAmount`: **string de centavos sin separadores** ("1.200,50" → `"120050"`).
- `Currency`: `"858"` UYU / `"840"` USD → mapea directo de nuestro `MonIdMoneda` 1/2.
- `Quotas`: mandar `1` (con `0` el POS pregunta cuotas en pantalla — la spec lo desaconseja).
- `InvoiceNumber`: **máx 7 chars** — usar el `TcaIdTransaccion` (o serie+número CFE truncado).
- `TaxRefund`/`TaxableAmount`: devolución de IVA ley 17.934/20.419 (Anexo 3) — ver pregunta P6.

**Respuesta final** (query): `AuthorizationCode` (⚠️ hasta **20 chars** desde v1.34), `Ticket`, `Batch`, `CardNumber` (enmascarada), `Issuer`/`Acquirer`, `InputMode`, `EmvApplicationName` — todo se guarda para auditoría/conciliación.

## 3. Arquitectura propuesta

**El backend es el único que habla con PLS** (el `SystemId` es secreto y el flujo necesita estado confiable). El frontend pollea a *nuestro* backend.

### 3.1 SQL (tablas nuevas)

```sql
-- Mapa caja → terminal POS (cada PC de caja tiene su pinpad)
CREATE TABLE dbo.PosTerminales (
    ID INT IDENTITY PRIMARY KEY,
    ClientAppId NVARCHAR(100) NOT NULL,   -- id de caja (matchea la sesión/PC de caja)
    PosID NVARCHAR(10) NOT NULL,          -- terminal asignado por Resonet
    Descripcion NVARCHAR(100) NULL,
    Activo BIT NOT NULL DEFAULT 1
);

-- Toda transacción POSLink que iniciamos: auditoría + máquina de estados + reversas
CREATE TABLE dbo.PosTransacciones (
    PtxId INT IDENTITY PRIMARY KEY,
    TransactionId BIGINT NULL,            -- id de PLS (19 dígitos) — usar STransactionId si hace falta
    PosID NVARCHAR(10) NOT NULL,
    TcaIdTransaccion INT NULL,            -- link a TransaccionesCaja (cuando se concreta)
    PagIdPago INT NULL,                   -- link al Pago registrado
    Tipo NVARCHAR(20) NOT NULL,           -- VENTA | ANULACION | DEVOLUCION | REVERSA
    Estado NVARCHAR(20) NOT NULL,         -- INICIADA | EN_POS | APROBADA | DENEGADA | CANCELADA | EXPIRADA | REVERSADA
    Monto DECIMAL(18,2) NOT NULL,
    MonIdMoneda INT NOT NULL,
    ResponseCode INT NULL,
    PosResponseCode NVARCHAR(10) NULL,
    AuthorizationCode NVARCHAR(20) NULL,  -- ⚠️ 20 chars (billeteras)
    Ticket NVARCHAR(10) NULL,
    Batch NVARCHAR(5) NULL,
    CardNumber NVARCHAR(50) NULL,         -- enmascarada, viene así de PLS
    Issuer INT NULL, Acquirer INT NULL,
    RawRespuesta NVARCHAR(MAX) NULL,      -- JSON completo de la última query (debug/conciliación)
    UsuarioId INT NULL,
    FechaInicio DATETIME NOT NULL DEFAULT GETDATE(),
    FechaFin DATETIME NULL
);
```

Config global (`SystemId`, `Branch`, URL) en **variables de entorno** (`POSLINK_URL`, `POSLINK_SYSTEM_ID`, `POSLINK_BRANCH`) — secretos fuera de la DB, patrón ya usado (Drive, Callbell).

### 3.2 Backend

**`backend/services/poslinkService.js`** (nuevo) — cliente REST puro, sin lógica de negocio:
- `iniciarVenta({posId, monto, monedaId, invoiceNumber, userId, clientAppId})` → `processFinancialPurchase` (con `TransactionDateTimeyyyyMMddHHmmssSSS` generado acá).
- `consultarEstado(transactionId, posId, ...)` → `processFinancialPurchaseQuery`.
- `cancelar(...)` → `cancelFinancialPurchase` (solo válida con RC 10, según spec).
- `anular(ticketOriginal, ...)` → `processFinancialPurchaseVoidByTicket` (mismo lote abierto, monto total).
- `devolver(datosOriginales, ...)` → `processFinancialPurchaseRefund` (lote cerrado, parcial o total).
- `reversar(transactionId, ...)` → `processFinancialReverse`.
- `cierreLote(posId)` → `processCloseQuery`.
- Helpers: `aCentavos(1200.50) → "120050"`, `monedaISO(monIdMoneda) → "858"|"840"`, **axios con timeout corto (10s)** — nunca colgar la caja esperando a PLS.

**`backend/controllers/poslinkController.js` + `backend/routes/poslinkRoutes.js`** (nuevos), montado en `/api/poslink`, con `verifyToken`:
- `POST /venta` — valida, resuelve `PosID` desde `PosTerminales` por la caja del usuario, inserta `PosTransacciones` (INICIADA), llama `iniciarVenta`, devuelve `ptxId`.
- `GET /estado/:ptxId` — consulta PLS, actualiza `PosTransacciones` (estado + raw), devuelve estado normalizado al front: `{estado, mensaje, authorizationCode?, ticket?, remainingTime}`. **Server-side throttle**: si el front pregunta más seguido que cada 2s, responder cache (respeta el "2-3s" de la spec).
- `POST /cancelar/:ptxId` — solo si el último RC fue 10.
- `POST /anular` / `POST /devolucion` — fase 3.
- `POST /cierre` — fase 4.
- **Regla de reversa** (de la spec, venta simple): si en el polling llega `ResponseCode 12` con `RemainingExpirationTime == 0` → la transacción murió a mitad de camino → `processFinancialReverse` automático + estado `REVERSADA` + avisar al cajero que repita el cobro. La reversa queda encolada en el POS y sale antes de la próxima transacción.
- **Recuperación**: al iniciar una venta nueva para un `PosID`, si hay una `PosTransacciones` colgada (INICIADA/EN_POS vieja), resolverla primero (query → si expiró con RC12, reversar; si aprobó, ofrecer vincular el pago).

### 3.3 Frontend (Caja)

- **`MetodosPagos`**: registro nuevo **"Tarjeta (POS integrado)"** (o flag `MPaEsPOS BIT` sobre el método Tarjeta existente — ver P3). El motor contable/CFE lo trata igual que el método tarjeta actual.
- **`CobroPOSModal.jsx`** (nuevo, en `src/components/pages/`): se abre desde `CajaPanelPago` cuando el pago usa ese método. Muestra monto grande + estado en vivo:
  - `Enviando al POS…` → `Esperando tarjeta…` (RC 10) → `Procesando…` (RC 12) → ✅ `APROBADA` (auth + ticket + tarjeta) / ❌ `DENEGADA` (motivo del Anexo 2 en español) / `Cancelada` / `Expirada — reintentá`.
  - Botón **Cancelar** habilitado solo mientras RC 10 (regla de la spec: después se cancela con el botón rojo del POS).
  - Polling `GET /estado` cada 2.5s con `setInterval` + cleanup (sin colgar la UI — lección del tótem: nada bloqueante en el camino crítico).
- **Al aprobar**: el modal devuelve `{ptxId, authorizationCode, ticket, cardNumber}` a `CajaPanelPago`, que completa el flujo actual de `procesarTransaccion` (TransaccionesCaja + Pagos + motor contable + CFE, sin cambios) y el backend linkea `PosTransacciones.PagIdPago`. En `Pagos` la referencia va en el campo de referencia existente (`PagRutaComprobante`/observaciones: `POS Auth 077629 Ticket 209`).
- **El voucher lo imprime el POS** (pinpads con impresora) — no tocamos nuestra impresión.

## 4. Fases

| Fase | Contenido | Riesgo |
|---|---|---|
| **F0 — Prerrequisitos** | Contrato/alta con Resonet: `SystemId`, `PosID`s, acceso a homologación + terminal de prueba. **Sin esto no se puede probar nada.** | Trámite externo |
| **F1 — Venta simple** | Tablas + service + controller + modal en caja + registro automático del pago. Homologar contra `poslink.hm`. | Medio |
| **F2 — Robustez** | Cancelación, reversas automáticas (RC12 + RET=0), recuperación de transacciones colgadas, mapa completo Anexo 2 en español. | **Alto — acá está la plata** |
| **F3 — Anulación/Devolución** | Anular pago del día (lote abierto, por Ticket) y devolución (lote cerrado) desde el flujo de anulación existente de la caja. | Medio |
| **F4 — Cierre y conciliación** | Cierre de lote (botón admin), reporte diario `processQuery` vs `Pagos` del día (detecta diferencias caja↔POS). | Bajo |
| **F5 — Futuro: tótem autoservicio** | La spec contempla explícitamente SCA-tótem (Lane 3000/5000/7000) con **reversas obligatorias**. Cobrar el retiro en el tótem sin cajero. Requiere comprar Lanes. | Alto |

## 5. Riesgos y decisiones técnicas

- **Homologación obligatoria**: Resonet certifica la integración contra el ambiente de homologación antes de dar producción. F1 no se puede validar sin terminal de prueba.
- **Es dinero real**: el estado de cada transacción tiene que quedar persistido en `PosTransacciones` ANTES de hablar con PLS (nunca depender solo de memoria — si el backend se reinicia a mitad de un cobro, la recuperación lo resuelve). Doble cobro es el peor escenario: la máquina de estados + reversas de F2 existen para eso.
- **Timeouts**: `RemainingExpirationTime` es la única referencia válida (arranca en 240s, baja según etapa). No inventar timeouts propios.
- **Nada bloqueante en la caja**: polling con estados visibles, la cajera siempre puede seguir operando (lección del tótem/print).
- **Montos**: SIEMPRE string de centavos. Un helper único y testeado — un error acá cobra 100× o /100.
- **`AuthorizationCode` 20 chars** (billeteras TOKE/Pago Después devuelven códigos largos + `CardNumber 999999******9999`): dimensionar columnas desde el día 1.
- **Billeteras** (TOKE, etc.): pueden quedar en estado `TP` (pendiente) que exige verificación manual en el POS — las dejamos explícitamente FUERA de F1 (funcionan igual si el POS las acepta, pero el manejo fino es fase posterior).
- **SOAP**: no usar, legacy.

## 6. Preguntas para vos (antes de arrancar)

> **P1 — ¿Cuántas cajas y cuántos pinpads hay?** ¿Un POS por caja (mapa fijo `PosTerminales`) o compartidos (usar `TerminalGroup`)?
>
> **R:** _(pendiente)_

> **P2 — ¿Ya tienen relación con Resonet/Geocom?** ¿Hay `SystemId` asignado o hay que iniciar el alta? ¿Tienen fecha para el terminal de homologación?
>
> **R:** _(pendiente)_

> **P3 — Método de pago:** ¿creamos "Tarjeta (POS)" nuevo en `MetodosPagos`, o le ponemos un flag al método Tarjeta existente (Metodo=4)? Impacta reportes/motor contable — nuevo método = se distingue en todos lados; flag = transparente.
>
> **R:** _(pendiente)_

> **P4 — Cuotas y planes:** ¿la caja debe ofrecer cuotas (selector antes de mandar al POS), siempre contado (Quotas=1), o que el POS pregunte (no recomendado por la spec)?
>
> **R:** _(pendiente)_

> **P5 — ¿USD además de UYU?** La caja ya maneja ambas monedas; ¿el POS/adquirente tiene habilitado 840?
>
> **R:** _(pendiente)_

> **P6 — Devolución de IVA (TaxRefund/ley):** ¿aplica al rubro? Hoy el CFE calcula IVA — ¿mandamos `TaxRefund` + `TaxableAmount` o `0`? (Anexo 3; consultarlo con el contador.)
>
> **R:** _(pendiente)_

> **P7 — Alcance F3:** ¿anulación/devolución por POS es requisito de arranque o alcanza con el flujo manual actual (anular en el POS a mano) hasta F3?
>
> **R:** _(pendiente)_

> **P8 — ¿Propina?** (`TipAmount`) — asumo que NO aplica.
>
> **R:** _(pendiente)_

---

## 7. Resumen de archivos a crear/tocar

| Archivo | Acción |
|---|---|
| `backend/services/poslinkService.js` | NUEVO — cliente REST PLS |
| `backend/controllers/poslinkController.js` | NUEVO — venta/estado/cancelar/reversa + máquina de estados |
| `backend/routes/poslinkRoutes.js` + `server.js` | NUEVO + montar `/api/poslink` |
| SQL | `PosTerminales`, `PosTransacciones`, registro en `MetodosPagos` |
| `src/components/pages/CobroPOSModal.jsx` | NUEVO — UI del cobro en vivo |
| `src/components/pages/CajaPanelPago.jsx` | Hook del método POS → abre modal → completa pago |
| `.env` | `POSLINK_URL`, `POSLINK_SYSTEM_ID`, `POSLINK_BRANCH` |

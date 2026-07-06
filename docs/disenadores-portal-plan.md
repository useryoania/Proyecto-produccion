# Plan: Diseñadores en el portal — subir pedidos en nombre de clientes

**Estado:** 🟢 F1+F2+F3+F4 IMPLEMENTADAS (2026-07-06) — registro/login, vínculos, toggle, creación impersonada, seguimiento del diseñador (`GET /web-designer/mis-pedidos` + sección "Mis Pedidos" en DesignerHomeView), badge "Creado por tu diseñador" en FactoryView del cliente, y hold de aprobación: si `Clientes.AprobarPedidosDisenador=1` y la orden tiene `DisenadorID`, al completar archivos queda en 'Cargando...' con `Ordenes.AprobacionPendiente=1` (invisible para producción) hasta que el cliente la aprueba (`POST /web-orders/aprobar-pedido`, chip ámbar + botón Aprobar en FactoryView). SQL extra F4: `ALTER TABLE dbo.Ordenes ADD AprobacionPendiente BIT NOT NULL DEFAULT 0;`. Pendiente menor: pantalla admin para aprobar diseñadores (hoy `UPDATE Disenadores SET Aprobado=1`).
**Fecha:** 2026-07-06

**Decisiones tomadas (respuestas del usuario):** P1 se registran solos + aprobación de USER (`Aprobado`, v1 por SQL). P2 **varios diseñadores por cliente** (tabla puente `ClienteDisenadores`, no columna). P3 el diseñador solo crea pedidos + ve el estado de LOS SUYOS, sin precios/cuenta/pagos. P4 diseñador NO es cliente (cuentas separadas). P5 la deuda es del cliente. P6 **toggle por cliente** `Clientes.AprobarPedidosDisenador` (default 0 = entra directo a producción). P7 sin avisos al diseñador. El lado del diseñador es un **selector de clientes** (puede tener varios).

## 1. La idea (confirmada)

Algunos clientes no diseñan y tercerizan en diseñadores. Se quiere:
1. **Registro de diseñadores** (cuenta propia en el portal).
2. Que el **cliente elija su diseñador desde su perfil** (opcional) — la autorización la da el cliente, el diseñador nunca se auto-asigna.
3. Que el diseñador **cree pedidos como si fuera ese cliente**: el pedido queda a nombre del cliente (facturación, avisos WSP, retiro — todo el flujo actual intacto), con registro de qué diseñador lo creó.

## 2. Cómo encaja en el sistema actual

El portal autentica contra `Clientes` (JWT con `role: 'WEB_CLIENT'`, `codCliente`) y `createWebOrder` toma el cliente del token. La clave del diseño: **la impersonación se resuelve en el backend validando el vínculo**, nunca confiando en un id que mande el navegador.

### 2.1 SQL

```sql
CREATE TABLE dbo.Disenadores (
    DisenadorID INT IDENTITY PRIMARY KEY,
    Nombre NVARCHAR(200) NOT NULL,
    Email NVARCHAR(200) NOT NULL,
    Telefono NVARCHAR(50) NULL,
    WebPasswordHash NVARCHAR(300) NULL,
    Aprobado BIT NOT NULL DEFAULT 0,      -- alta con aprobación (ver P1)
    Activo BIT NOT NULL DEFAULT 1,
    FechaAlta DATETIME NOT NULL DEFAULT GETDATE()
);

ALTER TABLE dbo.Clientes ADD DisenadorID INT NULL;   -- el diseñador elegido por el cliente
ALTER TABLE dbo.Ordenes  ADD DisenadorID INT NULL;   -- auditoría: quién creó el pedido
```

### 2.2 Backend

- **Login unificado** (`webAuthController`): si el identificador no matchea `Clientes`, buscar en `Disenadores` → token con `role: 'WEB_DESIGNER'` + `disenadorId`. (Registro: espejo del `/register` actual con `Aprobado = 0`.)
- **`GET /web-designer/mis-clientes`**: `SELECT ... FROM Clientes WHERE DisenadorID = @token.disenadorId` — los clientes que LO eligieron.
- **Middleware de impersonación**: para rutas del portal que el diseñador necesite, si `role = WEB_DESIGNER` y viene `X-Cliente-CodCliente` (header), validar `Clientes.DisenadorID = token.disenadorId` → inyectar en `req.user` los datos del cliente (codCliente, cliIdCliente, nombre) + mantener `req.disenadorId`. Si el vínculo no existe → 403. **Toda la seguridad vive acá.**
- **`createWebOrder`**: sin cambios de flujo — el cliente sale de `req.user` como siempre; solo se estampa `Ordenes.DisenadorID = req.disenadorId ?? NULL`.
- **Alcance de endpoints impersonables (whitelist)**: crear pedido + materiales/variantes + subir archivos + ver estado de pedidos (según P3). Explícitamente FUERA: pagos, cuenta corriente, retiros, datos de facturación (según P3).
- **Cliente elige diseñador**: `PUT /web-orders/mi-perfil/disenador { disenadorId | null }` + `GET /web-designer/directorio` (activos y aprobados) para el selector.

### 2.3 Frontend (portal)

- **Registro/Login diseñador**: misma LoginPage (el backend resuelve el tipo); registro con un toggle "Soy diseñador" o ruta propia.
- **Perfil del cliente** (`ProfileEdit`): selector "Mi diseñador" (opcional, lista del directorio) + quitar.
- **Vista del diseñador** (nueva, `DesignerClientsView`): lista "Mis clientes" → botón "Crear pedido para {cliente}" → entra al `OrderForm` normal con un **banner fijo "Estás creando un pedido para {cliente}"** y el header de impersonación en las llamadas (apiClient lo agrega mientras dure la sesión de trabajo sobre ese cliente).
- **FactoryView del diseñador**: los pedidos de sus clientes creados por él (filtro `Ordenes.DisenadorID`), solo estado — sin montos si P3 lo define así.
- El **cliente ve los pedidos del diseñador como propios** (son suyos) — con un badge "Creado por tu diseñador {nombre}".

## 3. Fases

| Fase | Contenido |
|---|---|
| **F1** | SQL + registro/login diseñador + selector en perfil del cliente + directorio |
| **F2** | Middleware de impersonación + "Mis clientes" + crear pedido en nombre del cliente (flujo completo con archivos) |
| **F3** | Seguimiento: FactoryView del diseñador (sus pedidos), badge en la vista del cliente, `DisenadorID` visible en producción/admin |
| **F4 (opcional)** | Aprobación del pedido por el cliente antes de entrar a producción (ver P6), notificaciones al diseñador |

## 4. Preguntas antes de arrancar

> **P1 — Alta de diseñadores:** ¿se registran solos y ustedes los aprueban (flag `Aprobado`), o los da de alta el admin directamente?
>
> **R:** _(pendiente)_

> **P2 — ¿Un cliente tiene UN diseñador o puede tener varios?** (el plan asume uno; varios = tabla puente en vez de columna)
>
> **R:** _(pendiente)_

> **P3 — ¿Qué ve el diseñador del cliente?** Propongo: crear pedidos + ver el estado de LOS PEDIDOS QUE ÉL CREÓ, sin precios, sin cuenta corriente, sin pagos, sin retiros. ¿Va así, o necesita ver más (todos los pedidos del cliente / precios para cotizar)?
>
> **R:** _(pendiente)_

> **P4 — ¿Un diseñador puede además ser cliente** (comprar para sí mismo)? ¿Cuenta separada o la misma?
>
> **R:** _(pendiente)_

> **P5 — Deuda/pago:** el pedido queda a nombre del cliente → la deuda es del cliente, como si lo hubiera subido él. ¿Confirmado?
>
> **R:** _(pendiente)_

> **P6 — ¿El pedido del diseñador entra DIRECTO a producción o el cliente debe aprobarlo antes?** Es la decisión más importante: el diseñador está gastando plata del cliente. Directo = más ágil; con aprobación = un estado intermedio "Esperando aprobación del cliente" + botón aprobar en el portal del cliente (F4).
>
> **R:** _(pendiente)_

> **P7 — ¿Avisos al diseñador?** (WSP/email cuando el pedido que subió está pronto). Los avisos al cliente siguen igual.
>
> **R:** _(pendiente)_

## 5. Riesgos / cuidados

- **Seguridad**: el vínculo cliente→diseñador se valida SIEMPRE server-side en el middleware; el header de impersonación sin vínculo válido = 403 + auditoría.
- **Aislamiento**: el diseñador con varios clientes nunca debe ver datos cruzados — el filtro es por el vínculo, no por listas del frontend.
- **Precios**: el OrderForm de algunos servicios muestra/calcula precios — si P3 dice "sin precios", hay que ocultarlos en modo impersonado.
- **Revocación**: si el cliente quita al diseñador, este pierde el acceso al instante (el vínculo se chequea por request); sus pedidos ya creados quedan (histórico con `Ordenes.DisenadorID`).
- Los -F/-R y todo el flujo interno de producción no cambian: la orden es del cliente.

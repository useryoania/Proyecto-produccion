# Plan: Impresión parcial (avance por unidades) — arranca en TPU

> Estado: **IMPLEMENTADO (F1+F2) el 20/07/26** — falta deploy (restart backend + build front).
> La columna `Ordenes.CantidadImpresa` se autocrea (`ensureOrderColumns`). F3 (trazabilidad
> por tanda) queda opcional a futuro.
>
> **Decisiones tomadas:** escudos fallados → se descartan y reimprimen (el contador solo
> cuenta buenos) · la orden parcial vuelve a la **Mesa de Armado** · el contador **puede
> bajar** (correcciones) · las cards TPU muestran **unidades**, no metros.
>
> **Nota de implementación:** el gate de "Finalizar Lote" del front había pasado a ser
> exclusivo de SB; el backend quedó alineado (bloqueo duro solo SB, TPU = parcial → mesa,
> resto sin exigencia de marcado).

## Problema

Un trabajo de TPU puede ser de 1000 escudos. Si en el día se imprimen 200, hoy no
hay forma de registrarlo: `Ordenes.Impreso` es un **BIT** (todo o nada). El operario
no puede marcar nada, y al otro día nadie sabe cuántos faltan.

## Cómo es TPU físicamente (esto define el modelo)

- Una orden de TPU tiene **5 archivos que NO son 5 trabajos**: son las **capas de una
  misma impresión** — cmyk, relieve, relieve 2, barniz (se imprimen una encima de la
  otra en PhotoPrint) y un **archivo de corte** que usa la máquina de corte.
  → A efectos de producción, **los 5 archivos son UNA sola cosa**.
- Se imprime en **planchas**: una grilla de escudos, múltiplo de 5 a lo ancho
  (5x5, 5x6, 5x3…). **La cantidad por plancha varía.**
- Dentro de una plancha **algunos escudos pueden salir mal**, así que no sirve marcar
  "plancha impresa": técnicamente no lo está. **El avance se cuenta por unidad.**

Conclusión: **un contador por ORDEN, en unidades**. No por archivo, no por plancha.

## Dónde vive la cantidad (verificado)

En TPU la orden va con **`UM = 'U'`** y `Ordenes.Magnitud` = **la cantidad de unidades
que pidió el cliente**. Verificado sobre TPU-5938:

```
Magnitud=4   UM='U'   Archivos=5   TotalCopias=5   TotalMetros=0.00
```

Las 5 copias son una por capa; los metros son 0. El sync
([RestSyncController.js:437-450](../backend/controllers/RestSyncController.js)) ya hace
esta distinción: `Magnitud` = metros si `UM` empieza con "M", si no = cantidad.

> Ojo: en otras áreas (SB, DF) `Magnitud` son **metros**. Por eso el contador arranca
> acotado a TPU / órdenes con `UM='U'`.

## Modelo de datos

- **Nueva columna**: `Ordenes.CantidadImpresa INT NOT NULL DEFAULT 0` — unidades buenas
  ya impresas.
- **Total** = `Ordenes.Magnitud` (unidades, con `UM='U'`).
- **`Ordenes.Impreso` queda como flag derivado**: pasa a 1 cuando
  `CantidadImpresa >= Magnitud`; vuelve a 0 si baja.
  **Esto es lo que evita romper lo existente**: el gate de "Fin Producción", el contador
  "0/25 impresas", la regla secuencial y el tick verde siguen leyendo `Impreso` sin
  enterarse del cambio.
- Totales de un lote: `SUM(CantidadImpresa)` / `SUM(Magnitud)` sobre sus órdenes.

El contador cuenta **unidades buenas**: si de una plancha de 25 salen 3 mal, se cargan 22.

## Flujo elegido (opción B): la orden vuelve a la cola con su saldo

Al dar **Fin Producción** en un lote:

- Órdenes **completas** → siguen el flujo normal.
- Órdenes **parciales** (`0 < CantidadImpresa < Magnitud`) → salen del lote
  (`RolloID = NULL`), vuelven a la cola conservando `CantidadImpresa`. Otro día entran
  en un lote nuevo y el operario continúa desde donde quedó.
- Órdenes en **0** → igual, vuelven a la cola.

Las unidades ya impresas **no avanzan solas** a la siguiente etapa: la orden avanza
recién cuando está completa.

## ⚠️ Choca con el gate de "Fin Producción" (hecho el 16/07)

Hoy el botón está **bloqueado** si queda alguna orden sin marcar impresa. Con impresión
parcial eso haría **imposible cerrar un lote con parciales** — justo el caso que
queremos habilitar. Cambio propuesto:

- Lote con **todas completas** → finaliza como hoy, sin fricción.
- Lote con **parciales o sin empezar** → permite finalizar, con **confirmación
  explícita** que liste qué vuelve a la cola ("TPU-5938 vuelve con 200/1000"). Aviso,
  no bloqueo.
- El bloqueo duro se mantiene **solo en áreas sin impresión parcial**.

## UI

1. **Detalle del lote** (`RollDetailsModal`): el tick de la orden **ya es por orden**
   (no por archivo), así que se reemplaza por un contador **`200 / 1000`** con input
   para cargar la tanda del día. El tick verde aparece solo al completar. Se mantiene
   la regla secuencial y `UPDLOCK` del lado del backend (mismo patrón que
   `updateFileCopyCount` en Control, que ya resuelve el conteo concurrente).
2. **Cards de lote** (planeación / mesa de armado): agregar **`IMPRESOS x/y`** junto a
   ÓRDENES y METROS, para saber de antemano cómo viene cada lote. Requiere sumar los
   agregados en `getBoardData` (`rollsController`).

## Alcance

Arranca **solo en TPU** (por `AreaID`), con un flag por área para extenderlo después
sin tocar código.

## Fases

1. **F1** — Columna + endpoint de avance + derivación de `Impreso` + contador en el
   detalle del lote. *Resuelve el problema operativo.*
2. **F2** — `IMPRESOS x/y` en las cards de lote + ajuste del gate de Fin Producción.
3. **F3 (opcional)** — Tabla `AvancesProduccion (OrdenID, Cantidad, Fecha, UsuarioID,
   RolloID)` para trazabilidad ("200 el lunes por Juan"). El contador pasa a ser la
   suma. No toca nada de F1/F2.

## Preguntas abiertas

1. **Los escudos que salen mal**: hoy se descartan y se reimprimen (el contador solo
   sube con los buenos). ¿Alcanza, o hay que registrar el descarte en algún lado
   (material consumido / merma)? Existe el flujo de **falla** (`-F`), pero es
   whole-file y no encaja con "3 de 25 escudos".
2. **¿A qué cola vuelve** la orden parcial: a la mesa de armado, o a "sin asignar"?
3. ¿Se puede **bajar** el contador para corregir una carga mal hecha, o solo suma?
4. **Ocupación del lote**: hoy el rollo suma `Magnitud` completa. Si TPU-5938 son 4
   unidades y el lote muestra "4.00 m" (ver captura), la card ya está mezclando
   unidades con metros. ¿Querés que lo corrija de paso, o lo dejamos para otro momento?

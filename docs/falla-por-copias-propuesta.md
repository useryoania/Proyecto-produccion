# Propuesta: Falla por copias (Control / Empaquetado)

> Estado: **propuesta a futuro**. Por ahora se implementó una restricción simple
> (ver "Solución temporal" al final). Este doc queda para implementar el modelo
> completo más adelante.

## Contexto / archivos

- Front: `src/components/pages/FilePrintControl.jsx` (vista Control) y
  `src/components/production/components/FileControlCard.jsx` (card por archivo).
- Back: `backend/controllers/productionFileController.js`
  - `postControlArchivo` (estado FALLA/CANCELADO) → crea/reutiliza la orden -F.
  - `updateFileCopyCount` (botón "+", conteo de copias y "heal" de la madre).
- Tablas: `ArchivosOrden` (Copias, Controlcopias, EstadoArchivo), `Ordenes`,
  `FallasProduccion`.

## Cómo funciona hoy la falla (whole-file)

1. Reportás falla en un archivo (`postControlArchivo`, estado `FALLA`):
   - Marca el archivo madre `EstadoArchivo='FALLA'` (bloquea el archivo entero).
   - La orden madre pasa a `Con Falla` + nota `[Esperando Reposición]`.
   - Crea (o **reutiliza** si ya existe) una **orden -F** `"{código}-F{archivoId}"`,
     clonando el archivo **con las mismas `Copias`** del original (solo pisa
     `Metros` con "metros a reponer"). → ver `productionFileController.js` ~525-534.
   - Inserta en `FallasProduccion`.
2. La -F se reimprime y se controla como cualquier orden.
3. Al completar el archivo de la -F (`updateFileCopyCount`, newCount >= total),
   **"sana" la madre**: busca el archivo madre por `NombreArchivo` con
   `EstadoArchivo='FALLA'` y lo pone `EstadoArchivo='OK'`, `Controlcopias=Copias`
   (todo). → ver `productionFileController.js` ~1240-1262.
4. `handleCorregirFalla` (front) finaliza la -F y navega a la madre.

## Problemas con copias múltiples (ej. x3)

- **Bloqueo**: al reportar falla, el archivo entero queda `FALLA`, se oculta el
  botón "+" y no se pueden controlar las copias buenas restantes.
- **Repone de más**: la -F clona `Copias` tal cual → reimprime las 3 aunque haya
  fallado 1 (desperdicio de material/metros).

El modelo es "todo o nada por archivo".

## Modelo propuesto: falla por copias

- En el modal de falla, campo **"copias falladas"** `f` (default 1, máx = copias
  que faltan controlar).
- El archivo madre **no se bloquea**: las copias buenas se siguen marcando OK; las
  `f` falladas quedan contadas como "en reposición".
- La **-F repone solo `f` copias** (`Copias = f`), no todas.
- Al controlar la -F, **heal parcial**: `Controlcopias += f` en la madre (en vez de
  `= Copias`). El archivo queda `OK` cuando *(buenas controladas + repuestas) = total*.
- Sigue siendo **una sola orden** (la reposición se consolida en la madre).

### Cambios necesarios

- **DB**: columna nueva `ArchivosOrden.CopiasFalladas INT NOT NULL DEFAULT 0`
  (copias en reposición). "Completo" = `Controlcopias + CopiasFalladas >= Copias`.
- **`postControlArchivo`**:
  - Recibir `copiasFalladas` (`f`).
  - La -F: `Copias = f` (no clonar el total).
  - Madre: `CopiasFalladas += f`; **no** setear `EstadoArchivo='FALLA'` si quedan
    copias buenas por controlar (usar estado parcial o dejar `Pendiente` + contador).
  - `FallasProduccion.CantidadFalla` podría pasar a contar copias (hoy guarda metros).
- **`updateFileCopyCount`**:
  - Permitir incrementar aunque haya falla pendiente (`CopiasFalladas > 0`).
  - "Completo" cuando `Controlcopias + CopiasFalladas >= Copias`.
  - Heal **parcial**: al completar la -F, `madre.Controlcopias += f`,
    `madre.CopiasFalladas -= f`; si llega al total → `EstadoArchivo='OK'`.
- **Front (`FileControlCard`)**: no bloquear la card tras falla; mostrar "+"
  mientras queden copias buenas; badge de copias falladas; campo "cantidad" en el
  modal de falla (`FilePrintControl.jsx`).
- **Compatibilidad**: las fallas viejas (whole-file, `CopiasFalladas=0`) deben
  seguir sanando como hoy.

### Puntos a probar

- Falla 1 de 3 → repone 1, controlás las otras 2, al sanar la -F queda 3/3 OK.
- Falla todas (3 de 3).
- Falla sobre una orden -F.
- Falla en archivo de 1 copia (comportamiento actual).
- Reutilización de la -F existente con múltiples fallas del mismo archivo.

### Riesgo

Flujo crítico: clona órdenes, sana la madre, genera etiquetas y arma canastos.
Implementar con cuidado y test manual de los casos de arriba.

## Solución temporal (implementada)

Mientras tanto, para evitar el bug del bloqueo: **si un archivo tiene más de una
copia, la falla solo se puede reportar en la ÚLTIMA copia** (cuando ya se
controlaron todas menos una: `controlCount === totalCopies - 1`). En archivos de 1
copia no hay restricción. Implementado en `FileControlCard.jsx` (botón de falla
deshabilitado salvo en la última copia).

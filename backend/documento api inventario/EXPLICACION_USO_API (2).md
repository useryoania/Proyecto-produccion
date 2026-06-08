# Manual de Uso de la API de Sincronización WMS y Egresos de Stock

Este documento detalla la estructura y el uso de los endpoints de la API de integración del WMS para sincronizar artículos, variantes y actualizar el stock en tiempo real.

---

## 1. Conceptos del Modelo del Catálogo (WMS)

El sistema de stock organiza los artículos en una estructura jerárquica para evitar redundancias y soportar múltiples variantes físicas (por ejemplo: remeras en distintos talles y colores, o rollos de tela con distintos anchos):

### A. Familia / Categoría (`cat_nombre`)
Representa la familia principal a la que pertenece el producto.
*Ejemplo: "TELAS", "LONAS, VINILOS Y OTROS", "INSUMOS".*

### B. Producto Maestro (`producto_nombre`)
Es el producto base o "padre". Contiene los atributos globales que comparten todas sus variantes, como la unidad de medida o el tipo de gestión.
*Ejemplo: "Vinilo Brillo R/ xm", "ADIS ELASTIZADO".*

### C. Variante (`nombre_variante` / `sku`)
Es el artículo final físico con el que se opera y que tiene código de barra asignado. Hereda los datos del Producto Maestro y especifica características puntuales.
*Ejemplo: "Adis Elastizado 1,83" con SKU "TEL-ADIS-2-18".*

---

## 2. Consulta de Artículos y Stock Real (Real-time)

### Endpoint: `GET /api/articulos`
Devuelve la lista completa de todas las variantes registradas en el WMS, asociadas a sus productos maestros y familias correspondientes, junto con la disponibilidad de stock consolidada y el desglose de stock por cada depósito/sucursal en tiempo real.

#### Respuesta JSON (Ejemplo de objeto retornado):
```json
[
  {
    "id": "143",
    "nombre": "Vinilo Brillo R/ xm - BLANCO - 1,52 - BRILLO - BLANCO",
    "nombre_variante": "BLANCO - 1,52 - BRILLO - BLANCO",
    "sku": "LON-VINIL-1-VAR-VINI-BLAN-152-BR",
    "categoria_id": 18,
    "producto_maestro_id": 22,
    "producto_nombre": "Vinilo Brillo R/ xm",
    "cat_nombre": "LONAS, VINILOS Y OTROS",
    "unidad_base": "mts",
    "tipo_gestion": "granel",
    "moneda": "USD",
    "costo": 71.00,
    "stock_total": 154,
    "stock_por_deposito": [
      {
        "deposito_id": "1",
        "deposito_nombre": "Centro de stock general",
        "stock": 149
      },
      {
        "deposito_id": "3",
        "deposito_nombre": "ECOUV",
        "stock": 5
      }
    ]
  }
]
```

### ¿Cómo interpretar y tomar el Stock?

Para que el sistema externo sepa con certeza qué cantidad está disponible para vender o consumir, se incluyen dos valores de stock calculados en tiempo real sumando los saldos de los lotes activos (`Stock_Etiquetas` con `estado = 'activo'`):

1. **`stock_total`**:
   * **Qué es:** La suma consolidada de todo el stock de esta variante en todos los depósitos/sucursales de la red.
   * **Cuándo usarlo:** Para conocer la disponibilidad global de la empresa.

2. **`stock_por_deposito`**:
   * **Qué es:** Un listado de objetos que contiene la cantidad de stock detallada por cada sucursal/almacén físico individual.
   * **Atributos:**
     * `deposito_id`: ID del depósito (ej: "1" para depósito central, "3" para sucursal secundaria).
     * `deposito_nombre`: Nombre de la sucursal física.
     * `stock`: Cantidad disponible en tiempo real en esa ubicación específica.
   * **Cuándo usarlo:** Para segmentar el stock disponible según la ubicación de despacho del pedido online, o para habilitar al usuario la selección de en cuál sucursal física retirar su compra (Retiro en Sucursal).

---

## 3. Dar de Baja / Descontar Stock (Criterio FIFO)

### Endpoint: `POST /api/articulos/descontar`
Permite dar de baja (descontar) stock físico del WMS en tiempo real tras concretarse una venta o consumo. El sistema buscará de manera automática las etiquetas físicas activas y restará el stock aplicando la metodología **FIFO (First-In, First-Out / Primero en entrar, primero en salir)** para agotar primero los lotes más antiguos.

#### Cuerpo de la Petición (Payload JSON):
```json
{
  "variante_id": "143",
  "cantidad": 5.5,
  "deposito_id": 1
}
```
* **`variante_id`** *(Requerido)*: ID de la variante a la que pertenece el stock a descontar.
* **`cantidad`** *(Requerido)*: Cantidad física a descontar (soporta decimales para unidades de medida como metros o kilogramos).
* **`deposito_id`** *(Opcional)*: ID del depósito del cual se retirará el stock. Si se omite, el sistema autodetectará el depósito central por defecto.

#### Respuesta JSON Exitosa:
```json
{
  "success": true,
  "remito_codigo": "WEB-15052943",
  "deposito_id": 1,
  "variante_id": "143",
  "cantidad_descontada": 5.5,
  "lotes_afectados": [
    {
      "id": 1024,
      "codigo_barras": "ETQ-82910-A",
      "cantidad_descontada": 5.5
    }
  ]
}
```

### Acciones internas de la API al descontar stock:
1. Registra un nuevo remito de salida en la tabla `wms_remitos_internos` con la numeración provista.
2. Descuenta la cantidad del lote físico (`Stock_Etiquetas`). Si la etiqueta queda en `0`, se marca como `estado = 'consumido'`.
3. Registra una fila por lote afectado en la tabla `Stock_Movimientos` con el tipo de movimiento `egreso_venta_web` para la trazabilidad y auditoría interna del stock.

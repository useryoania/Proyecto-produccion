# Plan de Implementación: Tarjeta de Orden y Modal de Detalle

Este plan describe los pasos para crear el nuevo componente de tarjeta de orden (`OrderCard`) y transformar el panel lateral actual (`OrderDetailPanel`) en una ventana emergente (`OrderDetailModal`).

## 1. Crear Componente `OrderCard`
El objetivo es tener un componente visual para representar una orden de forma compacta (Tarjeta), ideal para vistas tipo Kanban o Grilla.

- **Archivo**: `src/components/production/components/OrderCard.jsx`
- **Props**:
  - `order`: Objeto con los datos de la orden.
  - `onViewDetails`: Función a ejecutar al hacer click en el "ojito".
- **Diseño**:
  - Contenedor con estilos de tarjeta (borde, sombra suave, fondo blanco).
  - **Cabecera**: Número de Orden (resaltado) y Estado.
  - **Cuerpo**: Cliente, Trabajo/Descripción y Fechas relevantes.
  - **Pie**: Botón de acción (Icono de Ojo) para ver detalles.

## 2. Crear Componente `OrderDetailModal`
Migraremos la funcionalidad del actual `OrderDetailPanel` a un modal centrado.

- **Archivo**: `src/components/production/components/OrderDetailModal.jsx`
- **Funcionalidad (Heredada del Panel)**:
  - Recibe `order` y `onClose`.
  - Fetch de detalles de archivos (`/api/production/details`).
  - Edición de cantidad de copias, metros y links de archivos.
  - Cálculo de metros totales.
- **Cambios Visuales**:
  - Reemplazar el panel lateral (`fixed right-0 h-full`) por un modal centrado (`fixed inset-0 flex items-center justify-center`).
  - Añadir un backdrop (fondo oscuro) con desenfoque (`backdrop-blur`).
  - Contenedor principal con ancho máximo limitado y centrado, bordes redondeados y sombra elevada.

## 3. Integración en `AreaView`
Actualizaremos la vista principal de área para utilizar el nuevo Modal en lugar del Panel Lateral.

- **Archivo**: `src/components/production/areas/AreaView.jsx`
- **Cambios**:
  - **Importar**: `import OrderDetailModal from "../../production/components/OrderDetailModal";`
  - **Reemplazo**: Cambiar el componente `<OrderDetailPanel ... />` por `<OrderDetailModal ... />` al final del renderizado.
  - **Lógica**: La lógica de `setSelectedOrder` se mantiene igual. Al seleccionar una orden (ya sea desde la Tabla o desde una futura vista de Tarjetas), se abrirá el Modal.

## 4. (Opcional) Integración de `OrderCard`
Si se desea visualizar las órdenes como tarjetas inmediatamente:
- Podemos crear una nueva vista `ProductionGrid` o modificar el renderizado en `AreaView` para permitir alternar entre "Tabla" y "Tarjetas" usando el nuevo componente `OrderCard`.

---

**Siguientes Pasos**:
1. Confirmar este plan.
2. Proceder con la creación de los archivos.

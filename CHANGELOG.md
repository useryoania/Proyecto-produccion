# Changelog

Historial de cambios del sistema de producción. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/).

- Desde julio 2026 en adelante: una entrada por deploy, con fecha exacta.
- Lo anterior: reconstruido desde el historial de git, una entrada por mes (la granularidad por deploy no se registró en su momento).

---

## [2026-07-23] — Sin deployar

### Agregado
- DTF (`/area/df`): marcado de "impreso" LIBRE — se puede marcar/desmarcar cualquier orden del lote sin exigir que las anteriores estén impresas (sin invariante de secuencia, sin bloque "FUERA DE ORDEN", sin rechazo de drags). El resto de las áreas sigue con marcado en orden, y finalizar la impresión sigue exigiendo TODO marcado.
- Portal / Bandera Confeccionada: la zona de subida muestra miniatura del arte con guía punteada de 2,5 cm (margen de confección), y al clickear abre un modal con la vista del área útil recortada y un toggle "Flamear" que ondea la bandera (WebGL). Solo para materiales de medida fija.
- Changelog: este archivo.

### Arreglado
- **Seguridad de datos**: las órdenes sin cliente vinculado se asignaban al azar a un cliente real al ingresar al depósito (la etiqueta salía con cliente "0" en el QR y matcheaba contra `Clientes.IDReact = 0`). Guard en los 3 puntos que resuelven cliente por IDReact (ingreso por QR, import on-demand, integración planilla) + corrección de datos (ningún cliente queda con IDReact = 0). Un cliente venía recibiendo los avisos WSP y retiros de órdenes ajenas desde marzo.
- Planeación: los lotes en máquina no mostraban sus órdenes — el filtro de estados del tablero era case-sensitive y con lista incompleta ('En cola' ≠ 'En Cola'; faltaban 'Imprimiendo'/'Produccion'). Ahora filtra case-insensitive por exclusión.
- Planeación: el tablero daba 500 en bases donde `CantidadImpresa` quedó como INT — el auto-heal a DECIMAL fallaba por el default constraint; ahora lo suelta, altera y lo recrea.
- Detalle de lote: la columna Orden partía los códigos de falla largos a mitad de número (`w-28` + `break-all` → `w-36` + `break-words`).
- Detalle de lote: `JSON.parse` del estado de servicios hermanos protegido (un JSON malformado tiraba todo el detalle).

## [2026-07] — hasta el 22/07 (commiteado)

_(pendiente: en reconstrucción)_

## [2026-06]

### Agregado
- Igualador de Color: pantalla nueva para matchear color desde foto calibrada, manual LAB→CMYK y chart de referencia, con backend de color y scripts de calibración.
- Tela de Cliente: saldo e inventario de metros de tela por cliente, estado de cuenta y widget de saldo embebido en formularios y recepción.
- Dashboard de Producción y módulo de Reportes/Analítica: tableros con gráficos por área/estado/prioridad, informes de producción y exportación a Excel.
- Integraciones externas: WMS para armar pedidos por cliente desde catálogo con carrito (más logística y recepción de ventas) y API de órdenes protegida por API key para conectar un ERP externo.
- Facturación electrónica: nota de crédito (CFE), pre-factura y billetera de cliente; bandeja CFE y facturación manual rehechas.
- Coordinación de producción y Canastos: ordenar la cola de pendientes por prioridad (falla/urgente/normal/reposición) y clasificar órdenes en canastos (Producción, Falla, Reposiciones, Incompletos, etc.).
- Venta de Rollo con Adelanto: pantalla para vender rollos cobrando adelanto, integrada con Caja.
- Portal de clientes: tickets de soporte con adjuntos ligados a orden/departamento, notificaciones push, y aviso automático por WhatsApp que marca la orden como "Avisado".

### Cambiado
- Máquina de estados centralizada (stateManagerService): un único servicio para cambiar estado de órdenes y rollos con historial automático.
- Logística de remitos: historial con búsqueda por código de orden, encomiendas con cliente y origen/destino; Despacho, Transporte y Recepción reescritos.
- Portal y fábrica: formulario de pedidos y vista de fábrica reescritos, con descarga masiva de archivos (panel flotante + thumbnails).
- Gestión de bobinas: detalle de lote reescrito, selector de bobinas por tela de cliente y "Devolución al Cliente" que cierra la bobina automáticamente.

### Arreglado
- Contabilidad: repos sin PedidosCobranza ahora se insertan en OrdenesDeposito; facturas mal generadas y desajustes de moneda en estados de cuenta.
- Rendimiento: lentitud por tormentas de refetch de sockets; manejo de errores de carga de chunks con recarga forzada.
- Caja y monedas: correcciones en arqueo y pagos, moneda IMD y banderas de saldo.

## [2026-05]

_(pendiente: en reconstrucción)_

## [2026-04]

### Agregado
- Módulo de contabilidad/ERP integrado: Caja con sesiones de apertura/cierre y arqueo, venta directa, egresos, otros ingresos y numeración de documentos por secuencias.
- Facturación electrónica CFE con envío a DGI (bandeja de comprobantes, facturación manual y anulación) y Tesorería con cartera de cheques y catálogo de bancos.
- Contabilidad de fondo: plan de cuentas y libro mayor, motor de reglas contables configurable, reconciliación automática y manual, cuentas corrientes de clientes (deudas, ciclos, planes/billetera), reportes de antigüedad de deuda, estados de cuenta por email y cotizaciones editables con QR.
- Helpdesk: los clientes abren tickets por categoría con evidencia y responden en hilos desde el portal; panel interno para gestionar, derivar y resolver.
- Mercado Pago (Checkout Pro) como pasarela de pago, en paralelo a Handy.
- Web pública rediseñada: landing con video, Guías (PDF), Paletas de color, Plantillas, Términos, Privacidad, Trabajá con nosotros, Contacto y showroom.
- Portal: flujo completo de cuenta (registro, login, recuperación de contraseña por email) con validación de documento CI/RUT.
- Auditoría de depósito con escáner QR/código de barras (cámara + escaneo en vivo persistido) para controlar órdenes contra los códigos activos.
- API externa con API-Key para sincronizar clientes y vendedores con otro sistema.

### Cambiado
- Retiros web: estantes y empaques dinámicos desde la BD; el retiro postpago con Handy se crea recién al confirmarse el pago en el webhook.
- Refactors grandes de Transporte, sesiones activas de consola (SysAdmin) y módulos de Precios.

### Arreglado
- Idempotencia en el webhook de pagos (no procesar la misma orden dos veces).
- Acentos y caracteres corruptos en la UI de logística.
- Comprobantes de encomiendas (migración de nombres y regeneración) y sincronización de precios (cron).

## [2026-03]

_(pendiente: en reconstrucción)_

## [2026-02]

### Agregado
- **Portal de clientes** (nace el portal): los clientes arman pedidos online por técnica (DTF, sublimación, corte, bordado, estampado, costura), suben archivos y siguen sus retiros.
- Portal: alta con registro y verificación por mail, login, recuperación de contraseña y perfil, con vendedor asignado por cliente.
- Portal: checkout con pasarela Handy (módulo de cobranzas).
- Precios: perfiles de precios, precios base, especiales, calculadora y terminaciones Eco UV.
- Etiquetas: generador de etiquetas por lote.
- Máquinas: control por slots para montar/desmontar/recargar bobinas, con inventario de bobinas.
- Logística: stock de depósito e historial de rollos.
- Integraciones: sync con ERP y planilla de Google Sheets (cron), monitor en tiempo real, logs y CMS del portal.
- Atención al cliente: reposiciones que clonan los archivos del pedido original.

### Cambiado
- Descarga de archivos unificada (File System API + ZIP en streaming) y nomenclatura estándar "ORDEN_CLIENTE_TRABAJO Archivo X de Y".
- Formulario de pedidos del portal reescrito en servicios modulares por técnica.
- Tokens con expiración y renovación automática; lazy-loading del sistema interno; rediseño de navbar, dashboard y retiros responsive.

### Arreglado
- Solapamiento de sincronizaciones automáticas; acceso a Google Drive vía proxy.
- Descarga y medición de archivos; PDF de una página en DTF.

## [2025-11 → 2026-01] — Orígenes

- v1 del sistema (nov 2025): gestión de producción base en React + Node/Express + SQL Server.
- Refactor general del sistema de producción y primeras mediciones de archivos (dic 2025).
- Sincronización con el ERP estabilizada (numeración de órdenes 1/N, tinta/retiro, tablas de referencia, extras de terminación), auth en Despacho y Control de Transporte, lógica de recepción de inventario (códigos BOB) e integración legacy con búsqueda unificada (ene 2026).

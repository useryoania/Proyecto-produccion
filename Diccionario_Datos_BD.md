# Diccionario de Datos Completo (SecureAppDB)


### Tabla: Agencias
| Columna | Tipo |
|---|---|
| ID | int |
| Nombre | nvarchar |

### Tabla: ArchivosOrden
| Columna | Tipo |
|---|---|
| ArchivoID | int |
| OrdenID | int |
| NombreArchivo | varchar |
| Copias | int |
| Metros | decimal |
| RutaAlmacenamiento | varchar |
| TipoArchivo | varchar |
| FechaSubida | datetime |
| IdLineaERP | int |
| IdSubLineaERP | int |
| CodigoArticulo | varchar |
| DetalleLinea | nvarchar |
| MedidaConfirmada | decimal |
| Ancho | decimal |
| Alto | decimal |
| EstadoArchivo | varchar |
| FechaControl | datetime |
| Observaciones | nvarchar |
| UsuarioControl | varchar |
| UbicacionControl | varchar |
| Medir | bit |
| Controlar | bit |
| RutaLocal | varchar |
| Controlcopias | int |

### Tabla: ArchivosReferencia
| Columna | Tipo |
|---|---|
| RefID | int |
| OrdenID | int |
| TipoArchivo | nvarchar |
| UbicacionStorage | nvarchar |
| NombreOriginal | nvarchar |
| NotasAdicionales | nvarchar |
| FechaSubida | datetime |
| UsuarioID | int |

### Tabla: Areas
| Columna | Tipo |
|---|---|
| AreaID | varchar |
| Nombre | nvarchar |
| Categoria | nvarchar |
| ui_config | nvarchar |
| EsEstandar | bit |
| RenderKey | varchar |
| UM | nchar |
| Requerimientos | bit |
| Inicial | bit |
| Productiva | bit |
| EsProductivo | bit |
| TieneLogisticaBultos | bit |
| Entrega | nchar |

### Tabla: articulos
| Columna | Tipo |
|---|---|
| SupFlia | char |
| Grupo | char |
| CodStock | char |
| CodArticulo | char |
| Descripcion | char |
| IDProdReact | smallint |
| Mostrar | bit |
| anchoimprimible | real |
| LLEVAPAPEL | bit |

### Tabla: Auditoria
| Columna | Tipo |
|---|---|
| IdLog | bigint |
| IdUsuario | int |
| Accion | nvarchar |
| Detalles | nvarchar |
| DireccionIP | nvarchar |
| FechaHora | datetime |

### Tabla: BitacoraInsumosMaquina
| Columna | Tipo |
|---|---|
| BitacoraID | int |
| SlotID | int |
| EquipoID | int |
| UsuarioID | int |
| FechaRegistro | datetime |
| accion | nvarchar |
| InsumoID | int |
| BobinaID | int |
| Cantidad | decimal |
| Comentario | nvarchar |

### Tabla: BitacoraProduccion
| Columna | Tipo |
|---|---|
| BitacoraID | int |
| RolloID | varchar |
| MaquinaID | int |
| FechaInicio | datetime |
| FechaFin | datetime |
| DuracionMinutos | int |
| UsuarioID | int |

### Tabla: CalendarioFeriados
| Columna | Tipo |
|---|---|
| Fecha | date |
| Descripcion | varchar |

### Tabla: Cargos
| Columna | Tipo |
|---|---|
| IdCargo | int |
| Nombre | nvarchar |
| IdArea | varchar |

### Tabla: Clientes
| Columna | Tipo |
|---|---|
| CodCliente | int |
| CodReferencia | int |
| Nombre | char |
| NombreFantasia | char |
| DireccionTrabajo | char |
| TelefonoTrabajo | char |
| CioRuc | char |
| Cedula | char |
| IDCliente | varchar |
| Moneda | int |
| Tipo | char |
| Email | char |
| TiposPrecios | smallint |
| CodigoReact | nvarchar |
| IDReact | varchar |
| IDClientePlanilla | varchar |
| CliDireccion | nvarchar |
| Localidad | nvarchar |
| Agencia | nvarchar |
| WebPasswordHash | nvarchar |
| WebActive | bit |
| WebResetPassword | bit |
| WebLastLogin | datetime2 |
| DepartamentoID | int |
| LocalidadID | int |
| AgenciaID | int |
| FormaEnvioID | int |
| ESTADO | nvarchar |
| VendedorID | nvarchar |
| FechaRegistro | datetime2 |

### Tabla: ClientesPlanilla
| Columna | Tipo |
|---|---|
| ID | varchar |
| Nombre | varchar |
| Cel | varchar |
| Gmail | varchar |
| Column14 | varchar |

### Tabla: ClientesReact
| Columna | Tipo |
|---|---|
| CliIdCliente | int |
| CliCodigoCliente | varchar |
| CliNombreApellido | varchar |
| CliCelular | varchar |
| CliNombreEmpresa | varchar |
| CliDocumento | varchar |
| CliLocalidad | varchar |
| CliDireccion | varchar |
| CliAgencia | varchar |
| CliMail | varchar |
| TClIdTipoCliente | int |
| LReIdLugarRetiro | int |
| CliFechaAlta | datetime |
| CodClienteMacrosoft | nchar |
| IDCllientePlanilla | nchar |
| CliCodigoClientePlanilla | nchar |
| CliCodigoClienteFantasia | nchar |

### Tabla: ComentariosTicket
| Columna | Tipo |
|---|---|
| ComentarioID | int |
| TicketID | varchar |
| Usuario | varchar |
| Comentario | text |
| FechaHora | datetime |

### Tabla: ConfigColumnas
| Columna | Tipo |
|---|---|
| ColumnaID | int |
| AreaID | varchar |
| Titulo | nvarchar |
| ClaveData | nvarchar |
| Ancho | nvarchar |
| Orden | int |
| EsVisible | bit |
| TieneFiltro | bit |

### Tabla: ConfigEquipos
| Columna | Tipo |
|---|---|
| EquipoID | int |
| AreaID | varchar |
| Nombre | nvarchar |
| Activo | bit |
| Capacidad | int |
| Velocidad | int |
| Estado | nvarchar |
| EstadoProceso | nvarchar |
| separacionimpresion | nchar |

### Tabla: ConfigEstados
| Columna | Tipo |
|---|---|
| EstadoID | int |
| AreaID | varchar |
| Nombre | nvarchar |
| ColorHex | varchar |
| Orden | int |
| EsFinal | bit |
| TipoEstado | nchar |

### Tabla: ConfigMapeoERP
| Columna | Tipo |
|---|---|
| CodigoERP | varchar |
| AreaID_Interno | varchar |
| NombreReferencia | nvarchar |
| CodOrden | varchar |
| Numero | smallint |
| IdReact | int |
| VisibleWeb | bit |
| DescripcionWeb | nvarchar |
| ImagenWeb | nvarchar |
| ActivosComplementarios | nvarchar |

### Tabla: ConfigPrioridades
| Columna | Tipo |
|---|---|
| IdPrioridad | int |
| Nombre | nvarchar |
| Nivel | int |
| Color | nvarchar |
| Activo | bit |
| DiasEntregaExtra | int |

### Tabla: ConfigRequisitoReglas
| Columna | Tipo |
|---|---|
| ReglaID | int |
| RequisitoID | int |
| TipoBulto | nvarchar |
| MatchKeyword | nvarchar |

### Tabla: ConfigRequisitosProduccion
| Columna | Tipo |
|---|---|
| RequisitoID | int |
| AreaID | nvarchar |
| CodigoRequisito | nvarchar |
| Descripcion | nvarchar |
| EsBloqueante | bit |

### Tabla: ConfigServiciosRecepcion
| Columna | Tipo |
|---|---|
| ServicioID | int |
| Nombre | varchar |
| Activo | bit |

### Tabla: ConfiguracionesSync
| Columna | Tipo |
|---|---|
| ID | int |
| ProcesoID | varchar |
| NombreProceso | varchar |
| Descripcion | nvarchar |
| Activo | bit |
| UltimaEjecucion | datetime |
| UltimoEstado | varchar |
| MensajeError | nvarchar |

### Tabla: ConfiguracionGlobal
| Columna | Tipo |
|---|---|
| Clave | varchar |
| AreaID | nchar |
| Valor | nvarchar |

### Tabla: ConfiguracionRutas
| Columna | Tipo |
|---|---|
| RutaID | int |
| AreaOrigen | varchar |
| AreaDestino | varchar |
| Prioridad | int |
| RequiereExistencia | bit |

### Tabla: ConfiguracionTiemposEntrega
| Columna | Tipo |
|---|---|
| ConfigID | int |
| AreaID | varchar |
| Prioridad | varchar |
| Horas | int |
| Dias | int |

### Tabla: ContenidoWeb
| Columna | Tipo |
|---|---|
| ID | int |
| Tipo | nvarchar |
| Titulo | nvarchar |
| ImagenUrl | nvarchar |
| LinkDestino | nvarchar |
| Activo | bit |
| Orden | int |
| FechaCreacion | datetime |

### Tabla: Departamentos
| Columna | Tipo |
|---|---|
| ID | int |
| Nombre | nvarchar |
| Zona | nvarchar |

### Tabla: DescuentosVolumen
| Columna | Tipo |
|---|---|
| ID | int |
| CodArticulo | nvarchar |
| MinCantidad | decimal |
| TipoDescuento | nvarchar |
| Valor | decimal |
| Activo | bit |

### Tabla: DespachoItems
| Columna | Tipo |
|---|---|
| ID | int |
| DespachoID | int |
| OrdenID | int |
| EstadoItem | varchar |
| FechaEscaneo | datetime |
| EtiquetaID | int |
| CodigoBulto | varchar |

### Tabla: Despachos
| Columna | Tipo |
|---|---|
| DespachoID | int |
| Codigo | varchar |
| AreaOrigenID | varchar |
| AreaDestinoID | varchar |
| UsuarioEmisorID | int |
| FechaCreacion | datetime |
| Estado | varchar |
| Observaciones | nvarchar |

### Tabla: DiccionarioDatos
| Columna | Tipo |
|---|---|
| Clave | varchar |
| EtiquetaDefault | nvarchar |
| TipoDato | varchar |
| AnchoDefault | varchar |
| EsNativo | bit |

### Tabla: Etiquetas
| Columna | Tipo |
|---|---|
| EtiquetaID | int |
| OrdenID | int |
| NumeroBulto | int |
| TotalBultos | int |
| CodigoQR | nvarchar |
| FechaGeneracion | datetime |
| CreadoPor | nvarchar |
| Usuario | varchar |
| CodigoEtiqueta | nvarchar |
| PerfilesPrecio | nvarchar |
| DetalleCostos | nvarchar |

### Tabla: FallasProduccion
| Columna | Tipo |
|---|---|
| FallaID | int |
| OrdenID | int |
| ArchivoID | int |
| EquipoID | int |
| AreaID | varchar |
| FechaFalla | datetime |
| TipoFalla | varchar |
| CantidadFalla | numeric |
| Observaciones | nvarchar |

### Tabla: FormasEnvio
| Columna | Tipo |
|---|---|
| ID | int |
| Nombre | nvarchar |

### Tabla: HandyTransactions
| Columna | Tipo |
|---|---|
| Id | int |
| TransactionId | varchar |
| PaymentUrl | varchar |
| TotalAmount | decimal |
| Currency | int |
| OrdersJson | nvarchar |
| CodCliente | int |
| Status | varchar |
| IssuerName | varchar |
| PaidAt | datetime |
| WebhookReceivedAt | datetime |
| CreatedAt | datetime |

### Tabla: HistorialOrdenes
| Columna | Tipo |
|---|---|
| HistorialID | int |
| OrdenID | int |
| Estado | varchar |
| FechaInicio | datetime |
| FechaFin | datetime |
| DuracionMinutos | int |
| Usuario | varchar |
| Detalle | nvarchar |

### Tabla: Insumos
| Columna | Tipo |
|---|---|
| InsumoID | int |
| Nombre | nvarchar |
| UnidadDefault | varchar |
| Categoria | varchar |
| EsProductivo | bit |
| CodigoReferencia | nvarchar |
| StockMinimo | decimal |

### Tabla: InsumosPorArea
| Columna | Tipo |
|---|---|
| ID | int |
| InsumoID | int |
| AreaID | varchar |

### Tabla: IntegrationLogs
| Columna | Tipo |
|---|---|
| LogID | int |
| Fecha | datetime |
| Nivel | varchar |
| TipoEntidad | varchar |
| Mensaje | nvarchar |
| DatosJson | nvarchar |
| Estado | varchar |
| ReferenciaID | varchar |

### Tabla: InventarioBobinas
| Columna | Tipo |
|---|---|
| BobinaID | int |
| InsumoID | int |
| AreaID | nvarchar |
| CodigoEtiqueta | nvarchar |
| LoteProveedor | nvarchar |
| MetrosIniciales | decimal |
| MetrosRestantes | decimal |
| Ancho | decimal |
| FechaIngreso | datetime |
| FechaAgotado | datetime |
| Estado | nvarchar |
| Ubicacion | nvarchar |
| Referencia | nvarchar |
| ClienteID | nvarchar |
| OrdenID | int |

### Tabla: Localidades
| Columna | Tipo |
|---|---|
| ID | int |
| DepartamentoID | int |
| Nombre | nvarchar |

### Tabla: Logistica_Bultos
| Columna | Tipo |
|---|---|
| BultoID | int |
| CodigoEtiqueta | nvarchar |
| Tipocontenido | nvarchar |
| OrdenID | int |
| Descripcion | nvarchar |
| UbicacionActual | nvarchar |
| Estado | nvarchar |
| FechaCreacion | datetime |
| UsuarioCreador | int |
| RecepcionID | int |

### Tabla: Logistica_EnvioItems
| Columna | Tipo |
|---|---|
| ItemID | int |
| EnvioID | int |
| BultoID | int |
| EstadoRecepcion | nvarchar |
| FechaEscaneo | datetime |

### Tabla: Logistica_Envios
| Columna | Tipo |
|---|---|
| EnvioID | int |
| CodigoRemito | nvarchar |
| AreaOrigenID | nvarchar |
| AreaDestinoID | nvarchar |
| UsuarioChofer | nvarchar |
| UsuarioEmisor | int |
| UsuarioReceptor | int |
| FechaSalida | datetime |
| FechaLlegada | datetime |
| Estado | nvarchar |
| Observaciones | nvarchar |

### Tabla: LogsActividad
| Columna | Tipo |
|---|---|
| LogID | int |
| Tipo | varchar |
| Descripcion | varchar |
| Usuario | varchar |
| FechaHora | datetime |
| OrdenID | varchar |
| AreaID | varchar |

### Tabla: Matrices
| Columna | Tipo |
|---|---|
| MatrizID | int |
| OrdenID | varchar |
| NombreArchivo | varchar |
| Version | varchar |
| Estado | varchar |
| RutaAlmacenamiento | varchar |
| FechaSubida | datetime |
| AprobadoPor | varchar |

### Tabla: Mensajes
| Columna | Tipo |
|---|---|
| MensajeID | int |
| OrdenID | varchar |
| Usuario | varchar |
| Rol | varchar |
| Texto | text |
| Tipo | varchar |
| FechaHora | datetime |
| Leido | bit |

### Tabla: Metricas
| Columna | Tipo |
|---|---|
| MetricaID | int |
| AreaID | varchar |
| Tipo | varchar |
| Valor | decimal |
| CantidadOrdenes | int |
| FechaCalculo | datetime |
| Periodo | varchar |

### Tabla: Modulos
| Columna | Tipo |
|---|---|
| IdModulo | int |
| Titulo | nvarchar |
| IdPadre | int |
| Ruta | nvarchar |
| Icono | nvarchar |
| IndiceOrden | int |

### Tabla: MovimientosInsumos
| Columna | Tipo |
|---|---|
| MovimientoID | int |
| BobinaID | int |
| InsumoID | int |
| TipoMovimiento | nvarchar |
| Cantidad | decimal |
| Referencia | nvarchar |
| UsuarioID | int |
| FechaMovimiento | datetime |

### Tabla: MovimientosLogistica
| Columna | Tipo |
|---|---|
| MovimientoID | int |
| CodigoBulto | varchar |
| TipoMovimiento | varchar |
| AreaID | varchar |
| UsuarioID | int |
| FechaHora | datetime |
| Observaciones | nvarchar |
| EstadoAnterior | varchar |
| EstadoNuevo | varchar |
| EsRecepcion | bit |

### Tabla: OrdenCumplimientoRequisitos
| Columna | Tipo |
|---|---|
| CumplimientoID | int |
| OrdenID | int |
| AreaID | nvarchar |
| RequisitoID | int |
| Estado | nvarchar |
| FechaCumplimiento | datetime |
| BultoID | int |
| Observaciones | nvarchar |

### Tabla: Ordenes
| Columna | Tipo |
|---|---|
| OrdenID | int |
| AreaID | varchar |
| Cliente | nvarchar |
| DescripcionTrabajo | nvarchar |
| Estado | varchar |
| Prioridad | varchar |
| Material | varchar |
| Magnitud | nvarchar |
| Nota | nvarchar |
| ArchivosCount | int |
| FechaIngreso | datetime |
| FechaEstimadaEntrega | datetime |
| FechaEntradaSector | datetime |
| FechaRequerimientosok | datetime |
| MaquinaID | int |
| RolloID | int |
| meta_data | nvarchar |
| ArchivosMedidos | bit |
| NoDocERP | nchar |
| CodigoOrden | varchar |
| IdCabezalERP | varchar |
| Variante | varchar |
| TipoOrden | varchar |
| Secuencia | int |
| EstadoenArea | nvarchar |
| EstadoLogistica | nvarchar |
| falla | bit |
| Observaciones | nvarchar |
| ProximoServicio | varchar |
| Tinta | nvarchar |
| CodArt | nchar |
| BobinaTelaID | int |
| UbicacionActual | varchar |
| FechaHabilitacion | datetime |
| EstadoDependencia | nvarchar |
| ModoRetiro | varchar |
| UM | nchar |
| IdClienteReact | numeric |
| IdProductoReact | numeric |
| CodCliente | nchar |
| CostoTotal | decimal |
| CodArticulo | varchar |
| PerfilesPrecio | nvarchar |
| Validacion | bit |
| ValidacionOBS | nvarchar |

### Tabla: OrdenFlujo
| Columna | Tipo |
|---|---|
| ID | int |
| OrdenID | int |
| AreaID | varchar |
| OrdenSecuencia | int |
| Estado | varchar |

### Tabla: OrdenMateriales
| Columna | Tipo |
|---|---|
| ID | int |
| OrdenID | int |
| InsumoID | int |
| Cantidad | decimal |

### Tabla: PedidosCobranza
| Columna | Tipo |
|---|---|
| ID | int |
| NoDocERP | varchar |
| ClienteID | int |
| MontoTotal | decimal |
| Moneda | varchar |
| EstadoCobro | varchar |
| HandyPaymentId | varchar |
| HandyPaymentLink | varchar |
| EstadoSyncERP | varchar |
| FechaGeneracion | datetime |
| FechaPago | datetime |
| EstadoSyncReact | varchar |
| ObsERP | nvarchar |
| ObsReact | nvarchar |

### Tabla: PedidosCobranzaDetalle
| Columna | Tipo |
|---|---|
| ID | int |
| PedidoCobranzaID | int |
| OrdenID | int |
| CodArticulo | nvarchar |
| Cantidad | decimal |
| PrecioUnitario | decimal |
| Subtotal | decimal |
| LogPrecioAplicado | nvarchar |

### Tabla: PerfilesItems
| Columna | Tipo |
|---|---|
| ID | int |
| PerfilID | int |
| CodArticulo | nvarchar |
| TipoRegla | nvarchar |
| Valor | decimal |
| Moneda | nvarchar |
| CantidadMinima | int |

### Tabla: PerfilesPrecios
| Columna | Tipo |
|---|---|
| ID | int |
| Nombre | nvarchar |
| Descripcion | nvarchar |
| Activo | bit |
| EsGlobal | bit |

### Tabla: PermisosRoles
| Columna | Tipo |
|---|---|
| IdRol | int |
| IdModulo | int |

### Tabla: PreciosBase
| Columna | Tipo |
|---|---|
| ID | int |
| CodArticulo | nvarchar |
| Precio | decimal |
| Moneda | nvarchar |
| UltimaActualizacion | datetime |

### Tabla: PreciosEspeciales
| Columna | Tipo |
|---|---|
| ID | int |
| ClienteID | int |
| NombreCliente | nvarchar |
| FechaCreacion | datetime |
| UltimaActualizacion | datetime |
| PerfilID | int |
| PerfilesIDs | nvarchar |

### Tabla: PreciosEspecialesItems
| Columna | Tipo |
|---|---|
| ItemID | int |
| ClienteID | int |
| CodArticulo | nvarchar |
| TipoRegla | nvarchar |
| Valor | decimal |
| Moneda | nvarchar |
| MinCantidad | decimal |

### Tabla: ProyectosTecnicos
| Columna | Tipo |
|---|---|
| ProyectoID | varchar |
| Titulo | varchar |
| Responsable | varchar |
| Estado | varchar |
| Progreso | int |
| Tipo | varchar |
| FechaInicio | datetime |
| FechaEstimadaFin | datetime |

### Tabla: Recepciones
| Columna | Tipo |
|---|---|
| RecepcionID | int |
| Codigo | varchar |
| Cliente | varchar |
| Tipo | varchar |
| Detalle | nvarchar |
| CantidadBultos | int |
| Referencias | nvarchar |
| FechaRecepcion | datetime |
| UsuarioID | int |
| Estado | varchar |
| Observaciones | nvarchar |
| UbicacionActual | varchar |
| ProximoServicio | varchar |

### Tabla: Roles
| Columna | Tipo |
|---|---|
| IdRol | int |
| NombreRol | nvarchar |
| Descripcion | nvarchar |

### Tabla: Rollos
| Columna | Tipo |
|---|---|
| RolloID | int |
| AreaID | varchar |
| FechaCreacion | datetime |
| Estado | varchar |
| TotalOrdenes | int |
| MetrosTotales | decimal |
| Nombre | nvarchar |
| CapacidadMaxima | decimal |
| ColorHex | varchar |
| FechaInicioProduccion | datetime |
| MaquinaID | int |
| DuracionTotalSegundos | decimal |
| BobinaID | int |

### Tabla: RutasPasos
| Columna | Tipo |
|---|---|
| PasoID | int |
| RutaID | int |
| AreaDestinoID | varchar |
| Secuencia | int |

### Tabla: RutasProduccion
| Columna | Tipo |
|---|---|
| RutaID | int |
| Nombre | nvarchar |
| Descripcion | nvarchar |
| AreaID_Origen | varchar |

### Tabla: ServiciosExtraOrden
| Columna | Tipo |
|---|---|
| ServicioID | int |
| OrdenID | int |
| CodArt | varchar |
| CodStock | varchar |
| Descripcion | nvarchar |
| Cantidad | decimal |
| PrecioUnitario | decimal |
| TotalLinea | decimal |
| Observacion | nvarchar |
| FechaRegistro | datetime |
| CantidadPrendas | int |
| CantidadEstampados | int |
| OrdenRecpcionPrenda | nvarchar |
| Puntadas | int |
| Bajadas | int |
| BajadasAdicionales | int |
| Estado | varchar |
| FechaControl | datetime |
| UsuarioControl | varchar |
| Observaciones | nvarchar |
| TipoFalla | varchar |
| Controlcopias | int |

### Tabla: SlotsMaquina
| Columna | Tipo |
|---|---|
| SlotID | int |
| EquipoID | int |
| Nombre | nvarchar |
| Tipo | nvarchar |
| OrdenVisual | int |
| BobinaMontadaID | int |
| FechaMontaje | datetime |

### Tabla: SolicitudesInsumos
| Columna | Tipo |
|---|---|
| SolicitudID | int |
| AreaID | varchar |
| Item | nvarchar |
| Cantidad | decimal |
| Unidad | varchar |
| Prioridad | varchar |
| Estado | varchar |
| FechaSolicitud | datetime |
| Observaciones | nvarchar |

### Tabla: StockArt
| Columna | Tipo |
|---|---|
| SupFlia | varchar |
| Grupo | varchar |
| CodStock | varchar |
| Ref | varchar |
| Articulo | varchar |
| Marcado | bit |
| UM | nchar |
| Mostrar | bit |

### Tabla: Temp_ClientesCruce
| Columna | Tipo |
|---|---|
| Planilla_ID | varchar |
| Planilla_Nombre | varchar |
| Planilla_Gmail | varchar |
| CliIdCliente | int |
| CliCodigoCliente | varchar |
| CliNombreApellido | varchar |
| CliCelular | varchar |
| CliNombreEmpresa | varchar |
| CliDocumento | varchar |
| CliLocalidad | varchar |
| CliDireccion | varchar |
| CliAgencia | varchar |
| CliMail | varchar |
| TClIdTipoCliente | int |
| LReIdLugarRetiro | int |
| CliFechaAlta | datetime |
| CodClienteMacrosoft | nchar |
| IDCllientePlanilla | nchar |
| CliCodigoClientePlanilla | nchar |
| CliCodigoClienteFantasia | nchar |

### Tabla: TicketsMantenimiento
| Columna | Tipo |
|---|---|
| TicketID | varchar |
| MaquinaID | int |
| Titulo | nvarchar |
| Descripcion | nvarchar |
| Estado | varchar |
| Prioridad | varchar |
| FechaReporte | datetime |
| FechaCierre | datetime |
| ReportadoPor | varchar |

### Tabla: TiposFallas
| Columna | Tipo |
|---|---|
| FallaID | int |
| AreaID | varchar |
| Titulo | nvarchar |
| DescripcionDefault | nvarchar |
| EsFrecuente | bit |

### Tabla: Trabajadores
| Columna | Tipo |
|---|---|
| Cedula | int |
| Nombre | nvarchar |
| �rea | nvarchar |
| Puesto | nvarchar |
| Fecha_Ingreso | date |
| ID | nvarchar |
| Zona | nvarchar |

### Tabla: UpdatesProyecto
| Columna | Tipo |
|---|---|
| UpdateID | int |
| ProyectoID | varchar |
| Descripcion | text |
| FechaUpdate | datetime |
| Usuario | varchar |

### Tabla: Usuarios
| Columna | Tipo |
|---|---|
| IdUsuario | int |
| Usuario | nvarchar |
| ContrasenaHash | nvarchar |
| Email | nvarchar |
| IdRol | int |
| IdCargo | int |
| Activo | bit |
| FechaCreacion | datetime |
| Nombre | varchar |
| AreaUsuario | nchar |

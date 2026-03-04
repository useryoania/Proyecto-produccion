
--Create database [User]

Use [User]

Create table Cotizaciones
(
	CotIdCotizacion							int IDENTITY(1,1) PRIMARY KEY,
	CotFecha								date,
	CotDolar								float,
	CotEuro									float, 
	CotArgentino							float, 
	CotReal									float,
	CotUI									float,
	UNIQUE (CotFecha)
)

Create table Roles(
	RolIdRol							int identity(1,1) PRIMARY KEY,	
	RolDescripcionRol					varchar(20)
)

CREATE TABLE Usuarios (
    UsuIdUsuario						int identity(1,1) PRIMARY KEY,
    UsuUserName							varchar(20) unique NOT NULL,        
    UsuPassword							varchar(255) NOT NULL,                  
	UsuActivado							bit default 1,                     
    UsuFechaAlta						datetime default GETDATE(),        
    RolIdRol							int,
    FOREIGN KEY (RolIdRol) REFERENCES Roles(RolIdRol)
)


Create table Monedas (
	MonIdMoneda							int identity(1,1) PRIMARY KEY,
	MonSimbolo							varchar(5),
	MonDescripcionMoneda				varchar(20),
	MonFechaAlta						datetime
)

Create table Unidades (
	UniIdUnidad							int identity(1,1) PRIMARY KEY,
	UniDescripcionUnidad				varchar(20),
	UniNotación							varchar(5),
	UniFechaAlta						datetime
)

Create table SubMarcas (
	SMaIdSubMarca						int identity(1,1) PRIMARY KEY,
	SMaNombreSubMarca					varchar(50),
	SMaCodigoSubMarca					varchar(5),
	SMaFechaAlta						datetime,
	SMaUsuarioAlta						int,
	FOREIGN KEY (SMaUsuarioAlta)		REFERENCES Usuarios(UsuIdUsuario)
)

Create table Productos (
	ProIdProducto						int identity(1,1) PRIMARY KEY,
	ProCodigoOdooProducto				varchar(50),
	ProNombreProducto					varchar(100),
	ProDetalleProducto					varchar(50),
	SMaIdSubMarca						int,
	UniIdUnidad							int,	
	ProVigente							bit default 1,
	ProFechaHoraAlta					datetime,
	ProUsuarioAlta						int,
	FOREIGN KEY (SMaIdSubMarca)			REFERENCES SubMarcas(SMaIdSubMarca),
	FOREIGN KEY (UniIdUnidad)			REFERENCES Unidades(UniIdUnidad),
	FOREIGN KEY (ProUsuarioAlta)		REFERENCES Usuarios(UsuIdUsuario)
)

Create table HistoricoPreciosProductos (
	HPPIdCodigo							int identity(1,1) PRIMARY KEY,
	ProIdProducto						int,
	MonIdMoneda							int,
	HPPPrecioProducto					float,
	HPPFechaDesde						datetime,
	HPPFechaHasta						datetime,
	HPPFechaAlta						datetime,
	HPPFechaModificacion				datetime,
	HPPUsuarioAlta						int,
	FOREIGN KEY (ProIdProducto)			REFERENCES Productos(ProIdProducto),
	FOREIGN KEY (MonIdMoneda)			REFERENCES Monedas(MonIdMoneda),
	FOREIGN KEY (HPPUsuarioAlta)		REFERENCES Usuarios(UsuIdUsuario)
)

Create table ModosOrdenes
(
	MOrIdModoOrden									int identity(1,1) PRIMARY KEY,
	MOrNombreModo									varchar(50),
	MOrDescripcionModo								varchar(100),
	MOrRecargoPrecio								float,
	MOrModoVigente									bit default 1,
	MOrFechaAlta									datetime,
	MOrUsuarioAlta									int,
	FOREIGN KEY (MOrUsuarioAlta)					REFERENCES Usuarios(UsuIdUsuario)
)

Create table LugaresRetiro 
(
	LReIdLugarRetiro								int identity(1,1) PRIMARY KEY,
	LReNombreLugar									varchar(100),
	LReLugarVigente									bit default 1,
	LReFechaAlta									datetime,
	LReUsuarioAlta									int,
	FOREIGN KEY (LReUsuarioAlta)					REFERENCES Usuarios(UsuIdUsuario)
)

Create table TiposClientes
(
	TClIdTipoCliente								int identity(1,1) PRIMARY KEY,
	TClDescripcion									varchar(30),
	TClFechaAlta									datetime
)

Create table Clientes
(
	CliIdCliente									int identity(1,1) PRIMARY KEY,
	CliCodigoCliente								varchar(50),
	CliNombreApellido								varchar(200),
	CliCelular										varchar(50),
	CliNombreEmpresa								varchar(200),
	CliDocumento									varchar(20),
	CliLocalidad									varchar(100),
	CliDireccion									varchar(500),
	CliAgencia										varchar(100),
	CliMail											varchar(200),
	TClIdTipoCliente								int,
	LReIdLugarRetiro								int,
	CliFechaAlta									datetime,
	CliUsuarioAlta									int,
	CliFechaModificacion							datetime,
	FOREIGN KEY (TClIdTipoCliente)					REFERENCES TiposClientes(TClIdTipoCliente),
	FOREIGN KEY (LReIdLugarRetiro)					REFERENCES LugaresRetiro(LReIdLugarRetiro),
	FOREIGN KEY (CliUsuarioAlta)					REFERENCES Usuarios(UsuIdUsuario)
)

ALTER TABLE Clientes
ALTER COLUMN LReIdLugarRetiro int null

Create table MetodosPagos (
	MPaIdMetodoPago									int identity(1,1) PRIMARY KEY,
	MPaDescripcionMetodo							varchar(100)
)

Create table Pagos (
	PagIdPago										int identity(1,1) PRIMARY KEY,
	MPaIdMetodoPago									int,
	PagIdMonedaPago									int,
	PagMontoPago									float,
	PagFechaPago									datetime,
	PagUsuarioAlta									int,
	FOREIGN KEY (MPaIdMetodoPago)					REFERENCES MetodosPagos(MPaIdMetodoPago),
	FOREIGN KEY (PagIdMonedaPago)					REFERENCES Monedas(MonIdMoneda),
	FOREIGN KEY (PagUsuarioAlta)					REFERENCES Usuarios(UsuIdUsuario)
)

Alter Table Pagos
Add PagRutaComprobante varchar(max)

Create table Ordenes (
	OrdIdOrden										int identity(1,1) PRIMARY KEY,
	OrdCodigoOrden									varchar(20),
	CliIdCliente									int,
	OrdNombreTrabajo								varchar(200),
	MOrIdModoOrden									int,
	OrdCantidadArchivosOrden						int,		
	OrdNotaCliente									varchar(max),
	ProIdProducto									int, 
	OrdCantidad										float,
	MonIdMoneda										int,
	OrdCostoFinal									float,
	OrdDescuentoAplicado							float default 0,
	PagIdPago										int,
	LReIdLugarRetiro								int,
	OrdFechaIngresoOrden							datetime,
	OrdUsuarioAlta									int,
	OrdExportadoOdoo								bit default 0,
	FOREIGN KEY (CliIdCliente)						REFERENCES Clientes(CliIdCliente),
	FOREIGN KEY (MOrIdModoOrden)					REFERENCES ModosOrdenes(MOrIdModoOrden),
	FOREIGN KEY (ProIdProducto)						REFERENCES Productos(ProIdProducto),
	FOREIGN KEY (PagIdPago)							REFERENCES Pagos(PagIdPago),
	FOREIGN KEY (LReIdLugarRetiro)					REFERENCES LugaresRetiro(LReIdLugarRetiro),
	FOREIGN KEY (MonIdMoneda)						REFERENCES Monedas(MonIdMoneda),
	FOREIGN KEY (OrdUsuarioAlta)					REFERENCES Usuarios(UsuIdUsuario)
)

Create table EstadosOrdenes
(
	EOrIdEstadoOrden								int identity(1,1) PRIMARY KEY,
	EOrNombreEstado									varchar(50)
)

Create table HistoricoEstadosOrdenes (
	HEOIdHistoricoOrden								int identity(1,1) PRIMARY KEY,
	OrdIdOrden										int,
	EOrIdEstadoOrden								int,
	HEOFechaEstado									datetime,
	HEOUsuarioAlta									int,	
	FOREIGN KEY (EOrIdEstadoOrden)					REFERENCES EstadosOrdenes(EOrIdEstadoOrden),
	FOREIGN KEY (HEOUsuarioAlta)					REFERENCES Usuarios(UsuIdUsuario)
)

Create table OrdenesRetiro (
	OReIdOrdenRetiro								int identity(1,1) PRIMARY KEY,
	OReCostoTotalOrden								float,
	LReIdLugarRetiro								int,
	OReFechaAlta									datetime,
	OReUsuarioAlta									int,
	PagIdPago										int,
	FOREIGN KEY (LReIdLugarRetiro)					REFERENCES LugaresRetiro(LReIdLugarRetiro),
	FOREIGN KEY (OReUsuarioAlta)					REFERENCES Usuarios(UsuIdUsuario),
	FOREIGN KEY (PagIdPago)							REFERENCES Pagos(PagIdPago)
)

Alter table [User].dbo.OrdenesRetiro
Add MonIdMoneda Int

Create table EstadosOrdenesRetiro
(
	EORIdEstadoOrden								int identity(1,1) PRIMARY KEY,
	EORNombreEstado									varchar(50)
)

Create table HistoricoEstadosOrdenesRetiro (
	HEOIdEstadoOrdenRetiro							int identity(1,1) PRIMARY KEY,
	OReIdOrdenRetiro								int,
	EORIdEstadoOrden								int,										
	HEOFechaEstado									datetime,
	HEOUsuarioAlta									int,	
	FOREIGN KEY (OReIdOrdenRetiro)					REFERENCES OrdenesRetiro(OReIdOrdenRetiro),
	FOREIGN KEY (EORIdEstadoOrden)					REFERENCES EstadosOrdenesRetiro(EORIdEstadoOrden),
	FOREIGN KEY (HEOUsuarioAlta)					REFERENCES Usuarios(UsuIdUsuario)
)

Create table RelOrdenesRetiroOrdenes (
	RORIdOrdenRetiroOrden							int identity(1,1) PRIMARY KEY,
	OReIdOrdenRetiro								int,
	OrdIdOrden										int,
	FOREIGN KEY (OReIdOrdenRetiro)					REFERENCES OrdenesRetiro(OReIdOrdenRetiro),
	FOREIGN KEY (OrdIdOrden)						REFERENCES Ordenes(OrdIdOrden)
)

--------------------------------------------------------------------------------------------------------------
------------------------------------------------- ROLES ------------------------------------------------------
--------------------------------------------------------------------------------------------------------------

insert into Roles values ('Administrativo/a')
insert into Roles values ('OP Depósito')
insert into Roles values ('Cajero/a')
insert into Roles values ('Atención al Cliente')
insert into Roles values ('Publico')

CREATE INDEX IDX_Clientes_CliCodigoCliente ON Clientes (CliCodigoCliente);
CREATE INDEX IDX_Ordenes_CliIdCliente ON Ordenes (CliIdCliente);
CREATE INDEX IDX_HistoricoEstadosOrdenes_OrdIdOrden ON HistoricoEstadosOrdenes (OrdIdOrden);
CREATE INDEX IDX_HistoricoEstadosOrdenes_EOrIdEstadoOrden ON HistoricoEstadosOrdenes (EOrIdEstadoOrden);
CREATE INDEX IDX_Ordenes_OrdCodigoOrden ON Ordenes (OrdCodigoOrden);

CREATE INDEX IDX_OrdenesRetiro_LReIdLugarRetiro ON OrdenesRetiro (LReIdLugarRetiro);
CREATE INDEX IDX_OrdenesRetiro_UsuarioFecha ON OrdenesRetiro (OReUsuarioAlta, OReFechaAlta);
CREATE INDEX IDX_OrdenesRetiro_EstadoFecha ON HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, HEOFechaEstado DESC);

CREATE INDEX IDX_RelOrdenesRetiroOrdenes ON RelOrdenesRetiroOrdenes (OReIdOrdenRetiro, OrdIdOrden);

CREATE INDEX IDX_Pagos_MPaIdMetodoPago ON Pagos (MPaIdMetodoPago);
CREATE INDEX IDX_Pagos_FechaUsuario ON Pagos (PagFechaPago, PagUsuarioAlta);

CREATE INDEX IDX_EstadosOrdenes_NombreEstado ON EstadosOrdenes (EOrNombreEstado);
CREATE INDEX IDX_EstadosOrdenesRetiro_NombreEstado ON EstadosOrdenesRetiro (EORNombreEstado);

CREATE INDEX IDX_HistoricoEstadosOrdenes_Agrupacion ON HistoricoEstadosOrdenes (OrdIdOrden, EOrIdEstadoOrden);
CREATE INDEX IDX_HistoricoEstadosOrdenesRetiro_Agrupacion ON HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, EORIdEstadoOrden);
CREATE INDEX IDX_MetodosPagos_Descripcion ON MetodosPagos (MPaDescripcionMetodo);
CREATE INDEX IDX_Productos_CodigoOdoo ON Productos (ProCodigoOdooProducto);
CREATE INDEX IDX_Productos_SubMarca ON Productos (SMaIdSubMarca);
CREATE INDEX IDX_Productos_Unidad ON Productos (UniIdUnidad);
CREATE INDEX IDX_Productos_Vigente ON Productos (ProVigente);
CREATE INDEX IDX_HistoricoPrecios_ProductoFecha ON HistoricoPreciosProductos (ProIdProducto, HPPFechaHasta);
CREATE INDEX IDX_HistoricoPrecios_MonedaPrecio ON HistoricoPreciosProductos (MonIdMoneda, HPPPrecioProducto);
CREATE INDEX IDX_SubMarcas_Nombre ON SubMarcas (SMaNombreSubMarca);
CREATE INDEX IDX_Monedas_SimboloDescripcion ON Monedas (MonSimbolo, MonDescripcionMoneda);


ALTER TABLE [User].dbo.Ordenes
ADD OrdEstadoActual Int null

ALTER TABLE [User].dbo.Ordenes
ADD OrdFechaEstadoActual datetime null

ALTER TABLE [User].dbo.Ordenes
ADD OReIdOrdenRetiro int null

ALTER TABLE [User].dbo.Ordenes
ADD CONSTRAINT FK_Ordenes_EstadoActual
FOREIGN KEY (OrdEstadoActual) REFERENCES EstadosOrdenes(EORIdEstadoOrden)

ALTER TABLE [User].dbo.Ordenes
ADD CONSTRAINT FK_Orden_Retiro
FOREIGN KEY (OReIdOrdenRetiro) REFERENCES OrdenesRetiro(OReIdOrdenRetiro)

ALTER TABLE [User].dbo.OrdenesRetiro
ADD OReEstadoActual Int null

ALTER TABLE [User].dbo.OrdenesRetiro
ADD OReFechaEstadoActual datetime null

ALTER TABLE [User].dbo.OrdenesRetiro
ADD CONSTRAINT FK_OrdenesRetiro_EstadoActual
FOREIGN KEY (OReEstadoActual) REFERENCES EstadosOrdenesRetiro(EORIdEstadoOrden)

CREATE INDEX IDX_Ordenes_OrdEstadoActual ON [User].dbo.Ordenes(OrdEstadoActual);
CREATE INDEX IDX_OrdenesRetiro_OReEstadoActual ON [User].dbo.OrdenesRetiro(OReEstadoActual);

ALTER TABLE [User].dbo.Productos
ADD MonIdMoneda int

ALTER TABLE [User].dbo.Productos
ADD ProPrecioActual float

ALTER TABLE [User].dbo.Productos
ADD CONSTRAINT FK_Moneda
FOREIGN KEY (MonIdMoneda) REFERENCES Monedas(MonIdMoneda)

insert into Usuarios values ('SISTEMA','',1,getdate(),1)

/* Cambios ingresados 25/12/2024 */

ALTER TABLE [User].dbo.OrdenesRetiro
ADD ORePasarPorCaja bit default 0

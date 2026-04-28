CREATE TABLE dbo.[ImputacionPago] (
    [ImpIdImputacion] int IDENTITY(1,1) NOT NULL,
    [PagIdPago] int NOT NULL,
    [DDeIdDocumento] int NOT NULL,
    [CueIdCuenta] int NOT NULL,
    [ImpImporte] decimal(18, 4) NOT NULL,
    [ImpFecha] datetime NOT NULL,
    [ImpUsuarioAlta] int NOT NULL,
    [ImpObservaciones] nvarchar(500) NULL,
    PRIMARY KEY ([ImpIdImputacion])
);
GO

CREATE TABLE dbo.[TransaccionDetalle] (
    [TdeIdDetalle] int IDENTITY(1,1) NOT NULL,
    [TcaIdTransaccion] int NOT NULL,
    [TdeTipoReferencia] varchar(20) NOT NULL,
    [TdeReferenciaId] int NULL,
    [TdeCodigoReferencia] varchar(30) NULL,
    [TdeDescripcion] nvarchar(200) NULL,
    [TdeImporteOriginal] decimal(18, 2) NOT NULL,
    [TdeAjuste] decimal(18, 2) NOT NULL,
    [TdeImporteFinal] decimal(18, 2) NOT NULL,
    [TdeTipoAjuste] varchar(20) NULL,
    [TdePagado] bit NOT NULL,
    PRIMARY KEY ([TdeIdDetalle])
);
GO

CREATE TABLE dbo.[AjustesDocumento] (
    [AjuIdAjuste] int IDENTITY(1,1) NOT NULL,
    [DocIdDocumento] int NOT NULL,
    [AjuTipo] varchar(15) NOT NULL,
    [AjuConcepto] nvarchar(300) NOT NULL,
    [AjuCategoria] varchar(30) NULL,
    [AjuPorcentaje] decimal(8, 4) NULL,
    [AjuBaseCalculo] decimal(18, 4) NULL,
    [AjuMontoFijo] decimal(18, 4) NULL,
    [AjuImporte] decimal(18, 4) NOT NULL,
    [AjuRequirioPwd] bit NOT NULL,
    [AjuUsuarioAutoriza] int NULL,
    [AjuFecha] datetime NOT NULL,
    [AjuObservaciones] nvarchar(500) NULL
);
GO

CREATE TABLE dbo.[TransaccionesCaja] (
    [TcaIdTransaccion] int IDENTITY(1,1) NOT NULL,
    [TcaFecha] datetime NOT NULL,
    [TcaUsuarioId] int NOT NULL,
    [TcaClienteId] int NOT NULL,
    [TcaTipoDocumento] varchar(20) NOT NULL,
    [TcaSerieDoc] varchar(5) NULL,
    [TcaNumeroDoc] varchar(20) NULL,
    [TcaTotalBruto] decimal(18, 2) NOT NULL,
    [TcaTotalAjuste] decimal(18, 2) NOT NULL,
    [TcaTotalNeto] decimal(18, 2) NOT NULL,
    [TcaTotalCobrado] decimal(18, 2) NOT NULL,
    [TcaMonedaBase] varchar(10) NOT NULL,
    [TcaEstado] varchar(20) NOT NULL,
    [TcaObservaciones] nvarchar(500) NULL,
    [TcaFechaAnulacion] datetime NULL,
    [TcaUsuarioAnula] int NULL,
    [StuIdSesion] int NULL,
    PRIMARY KEY ([TcaIdTransaccion])
);
GO

CREATE TABLE dbo.[EgresosCaja] (
    [EgrIdEgreso] int IDENTITY(1,1) NOT NULL,
    [StuIdSesion] int NULL,
    [EgrFecha] datetime NOT NULL,
    [EgrUsuarioId] int NOT NULL,
    [EgrConcepto] nvarchar(200) NOT NULL,
    [EgrProveedor] nvarchar(150) NULL,
    [EgrMonto] decimal(18, 4) NOT NULL,
    [EgrMoneda] varchar(10) NOT NULL,
    [EgrCotizacion] decimal(18, 4) NULL,
    [EgrMontoConvertido] decimal(18, 4) NOT NULL,
    [MPaIdMetodoPago] int NULL,
    [EgrTipoDocumento] varchar(20) NULL,
    [EgrSerieDoc] varchar(5) NULL,
    [EgrNumeroDoc] varchar(20) NULL,
    [EgrEstado] varchar(20) NOT NULL,
    [EgrComprobante] nvarchar(500) NULL,
    [EgrObservaciones] nvarchar(300) NULL,
    PRIMARY KEY ([EgrIdEgreso])
);
GO

CREATE TABLE dbo.[AutorizacionesSinPago] (
    [AuzIdAutorizacion] int IDENTITY(1,1) NOT NULL,
    [OReIdOrdenRetiro] int NOT NULL,
    [AuzFecha] datetime NOT NULL,
    [AuzUsuarioId] int NOT NULL,
    [AuzMotivo] nvarchar(300) NOT NULL,
    [AuzMontoDeuda] decimal(18, 2) NOT NULL,
    [AuzFechaVencimiento] date NULL,
    [AuzEstado] varchar(20) NOT NULL,
    [AuzFechaCobro] datetime NULL,
    [TcaIdTransaccion] int NULL,
    PRIMARY KEY ([AuzIdAutorizacion])
);
GO

CREATE TABLE dbo.[MovimientosCuenta] (
    [MovIdMovimiento] int IDENTITY(1,1) NOT NULL,
    [CueIdCuenta] int NOT NULL,
    [MovTipo] varchar(30) NOT NULL,
    [MovConcepto] nvarchar(500) NOT NULL,
    [MovImporte] decimal(18, 4) NOT NULL,
    [MovSaldoPosterior] decimal(18, 4) NOT NULL,
    [OrdIdOrden] int NULL,
    [OReIdOrdenRetiro] int NULL,
    [PagIdPago] int NULL,
    [DocIdDocumento] int NULL,
    [MovRefExterna] varchar(100) NULL,
    [MovFecha] datetime NOT NULL,
    [MovUsuarioAlta] int NOT NULL,
    [MovAnulado] bit NOT NULL,
    [MovIdAnula] int NULL,
    [MovObservaciones] nvarchar(500) NULL
);
GO

CREATE TABLE dbo.[DeudaDocumento] (
    [DDeIdDocumento] int IDENTITY(1,1) NOT NULL,
    [CueIdCuenta] int NOT NULL,
    [OrdIdOrden] int NULL,
    [OReIdOrdenRetiro] int NULL,
    [DocIdDocumento] int NULL,
    [DDeImporteOriginal] decimal(18, 4) NOT NULL,
    [DDeImportePendiente] decimal(18, 4) NOT NULL,
    [DDeFechaEmision] date NOT NULL,
    [DDeFechaVencimiento] date NOT NULL,
    [DDeCuotaNumero] int NOT NULL,
    [DDeCuotaTotal] int NOT NULL,
    [DDeEstado] varchar(20) NOT NULL,
    [DDeFechaCobro] datetime NULL,
    [DDeObservaciones] nvarchar(500) NULL
);
GO

CREATE TABLE dbo.[PlanesMetros] (
    [PlaIdPlan] int IDENTITY(1,1) NOT NULL,
    [CliIdCliente] int NOT NULL,
    [CueIdCuenta] int NOT NULL,
    [ProIdProducto] int NOT NULL,
    [PlaDescripcion] nvarchar(200) NULL,
    [PlaCantidadTotal] decimal(18, 4) NOT NULL,
    [PlaCantidadUsada] decimal(18, 4) NOT NULL,
    [PlaPrecioUnitario] decimal(18, 4) NULL,
    [MonIdMoneda] int NULL,
    [PlaFechaInicio] date NOT NULL,
    [PlaFechaVencimiento] date NULL,
    [PlaActivo] bit NOT NULL,
    [PlaObservaciones] nvarchar(500) NULL,
    [PlaFechaAlta] datetime NOT NULL,
    [PlaUsuarioAlta] int NULL
);
GO

CREATE TABLE dbo.[CiclosCredito] (
    [CicIdCiclo] int IDENTITY(1,1) NOT NULL,
    [CueIdCuenta] int NOT NULL,
    [CliIdCliente] int NOT NULL,
    [CicFechaInicio] date NOT NULL,
    [CicFechaCierre] date NOT NULL,
    [CicDiasAprobados] int NOT NULL,
    [CicTotalOrdenes] decimal(18, 4) NULL,
    [CicTotalPagos] decimal(18, 4) NULL,
    [CicSaldoFacturar] decimal(18, 4) NULL,
    [CicEstado] varchar(20) NOT NULL,
    [CicNumeroFactura] varchar(100) NULL,
    [CicFechaFactura] datetime NULL,
    [CicFechaCobro] datetime NULL,
    [CicUsuarioApertura] int NOT NULL,
    [CicUsuarioCierre] int NULL,
    [CicObservaciones] nvarchar(500) NULL
);
GO

CREATE TABLE dbo.[DocumentosContables] (
    [DocIdDocumento] int IDENTITY(1,1) NOT NULL,
    [CueIdCuenta] int NOT NULL,
    [CliIdCliente] int NOT NULL,
    [DocTipo] varchar(20) NOT NULL,
    [DocNumero] varchar(50) NOT NULL,
    [DocSerie] varchar(10) NOT NULL,
    [DocIdDocumentoRef] int NULL,
    [DocMotivoRef] nvarchar(300) NULL,
    [DocFechaDesde] date NULL,
    [DocFechaHasta] date NULL,
    [DocSubtotal] decimal(18, 4) NOT NULL,
    [MonIdMoneda] int NOT NULL,
    [DocTotalDescuentos] decimal(18, 4) NOT NULL,
    [DocTotalRecargos] decimal(18, 4) NOT NULL,
    [DocTotal] decimal(18, 4) NOT NULL,
    [DocEstado] varchar(20) NOT NULL,
    [DocFechaEmision] datetime NOT NULL,
    [DocFechaVencimiento] date NULL,
    [DocUsuarioAlta] int NOT NULL,
    [DocObservaciones] nvarchar(500) NULL,
    [CicIdCiclo] int NULL,
    [CfeEstado] varchar(50) NULL,
    [CfeNumeroOficial] varchar(100) NULL,
    [CfeCAE] varchar(255) NULL,
    [CfeUrlImpresion] nvarchar(-0.5) NULL,
    [DocImpuestos] decimal(18, 2) NULL,
    [AsiIdAsiento] int NULL,
    [TcaIdTransaccion] int NULL,
    [DocPagado] bit NOT NULL
);
GO

CREATE TABLE dbo.[DocumentosContablesDetalle] (
    [DcdIdDetalle] int IDENTITY(1,1) NOT NULL,
    [DocIdDocumento] int NOT NULL,
    [OrdCodigoOrden] varchar(50) NULL,
    [DcdNomItem] varchar(80) NOT NULL,
    [DcdDscItem] varchar(1000) NULL,
    [DcdCantidad] decimal(18, 2) NOT NULL,
    [DcdPrecioUnitario] decimal(18, 2) NOT NULL,
    [DcdSubtotal] decimal(18, 2) NOT NULL,
    [DcdImpuestos] decimal(18, 2) NOT NULL,
    [DcdTotal] decimal(18, 2) NOT NULL,
    PRIMARY KEY ([DcdIdDetalle])
);
GO

CREATE TABLE dbo.[SesionesTurno] (
    [StuIdSesion] int IDENTITY(1,1) NOT NULL,
    [StuFechaApertura] datetime NOT NULL,
    [StuFechaCierre] datetime NULL,
    [StuUsuarioAbre] int NOT NULL,
    [StuUsuarioCierra] int NULL,
    [StuMontoInicial] decimal(18, 2) NOT NULL,
    [StuMontoFinal] decimal(18, 2) NULL,
    [StuMontoSistema] decimal(18, 2) NULL,
    [StuDiferencia] decimal(18, 2) NULL,
    [StuEstado] varchar(30) NOT NULL,
    [StuObservaciones] nvarchar(500) NULL,
    PRIMARY KEY ([StuIdSesion])
);
GO

CREATE TABLE dbo.[Cont_AsientosDetalle] (
    [DetId] int IDENTITY(1,1) NOT NULL,
    [AsiId] int NOT NULL,
    [CueId] int NOT NULL,
    [DetDebeUYU] decimal(18, 2) NOT NULL,
    [DetHaberUYU] decimal(18, 2) NOT NULL,
    [DetImporteOriginal] decimal(18, 2) NOT NULL,
    [DetCotizacion] decimal(18, 4) NOT NULL,
    [DetMonedaId] int NOT NULL,
    [DetEntidadId] int NULL,
    [DetEntidadTipo] varchar(20) NULL
);
GO

CREATE TABLE dbo.[Cont_AsientosCabecera] (
    [AsiId] int IDENTITY(1,1) NOT NULL,
    [AsiFecha] datetime NOT NULL,
    [AsiConcepto] nvarchar(200) NOT NULL,
    [AsiEstado] varchar(20) NOT NULL,
    [UsuarioId] int NOT NULL,
    [TcaIdTransaccion] int NULL,
    [SysOrigen] varchar(50) NOT NULL
);
GO

CREATE TABLE dbo.[ColaEstadosCuenta] (
    [ColIdCola] int IDENTITY(1,1) NOT NULL,
    [CliIdCliente] int NOT NULL,
    [CueIdCuenta] int NOT NULL,
    [CicIdCiclo] int NULL,
    [ColContenidoJSON] nvarchar(-0.5) NOT NULL,
    [ColAsunto] nvarchar(300) NOT NULL,
    [ColEmailDestino] nvarchar(300) NOT NULL,
    [ColFechaDesde] date NOT NULL,
    [ColFechaHasta] date NOT NULL,
    [ColEstado] varchar(20) NOT NULL,
    [ColUsuarioRevision] int NULL,
    [ColFechaRevision] datetime NULL,
    [ColNotaRevision] nvarchar(500) NULL,
    [ColFechaEnvio] datetime NULL,
    [ColUsuarioEnvio] int NULL,
    [ColErrorEnvio] nvarchar(500) NULL,
    [ColFechaGeneracion] datetime NOT NULL,
    [ColTipoDisparo] varchar(20) NOT NULL
);
GO

CREATE TABLE dbo.[CuentasCliente] (
    [CueIdCuenta] int IDENTITY(1,1) NOT NULL,
    [CliIdCliente] int NOT NULL,
    [CPaIdCondicion] int NOT NULL,
    [CueTipo] varchar(20) NOT NULL,
    [ProIdProducto] int NULL,
    [MonIdMoneda] int NULL,
    [CueSaldoActual] decimal(18, 4) NOT NULL,
    [CueLimiteCredito] decimal(18, 4) NOT NULL,
    [CuePuedeNegativo] bit NOT NULL,
    [CueDiasCiclo] int NULL,
    [CueCicloActivo] bit NOT NULL,
    [CueActiva] bit NOT NULL,
    [CueFechaAlta] datetime NOT NULL,
    [CueUsuarioAlta] int NULL,
    [CueObservaciones] nvarchar(500) NULL
);
GO

CREATE TABLE dbo.[SecuenciaDocumentos] (
    [SecIdSecuencia] int IDENTITY(1,1) NOT NULL,
    [SecTipoDoc] varchar(20) NOT NULL,
    [SecSerie] varchar(5) NOT NULL,
    [SecPrefijo] varchar(10) NULL,
    [SecDigitos] int NOT NULL,
    [SecUltimoNumero] int NOT NULL,
    [SecActivo] bit NOT NULL,
    [SecObservaciones] nvarchar(200) NULL,
    PRIMARY KEY ([SecIdSecuencia])
);
GO


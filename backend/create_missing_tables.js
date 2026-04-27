require('dotenv').config();
const { getPool } = require('./config/db');

const tablesDDL = [
    `CREATE TABLE dbo.[ImputacionPago] (
        [ImpIdImputacion] int IDENTITY(1,1) NOT NULL,
        [PagIdPago] int NOT NULL,
        [DDeIdDocumento] int NOT NULL,
        [CueIdCuenta] int NOT NULL,
        [ImpImporte] decimal(18, 4) NOT NULL,
        [ImpFecha] datetime NOT NULL,
        [ImpUsuarioAlta] int NOT NULL,
        [ImpObservaciones] nvarchar(500) NULL,
        PRIMARY KEY ([ImpIdImputacion])
    );`,
    `CREATE TABLE dbo.[TransaccionDetalle] (
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
    );`,
    `CREATE TABLE dbo.[AjustesDocumento] (
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
    );`,
    `CREATE TABLE dbo.[TransaccionesCaja] (
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
    );`,
    `CREATE TABLE dbo.[EgresosCaja] (
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
    );`,
    `CREATE TABLE dbo.[AutorizacionesSinPago] (
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
    );`,
    `CREATE TABLE dbo.[DocumentosContablesDetalle] (
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
    );`,
    `CREATE TABLE dbo.[SesionesTurno] (
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
    );`,
    `CREATE TABLE dbo.[Cont_AsientosDetalle] (
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
    );`,
    `CREATE TABLE dbo.[Cont_AsientosCabecera] (
        [AsiId] int IDENTITY(1,1) NOT NULL,
        [AsiFecha] datetime NOT NULL,
        [AsiConcepto] nvarchar(200) NOT NULL,
        [AsiEstado] varchar(20) NOT NULL,
        [UsuarioId] int NOT NULL,
        [TcaIdTransaccion] int NULL,
        [SysOrigen] varchar(50) NOT NULL
    );`,
    `CREATE TABLE dbo.[ColaEstadosCuenta] (
        [ColIdCola] int IDENTITY(1,1) NOT NULL,
        [CliIdCliente] int NOT NULL,
        [CueIdCuenta] int NOT NULL,
        [CicIdCiclo] int NULL,
        [ColContenidoJSON] nvarchar(max) NOT NULL,
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
    );`,
    `CREATE TABLE dbo.[SecuenciaDocumentos] (
        [SecIdSecuencia] int IDENTITY(1,1) NOT NULL,
        [SecTipoDoc] varchar(20) NOT NULL,
        [SecSerie] varchar(5) NOT NULL,
        [SecPrefijo] varchar(10) NULL,
        [SecDigitos] int NOT NULL,
        [SecUltimoNumero] int NOT NULL,
        [SecActivo] bit NOT NULL,
        [SecObservaciones] nvarchar(200) NULL,
        PRIMARY KEY ([SecIdSecuencia])
    );`
];

async function createTables() {
    try {
        const pool = await getPool();
        for (let i = 0; i < tablesDDL.length; i++) {
            const query = tablesDDL[i];
            const request = pool.request();
            await request.query(query);
            console.log(`✅ Creada tabla ${i + 1} de ${tablesDDL.length}`);
        }
        console.log("¡Todas las tablas fueron creadas exitosamente!");
        process.exit(0);
    } catch(err) {
        console.error("❌ Error creando tablas:", err.message);
        process.exit(1);
    }
}

createTables();

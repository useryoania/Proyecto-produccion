const sql = require('mssql');
require('dotenv').config();
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: { encrypt: true, trustServerCertificate: true }
};
sql.connect(config).then(pool => {
    return pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PedidosCobranza' AND xtype='U')
            BEGIN
                CREATE TABLE PedidosCobranza (
                    ID INT IDENTITY(1,1) PRIMARY KEY,
                    NoDocERP VARCHAR(50) NOT NULL,
                    ClienteID INT NOT NULL,
                    MontoTotal DECIMAL(18,2) NOT NULL,
                    Moneda VARCHAR(3) NOT NULL,
                    EstadoCobro VARCHAR(20) DEFAULT 'Pendiente', 
                    HandyPaymentId VARCHAR(100) NULL,
                    HandyPaymentLink VARCHAR(500) NULL,
                    EstadoSyncERP VARCHAR(20) DEFAULT 'Pendiente', 
                    FechaGeneracion DATETIME DEFAULT GETDATE(),
                    FechaPago DATETIME NULL
                );
                
                CREATE NONCLUSTERED INDEX IX_PedidosCobranza_NoDocERP ON PedidosCobranza(NoDocERP);
                PRINT 'Tabla PedidosCobranza creada';
            END ELSE PRINT 'La tabla PedidosCobranza ya existe';

            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PedidosCobranzaDetalle' AND xtype='U')
            BEGIN
                CREATE TABLE PedidosCobranzaDetalle (
                    ID INT IDENTITY(1,1) PRIMARY KEY,
                    PedidoCobranzaID INT NOT NULL,
                    OrdenID INT NOT NULL,
                    CodArticulo NVARCHAR(50) NOT NULL,
                    Cantidad DECIMAL(18,2) NOT NULL,
                    PrecioUnitario DECIMAL(18,2) NOT NULL,
                    Subtotal DECIMAL(18,2) NOT NULL,
                    LogPrecioAplicado NVARCHAR(500) NULL,
                    CONSTRAINT FK_PedidosCobranzaDetalle_Cabecera 
                        FOREIGN KEY (PedidoCobranzaID) REFERENCES PedidosCobranza(ID) ON DELETE CASCADE
                );
                PRINT 'Tabla PedidosCobranzaDetalle creada';
            END ELSE PRINT 'La tabla PedidosCobranzaDetalle ya existe';
            SELECT 'OK' as Msg;
    `);
}).then(res => {
    console.log(res.recordset);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});

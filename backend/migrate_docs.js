const { getPool, sql } = require('./config/db');

async function run() {
    try {
        const pool = await getPool();
        
        await pool.request().query(`
            IF OBJECT_ID('Config_TiposDocumento', 'U') IS NOT NULL DROP TABLE Config_TiposDocumento;
            
            CREATE TABLE Config_TiposDocumento (
                CodDocumento VARCHAR(10) PRIMARY KEY,
                Detalle VARCHAR(100),
                Codigo_Efact INT,
                RutObligatorio BIT,
                AfectaCtaCte BIT,
                Referenciado BIT,
                NroCaja INT,
                EvtCodigo VARCHAR(50),
                SecIdSecuencia INT
            );
            
            INSERT INTO Config_TiposDocumento (CodDocumento, Detalle, Codigo_Efact, RutObligatorio, AfectaCtaCte, Referenciado, NroCaja)
            SELECT LTRIM(RTRIM(Documento)), Detalle, Codigo_Efact, RutObligatorio, AfectaCtaCte, Referenciado, NroCaja
            FROM [Macrosoft].[dbo].[Documentos]
            WHERE Inactivo = 0 AND TipDoc IN ('V', 'C', 'MC');

            -- MAPEOS DE SECUENCIA (Obteniendo SecIdSecuencia)
            DECLARE @SecFactura INT = (SELECT SecIdSecuencia FROM SecuenciaDocumentos WHERE SecTipoDoc = 'FACTURA');
            DECLARE @SecETicket INT = (SELECT SecIdSecuencia FROM SecuenciaDocumentos WHERE SecTipoDoc = 'ETICKET');
            DECLARE @SecCredito INT = (SELECT SecIdSecuencia FROM SecuenciaDocumentos WHERE SecTipoDoc = 'CREDITO');
            DECLARE @SecRecibo INT = (SELECT SecIdSecuencia FROM SecuenciaDocumentos WHERE SecTipoDoc = 'RECIBO');
            DECLARE @SecConsumo INT = (SELECT SecIdSecuencia FROM SecuenciaDocumentos WHERE SecTipoDoc = 'NOTA_CONSUMO');

            -- MAPEOS: FACTURA CONTADO
            UPDATE Config_TiposDocumento SET EvtCodigo = 'VTA_CAJA', SecIdSecuencia = @SecFactura WHERE CodDocumento IN ('01', '101');
            
            -- MAPEOS: FACTURA CREDITO
            UPDATE Config_TiposDocumento SET EvtCodigo = 'FACTURA', SecIdSecuencia = @SecFactura WHERE CodDocumento IN ('02', '102');
            
            -- MAPEOS: TICKET CONTADO
            UPDATE Config_TiposDocumento SET EvtCodigo = 'VTA_CAJA', SecIdSecuencia = @SecETicket WHERE CodDocumento IN ('07', '107');
            
            -- MAPEOS: TICKET CREDITO
            UPDATE Config_TiposDocumento SET EvtCodigo = 'FACTURA', SecIdSecuencia = @SecETicket WHERE CodDocumento IN ('08', '108');
            
            -- MAPEOS: NOTAS DE CREDITO
            UPDATE Config_TiposDocumento SET EvtCodigo = 'NOTA_CREDITO', SecIdSecuencia = @SecCredito WHERE CodDocumento IN ('04', '104', '10', '100');
            
            -- MAPEOS: RECIBO
            UPDATE Config_TiposDocumento SET EvtCodigo = 'RECIBO', SecIdSecuencia = @SecRecibo WHERE CodDocumento IN ('05', '13');
        `);
        console.log('Tabla creada, poblada y mapeada correctamente');
        process.exit(0);
    } catch(e) {
        console.error(e.message);
        process.exit(1);
    }
}

run();

const { getPool, sql } = require('./backend/config/db');

async function createLogisticsTables() {
    try {
        const pool = await getPool();

        // 1. Tabla MovimientosLogistica
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MovimientosLogistica')
            BEGIN
                CREATE TABLE MovimientosLogistica (
                    MovimientoID INT IDENTITY(1,1) PRIMARY KEY,
                    CodigoBulto VARCHAR(50) NOT NULL,
                    TipoMovimiento VARCHAR(20) NOT NULL,
                    AreaID VARCHAR(50) NOT NULL,
                    UsuarioID INT NULL,
                    FechaHora DATETIME DEFAULT GETDATE(),
                    Observaciones NVARCHAR(MAX),
                    EstadoAnterior VARCHAR(50),
                    EstadoNuevo VARCHAR(50),
                    EsRecepcion BIT DEFAULT 0 
                );
            END
        `);
        console.log('Tabla MovimientosLogistica verificada.');

        // 2. Agregar UbicacionActual a Recepciones si no existe
        const checkRecepciones = await pool.request().query(`
            SELECT COUNT(*) as count FROM sys.columns 
            WHERE object_id = OBJECT_ID('Recepciones') AND name = 'UbicacionActual'
        `);

        if (checkRecepciones.recordset[0].count === 0) {
            await pool.request().query(`
                ALTER TABLE Recepciones ADD UbicacionActual VARCHAR(50) DEFAULT 'Recepccion';
                ALTER TABLE Recepciones ADD ProximoServicio VARCHAR(50);
            `);
            console.log('Columnas logísticas agregadas a Recepciones.');
        } else {
            console.log('Recepciones ya tiene columnas logísticas.');
        }

        // 3. Agregar columnas a Ordenes
        const checkOrdenes = await pool.request().query(`
            SELECT COUNT(*) as count FROM sys.columns 
            WHERE object_id = OBJECT_ID('Ordenes') AND name = 'UbicacionActual'
        `);

        if (checkOrdenes.recordset[0].count === 0) {
            await pool.request().query(`
                ALTER TABLE Ordenes ADD UbicacionActual VARCHAR(50);
                ALTER TABLE Ordenes ADD ProximoServicio VARCHAR(50);
            `);
            console.log('Columnas logísticas agregadas a Ordenes.');
        } else {
            console.log('Ordenes ya tiene columnas logísticas.');
        }

        console.log("Configuración de BD Logística completada.");
        process.exit();

    } catch (err) {
        console.error("Error creating logistics tables:", err);
        process.exit(1);
    }
}

createLogisticsTables();

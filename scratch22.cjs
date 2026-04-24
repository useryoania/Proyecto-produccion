const { getPool, sql } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        await pool.request().query(`
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'CfeEstado' AND Object_ID = Object_ID(N'DocumentosContables'))
            BEGIN
                ALTER TABLE DocumentosContables ADD 
                    CfeEstado VARCHAR(50) DEFAULT 'PENDIENTE',
                    CfeNumeroOficial VARCHAR(100) NULL,
                    CfeCAE VARCHAR(255) NULL,
                    CfeUrlImpresion NVARCHAR(MAX) NULL
            END
        `);
        console.log("Tabla DocumentosContables alterada correctamente.");
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}).catch(e => console.error(e));

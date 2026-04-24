const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DocumentosContablesDetalle' and xtype='U')
            BEGIN
                CREATE TABLE dbo.DocumentosContablesDetalle (
                    DcdIdDetalle INT IDENTITY(1,1) PRIMARY KEY,
                    DocIdDocumento INT NOT NULL,
                    OrdCodigoOrden VARCHAR(50) NULL,
                    DcdNomItem VARCHAR(80) NOT NULL,
                    DcdDscItem VARCHAR(1000) NULL,
                    DcdCantidad DECIMAL(18,2) NOT NULL DEFAULT 1,
                    DcdPrecioUnitario DECIMAL(18,2) NOT NULL,
                    DcdSubtotal DECIMAL(18,2) NOT NULL,
                    DcdImpuestos DECIMAL(18,2) NOT NULL DEFAULT 0,
                    DcdTotal DECIMAL(18,2) NOT NULL
                );
                PRINT 'Created';
            END
            ELSE BEGIN
                PRINT 'Already exists';
            END
        `);
        console.log("Completado");
        process.exit(0);
    } catch(err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
});

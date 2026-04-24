const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        await pool.request().query(`
            ALTER TABLE DocumentosContables ADD 
                AsiIdAsiento INT NULL,
                TcaIdTransaccion INT NULL,
                DocPagado BIT NOT NULL DEFAULT 0;
        `);
        console.log("Columnas agregadas con exito");
        process.exit(0);
    } catch(err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}).catch(e => console.error(e));

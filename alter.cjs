const { getPool, sql } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        await pool.request().query("ALTER TABLE DocumentosContables ADD DocImpuestos DECIMAL(18,2) NULL DEFAULT 0;");
        console.log("Columna agregada");
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
}).catch(e => console.error(e));

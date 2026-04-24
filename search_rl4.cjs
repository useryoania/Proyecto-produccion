const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r1 = await pool.request().query("SELECT * FROM OrdenesRetiro WHERE OReIdOrdenRetiro = 4 OR OReIdOrdenRetiro = 5");
        console.table(r1.recordset);
        const r2 = await pool.request().query("SELECT * FROM RelOrdenesRetiroOrdenes WHERE OReIdOrdenRetiro = 4 OR OReIdOrdenRetiro = 5");
        console.table(r2.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});

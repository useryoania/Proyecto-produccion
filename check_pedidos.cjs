const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r1 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PedidosCobranza'");
        const r2 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PedidosCobranzaDetalle'");
        console.log('PedidosCobranza:', r1.recordset.map(c=>c.COLUMN_NAME).join(', '));
        console.log('PedidosCobranzaDetalle:', r2.recordset.map(c=>c.COLUMN_NAME).join(', '));
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});

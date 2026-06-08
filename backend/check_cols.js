const sql = require('mssql');
const { getPool } = require('./backend/config/db');

async function run() {
    try {
        const pool = await getPool();
        let res = await pool.request().query("SELECT TOP 1 * FROM Articulos");
        console.log('Articulos columns:', Object.keys(res.recordset[0] || {}));
        
        let res2 = await pool.request().query("SELECT TOP 1 * FROM Articulos_Wms");
        console.log('Articulos_Wms columns:', Object.keys(res2.recordset[0] || {}));
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();

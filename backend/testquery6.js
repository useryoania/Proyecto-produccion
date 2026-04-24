const { sql, getPool } = require('./config/db.js');
(async () => {
    try {
        const pool = await getPool();
        const r1 = await pool.request().query("SELECT * FROM ConfigMapeoERP WHERE AreaID_Interno = 'TPUT' OR CodigoERP = 'TPUT'");
        console.dir(r1.recordset);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();

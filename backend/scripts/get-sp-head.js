const { getPool } = require('./config/db');

async function getSpHead() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT TOP 15 text FROM syscomments WHERE id = OBJECT_ID('sp_GetOrdenesControl_V2')");
        // syscomments a veces corta texto, mejor usar sp_helptext pero capturar las primeras lineas

        const result2 = await pool.request().query("sp_helptext 'sp_GetOrdenesControl_V2'");

        let lines = "";
        for (let i = 0; i < Math.min(25, result2.recordset.length); i++) {
            lines += result2.recordset[i].Text;
        }
        console.log(lines);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
getSpHead();

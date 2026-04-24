const { getPool, sql } = require('./backend/config/db');

async function run() {
    try {
        const pool = await getPool();
        await pool.request().query("ALTER TABLE PerfilesItems ADD CodGrupo VARCHAR(100) NULL");
        console.log("Added CodGrupo to PerfilesItems");
        await pool.request().query("ALTER TABLE PreciosEspecialesItems ADD CodGrupo VARCHAR(100) NULL");
        console.log("Added CodGrupo to PreciosEspecialesItems");
    } catch(e) {
        console.log("Error:", e.message);
    }
    process.exit();
}
run();

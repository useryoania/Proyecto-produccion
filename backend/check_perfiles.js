const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query("SELECT PerfilID, Nombre, CategoriasAplicables, EsGlobal FROM PerfilesPrecios");
        console.table(res.recordset);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});

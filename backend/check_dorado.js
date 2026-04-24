const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        console.log("== REGLAS PARA DTF DORADO (ProIdProducto = 248) ==");
        let res = await pool.request().query(`
            SELECT PI.ID, PI.PerfilID, PP.Nombre as PerfilNombre, 
                   PI.TipoRegla, PI.Valor, PI.CantidadMinima 
            FROM PerfilesItems PI 
            INNER JOIN PerfilesPrecios PP ON PI.PerfilID = PP.ID 
            WHERE PI.ProIdProducto = 248 AND PP.Activo = 1
        `);
        console.table(res.recordset);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});

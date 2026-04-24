const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query("UPDATE [SINCRO-ARTICULOS] SET Material = 'Tela Blackout - Tela Doble Cara (2,9)' WHERE IDREACT = 162");
        console.log("Reverted:", res.rowsAffected);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});

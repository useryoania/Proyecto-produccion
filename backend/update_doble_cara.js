const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query(`
            UPDATE [SINCRO-ARTICULOS]
            SET PROIDPRODUCTO = 32, codArticulo = 1560, IDREACT = 162
            WHERE Material LIKE '%Tela Doble Cara%'
        `);
        console.log("Doble Cara actualizado:", res.rowsAffected);
    } catch(e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
});

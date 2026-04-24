const { getPool, sql } = require('./backend/config/db.js');
getPool().then(async pool => {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        await pool.request(transaction).query("DELETE FROM PreciosEspeciales WHERE PerfilID = 9");
        await pool.request(transaction).query("DELETE FROM PerfilesItems WHERE PerfilID = 9");
        await pool.request(transaction).query("DELETE FROM PerfilesPrecios WHERE ID = 9");
        await transaction.commit();
        console.log('Perfil 9 (EMB Precios Bordado) borrado exitosamente.');
        process.exit(0);
    } catch(err) {
        await transaction.rollback();
        console.error(err);
        process.exit(1);
    }
}).catch(e => console.error(e));

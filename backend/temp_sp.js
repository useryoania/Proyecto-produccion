const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        const r = await pool.request().query("EXEC sp_helptext 'SP_AbrirSesionCaja'");
        console.log(r.recordset.map(x=>x.Text).join(''));
    } catch(e) {
        console.log(e.message);
    }
    process.exit(0);
});

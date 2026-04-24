const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        await pool.request().query("EXEC sp_recompile 'dbo.SP_AbrirSesionCaja'");
        console.log('SP_AbrirSesionCaja recompiled');
        await pool.request().query("EXEC sp_recompile 'dbo.SesionesTurno'");
        console.log('Table SesionesTurno recompiled');
    } catch(e) {
        console.log(e.message);
    }
    process.exit(0);
});

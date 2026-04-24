const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        await pool.request().query("ALTER TABLE SesionesTurno ADD DEFAULT (GETDATE()) FOR StuFechaApertura;");
        await pool.request().query("ALTER TABLE SesionesTurno ADD DEFAULT 0 FOR StuMontoInicial;");
        await pool.request().query("ALTER TABLE SesionesTurno ADD DEFAULT 'ABIERTA' FOR StuEstado;");
        console.log('SesionesTurno - OK');
    } catch(e){
        console.log('SesionesTurno - Err:', e.message);
    }
    try {
        await pool.request().query("ALTER TABLE TransaccionesCaja ADD DEFAULT (GETDATE()) FOR TcaFecha;");
        await pool.request().query("ALTER TABLE TransaccionesCaja ADD DEFAULT 'UYU' FOR TcaMonedaBase;");
        await pool.request().query("ALTER TABLE TransaccionesCaja ADD DEFAULT 'COMPLETADO' FOR TcaEstado;");
        await pool.request().query("ALTER TABLE TransaccionesCaja ADD DEFAULT 0 FOR TcaTotalBruto;");
        await pool.request().query("ALTER TABLE TransaccionesCaja ADD DEFAULT 0 FOR TcaTotalNeto;");
        await pool.request().query("ALTER TABLE TransaccionesCaja ADD DEFAULT 0 FOR TcaTotalCobrado;");
        await pool.request().query("ALTER TABLE TransaccionesCaja ADD DEFAULT 0 FOR TcaTotalAjuste;");
        console.log('TransaccionesCaja - OK');
    } catch(e){
        console.log('TransaccionesCaja - Err:', e.message);
    }
    process.exit(0);
});

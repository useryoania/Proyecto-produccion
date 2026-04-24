const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        console.log('-- Testing clientes-activos query --');
        await pool.request().query(`
            DECLARE @TC DECIMAL(18,4) = ISNULL((SELECT TOP 1 CotDolar FROM dbo.Cotizaciones ORDER BY CotFecha DESC), 40.0);
            SELECT TOP 1 c.CliIdCliente FROM dbo.Clientes c WITH(NOLOCK)
        `);
        console.log('OK Clientes select');
    } catch(e) {
        console.log('Error in Clientes select:', e.message);
    }

    try {
        await pool.request().query('SELECT TOP 1 CueIdCuenta FROM dbo.CuentasCliente');
        console.log('OK CuentasCliente select');
    } catch(e) {
        console.log('Error in CuentasCliente select:', e.message);
    }
    
    process.exit(0);
});

const { getPool } = require('./config/db');
(async () => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("EXEC sp_helptext 'dbo.SP_CerrarSesionCaja'");
    console.log(result.recordset.map(r => r.Text).join(''));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

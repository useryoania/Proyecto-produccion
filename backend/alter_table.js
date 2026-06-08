const { getPool } = require('./config/db');
(async () => {
  try {
    const pool = await getPool();
    await pool.request().query(`
      IF COL_LENGTH('dbo.SesionesTurno', 'StuMontoInicialUSD') IS NULL
      BEGIN
          ALTER TABLE dbo.SesionesTurno ADD StuMontoInicialUSD DECIMAL(18,2) NOT NULL DEFAULT 0;
          ALTER TABLE dbo.SesionesTurno ADD StuMontoFinalUSD DECIMAL(18,2) NULL;
          ALTER TABLE dbo.SesionesTurno ADD StuMontoSistemaUSD DECIMAL(18,2) NULL;
          ALTER TABLE dbo.SesionesTurno ADD StuDiferenciaUSD DECIMAL(18,2) NULL;
      END
    `);
    console.log('Columnas USD agregadas a SesionesTurno.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

require('dotenv').config({ path: 'c:/Integracion/User-Macrosoft/Proyecto-produccion/backend/.env' });
const sql = require('mssql');
const config = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, server: process.env.DB_SERVER, database: process.env.DB_DATABASE, options: { encrypt: false, trustServerCertificate: true } };
async function alter() {
  await sql.connect(config);
  try {
    await sql.query("ALTER TABLE dbo.ConfigEstados ALTER COLUMN TipoEstado NVARCHAR(50)");
    console.log('Column altered successfully.');
  } catch(e) { console.log(e.message) }
  process.exit();
}
alter();

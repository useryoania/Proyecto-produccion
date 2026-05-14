require('dotenv').config({ path: 'c:/Integracion/User-Macrosoft/Proyecto-produccion/backend/.env' });
const sql = require('mssql');
const config = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, server: process.env.DB_SERVER, database: process.env.DB_DATABASE, options: { encrypt: false, trustServerCertificate: true } };
async function q() {
  await sql.connect(config);
  try {
    const res = await sql.query("SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ConfigEstados' AND COLUMN_NAME = 'AreaID'");
    console.log('AreaID Max Length:', res.recordset[0].CHARACTER_MAXIMUM_LENGTH);
  } catch(e) { console.log(e.message) }
  process.exit();
}
q();

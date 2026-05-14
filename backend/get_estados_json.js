require('dotenv').config({ path: 'c:/Integracion/User-Macrosoft/Proyecto-produccion/backend/.env' });
const sql = require('mssql');
const config = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, server: process.env.DB_SERVER, database: process.env.DB_DATABASE, options: { encrypt: false, trustServerCertificate: true } };
async function q() {
  await sql.connect(config);
  try {
    const res = await sql.query("SELECT * FROM ConfigEstados");
    console.log(JSON.stringify(res.recordset, null, 2));
  } catch(e) { console.log(e.message) }
  process.exit();
}
q();

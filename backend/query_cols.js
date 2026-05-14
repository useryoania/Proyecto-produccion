require('dotenv').config({ path: 'c:/Integracion/User-Macrosoft/Proyecto-produccion/backend/.env' });
const sql = require('mssql');
const config = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, server: process.env.DB_SERVER, database: process.env.DB_DATABASE, options: { encrypt: false, trustServerCertificate: true } };
async function q() {
  await sql.connect(config);
  try {
    const r1 = await sql.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Ordenes'");
    console.log('Ordenes columns:', r1.recordset.map(x=>x.COLUMN_NAME));
    const r2 = await sql.query("SELECT DISTINCT Estado FROM Ordenes WITH(NOLOCK)");
    console.log('Ordenes.Estado:', r2.recordset.map(x=>x.Estado));
    const r3 = await sql.query("SELECT DISTINCT EstadoLogistica FROM Ordenes WITH(NOLOCK)");
    console.log('Ordenes.EstadoLogistica:', r3.recordset.map(x=>x.EstadoLogistica));
    const r4 = await sql.query("SELECT DISTINCT EstadoEnArea FROM Ordenes WITH(NOLOCK)");
    console.log('Ordenes.EstadoEnArea:', r4.recordset.map(x=>x.EstadoEnArea));
  } catch(e) { console.log(e.message) }
  process.exit();
}
q();

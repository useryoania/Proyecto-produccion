require('dotenv').config({ path: 'c:/Integracion/User-Macrosoft/Proyecto-produccion/backend/.env' });
const sql = require('mssql');
const config = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, server: process.env.DB_SERVER, database: process.env.DB_DATABASE, options: { encrypt: false, trustServerCertificate: true } };
async function q() {
  await sql.connect(config);
  try {
    const r1 = await sql.query('SELECT DISTINCT OrdEstadoActual FROM OrdenesDeposito WITH(NOLOCK)');
    console.log('OrdenesDeposito.OrdEstadoActual:', r1.recordset.map(x=>x.OrdEstadoActual));
  } catch(e) { console.log(e.message) }
  try {
    const r2 = await sql.query('SELECT DISTINCT OReEstadoActual FROM OrdenesRetiro WITH(NOLOCK)');
    console.log('OrdenesRetiro.OReEstadoActual:', r2.recordset.map(x=>x.OReEstadoActual));
  } catch(e) { console.log(e.message) }
  try {
    const r3 = await sql.query('SELECT DISTINCT Estado FROM HistorialOrdenes WITH(NOLOCK)');
    console.log('HistorialOrdenes.Estado:', r3.recordset.map(x=>x.Estado));
  } catch(e) { console.log(e.message) }
  try {
    const r4 = await sql.query('SELECT DISTINCT EstadoLogistica FROM HistorialOrdenes WITH(NOLOCK)');
    console.log('HistorialOrdenes.EstadoLogistica:', r4.recordset.map(x=>x.EstadoLogistica));
  } catch(e) { console.log(e.message) }
  try {
    const r5 = await sql.query('SELECT DISTINCT EstadoEnArea FROM HistorialOrdenes WITH(NOLOCK)');
    console.log('HistorialOrdenes.EstadoEnArea:', r5.recordset.map(x=>x.EstadoEnArea));
  } catch(e) { console.log(e.message) }
  process.exit();
}
q();

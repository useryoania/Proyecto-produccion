const { getPool } = require('./backend/config/db');

getPool().then(p => {
  return p.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ArchivosOrden'");
}).then(r => {
  console.table(r.recordset);
  process.exit(0);
}).catch(console.error);

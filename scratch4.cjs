const { getPool } = require('./backend/config/db');

getPool().then(p => {
  return p.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PedidosCobranza';
    SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PedidosCobranzaDetalle';
  `);
}).then(r => {
  console.log('--- PedidosCobranza ---');
  // First recordset is PedidosCobranza, usually r.recordsets[0]
  if (r.recordsets && r.recordsets.length > 1) {
    console.table(r.recordsets[0]);
    console.log('--- PedidosCobranzaDetalle ---');
    console.table(r.recordsets[1]);
  } else {
    // If multiple recordsets aren't returned this way, I'll just check one by one
    console.table(r.recordset);
  }
  process.exit(0);
}).catch(console.error);

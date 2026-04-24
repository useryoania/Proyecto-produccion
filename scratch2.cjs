const { getPool } = require('./backend/config/db');

getPool().then(async p => {
  const r1 = await p.request().query("SELECT OrdenID, CodigoOrden, Validacion FROM Ordenes WHERE CodigoOrden LIKE '%90968%'");
  console.table(r1.recordset);
  
  if (r1.recordset.length > 0) {
      const oids = r1.recordset.map(r => r.OrdenID).join(',');
      const r2 = await p.request().query(`SELECT * FROM ArchivosOrden WHERE OrdenID IN (${oids})`);
      console.table(r2.recordset);
  }
  process.exit(0);
}).catch(console.error);

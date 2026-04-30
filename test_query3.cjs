const { sql, getPool } = require('./backend/config/db');
getPool().then(pool => pool.request()
  .query("SELECT tr.name AS TriggerName, m.definition AS TriggerDefinition FROM sys.triggers tr INNER JOIN sys.sql_modules m ON tr.object_id = m.object_id WHERE OBJECT_NAME(tr.parent_id) = 'Ordenes'")
  .then(r => { console.log(r.recordset); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); })
);

const { getPool } = require('./config/db');
getPool().then(async pool => {
  const r = await pool.request().query("SELECT TransactionId, Status, PaidAt FROM HandyTransactions WHERE TransactionId = '1a4ce4f2-9c34-48c7-8e3e-a243fc430f7d'");
  console.log(r.recordset);
  process.exit();
});

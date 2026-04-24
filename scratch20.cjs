const { getPool, sql } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const docCont = await pool.request().query("SELECT TOP 1 * FROM DocumentosContables");
        console.log("DocumentosContables:", docCont.recordset[0]);
        const deudaDoc = await pool.request().query("SELECT TOP 1 * FROM DeudaDocumento");
        console.log("DeudaDocumento:", deudaDoc.recordset[0]);
        const transCaja = await pool.request().query("SELECT TOP 1 * FROM TransaccionesCaja");
        console.log("TransaccionesCaja:", transCaja.recordset[0]);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}).catch(e => console.error(e));

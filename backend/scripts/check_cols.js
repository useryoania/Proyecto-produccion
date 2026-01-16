const { getPool } = require('./config/db');

async function run() {
    try {
        const pool = await getPool();
        const res = await pool.request().query('SELECT TOP 1 * FROM ArchivosOrden');
        if (res.recordset.length > 0) {
            console.log('Columns:', Object.keys(res.recordset[0]).join(', '));
            console.log('Sample Row:', res.recordset[0]);
        } else {
            console.log('Table is empty, checking columns via sys.columns handled by *');
            // Fallback if empty, but usually we have data. 
        }
    } catch (err) {
        console.error('Error fetching columns:', err);
    }
}

run();

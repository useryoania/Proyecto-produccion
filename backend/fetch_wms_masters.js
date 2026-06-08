const sql = require('mssql');
const config = require('./config/db');

async function run() {
    try {
        console.log('Fetching master products from WMS API...');
        
        const wmsQuery = `
            USE Ventas_Dev;
            SELECT id, nombre
            FROM Stock_Productos_Maestros 
            ORDER BY id;
        `;
        
        // Fix fetch not being available in node 16 natively if not using experimental flag,
        // but Node 18+ has it. We'll use axios to be safe since it's installed.
        const axios = require('axios');
        const response = await axios.post('https://administracionuser.uy/api/sql', { query: wmsQuery }, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        const wmsData = response.data;
        const items = wmsData.data || [];
        
        console.log(`Fetched ${items.length} master products from WMS.`);
        
        const pool = await config.getPool();
        
        console.log('Dropping Temp_WMS_Maestros if exists...');
        await pool.request().query("IF OBJECT_ID('Temp_WMS_Maestros', 'U') IS NOT NULL DROP TABLE Temp_WMS_Maestros;");
        
        console.log('Creating Temp_WMS_Maestros...');
        await pool.request().query(`
            CREATE TABLE Temp_WMS_Maestros (
                id INT PRIMARY KEY,
                nombre NVARCHAR(255)
            );
        `);
        
        console.log('Inserting data...');
        let count = 0;
        for (const item of items) {
            await pool.request()
                .input('id', sql.Int, item.id)
                .input('nombre', sql.NVarChar, item.nombre || '')
                .query("INSERT INTO Temp_WMS_Maestros (id, nombre) VALUES (@id, @nombre)");
            count++;
        }
        
        console.log(`Successfully inserted ${count} master products into Temp_WMS_Maestros.`);
        process.exit(0);
        
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();

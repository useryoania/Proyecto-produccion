const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const configBase = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    options: {
        instanceName: process.env.DB_INSTANCE || undefined,
        encrypt: false,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        const poolOld = await sql.connect({ ...configBase, database: 'SecureAppDB2205' });
        const countOldRes = await poolOld.request().query('SELECT COUNT(*) as C FROM [dbo].[Articulos]');
        const countOld = countOldRes.recordset[0].C;
        await poolOld.close();

        const poolNew = await sql.connect({ ...configBase, database: 'SecureAppDB' });
        const countNewRes = await poolNew.request().query('SELECT COUNT(*) as C FROM [dbo].[Articulos]');
        const countNew = countNewRes.recordset[0].C;

        // Check if UniIdUnidad has values other than NULL
        const uniRes = await poolNew.request().query('SELECT COUNT(*) as C FROM [dbo].[Articulos] WHERE UniIdUnidad IS NOT NULL');
        const uniCount = uniRes.recordset[0].C;

        // Check if borrar has values other than NULL
        const borrarRes = await poolNew.request().query('SELECT COUNT(*) as C FROM [dbo].[Articulos] WHERE borrar IS NOT NULL');
        const borrarCount = borrarRes.recordset[0].C;

        console.log(`Articulos in SecureAppDB2205: ${countOld}`);
        console.log(`Articulos in SecureAppDB: ${countNew}`);
        console.log(`Rows with UniIdUnidad set in SecureAppDB: ${uniCount}`);
        console.log(`Rows with borrar set in SecureAppDB: ${borrarCount}`);

        await poolNew.close();
    } catch(err) {
        console.error(err);
    }
}
run();

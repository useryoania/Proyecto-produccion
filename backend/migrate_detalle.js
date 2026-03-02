const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function migrate() {
    try {
        let pool = await sql.connect(config);
        console.log('Connected to DB');
        await pool.request().query("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Etiquetas') AND name = 'DetalleCostos') ALTER TABLE Etiquetas ADD DetalleCostos NVARCHAR(MAX);");
        console.log('Column DetalleCostos added successfully');
        await sql.close();
    } catch (err) {
        console.error('Migration error:', err);
    }
}

migrate();

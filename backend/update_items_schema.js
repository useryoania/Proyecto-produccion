require('dotenv').config();
const { getPool, sql } = require('./config/db');

async function migrateItems() {
    try {
        const pool = await getPool();

        console.log("🛠 Updating DespachoItems schema...");

        const alterQuery = `
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DespachoItems' AND COLUMN_NAME = 'EstadoItem')
            BEGIN
                ALTER TABLE DespachoItems ADD EstadoItem varchar(20) DEFAULT 'EN_TRANSITO';
            END

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DespachoItems' AND COLUMN_NAME = 'FechaEscaneo')
            BEGIN
                ALTER TABLE DespachoItems ADD FechaEscaneo datetime NULL;
            END
        `;

        await pool.request().query(alterQuery);
        console.log("✅ DespachoItems schema updated successfully.");

    } catch (e) {
        console.error("Migration failed:", e);
    }
}
migrateItems();

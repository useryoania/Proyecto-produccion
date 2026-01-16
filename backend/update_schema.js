require('dotenv').config();
const { getPool, sql } = require('./config/db');

async function migrate() {
    try {
        const pool = await getPool();

        console.log("🛠 Updating table schema...");

        // 1. Add missing columns safely
        const alterQuery = `
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Despachos' AND COLUMN_NAME = 'Codigo')
            BEGIN
                ALTER TABLE Despachos ADD Codigo varchar(50) NULL;
            END

             IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Despachos' AND COLUMN_NAME = 'AreaOrigenID')
            BEGIN
                ALTER TABLE Despachos ADD AreaOrigenID varchar(20) NULL;
            END

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Despachos' AND COLUMN_NAME = 'AreaDestinoID')
            BEGIN
                ALTER TABLE Despachos ADD AreaDestinoID varchar(20) NULL;
            END

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Despachos' AND COLUMN_NAME = 'UsuarioEmisorID')
            BEGIN
                ALTER TABLE Despachos ADD UsuarioEmisorID int NULL;
            END

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Despachos' AND COLUMN_NAME = 'Estado')
            BEGIN
                ALTER TABLE Despachos ADD Estado varchar(20) DEFAULT 'EN_TRANSITO';
            END

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Despachos' AND COLUMN_NAME = 'Observaciones')
            BEGIN
                ALTER TABLE Despachos ADD Observaciones nvarchar(255) NULL;
            END
        `;

        await pool.request().query(alterQuery);
        console.log("✅ Schema updated successfully.");

        // Update old fields mappings if needed
        await pool.request().query("UPDATE Despachos SET Codigo = CodigoSeguimiento WHERE Codigo IS NULL");

    } catch (e) {
        console.error("Migration failed:", e);
    }
}
migrate();

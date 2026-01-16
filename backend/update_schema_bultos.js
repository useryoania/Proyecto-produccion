require('dotenv').config();
const { getPool, sql } = require('./config/db');

async function updateItemsForBultos() {
    try {
        const pool = await getPool();

        console.log("🛠 Adding Bulto tracking columns to DespachoItems...");

        // Usamos EtiquetaID para vincular con la tabla Etiquetas (si existe) o CodigoBulto para el string del QR
        const alterQuery = `
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DespachoItems' AND COLUMN_NAME = 'EtiquetaID')
            BEGIN
                ALTER TABLE DespachoItems ADD EtiquetaID int NULL;
            END

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DespachoItems' AND COLUMN_NAME = 'CodigoBulto')
            BEGIN
                ALTER TABLE DespachoItems ADD CodigoBulto varchar(50) NULL;
            END
        `;

        await pool.request().query(alterQuery);
        console.log("✅ DespachoItems updated for detailed Bulto tracking.");

    } catch (e) {
        console.error("Schema update failed:", e);
    }
}
updateItemsForBultos();

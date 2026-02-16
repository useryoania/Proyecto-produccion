const { getPool } = require('../config/db');

async function addColumn() {
    try {
        const pool = await getPool();
        console.log("Adding ActivosComplementarios column...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ConfigMapeoERP]') AND name = 'ActivosComplementarios')
            BEGIN
                ALTER TABLE [dbo].[ConfigMapeoERP] ADD ActivosComplementarios NVARCHAR(MAX) NULL
                PRINT 'Column added successfully.'
            END
            ELSE
            BEGIN
                PRINT 'Column already exists.'
            END
        `);
        console.log("Done.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

addColumn();

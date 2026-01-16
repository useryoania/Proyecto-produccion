
const { sql, getPool } = require('../config/db');

async function createTable() {
    try {
        const pool = await getPool();
        console.log("Creating/Verifying Etiquetas table...");

        await pool.query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Etiquetas]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[Etiquetas](
                    [EtiquetaID] [int] IDENTITY(1,1) NOT NULL,
                    [OrdenID] [int] NOT NULL,
                    [NumeroBulto] [int] NOT NULL,
                    [TotalBultos] [int] NOT NULL,
                    [CodigoQR] [nvarchar](max) NULL,
                    [FechaGeneracion] [datetime] DEFAULT GETDATE(),
                    [CreadoPor] [nvarchar](100) NULL,
                    PRIMARY KEY CLUSTERED ([EtiquetaID] ASC)
                )
                PRINT 'Table Etiquetas created.'
            END
            ELSE
            BEGIN
                PRINT 'Table Etiquetas already exists.'
            END
        `);
        console.log("Done.");

    } catch (err) {
        console.error("Error creating table:", err);
    }
}

createTable();

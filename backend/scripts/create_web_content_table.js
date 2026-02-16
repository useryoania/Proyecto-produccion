const { getPool } = require('../config/db');

async function createTable() {
    try {
        const pool = await getPool();
        console.log("Creating ContenidoWeb table...");

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ContenidoWeb]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[ContenidoWeb](
                    [ID] [int] IDENTITY(1,1) NOT NULL,
                    [Tipo] [nvarchar](50) NOT NULL, -- 'SIDEBAR', 'POPUP'
                    [Titulo] [nvarchar](100) NULL,
                    [ImagenUrl] [nvarchar](max) NULL,
                    [LinkDestino] [nvarchar](max) NULL,
                    [Activo] [bit] NOT NULL DEFAULT 1,
                    [Orden] [int] NOT NULL DEFAULT 0,
                    [FechaCreacion] [datetime] DEFAULT GETDATE(),
                    PRIMARY KEY CLUSTERED ([ID] ASC)
                )
                PRINT 'Table created.'
            END
            ELSE
            BEGIN
                PRINT 'Table already exists.'
            END
        `);
        console.log("Done.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

createTable();

const { sql, getPool } = require('../backend/config/db');

async function migratePricingTables() {
    console.log("🚀 Starting DB Migration for Pricing Tables...");
    const pool = await getPool();

    try {
        console.log("Adding new columns if they do not exist...");
        
        // Add ProdIdProducto to PreciosBase
        await pool.request().query(`
            IF COL_LENGTH('PreciosBase', 'ProdIdProducto') IS NULL
            BEGIN
                ALTER TABLE PreciosBase ADD ProdIdProducto INT NULL;
            END
        `);

        // Add ProdIdProducto to PerfilesItems
        await pool.request().query(`
            IF COL_LENGTH('PerfilesItems', 'ProdIdProducto') IS NULL
            BEGIN
                ALTER TABLE PerfilesItems ADD ProdIdProducto INT NULL;
            END
        `);

        // Add ProdIdProducto & CliIdCliente to PreciosEspecialesItems
        await pool.request().query(`
            IF COL_LENGTH('PreciosEspecialesItems', 'ProdIdProducto') IS NULL
            BEGIN
                ALTER TABLE PreciosEspecialesItems ADD ProdIdProducto INT NULL;
            END
            
            IF COL_LENGTH('PreciosEspecialesItems', 'CliIdCliente') IS NULL
            BEGIN
                ALTER TABLE PreciosEspecialesItems ADD CliIdCliente INT NULL;
            END
        `);

        // Add CliIdCliente to PreciosEspeciales
        await pool.request().query(`
            IF COL_LENGTH('PreciosEspeciales', 'CliIdCliente') IS NULL
            BEGIN
                ALTER TABLE PreciosEspeciales ADD CliIdCliente INT NULL;
            END
        `);

        console.log("Migrating values (UPDATING rows)...");

        // Migrate PreciosBase
        console.log("   -> Migrating PreciosBase...");
        await pool.request().query(`
            UPDATE PB
            SET PB.ProdIdProducto = A.ProIdProducto
            FROM PreciosBase PB
            INNER JOIN Articulos A ON LTRIM(RTRIM(PB.CodArticulo)) = LTRIM(RTRIM(A.CodArticulo))
            WHERE PB.ProdIdProducto IS NULL;
        `);

        // Migrate PerfilesItems
        console.log("   -> Migrating PerfilesItems...");
        await pool.request().query(`
            UPDATE PI
            SET PI.ProdIdProducto = CASE WHEN LTRIM(RTRIM(PI.CodArticulo)) = 'TOTAL' THEN 0 ELSE A.ProIdProducto END
            FROM PerfilesItems PI
            LEFT JOIN Articulos A ON LTRIM(RTRIM(PI.CodArticulo)) = LTRIM(RTRIM(A.CodArticulo))
            WHERE PI.ProdIdProducto IS NULL;
        `);

        // Migrate PreciosEspecialesItems
        console.log("   -> Migrating PreciosEspecialesItems...");
        await pool.request().query(`
            UPDATE PEI
            SET PEI.ProdIdProducto = CASE WHEN LTRIM(RTRIM(PEI.CodArticulo)) = 'TOTAL' THEN 0 ELSE A.ProIdProducto END
            FROM PreciosEspecialesItems PEI
            LEFT JOIN Articulos A ON LTRIM(RTRIM(PEI.CodArticulo)) = LTRIM(RTRIM(A.CodArticulo))
            WHERE PEI.ProdIdProducto IS NULL;

            UPDATE PEI
            SET PEI.CliIdCliente = C.CliIdCliente
            FROM PreciosEspecialesItems PEI
            INNER JOIN Clientes C ON PEI.ClienteID = C.CodCliente OR PEI.ClienteID = C.CliIdCliente
            WHERE PEI.CliIdCliente IS NULL;
        `);

        // Migrate PreciosEspeciales
        console.log("   -> Migrating PreciosEspeciales...");
        await pool.request().query(`
            UPDATE PE
            SET PE.CliIdCliente = C.CliIdCliente
            FROM PreciosEspeciales PE
            INNER JOIN Clientes C ON PE.ClienteID = C.CodCliente OR PE.ClienteID = C.CliIdCliente
            WHERE PE.CliIdCliente IS NULL;
        `);

        console.log("🔥 WARNING: Deleting old columns as requested by the user...");

        // Drop CodArticulo from PreciosBase
        await pool.request().query(`
            IF COL_LENGTH('PreciosBase', 'CodArticulo') IS NOT NULL
            BEGIN
                ALTER TABLE PreciosBase DROP COLUMN CodArticulo;
            END
        `);

        // Drop CodArticulo from PerfilesItems
        await pool.request().query(`
            IF COL_LENGTH('PerfilesItems', 'CodArticulo') IS NOT NULL
            BEGIN
                ALTER TABLE PerfilesItems DROP COLUMN CodArticulo;
            END
        `);

        // Drop CodArticulo and ClienteID from PreciosEspecialesItems
        await pool.request().query(`
            IF COL_LENGTH('PreciosEspecialesItems', 'CodArticulo') IS NOT NULL
            BEGIN
                ALTER TABLE PreciosEspecialesItems DROP COLUMN CodArticulo;
            END
            
            IF COL_LENGTH('PreciosEspecialesItems', 'ClienteID') IS NOT NULL
            BEGIN
                ALTER TABLE PreciosEspecialesItems DROP COLUMN ClienteID;
            END
        `);

        // Drop ClienteID from PreciosEspeciales
        await pool.request().query(`
            IF COL_LENGTH('PreciosEspeciales', 'ClienteID') IS NOT NULL
            BEGIN
                ALTER TABLE PreciosEspeciales DROP COLUMN ClienteID;
            END
        `);

        console.log("✅ DB Migration completed completely structure mapped!");

    } catch (e) {
        console.error("❌ Error during DB migration:", e.message);
    } finally {
        process.exit(0);
    }
}

migratePricingTables();

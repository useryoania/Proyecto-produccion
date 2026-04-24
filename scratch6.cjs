const { getPool } = require('./backend/config/db');

getPool().then(async p => {
    try {
        console.log("Dropping constraints first...");
        const columns = ['HandyPaymentId', 'HandyPaymentLink', 'EstadoSyncERP', 'EstadoSyncReact', 'ObsERP', 'ObsReact'];
        
        for (const col of columns) {
            const query = `
                DECLARE @ConstraintName nvarchar(200)
                SELECT @ConstraintName = Name 
                FROM sys.default_constraints
                WHERE parent_object_id = OBJECT_ID('PedidosCobranza')
                AND parent_column_id = (
                    SELECT column_id FROM sys.columns
                    WHERE name = N'${col}' AND object_id = OBJECT_ID('PedidosCobranza')
                )
                IF @ConstraintName IS NOT NULL
                EXEC('ALTER TABLE PedidosCobranza DROP CONSTRAINT ' + @ConstraintName)
            `;
            await p.request().query(query);
        }
        
        console.log("Constraints dropped. Dropping columns...");
        await p.request().query(`
            ALTER TABLE PedidosCobranza
            DROP COLUMN IF EXISTS HandyPaymentId, HandyPaymentLink, EstadoSyncERP, EstadoSyncReact, ObsERP, ObsReact;
        `);
        console.log("✅ Columnas removidas de PedidosCobranza.");

        console.log("Alterando PedidosCobranzaDetalle...");
        await p.request().query(`
            ALTER TABLE PedidosCobranzaDetalle
            ADD Moneda VARCHAR(10) NULL,
                PerfilAplicado NVARCHAR(MAX) NULL,
                PricingTrace NVARCHAR(MAX) NULL;
        `);
        console.log("✅ Columnas agregadas a PedidosCobranzaDetalle.");
    } catch (e) {
        if (e.message.includes('already exists') || e.message.includes('Column names in each table must be unique')) {
           console.log("Columnos ya existian (Warning):", e.message);
        } else {
           console.error("Error DB:", e);
        }
    }
    process.exit(0);
}).catch(console.error);

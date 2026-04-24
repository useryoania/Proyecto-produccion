const { getPool } = require('./backend/config/db');

getPool().then(async p => {
    try {
        console.log("Alterando PedidosCobranza...");
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
           console.log("Columnos ya exisitan (Warning):", e.message);
        } else {
           console.error("Error DB:", e);
        }
    }
    process.exit(0);
}).catch(console.error);

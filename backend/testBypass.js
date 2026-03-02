const { getPool, sql } = require('./config/db');
const ERPSyncService = require('./services/erpSyncService');

async function test() {
    try {
        console.log("Testing bypass...");
        const res = await ERPSyncService.syncFinalOrderIntegration('174', 1, 'Sistema', null, { 
            syncTarget: 'REACT',
            isReactEnabledGlobal: false,
            isErpEnabledGlobal: true
        });
        console.log("Result:", res);
    } catch (e) {
        console.error("Error catched:", e);
    }
    process.exit(0);
}
test();

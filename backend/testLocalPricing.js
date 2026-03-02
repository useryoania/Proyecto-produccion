const path = require('path');
const { getPool, sql } = require('./config/db');
const PricingService = require('./services/pricingService');

async function testCalculate() {
    console.log("Testing calculate...");
    // sib.CodArticulo = '48', internalClientId = '5713011', extraProfiles = [2], vars = {}, targetCurrency = 'USD'
    try {
        const result = await PricingService.calculatePrice('48', 0.48, '5713011', [2], {}, 'USD');
        console.log("CALCULATE RESULT:", JSON.stringify(result, null, 2));
    } catch(e) {
        console.error("ERROR", e);
    }
}
testCalculate().then(() => process.exit(0));

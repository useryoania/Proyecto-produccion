const { getPool, sql } = require('./backend/config/db');

async function analyzePrices() {
    try {
        const p = await getPool();
        
        console.log("\n--- ESTRUCTURA DE TABLA PreciosBase ---");
        const c1 = await p.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PreciosBase'");
        console.table(c1.recordset);

        console.log("\n--- EJEMPLOS DE ARTICULOS CON VARIAS MONEDAS ---");
        const c2 = await p.request().query(`
            SELECT CodArticulo, COUNT(Moneda) as Monedas, MIN(Moneda) as M1, MAX(Moneda) as M2
            FROM PreciosBase
            GROUP BY CodArticulo
            HAVING COUNT(Moneda) > 1
        `);
        console.table(c2.recordset);

        console.log("\n--- EJEMPLOS DE ARTICULOS DTF Y SB ---");
        const c3 = await p.request().query(`
            SELECT CodArticulo, Precio, Moneda FROM PreciosBase
            WHERE CodArticulo IN ('110', '113', '109') OR CodArticulo LIKE '%SB%' OR CodArticulo LIKE '%DTF%'
        `);
        console.table(c3.recordset);
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
analyzePrices();

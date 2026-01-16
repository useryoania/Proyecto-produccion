require('dotenv').config();
const { getPool, sql } = require('./config/db');

async function testCreate() {
    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            console.log("1. Transaction started");

            const dispatchCode = "TEST-" + Date.now();
            const originAreaId = "PRODUCCION";
            const destAreaId = "LOGISTICA";
            const userId = 1;
            const observations = "Test obs";

            // Try Insert
            console.log("2. Attempting Insert...");
            const resultVals = await new sql.Request(transaction)
                .input('Codigo', sql.VarChar(50), dispatchCode)
                .input('AreaOrigen', sql.VarChar(20), originAreaId)
                .input('AreaDestino', sql.VarChar(20), destAreaId)
                .input('UsuarioID', sql.Int, userId)
                .input('Obs', sql.NVarChar(255), observations)
                .query(`
                    INSERT INTO Despachos (Codigo, AreaOrigenID, AreaDestinoID, UsuarioEmisorID, Estado, Observaciones)
                    OUTPUT INSERTED.DespachoID
                    VALUES (@Codigo, @AreaOrigen, @AreaDestino, @UsuarioID, 'EN_TRANSITO', @Obs)
                `);

            console.log("3. Insert Success. ID:", resultVals.recordset[0].DespachoID);

            await transaction.rollback();
            console.log("4. Rollback (Test Only)");

        } catch (inner) {
            console.error("❌ SQL Error inside transaction:", inner);
            await transaction.rollback();
        }

    } catch (e) {
        console.error("❌ Connection/Main Error:", e);
    }
}

testCreate();

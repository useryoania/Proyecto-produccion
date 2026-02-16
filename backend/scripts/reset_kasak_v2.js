const { getPool, sql } = require('../config/db');

async function resetPassword() {
    try {
        console.log("Iniciando conexión a BD...");
        const pool = await getPool();
        console.log("Conectado. Buscando Kasak-1899...");

        // Buscamos con LIKE por si hay espacios
        const search = await pool.request().query("SELECT CodCliente, IDCliente, WebPasswordHash FROM Clientes WHERE IDCliente LIKE '%Kasak-1899%'");

        console.log(`Encontrados: ${search.recordset.length}`);
        if (search.recordset.length > 0) {
            console.log("Detalles:", search.recordset[0]);

            await pool.request()
                .input('ID', sql.Int, search.recordset[0].CodCliente)
                .query("UPDATE Clientes SET WebPasswordHash = '2', WebResetPassword = 0, WebActive = 1 WHERE CodCliente = @ID");
            console.log("✅ UPDATE Completado. Password es '2'");
        } else {
            console.log("❌ No encontrado.");
        }
        process.exit(0);

    } catch (err) {
        console.log("❌ Error Catch:", err);
        process.exit(1);
    }
}

resetPassword();

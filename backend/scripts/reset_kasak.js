const { getPool, sql } = require('../config/db');

async function resetPassword() {
    try {
        console.log("Iniciando reset de contraseña para 'Kasak-1899'...");
        const pool = await getPool();

        // Buscamos con LIKE por si hay espacios
        const search = await pool.request().query("SELECT CodCliente, IDCliente FROM Clientes WHERE IDCliente LIKE '%Kasak-1899%'");

        if (search.recordset.length === 0) {
            console.error("❌ No se encontró ningún cliente que coincida con 'Kasak-1899'");
            process.exit(1);
        }

        const cliente = search.recordset[0];
        console.log(`✅ Cliente encontrado: ${cliente.IDCliente} (Cod: ${cliente.CodCliente})`);

        // Actualizamos
        await pool.request()
            .input('ID', sql.Int, cliente.CodCliente)
            .input('Pass', sql.NVarChar, '2')
            .query("UPDATE Clientes SET WebPasswordHash = @Pass, WebResetPassword = 0, WebActive = 1 WHERE CodCliente = @ID");

        console.log(`✅ Contraseña restablecida a '2' correctamente.`);
        process.exit(0);

    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

resetPassword();

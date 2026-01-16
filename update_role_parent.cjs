const { getPool, sql } = require('./backend/config/db');

async function run() {
    try {
        const pool = await getPool();

        console.log("Updating module parent to 22 (Configuración)...");
        await pool.request()
            .query("UPDATE Modulos SET IdPadre = 22, Titulo = 'Gestión de Roles', Icono = 'fa-users-gear' WHERE Ruta = '/admin/roles'");

        console.log("Module updated.");
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();

const { getPool, sql } = require('../config/db');

async function updateMenu() {
    try {
        const pool = await getPool();
        console.log("🛠️ Actualizando Menú Logística...");

        // 1. Actualizar el Item Principal (ID 10)
        // Corregimos la ruta a /logistica (sin slash final, minuscula) y asignamos icono
        await pool.request().query(`
            UPDATE Modulos 
            SET Ruta = '/logistica', 
                Icono = 'fa-truck-ramp-box', 
                Titulo = 'Logística WMS'
            WHERE IdModulo = 10;
        `);
        console.log("✅ ID 10 Actualizado.");

        // 2. Eliminar submenú viejo 'Despacho' (ID 13) si existe
        // Primero limpiamos referencias (FK)
        await pool.request().query(`
            DELETE FROM PermisosRoles WHERE IdModulo = 13;
            DELETE FROM Modulos WHERE IdModulo = 13;
        `);
        console.log("✅ ID 13 Eliminado (Submenú obsoleto).");

        // 3. Asegurar Permisos (Rol 1 = Admin)
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM PermisosRoles WHERE IdModulo = 10 AND IdRol = 1)
            BEGIN
                INSERT INTO PermisosRoles (IdRol, IdModulo) VALUES (1, 10);
            END
        `);
        console.log("✅ Permisos verificados.");

        console.log("🎉 Menú Logística Listo.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error actualizando menú:", err);
        process.exit(1);
    }
}

updateMenu();

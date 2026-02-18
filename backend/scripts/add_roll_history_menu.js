const { getPool, sql } = require('../config/db');

(async () => {
    try {
        const pool = await getPool();
        console.log("🔌 Conectando a Base de Datos...");

        // 1. Insertar Modulo "Historial de Lotes"
        // Verificar si ya existe
        const checkRes = await pool.request()
            .input('Ruta', sql.VarChar, '/consultas/rollos')
            .query("SELECT IdModulo FROM Modulos WHERE Ruta = @Ruta");

        let moduleId;
        if (checkRes.recordset.length > 0) {
            moduleId = checkRes.recordset[0].IdModulo;
            console.log(`✅ Módulo ya existe (ID: ${moduleId})`);
        } else {
            const insertRes = await pool.request()
                .input('Titulo', sql.VarChar, 'Historial de Lotes')
                .input('Icono', sql.VarChar, 'fa-clock-rotate-left')
                .input('Ruta', sql.VarChar, '/consultas/rollos')
                .input('IdPadre', sql.Int, 3) // Producción
                .input('IndiceOrden', sql.Int, 99) // Al final
                .query(`
                    INSERT INTO Modulos (Titulo, Icono, Ruta, IdPadre, IndiceOrden)
                    OUTPUT INSERTED.IdModulo
                    VALUES (@Titulo, @Icono, @Ruta, @IdPadre, @IndiceOrden)
                `);
            moduleId = insertRes.recordset[0].IdModulo;
            console.log(`✨ Módulo creado (ID: ${moduleId})`);
        }

        // 2. Asignar Permisos (Rol 1 y Rol 3)
        const roles = [1, 3];
        for (const rolId of roles) {
            const checkPerm = await pool.request()
                .input('IdRol', sql.Int, rolId)
                .input('IdModulo', sql.Int, moduleId)
                .query("SELECT 1 FROM PermisosRoles WHERE IdRol = @IdRol AND IdModulo = @IdModulo");

            if (checkPerm.recordset.length === 0) {
                await pool.request()
                    .input('IdRol', sql.Int, rolId)
                    .input('IdModulo', sql.Int, moduleId)
                    .query("INSERT INTO PermisosRoles (IdRol, IdModulo) VALUES (@IdRol, @IdModulo)");
                console.log(`✅ Permiso asignado al Rol ${rolId}`);
            } else {
                console.log(`ℹ️ Permiso ya existe para Rol ${rolId}`);
            }
        }

        process.exit(0);
    } catch (e) {
        console.error("❌ Error:", e);
        process.exit(1);
    }
})();

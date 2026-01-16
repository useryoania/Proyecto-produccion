const { getPool, sql } = require('../config/db');

async function addMenu() {
    try {
        const pool = await getPool();
        console.log("--- AGREGANDO MENU INVENTARIO ---");

        // 1. Buscar Parent (Logistica o Produccion)
        // Preferimos Logistica
        let parentId = null;

        let r = await pool.request().query("SELECT MenuID FROM MenuApp WHERE Titulo = 'Logística'");
        if (r.recordset.length > 0) parentId = r.recordset[0].MenuID;
        else {
            r = await pool.request().query("SELECT MenuID FROM MenuApp WHERE Titulo = 'Producción'");
            if (r.recordset.length > 0) parentId = r.recordset[0].MenuID;
        }

        // 2. Insertar si no existe
        const check = await pool.request().query("SELECT MenuID FROM MenuApp WHERE Ruta = '/inventario'");
        if (check.recordset.length > 0) {
            console.log("✅ El menú /inventario ya existe.");
        } else {
            await pool.request()
                .input('Titulo', sql.NVarChar, 'Inventario')
                .input('Ruta', sql.NVarChar, '/inventario')
                .input('Icono', sql.NVarChar, 'fa-solid fa-boxes-stacked')
                .input('Parent', sql.Int, parentId) // Can be null
                .input('Orden', sql.Int, 99)
                .query(`
                    INSERT INTO MenuApp (Titulo, Ruta, Icono, ParentID, Orden, Activo)
                    VALUES (@Titulo, @Ruta, @Icono, @Parent, @Orden, 1)
                `);
            console.log("✅ Menú Inventario agregado correctamente.");
        }

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit();
}

addMenu();

const { getPool, sql } = require('../config/db');

async function addMenu() {
    try {
        const pool = await getPool();

        // 1. Find Parent
        const parentRes = await pool.request()
            .query("SELECT IdModulo FROM Modulos WHERE Titulo LIKE '%Logística%' OR Titulo LIKE '%Logistica%'");

        let parentId = null;
        if (parentRes.recordset.length > 0) {
            parentId = parentRes.recordset[0].IdModulo;
        }

        // 2. Check if exists
        let newId = null;
        const check = await pool.request()
            .input('R', sql.NVarChar, '/logistica/transporte')
            .query("SELECT IdModulo FROM Modulos WHERE Ruta = @R");

        if (check.recordset.length > 0) {
            console.log("Menu item already exists.");
            newId = check.recordset[0].IdModulo;
        } else {
            // 3. Insert
            await pool.request()
                .input('Titulo', sql.NVarChar, 'Control Transporte')
                .input('Ruta', sql.NVarChar, '/logistica/transporte')
                .input('Icono', sql.NVarChar, 'fa-truck-fast')
                .input('IdPadre', sql.Int, parentId)
                .input('Indice', sql.Int, 99)
                .query(`
                    INSERT INTO Modulos (Titulo, Ruta, Icono, IdPadre, IndiceOrden)
                    VALUES (@Titulo, @Ruta, @Icono, @IdPadre, @Indice)
                `);

            // Get ID
            const newIdRes = await pool.request()
                .input('R', sql.NVarChar, '/logistica/transporte')
                .query("SELECT IdModulo FROM Modulos WHERE Ruta = @R");
            newId = newIdRes.recordset[0].IdModulo;
            console.log("✅ Menu item 'Control Transporte' added successfully!");
        }

        // 4. Assign Permission
        if (newId) {
            // Check if permission exists
            const permCheck = await pool.request()
                .input('RID', sql.Int, 1)
                .input('MID', sql.Int, newId)
                .query("SELECT * FROM PermisosRoles WHERE IdRol = @RID AND IdModulo = @MID");

            if (permCheck.recordset.length === 0) {
                await pool.request()
                    .input('RID', sql.Int, 1)
                    .input('MID', sql.Int, newId)
                    .query("INSERT INTO PermisosRoles (IdRol, IdModulo) VALUES (@RID, @MID)");
                console.log("✅ Permission assigned to Admin role (PermisosRoles).");
            } else {
                console.log("Permission already exists.");
            }
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

addMenu();

const { getPool, sql } = require('./backend/config/db');

async function run() {
    try {
        const pool = await getPool();

        // Check parent 2
        const parent = await pool.request().query('SELECT * FROM Modulos WHERE IdModulo = 2');
        console.log("Parent 2:", parent.recordset[0]);

        // Insert if not exists
        const check = await pool.request().query("SELECT * FROM Modulos WHERE Ruta = '/admin/roles'");
        if (check.recordset.length === 0) {
            console.log("Inserting module...");
            await pool.request()
                .input('Titulo', sql.NVarChar, 'Gestión de Roles')
                .input('Ruta', sql.NVarChar, '/admin/roles')
                .input('Icono', sql.NVarChar, 'fa-users-gear')
                .input('IdPadre', sql.Int, 2)
                .input('IndiceOrden', sql.Int, 25)
                .query(`
                    INSERT INTO Modulos (Titulo, Ruta, Icono, IdPadre, IndiceOrden)
                    VALUES (@Titulo, @Ruta, @Icono, @IdPadre, @IndiceOrden)
                `);
            console.log("Module inserted.");
        } else {
            console.log("Module already exists.");
        }
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();

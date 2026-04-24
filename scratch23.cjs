const { getPool } = require('./backend/config/db');

async function addMenuEntry() {
    try {
        const pool = await getPool();
        // 1. Find the 'Contabilidad' or 'Administración' parent menu.
        // Usually Contabilidad has a name like 'Contabilidad' or 'Administración'
        const parentRes = await pool.request().query(`
            SELECT IdModulo FROM ModulosSistema WHERE Nombre LIKE '%Contabilidad%' OR Nombre LIKE '%Administraci_n%'
        `);
        
        let parentId = null;
        if (parentRes.recordset.length > 0) {
            parentId = parentRes.recordset[0].IdModulo;
        }

        // 2. Insert Bandeja CFE
        await pool.request()
            .input('IdPadre', parentId)
            .query(`
            IF NOT EXISTS (SELECT 1 FROM ModulosSistema WHERE Ruta = '/contabilidad/bandeja-cfe')
            BEGIN
                INSERT INTO ModulosSistema (IdPadre, Nombre, Ruta, Icono, IndiceOrden, ModuloVisible, PermisoRequerido)
                VALUES (@IdPadre, 'Bandeja CFE', '/contabilidad/bandeja-cfe', 'fa-file-invoice', 99, 1, 'VER_CONTABILIDAD')
            END
        `);
        console.log('Menu entry Bandeja CFE added successfully');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
addMenuEntry();

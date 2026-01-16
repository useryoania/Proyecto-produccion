const { getPool, sql } = require('./backend/config/db');

async function addLogisticsMenu() {
    try {
        const pool = await getPool();

        // 1. Buscar padre "Atención al Cliente"
        let parentRes = await pool.request()
            .input('Nombre', sql.VarChar, 'Atención al Cliente')
            .query("SELECT IdModulo FROM Modulos WHERE Titulo = @Nombre OR Titulo = 'Atención al Cliente'");

        // Si no existe, buscar 'Logística'
        if (parentRes.recordset.length === 0) {
            parentRes = await pool.request()
                .input('Nombre', sql.VarChar, 'Logística')
                .query("SELECT IdModulo FROM Modulos WHERE Titulo = @Nombre");
        }

        let parentId = parentRes.recordset.length > 0 ? parentRes.recordset[0].IdModulo : null;

        if (!parentId) {
            console.log("No se encontró módulo padre. Creando 'Logística Global'...");
            const newParent = await pool.request().query("INSERT INTO Modulos (Titulo, Ruta, Icono, IndiceOrden) OUTPUT INSERTED.IdModulo VALUES ('Logística Global', '/logistica-global', 'fa-truck', 90)");
            parentId = newParent.recordset[0].IdModulo;
        }

        // 2. Insertar Modulo Control Logístico
        const ruta = '/atencion-cliente/control';
        const check = await pool.request().input('Ruta', sql.VarChar, ruta).query("SELECT IdModulo FROM Modulos WHERE Ruta = @Ruta");

        let moduloId;
        if (check.recordset.length > 0) {
            console.log("El menú ya existe.");
            moduloId = check.recordset[0].IdModulo;
        } else {
            const insert = await pool.request()
                .input('Titulo', sql.VarChar, 'Control Logístico')
                .input('Ruta', sql.VarChar, ruta)
                .input('Icono', sql.VarChar, 'fa-barcode')
                .input('IdPadre', sql.Int, parentId)
                .input('Orden', sql.Int, 20)
                .query("INSERT INTO Modulos (Titulo, Ruta, Icono, IdPadre, IndiceOrden) OUTPUT INSERTED.IdModulo VALUES (@Titulo, @Ruta, @Icono, @IdPadre, @Orden)");

            moduloId = insert.recordset[0].IdModulo;
            console.log("Menú creado con ID:", moduloId);
        }

        // 3. Asignar Permisos a todos los roles (para probar)
        // Intentar adivinar nombre columna foreign key. IdModulo o ModuloID?
        // Check columns of PermisosRoles
        const cols = await pool.request().query("SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('PermisosRoles')");
        const colNames = cols.recordset.map(c => c.name);

        const modCol = colNames.includes('IdModulo') ? 'IdModulo' : 'ModuloID';
        const rolCol = colNames.includes('IdRol') ? 'IdRol' : 'RolID';

        console.log(`Usando columnas: ${modCol}, ${rolCol}`);

        await pool.request().input('ModID', sql.Int, moduloId).query(`
            DELETE FROM PermisosRoles WHERE ${modCol} = @ModID;
            INSERT INTO PermisosRoles (${rolCol}, ${modCol})
            SELECT ${rolCol}, @ModID FROM Roles;
        `);
        console.log("Permisos asignados a todos los roles.");

        process.exit();

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

addLogisticsMenu();

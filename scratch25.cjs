const { getPool } = require('./backend/config/db');

async function fixPermissions() {
    try {
        const pool = await getPool();
        const modRes = await pool.request().query(`SELECT IdModulo FROM Modulos WHERE Ruta = '/contabilidad/bandeja-cfe'`);
        if (modRes.recordset.length > 0) {
            const idMod = modRes.recordset[0].IdModulo;
            await pool.request()
                .input('IdMod', idMod)
                .query(`
                IF NOT EXISTS (SELECT 1 FROM PermisosRoles WHERE IdModulo = @IdMod AND IdRol = 1)
                BEGIN
                    INSERT INTO PermisosRoles (IdRol, IdModulo, Permisos) VALUES (1, @IdMod, 'R,W,D')
                END
            `);
            console.log('Permisos añadidos para Bandeja CFE al Rol 1');
        }
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
fixPermissions();

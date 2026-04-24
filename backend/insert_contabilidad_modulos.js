const { getPool } = require('./config/db');
const sql = require('mssql');

async function main() {
    try {
        const pool = await getPool();

        // Helper to insert module if not exists
        async function upsertModule(titulo, idPadre, ruta, icono, indice) {
            const check = await pool.request()
                .input('titulo', sql.VarChar, titulo)
                .query(`SELECT IdModulo FROM Modulos WHERE Titulo = @titulo`);
            
            if (check.recordset.length > 0) {
                return check.recordset[0].IdModulo;
            }

            const insert = await pool.request()
                .input('titulo', sql.VarChar, titulo)
                .input('idPadre', sql.Int, idPadre)
                .input('ruta', sql.VarChar, ruta)
                .input('icono', sql.VarChar, icono)
                .input('indice', sql.Int, indice)
                .query(`
                    INSERT INTO Modulos (Titulo, IdPadre, Ruta, Icono, IndiceOrden)
                    OUTPUT INSERTED.IdModulo
                    VALUES (@titulo, @idPadre, @ruta, @icono, @indice)
                `);
            return insert.recordset[0].IdModulo;
        }

        // Helper to ensure role permission
        async function ensurePermission(idModulo, idRol) {
            const check = await pool.request()
                .input('idModulo', sql.Int, idModulo)
                .input('idRol', sql.Int, idRol)
                .query(`SELECT 1 FROM PermisosRoles WHERE IdModulo = @idModulo AND IdRol = @idRol`);
            
            if (check.recordset.length === 0) {
                await pool.request()
                    .input('idModulo', sql.Int, idModulo)
                    .input('idRol', sql.Int, idRol)
                    .query(`INSERT INTO PermisosRoles (IdModulo, IdRol) VALUES (@idModulo, @idRol)`);
            }
        }

        console.log("Creando módulo padre 'Contabilidad'...");
        const parentId = await upsertModule('Contabilidad', null, null, 'fa-calculator', 91);
        await ensurePermission(parentId, 1);

        console.log("Creando sub-módulos...");
        const mods = [
            { t: 'Cuentas Clientes', r: '/contabilidad/cuentas', i: 'fa-credit-card', idx: 1 },
            { t: 'Antigüedad de Deuda', r: '/contabilidad/antiguedad', i: 'fa-calendar', idx: 2 },
            { t: 'Cola Estados Cuenta', r: '/contabilidad/cola-estados', i: 'fa-book-open', idx: 3 },
            { t: 'Tipos Movimiento', r: '/contabilidad/tipos-movimiento', i: 'fa-gear', idx: 4 }
        ];

        for (const m of mods) {
            const mId = await upsertModule(m.t, parentId, m.r, m.i, m.idx);
            await ensurePermission(mId, 1);
            console.log(`- ${m.t} creado/verificado (ID: ${mId})`);
        }

        console.log("Módulos de Contabilidad instalados correctamente.");
        process.exit(0);

    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();

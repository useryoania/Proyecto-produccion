require('dotenv').config();
const { getPool, sql } = require('./config/db');
async function run() {
  try {
    const pool = await getPool();
    const parentRes = await pool.request().query(`SELECT IdModulo FROM Modulos WHERE Titulo = 'Contabilidad'`);
    const parentId = parentRes.recordset[0]?.IdModulo || null;

    if (parentId) {
      const existRes = await pool.request().query(`SELECT IdModulo FROM Modulos WHERE Titulo = 'Bandeja Tesorería'`);
      if (existRes.recordset.length === 0) {
        const ins = await pool.request().query(`
          INSERT INTO Modulos (Titulo, Ruta, Icono, IdPadre, IndiceOrden)
          OUTPUT INSERTED.IdModulo
          VALUES ('Bandeja Tesorería', '/contabilidad/tesoreria', 'Landmark', ${parentId}, 5)
        `);
        const newId = ins.recordset[0].IdModulo;
        await pool.request().query(`INSERT INTO PermisosRoles (IdRol, IdModulo) VALUES (1, ${newId})`);
        console.log('Modulo Tesoreria Creado con ID:', newId);
      } else {
        console.log('Modulo ya existe:', existRes.recordset[0].IdModulo);
      }
    } else {
      console.log('No encontre parent Contabilidad');
    }
    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
}
run();

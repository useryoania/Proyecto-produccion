const { getPool } = require('./config/db');
async function setup() {
    try {
        const pool = await getPool();
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM ConfiguracionGlobal WHERE Clave = 'ActivarAvisosWSP')
        INSERT INTO ConfiguracionGlobal (Clave, Valor, AreaID) VALUES ('ActivarAvisosWSP', '1', 'ADMIN     ');
      ELSE
        UPDATE ConfiguracionGlobal SET Valor = '1' WHERE Clave = 'ActivarAvisosWSP';
    `);
        console.log('✅ Configuración insertada en DB correctamente');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
setup();

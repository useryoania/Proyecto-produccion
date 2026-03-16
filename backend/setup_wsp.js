const { getPool } = require('./config/db');
const logger = require('./utils/logger');
async function setup() {
    try {
        const pool = await getPool();
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM ConfiguracionGlobal WHERE Clave = 'ActivarAvisosWSP')
        INSERT INTO ConfiguracionGlobal (Clave, Valor, AreaID) VALUES ('ActivarAvisosWSP', '1', 'ADMIN     ');
      ELSE
        UPDATE ConfiguracionGlobal SET Valor = '1' WHERE Clave = 'ActivarAvisosWSP';
    `);
        logger.info('✅ Configuración insertada en DB correctamente');
        process.exit(0);
    } catch (e) {
        logger.error(e);
        process.exit(1);
    }
}
setup();

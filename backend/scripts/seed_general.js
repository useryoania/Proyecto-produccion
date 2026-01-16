require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');

async function seedGeneral() {
    try {
        const pool = await getPool();
        // Insertar para 'General' copiando de 'DTF' si no existen ya
        const res = await pool.request().query(`
            INSERT INTO TiposFallas (AreaID, Titulo, DescripcionDefault, EsFrecuente)
            SELECT 'General', Titulo, DescripcionDefault, EsFrecuente 
            FROM TiposFallas 
            WHERE AreaID = 'DTF' 
            AND Titulo NOT IN (SELECT Titulo FROM TiposFallas WHERE AreaID = 'General')
        `);
        console.log("Registros copiados a General:", res.rowsAffected[0]);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
seedGeneral();

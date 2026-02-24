const sql = require('mssql');
require('dotenv').config();

async function updateDB() {
    try {
        const pool = await sql.connect({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER || '127.0.0.1',
            database: process.env.DB_DATABASE,
            options: { encrypt: false, trustServerCertificate: true },
            port: parseInt(process.env.DB_PORT) || 1433,
        });

        await pool.request().query(`
            UPDATE ConfiguracionesSync 
            SET ProcesoID = 'SYNC_PLANILLA_SHEETS_DF', NombreProceso = 'Sincronizar Pedidos Google Sheets (DTF)' 
            WHERE ProcesoID = 'SYNC_PLANILLA_SHEETS';
            
            IF NOT EXISTS (SELECT * FROM ConfiguracionesSync WHERE ProcesoID = 'SYNC_PLANILLA_SHEETS_SUB')
            BEGIN
                INSERT INTO ConfiguracionesSync (ProcesoID, NombreProceso, Descripcion, Activo)
                VALUES ('SYNC_PLANILLA_SHEETS_SUB', 'Sincronizar Pedidos Google Sheets (Sublimacion)', 'Importa pedidos de la planilla de sublimacion autom.', 1);
            END
        `);

        console.log('BASE DE DATOS ACTUALIZADA CON EXITO');
        process.exit(0);
    } catch (e) {
        console.error('ERROR SQL', e.message);
        process.exit(1);
    }
}
updateDB();

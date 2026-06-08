const sql = require('mssql');
const config = require('./config/db');

async function run() {
    try {
        const pool = await config.getPool();
        console.log('Borrando tabla temporal anterior si existe...');
        await pool.request().query("IF OBJECT_ID('Temp_Articulos_Maestros', 'U') IS NOT NULL DROP TABLE Temp_Articulos_Maestros;");
        
        console.log('Creando y poblando Temp_Articulos_Maestros...');
        const res = await pool.request().query("SELECT * INTO Temp_Articulos_Maestros FROM Articulos;");
        
        console.log('Tabla creada con éxito. Filas insertadas:', res.rowsAffected);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();

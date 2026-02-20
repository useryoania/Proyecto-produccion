const { getPool } = require('./config/db');

async function checkMachineTable() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT TOP 1 * FROM ConfigEquipos");
        console.log("Columnas en ConfigEquipos:", Object.keys(result.recordset[0]));

        // Ver si hay algun rollo asignado a maquina y como esta el estado
        const r2 = await pool.request().query("SELECT TOP 5 EquipoID, Nombre, Estado FROM ConfigEquipos");
        console.log("Ejemplos Maquinas:", r2.recordset);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkMachineTable();

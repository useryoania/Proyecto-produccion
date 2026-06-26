const { getPool } = require('./config/db');

async function listMappings() {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT 
            a.ProIdProducto as local_id,
            a.Descripcion as local_nombre,
            aw.producto_maestro_id as wms_maestro_id,
            aw.nombre_wms
        FROM Articulos a
        LEFT JOIN Articulos_Wms aw ON a.ProIdProducto = aw.Idproid
        WHERE a.SupFlia = '2'
        ORDER BY a.Descripcion
    `);
    
    console.log(JSON.stringify(result.recordset, null, 2));
    process.exit(0);
}

listMappings();

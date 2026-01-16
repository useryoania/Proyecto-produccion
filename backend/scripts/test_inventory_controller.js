const { getPool, sql } = require('../config/db');

async function testController() {
    try {
        const pool = await getPool();
        console.log("--- TEST INVENTORY CONTROLLER ---");

        const areaId = 'DTF';

        const query = `
            SELECT 
                i.InsumoID, 
                i.Nombre, 
                i.CodigoReferencia as CodArt,
                i.UnidadDefault,
                (SELECT COUNT(*) FROM InventarioBobinas WHERE InsumoID = i.InsumoID AND Estado = 'Disponible' AND AreaID = @Area) as BobinasDisponibles,
                (SELECT ISNULL(SUM(MetrosRestantes),0) FROM InventarioBobinas WHERE InsumoID = i.InsumoID AND Estado = 'Disponible' AND AreaID = @Area) as MetrosTotales,
                (
                    SELECT BobinaID, CodigoEtiqueta, MetrosIniciales, MetrosRestantes, Estado, FechaIngreso
                    FROM InventarioBobinas 
                    WHERE InsumoID = i.InsumoID AND AreaID = @Area AND Estado IN ('Disponible', 'En Uso')
                    ORDER BY FechaIngreso ASC
                    FOR JSON PATH
                ) as ActiveBatches
            FROM Insumos i
            WHERE EXISTS (SELECT 1 FROM InsumosPorArea ipa WHERE ipa.InsumoID = i.InsumoID AND ipa.AreaID = @Area)
            OR EXISTS (SELECT 1 FROM InventarioBobinas ib WHERE ib.InsumoID = i.InsumoID AND ib.AreaID = @Area)
        `;

        const result = await pool.request()
            .input('Area', sql.VarChar(20), areaId)
            .query(query);

        console.log("✅ Query OK. Rows:", result.recordset.length);
        console.log(result.recordset);

    } catch (err) {
        console.error("❌ CRITICAL SQL ERROR:", err);
    }
    process.exit();
}

testController();

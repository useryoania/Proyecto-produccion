const { sql, getPool } = require('../config/db');
const { logAlert } = require('../services/alertsService');

exports.updateLocalProduct = async (req, res) => {
    const { codArticulo, descripcion, codStock, grupo, supFlia, mostrar, anchoImprimible, llevaPapel } = req.body;

    if (!codArticulo) return res.status(400).json({ error: "Falta CodArticulo" });

    try {
        const pool = await getPool();
        await pool.request()
            .input('Cod', sql.VarChar(50), codArticulo)
            .input('Desc', sql.VarChar(255), descripcion || '')
            .input('Stock', sql.VarChar(50), codStock || '')
            .input('Grp', sql.VarChar(100), grupo || '')
            .input('Sup', sql.VarChar(100), supFlia || '')
            .input('Mos', sql.Bit, mostrar ? 1 : 0)
            .input('Ancho', sql.Decimal(10, 2), anchoImprimible || 0)
            .input('Papel', sql.Bit, llevaPapel ? 1 : 0)
            .query(`
                UPDATE Articulos 
                SET Descripcion = @Desc, 
                    CodStock = @Stock, 
                    Grupo = @Grp, 
                    SupFlia = @Sup, 
                    Mostrar = @Mos, 
                    anchoimprimible = @Ancho, 
                    LLEVAPAPEL = @Papel
                WHERE CodArticulo = @Cod
            `);

        logAlert('INFO', 'PRODUCTO', 'Producto local actualizado', codArticulo, { descripcion, codStock });

        res.json({ success: true, message: "Producto actualizado correctamente" });
    } catch (e) {
        console.error("Error updateLocalProduct:", e);
        res.status(500).json({ error: e.message });
    }
};

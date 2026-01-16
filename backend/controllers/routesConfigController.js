const { getPool, sql } = require('../config/db');

// Obtener todas las reglas
exports.getAllRules = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT * FROM dbo.ConfiguracionRutas ORDER BY Prioridad ASC");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error getting rules:", err);
        res.status(500).json({ error: err.message });
    }
};

// Crear regla
exports.createRule = async (req, res) => {
    const { areaOrigen, areaDestino, prioridad, requiereExistencia } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('Origen', sql.VarChar(20), areaOrigen)
            .input('Destino', sql.VarChar(20), areaDestino)
            .input('Prio', sql.Int, prioridad || 0)
            .input('Req', sql.Bit, requiereExistencia ? 1 : 0)
            .query("INSERT INTO dbo.ConfiguracionRutas (AreaOrigen, AreaDestino, Prioridad, RequiereExistencia) VALUES (@Origen, @Destino, @Prio, @Req)");

        res.json({ success: true, message: 'Regla creada' });
    } catch (err) {
        console.error("Error creating rule:", err);
        res.status(500).json({ error: err.message });
    }
};

// Actualizar regla
exports.updateRule = async (req, res) => {
    const { id } = req.params;
    const { areaOrigen, areaDestino, prioridad, requiereExistencia } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('ID', sql.Int, id)
            .input('Origen', sql.VarChar(20), areaOrigen)
            .input('Destino', sql.VarChar(20), areaDestino)
            .input('Prio', sql.Int, prioridad)
            .input('Req', sql.Bit, requiereExistencia ? 1 : 0)
            .query(`UPDATE dbo.ConfiguracionRutas 
                    SET AreaOrigen = @Origen, AreaDestino = @Destino, Prioridad = @Prio, RequiereExistencia = @Req 
                    WHERE RutaID = @ID`);

        res.json({ success: true, message: 'Regla actualizada' });
    } catch (err) {
        console.error("Error updating rule:", err);
        res.status(500).json({ error: err.message });
    }
};

// Eliminar regla
exports.deleteRule = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        await pool.request()
            .input('ID', sql.Int, id)
            .query("DELETE FROM dbo.ConfiguracionRutas WHERE RutaID = @ID");

        res.json({ success: true, message: 'Regla eliminada' });
    } catch (err) {
        console.error("Error deleting rule:", err);
        res.status(500).json({ error: err.message });
    }
};

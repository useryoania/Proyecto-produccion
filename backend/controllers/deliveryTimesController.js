const { getPool, sql } = require('../config/db');

// Obtener Tiempos de Entrega
exports.getAllDeliveryTimes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT * FROM dbo.ConfiguracionTiemposEntrega ORDER BY Prioridad ASC");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error getting delivery times:", err);
        res.status(500).json({ error: err.message });
    }
};

// Crear Tiempo de Entrega
exports.createDeliveryTime = async (req, res) => {
    const { areaID, prioridad, horas, dias } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('AreaID', sql.VarChar(5), areaID)
            .input('Prioridad', sql.Int, prioridad)
            .input('Horas', sql.Int, horas || 0)
            .input('Dias', sql.Int, dias || 0)
            .query("INSERT INTO dbo.ConfiguracionTiemposEntrega (AreaID, Prioridad, Horas, Dias) VALUES (@AreaID, @Prioridad, @Horas, @Dias)");

        res.json({ success: true, message: 'Tiempo de entrega creado' });
    } catch (err) {
        console.error("Error creating delivery time:", err);
        res.status(500).json({ error: err.message });
    }
};

// Actualizar Tiempo de Entrega
exports.updateDeliveryTime = async (req, res) => {
    const { id } = req.params;
    const { areaID, prioridad, horas, dias } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('ID', sql.Int, id)
            .input('AreaID', sql.VarChar(5), areaID)
            .input('Prioridad', sql.Int, prioridad)
            .input('Horas', sql.Int, horas || 0)
            .input('Dias', sql.Int, dias || 0)
            .query(`UPDATE dbo.ConfiguracionTiemposEntrega 
                    SET AreaID = @AreaID, Prioridad = @Prioridad, Horas = @Horas, Dias = @Dias 
                    WHERE ConfigID = @ID`);

        res.json({ success: true, message: 'Tiempo de entrega actualizado' });
    } catch (err) {
        console.error("Error updating delivery time:", err);
        res.status(500).json({ error: err.message });
    }
};

// Eliminar Tiempo de Entrega
exports.deleteDeliveryTime = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        await pool.request()
            .input('ID', sql.Int, id)
            .query("DELETE FROM dbo.ConfiguracionTiemposEntrega WHERE ConfigID = @ID");

        res.json({ success: true, message: 'Tiempo de entrega eliminado' });
    } catch (err) {
        console.error("Error deleting delivery time:", err);
        res.status(500).json({ error: err.message });
    }
};

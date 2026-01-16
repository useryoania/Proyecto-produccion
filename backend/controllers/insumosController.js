const { getPool, sql } = require('../config/db');

// Obtener Insumos
exports.getAllInsumos = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT * FROM dbo.Insumos ORDER BY Nombre ASC");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error getting insumos:", err);
        res.status(500).json({ error: err.message });
    }
};

// Crear Insumo
exports.createInsumo = async (req, res) => {
    const { nombre, unidadDefault, categoria, esProductivo } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('Nombre', sql.NVarChar(100), nombre)
            .input('Unidad', sql.NVarChar(20), unidadDefault || 'UN')
            .input('Cat', sql.NVarChar(50), categoria || 'GENERAL')
            .input('Prod', sql.Bit, esProductivo ? 1 : 0)
            .query("INSERT INTO dbo.Insumos (Nombre, UnidadDefault, Categoria, EsProductivo) VALUES (@Nombre, @Unidad, @Cat, @Prod)");

        res.json({ success: true, message: 'Insumo creado' });
    } catch (err) {
        console.error("Error creating insumo:", err);
        res.status(500).json({ error: err.message });
    }
};

// Actualizar Insumo
exports.updateInsumo = async (req, res) => {
    const { id } = req.params;
    const { nombre, unidadDefault, categoria, esProductivo } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('ID', sql.Int, id)
            .input('Nombre', sql.NVarChar(100), nombre)
            .input('Unidad', sql.NVarChar(20), unidadDefault)
            .input('Cat', sql.NVarChar(50), categoria)
            .input('Prod', sql.Bit, esProductivo ? 1 : 0)
            .query(`UPDATE dbo.Insumos 
                    SET Nombre = @Nombre, UnidadDefault = @Unidad, Categoria = @Cat, EsProductivo = @Prod 
                    WHERE InsumoID = @ID`);

        res.json({ success: true, message: 'Insumo actualizado' });
    } catch (err) {
        console.error("Error updating insumo:", err);
        res.status(500).json({ error: err.message });
    }
};

// Eliminar Insumo
exports.deleteInsumo = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        await pool.request()
            .input('ID', sql.Int, id)
            .query("DELETE FROM dbo.Insumos WHERE InsumoID = @ID");

        res.json({ success: true, message: 'Insumo eliminado' });
    } catch (err) {
        // Manejar FK constraint error
        if (err.number === 547) {
            return res.status(400).json({ error: 'No se puede eliminar porque está en uso.' });
        }
        console.error("Error deleting insumo:", err);
        res.status(500).json({ error: err.message });
    }
};

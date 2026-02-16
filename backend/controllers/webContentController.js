const { getPool, sql } = require('../config/db');

exports.getActiveContent = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT * FROM ContenidoWeb WHERE Activo = 1 ORDER BY Orden ASC");
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error("Error getting active content:", error);
        res.status(500).json({ success: false, error: "Error retrieving content." });
    }
};

exports.getAllContent = async (req, res) => {
    try {
        const pool = await getPool();
        // Orden por Tipo y luego Orden
        const result = await pool.request().query("SELECT * FROM ContenidoWeb ORDER BY Tipo, Orden ASC");
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error("Error getting all content:", error);
        res.status(500).json({ success: false, error: "Error retrieving content." });
    }
};

exports.createContent = async (req, res) => {
    const { tipo, titulo, imagenUrl, linkDestino, activo, orden } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('tipo', sql.NVarChar, tipo)
            .input('titulo', sql.NVarChar, titulo || null)
            .input('img', sql.NVarChar, imagenUrl)
            .input('link', sql.NVarChar, linkDestino || null)
            .input('act', sql.Bit, activo !== false ? 1 : 0) // Default true
            .input('ord', sql.Int, orden || 0)
            .query(`INSERT INTO ContenidoWeb (Tipo, Titulo, ImagenUrl, LinkDestino, Activo, Orden) 
                    VALUES (@tipo, @titulo, @img, @link, @act, @ord)`);

        res.json({ success: true, message: "Contenido creado." });
    } catch (error) {
        console.error("Error creating content:", error);
        res.status(500).json({ success: false, error: "Error creating content." });
    }
};

exports.updateContent = async (req, res) => {
    const { id } = req.params;
    const { titulo, imagenUrl, linkDestino, activo, orden } = req.body;
    try {
        const pool = await getPool();
        const request = pool.request()
            .input('id', sql.Int, id);

        let query = "UPDATE ContenidoWeb SET ";
        const updates = [];

        if (titulo !== undefined) { updates.push("Titulo = @titulo"); request.input('titulo', sql.NVarChar, titulo); }
        if (imagenUrl !== undefined) { updates.push("ImagenUrl = @img"); request.input('img', sql.NVarChar, imagenUrl); }
        if (linkDestino !== undefined) { updates.push("LinkDestino = @link"); request.input('link', sql.NVarChar, linkDestino); }
        if (activo !== undefined) { updates.push("Activo = @act"); request.input('act', sql.Bit, activo ? 1 : 0); }
        if (orden !== undefined) { updates.push("Orden = @ord"); request.input('ord', sql.Int, orden); }

        if (updates.length === 0) return res.json({ success: true, message: "No changes." });

        query += updates.join(", ") + " WHERE ID = @id";
        await request.query(query);

        res.json({ success: true, message: "Contenido actualizado." });
    } catch (error) {
        console.error("Error updating content:", error);
        res.status(500).json({ success: false, error: "Error updating content." });
    }
};

exports.deleteContent = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .query("DELETE FROM ContenidoWeb WHERE ID = @id");
        res.json({ success: true, message: "Contenido eliminado." });
    } catch (error) {
        console.error("Error deleting content:", error);
        res.status(500).json({ success: false, error: "Error deleting content." });
    }
};

const { getPool, sql } = require('../config/db');

exports.getByUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) return res.status(400).json({ error: "ID de usuario inválido" });

        const pool = await getPool();
        const result = await pool.request()
            .input('IdUsuario', sql.Int, userId)
            .execute('sp_ObtenerMenuUsuario');

        const menuData = result.recordset.map(item => ({
            IdModulo: item.IdModulo,
            Nombre: item.Nombre || item.Titulo, // Adaptamos por si el SP devuelve uno u otro
            Titulo: item.Titulo || item.Nombre,
            Ruta: item.Ruta,
            Icono: item.Icono,
            IdPadre: item.IdPadre,
            IndiceOrden: item.IndiceOrden,
            ui_config: item.ui_config // Mantenemos por si el SP hace join con otra cosa
        }));

        res.json(menuData);
    } catch (err) {
        console.error('❌ ERROR EN GETBYUSER:', err);
        res.status(500).json({ error: err.message });
    }
};

// --- CRUD DE ADMINISTRACIÓN ---

exports.getAll = async (req, res) => {
    try {
        const pool = await getPool();
        // Ajustado al schema del usuario: Titulo en lugar de Nombre, sin Activo
        const result = await pool.request().query(`
            SELECT IdModulo, Titulo, Ruta, Icono, IdPadre, IndiceOrden
            FROM Modulos 
            ORDER BY IndiceOrden
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error getAll:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { Titulo, Ruta, Icono, IdPadre, IndiceOrden } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('Titulo', sql.NVarChar, Titulo)
            .input('Ruta', sql.NVarChar, Ruta)
            .input('Icono', sql.NVarChar, Icono)
            .input('IdPadre', sql.Int, IdPadre || null)
            .input('IndiceOrden', sql.Int, IndiceOrden || 0)
            .query(`
                INSERT INTO Modulos (Titulo, Ruta, Icono, IdPadre, IndiceOrden)
                VALUES (@Titulo, @Ruta, @Icono, @IdPadre, @IndiceOrden)
            `);
        res.json({ success: true, message: 'Modulo creado' });
    } catch (err) {
        console.error('Error create:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { Titulo, Ruta, Icono, IdPadre, IndiceOrden } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('IdModulo', sql.Int, id)
            .input('Titulo', sql.NVarChar, Titulo)
            .input('Ruta', sql.NVarChar, Ruta)
            .input('Icono', sql.NVarChar, Icono)
            .input('IdPadre', sql.Int, IdPadre || null)
            .input('IndiceOrden', sql.Int, IndiceOrden)
            .query(`
                UPDATE Modulos 
                SET Titulo = @Titulo, Ruta = @Ruta, Icono = @Icono, 
                    IdPadre = @IdPadre, IndiceOrden = @IndiceOrden
                WHERE IdModulo = @IdModulo
            `);
        res.json({ success: true, message: 'Modulo actualizado' });
    } catch (err) {
        console.error('Error update:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.remove = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        await pool.request().input('Id', sql.Int, id).query(`DELETE FROM Modulos WHERE IdModulo = @Id`);
        res.json({ success: true });
    } catch (err) {
        if (err.number === 547) {
            return res.status(400).json({ error: "No se puede eliminar: Tiene submódulos o permisos asociados." });
        }
        res.status(500).json({ error: err.message });
    }
};
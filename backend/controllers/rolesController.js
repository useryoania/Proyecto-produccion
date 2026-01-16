const { getPool, sql } = require('../config/db');

exports.getAll = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT IdRol, NombreRol, Descripcion FROM Roles');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error getting roles:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { NombreRol, Descripcion } = req.body;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('NombreRol', sql.NVarChar, NombreRol)
            .input('Descripcion', sql.NVarChar, Descripcion)
            .query('INSERT INTO Roles (NombreRol, Descripcion) OUTPUT INSERTED.IdRol VALUES (@NombreRol, @Descripcion)');

        res.json({ success: true, message: 'Rol creado exitosamente', IdRol: result.recordset[0].IdRol });
    } catch (err) {
        console.error('Error creating role:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { NombreRol, Descripcion } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('IdRol', sql.Int, id)
            .input('NombreRol', sql.NVarChar, NombreRol)
            .input('Descripcion', sql.NVarChar, Descripcion)
            .query('UPDATE Roles SET NombreRol = @NombreRol, Descripcion = @Descripcion WHERE IdRol = @IdRol');
        res.json({ success: true, message: 'Rol actualizado exitosamente' });
    } catch (err) {
        console.error('Error updating role:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        // First delete permissions to avoid FK constraint errors if cascade isn't set up
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const request = new sql.Request(transaction);
            await request.input('IdRol', sql.Int, id).query('DELETE FROM PermisosRoles WHERE IdRol = @IdRol');

            await request.query('DELETE FROM Roles WHERE IdRol = @IdRol');

            await transaction.commit();
            res.json({ success: true, message: 'Rol eliminado exitosamente' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Error deleting role:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getPermissions = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('IdRol', sql.Int, id)
            .query('SELECT IdModulo FROM PermisosRoles WHERE IdRol = @IdRol');
        res.json(result.recordset.map(r => r.IdModulo));
    } catch (err) {
        console.error('Error getting permissions:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.updatePermissions = async (req, res) => {
    const { id } = req.params;
    const { moduleIds } = req.body; // Array of ints

    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);
            // Delete existing permissions
            await request.input('IdRol', sql.Int, id).query('DELETE FROM PermisosRoles WHERE IdRol = @IdRol');

            // Insert new permissions
            if (moduleIds && Array.isArray(moduleIds) && moduleIds.length > 0) {
                for (const modId of moduleIds) {
                    const insertReq = new sql.Request(transaction);
                    await insertReq
                        .input('IdRol', sql.Int, id)
                        .input('IdModulo', sql.Int, modId)
                        .query('INSERT INTO PermisosRoles (IdRol, IdModulo) VALUES (@IdRol, @IdModulo)');
                }
            }

            await transaction.commit();
            res.json({ success: true, message: 'Permisos actualizados' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Error updating permissions:', err);
        res.status(500).json({ error: err.message });
    }
};

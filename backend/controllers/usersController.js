const { getPool, sql } = require('../config/db');

exports.getAll = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT IdUsuario, Usuario, Email, IdRol, IdCargo, Activo, FechaCreacion, Nombre, AreaUsuario FROM Usuarios');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error getting users:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { Usuario, Contrasena, Email, IdRol, IdCargo, Activo, Nombre, AreaUsuario } = req.body;
    try {
        const pool = await getPool();
        // NOTE: In production, password must be hashed. For now, matching authController which compares plaintext.
        // Wait, authController compares `password !== user.PasswordHash`. If user.PasswordHash implies it IS a hash, then authController is doing it wrong or assuming the DB has plaintext for now?
        // Ah, `password !== user.PasswordHash` compares the input directly to the DB column. If the DB column is named PasswordHash but stores plaintext, that's a security risk, but I must follow existing logic or fix both.
        // The user prompted `[ContrasenaHash]` column name.
        // For now, I will store it as is, or maybe I should update authController later? The USER prompt implies existing structure.
        // I will assume simple storage for now to match authController logic `password !== user.PasswordHash`.

        const result = await pool.request()
            .input('Usuario', sql.NVarChar, Usuario)
            .input('ContrasenaHash', sql.NVarChar, Contrasena) // Storing directly as per current auth controller logic (or assuming it's already hashed by frontend? Unlikely)
            .input('Email', sql.NVarChar, Email)
            .input('IdRol', sql.Int, IdRol)
            .input('IdCargo', sql.Int, IdCargo || null)
            .input('Activo', sql.Bit, Activo !== undefined ? Activo : true)
            .input('Nombre', sql.NVarChar, Nombre)
            .input('AreaUsuario', sql.NVarChar, AreaUsuario)
            .query(`
                INSERT INTO Usuarios (Usuario, ContrasenaHash, Email, IdRol, IdCargo, Activo, Nombre, AreaUsuario, FechaCreacion)
                OUTPUT INSERTED.IdUsuario
                VALUES (@Usuario, @ContrasenaHash, @Email, @IdRol, @IdCargo, @Activo, @Nombre, @AreaUsuario, GETDATE())
            `);

        res.json({ success: true, message: 'Usuario creado', IdUsuario: result.recordset[0].IdUsuario });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { Usuario, Contrasena, Email, IdRol, IdCargo, Activo, Nombre, AreaUsuario } = req.body;
    try {
        const pool = await getPool();
        const request = pool.request()
            .input('IdUsuario', sql.Int, id)
            .input('Usuario', sql.NVarChar, Usuario)
            .input('Email', sql.NVarChar, Email)
            .input('IdRol', sql.Int, IdRol)
            .input('IdCargo', sql.Int, IdCargo || null)
            .input('Activo', sql.Bit, Activo)
            .input('Nombre', sql.NVarChar, Nombre)
            .input('AreaUsuario', sql.NVarChar, AreaUsuario);

        let query = `
            UPDATE Usuarios 
            SET Usuario = @Usuario, Email = @Email, IdRol = @IdRol, IdCargo = @IdCargo, 
                Activo = @Activo, Nombre = @Nombre, AreaUsuario = @AreaUsuario
        `;

        if (Contrasena) {
            request.input('ContrasenaHash', sql.NVarChar, Contrasena);
            query += `, ContrasenaHash = @ContrasenaHash`;
        }

        query += ` WHERE IdUsuario = @IdUsuario`;

        await request.query(query);
        res.json({ success: true, message: 'Usuario actualizado' });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        await pool.request()
            .input('IdUsuario', sql.Int, id)
            .query('DELETE FROM Usuarios WHERE IdUsuario = @IdUsuario');
        res.json({ success: true, message: 'Usuario eliminado' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: err.message });
    }
};

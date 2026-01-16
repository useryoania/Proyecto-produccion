const { getPool, sql } = require('../config/db');

exports.getAll = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                a.IdLog as AccionID,
                a.IdUsuario as UserID,
                u.Usuario,
                u.Nombre,
                a.Accion,
                a.Detalles,
                a.FechaHora as FechaAccion,
                a.DireccionIP as IPAddress
            FROM Auditoria a
            LEFT JOIN Usuarios u ON a.IdUsuario = u.IdUsuario
            ORDER BY a.FechaHora DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error getting audit logs:', err);
        res.status(500).json({ error: err.message });
    }
};

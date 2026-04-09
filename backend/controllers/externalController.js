const { sql, getPool } = require('../config/db');

exports.getClientes = async (req, res) => {
    // Basic API Key validation
    const apiKey = req.headers['x-api-key'];
    // Default fallback en caso de no tenerlo en el .env
    const EXPERT_API_KEY = process.env.EXTERNAL_API_KEY;

    if (!apiKey || apiKey !== EXPERT_API_KEY) {
        return res.status(401).json({ error: 'No autorizado. API Key inválida o faltante.' });
    }

    try {
        const pool = await getPool();
        const query = `
            SELECT 
                c.CliIdCliente as id,
                c.CodCliente,
                c.IDCliente,
                c.Nombre,
                c.NombreFantasia,
                c.Email,
                c.TelefonoTrabajo,
                c.CioRuc,
                c.DireccionTrabajo,
                c.DepartamentoID,
                c.LocalidadID,
                c.VendedorID,
                t.Nombre as VendedorNombre,
                c.FormaEnvioID
            FROM [SecureAppDB].[dbo].[Clientes] c
            LEFT JOIN [SecureAppDB].[dbo].[Trabajadores] t ON CAST(c.VendedorID AS VARCHAR) = CAST(t.Cedula AS VARCHAR)
            WHERE c.CliIdCliente IS NOT NULL
        `;
        const result = await pool.request().query(query);

        res.json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error obteniendo clientes para sistema externo:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener clientes.' });
    }
};

// PATCH /api/external/clientes/:id/vendedor
exports.updateVendedor = async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;

    if (!apiKey || apiKey !== EXTERNAL_API_KEY) {
        return res.status(401).json({ error: 'No autorizado. API Key inválida o faltante.' });
    }

    const { id } = req.params;
    const { VendedorID } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Falta el parámetro id del cliente.' });
    }
    if (VendedorID === undefined || VendedorID === null) {
        return res.status(400).json({ error: 'Falta el campo VendedorID en el body.' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('VendedorID', sql.Int, VendedorID)
            .input('CliIdCliente', sql.Int, id)
            .query(`
                UPDATE [SecureAppDB].[dbo].[Clientes]
                SET VendedorID = @VendedorID
                WHERE CliIdCliente = @CliIdCliente
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        }

        res.json({ success: true, message: `VendedorID actualizado correctamente para cliente ${id}.` });
    } catch (error) {
        console.error('Error actualizando VendedorID:', error);
        res.status(500).json({ error: 'Error interno al actualizar VendedorID.' });
    }
};

// GET /api/external/vendedores
exports.getVendedores = async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;

    if (!apiKey || apiKey !== EXTERNAL_API_KEY) {
        return res.status(401).json({ error: 'No autorizado. API Key inválida o faltante.' });
    }

    try {
        const pool = await getPool();
        const query = `
            SELECT 
                Cedula as id,
                Cedula as VendedorID,
                Nombre as VendedorNombre,
                Zona 
            FROM [SecureAppDB].[dbo].[Trabajadores]
            WHERE Zona IS NOT NULL AND LTRIM(RTRIM(Zona)) != ''
        `;
        const result = await pool.request().query(query);

        res.json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error obteniendo vendedores para sistema externo:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener vendedores.' });
    }
};


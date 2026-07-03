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
                c.FormaEnvioID,
                c.WebLastLogin
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

// Helper function to execute queries on Ventas_Dev database with v17 signature pre-loaded
async function executeWmsQuery(pool, queryText) {
    const request = pool.request();
    const queryWithDb = `USE Ventas_Dev; CREATE TABLE #WmsSecureTx_v17 (id INT); ${queryText}`;
    const result = await request.batch(queryWithDb);
    return result.recordset || [];
}

// Helper to discount stock and handle shortages
async function discountVariantStock(pool, variantId, quantity, depotId = null) {
    let targetDepotId = depotId || 5; // Default to Ventas (ID 5)
    
    const activeLabels = await executeWmsQuery(pool,
        `SELECT id, cantidad_actual, codigo_barras 
         FROM Stock_Etiquetas 
         WHERE variante_id = ${variantId} AND deposito_id = ${targetDepotId} AND estado = 'activo'
         ORDER BY id ASC;`
    );
    
    const totalAvailable = activeLabels.reduce((sum, label) => sum + Number(label.cantidad_actual), 0);
    
    const qtyToDraw = Math.min(totalAvailable, Number(quantity));
    const shortage = Number(quantity) - qtyToDraw;
    
    let remainingToDraw = qtyToDraw;
    const queries = [];
    const processedLabels = [];
    let remitoCode = null;
    let solCode = null;
    
    if (qtyToDraw > 0) {
        remitoCode = 'WEB-' + Date.now().toString().slice(-6) + Math.floor(Math.random()*100).toString();
        queries.push(`
            INSERT INTO wms_remitos_internos (numeracion, deposito_origen_id, deposito_destino_id, creado_por, estado) 
            VALUES ('${remitoCode}', ${targetDepotId}, ${targetDepotId}, 'venta', 'EGRESO_WEB');
            DECLARE @RemId INT = SCOPE_IDENTITY();
        `);
        
        for (const label of activeLabels) {
            if (remainingToDraw <= 0) break;
            
            const currentQty = Number(label.cantidad_actual);
            const drawQty = Math.min(currentQty, remainingToDraw);
            
            processedLabels.push({
                id: label.id,
                codigo_barras: label.codigo_barras,
                cantidad_descontada: drawQty
            });
            
            queries.push(`
                INSERT INTO Stock_Movimientos (etiqueta_id, tipo_movimiento, cantidad_afectada, deposito_origen_id, remito_id, usuario_id)
                VALUES (${label.id}, 'egreso_venta_web', ${drawQty}, ${targetDepotId}, @RemId, 'venta');
                INSERT INTO wms_remitos_internos_items (remito_id, variante_id, cantidad_enviada, etiqueta_generada_id, estado)
                VALUES (@RemId, ${variantId}, ${drawQty}, ${label.id}, 'ENTREGADO');
            `);
            
            remainingToDraw -= drawQty;
        }
    }
    
    if (shortage > 0) {
        solCode = 'SOL-' + Date.now().toString().slice(-6) + Math.floor(Math.random()*100).toString();
        queries.push(`
            INSERT INTO wms_solicitudes (numeracion, deposito_solicitante_id, creado_por, fecha_creacion, estado)
            VALUES ('${solCode}', ${targetDepotId}, 'venta', GETDATE(), 'PENDIENTE');
            DECLARE @SolId INT = SCOPE_IDENTITY();
            
            INSERT INTO wms_solicitudes_items (solicitud_id, variante_id, cantidad_solicitada, cantidad_despachada)
            VALUES (@SolId, ${variantId}, ${shortage}, 0);
        `);
    }
    
    if (queries.length > 0) {
        const transactionSQL = `
            BEGIN TRY 
                BEGIN TRANSACTION; 
                ${queries.join('\n')} 
                COMMIT TRANSACTION; 
            END TRY 
            BEGIN CATCH 
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION; 
                THROW; 
            END CATCH
        `;
        await executeWmsQuery(pool, transactionSQL);
    }
    
    return {
        success: true,
        remito_codigo: remitoCode,
        solicitud_codigo: solCode,
        deposito_id: targetDepotId,
        variante_id: variantId,
        cantidad_descontada: qtyToDraw,
        cantidad_solicitada: shortage,
        detalles: processedLabels
    };
}

// GET /api/external/articulos
exports.getArticulos = async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;

    if (!apiKey || apiKey !== EXTERNAL_API_KEY) {
        return res.status(401).json({ error: 'No autorizado. API Key inválida o faltante.' });
    }

    try {
        const { search } = req.query;
        const pool = await getPool();
        
        let sqlQuery = `
            SELECT 
                v.id as variant_id,
                v.nombre_variante,
                v.codigo_variante,
                pm.id as producto_maestro_id,
                pm.nombre as producto_padre,
                c.id as categoria_id,
                c.nombre as cat_nombre,
                ISNULL(SUM(e.cantidad_actual), 0) as stock_total
            FROM Stock_Variantes v
            INNER JOIN Stock_Productos_Maestros pm ON v.producto_maestro_id = pm.id
            INNER JOIN Stock_Categorias c ON pm.categoria_id = c.id
            LEFT JOIN Stock_Etiquetas e ON e.variante_id = v.id AND e.estado = 'activo'
        `;
        
        if (search && search.trim()) {
            sqlQuery += ` WHERE v.nombre_variante LIKE '%${search.trim()}%' OR pm.nombre LIKE '%${search.trim()}%'`;
        }
        
        sqlQuery += `
            GROUP BY v.id, v.nombre_variante, v.codigo_variante, pm.id, pm.nombre, c.id, c.nombre
            ORDER BY pm.nombre, v.nombre_variante;
        `;
        
        const data = await executeWmsQuery(pool, sqlQuery);
        res.json(data);
    } catch (err) {
        console.error('Error fetching articles:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/external/articulos/descontar
exports.descontarArticulo = async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;

    if (!apiKey || apiKey !== EXTERNAL_API_KEY) {
        return res.status(401).json({ error: 'No autorizado. API Key inválida o faltante.' });
    }

    const { variante_id, cantidad, deposito_id } = req.body;
    
    if (!variante_id || !cantidad) {
        return res.status(400).json({ error: 'Falta variante_id o cantidad en la petición.' });
    }

    try {
        const pool = await getPool();
        const result = await discountVariantStock(pool, variante_id, cantidad, deposito_id);
        res.json(result);
    } catch (err) {
        console.error('Error discounting article stock:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/external/inventory/variants
exports.getInventoryVariants = async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;

    if (!apiKey || apiKey !== EXTERNAL_API_KEY) {
        return res.status(401).json({ error: 'No autorizado. API Key inválida o faltante.' });
    }

    try {
        const pool = await getPool();
        const sqlQuery = `
            SELECT 
                v.id as variant_id,
                v.nombre_variante,
                v.codigo_variante,
                pm.nombre as producto_padre,
                e.deposito_id,
                d.nombre as deposito_nombre,
                SUM(e.cantidad_actual) as stock
            FROM Stock_Variantes v
            INNER JOIN Stock_Productos_Maestros pm ON v.producto_maestro_id = pm.id
            INNER JOIN Stock_Etiquetas e ON e.variante_id = v.id AND e.estado = 'activo'
            INNER JOIN Stock_Depositos d ON e.deposito_id = d.id
            GROUP BY v.id, v.nombre_variante, v.codigo_variante, pm.nombre, e.deposito_id, d.nombre
            ORDER BY pm.nombre, v.nombre_variante;
        `;
        const data = await executeWmsQuery(pool, sqlQuery);
        res.json(data);
    } catch (err) {
        console.error('Error fetching inventory variants:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/external/inventory/categories
exports.getInventoryCategories = async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;

    if (!apiKey || apiKey !== EXTERNAL_API_KEY) {
        return res.status(401).json({ error: 'No autorizado. API Key inválida o faltante.' });
    }

    try {
        const pool = await getPool();
        const data = await executeWmsQuery(pool, "SELECT id, nombre, descripcion FROM Stock_Categorias ORDER BY nombre;");
        res.json(data);
    } catch (err) {
        console.error('Error fetching inventory categories:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/external/inventory/masters
exports.getInventoryMasters = async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;

    if (!apiKey || apiKey !== EXTERNAL_API_KEY) {
        return res.status(401).json({ error: 'No autorizado. API Key inválida o faltante.' });
    }

    try {
        const pool = await getPool();
        const data = await executeWmsQuery(pool, "SELECT id, sku, nombre, categoria_id FROM Stock_Productos_Maestros ORDER BY nombre;");
        res.json(data);
    } catch (err) {
        console.error('Error fetching inventory masters:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/external/inventory/masters/:id/variants
exports.getInventoryMasterVariants = async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;

    if (!apiKey || apiKey !== EXTERNAL_API_KEY) {
        return res.status(401).json({ error: 'No autorizado. API Key inválida o faltante.' });
    }

    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: 'Falta el parámetro id del producto maestro.' });
    }

    try {
        const pool = await getPool();
        const data = await executeWmsQuery(pool,
            `SELECT id, nombre_variante, codigo_variante, producto_maestro_id 
             FROM Stock_Variantes 
             WHERE producto_maestro_id = ${id} 
             ORDER BY nombre_variante;`
        );
        res.json(data);
    } catch (err) {
        console.error('Error fetching inventory master variants:', err);
        res.status(500).json({ error: err.message });
    }
};


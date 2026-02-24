const { getPool, sql } = require('../config/db');
const PricingService = require('../services/pricingService');

// Obtener Precios Base (Lista Pagina o Filtrada)
// Obtener Precios Base (Lista Pagina o Filtrada)
const getBasePrices = async (req, res) => {
    try {
        const pool = await getPool();
        // Usamos LEFT JOIN con Articulos para mostrar Descripción si existe
        // PRECIO MULTI-MONEDA: Si un artículo tiene 2 precios, aparecerá 2 veces (deseado)
        const result = await pool.request().query(`
            SELECT A.CodArticulo, A.Descripcion, A.SupFlia, A.Grupo, 
                   LTRIM(RTRIM(SA.Articulo)) as GrupoNombre, 
                   MAP.NombreReferencia as NombreReferenciaGrupo,
                   PB.ID, PB.Precio, PB.Moneda
            FROM Articulos A
            LEFT JOIN StockArt SA ON A.CodStock = SA.CodStock
            LEFT JOIN ConfigMapeoERP MAP ON MAP.CodigoERP = A.Grupo COLLATE Database_Default
            LEFT JOIN PreciosBase PB ON A.CodArticulo = PB.CodArticulo
            ORDER BY A.SupFlia, A.Grupo, A.CodArticulo, PB.Moneda
        `);
        console.log(`getBasePrices: Found ${result.recordset.length} rows.`);
        res.json(result.recordset);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Guardar Precio Base (Individual)
const saveBasePrice = async (req, res) => {
    const { codArticulo, precio, moneda } = req.body;
    try {
        await PricingService.setBasePrice(codArticulo, precio, moneda);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Guardar Precios Base (Masivo)
const saveBasePricesBulk = async (req, res) => {
    const { items } = req.body; // Array de { codArticulo, precio, moneda }
    if (!items || !Array.isArray(items)) return res.status(400).json({ error: "Se espera un array 'items'." });

    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (const item of items) {
                const request = new sql.Request(transaction);

                if (item.id) {
                    await request
                        .input('Id', sql.Int, item.id)
                        .input('Precio', sql.Decimal(18, 4), item.precio)
                        .input('Moneda', sql.VarChar, item.moneda || 'UYU')
                        .query(`
                            UPDATE PreciosBase 
                            SET Precio = @Precio, Moneda = @Moneda, UltimaActualizacion = GETDATE()
                            WHERE ID = @Id
                        `);
                } else {
                    await request
                        .input('Cod', sql.NVarChar, item.codArticulo)
                        .input('Precio', sql.Decimal(18, 4), item.precio)
                        .input('Moneda', sql.VarChar, item.moneda || 'UYU')
                        .query(`
                            MERGE PreciosBase AS target
                            USING (SELECT @Cod AS CodArticulo, @Moneda AS Moneda) AS source
                            ON (target.CodArticulo = source.CodArticulo AND target.Moneda = source.Moneda)
                            WHEN MATCHED THEN
                                UPDATE SET Precio = @Precio, UltimaActualizacion = GETDATE()
                            WHEN NOT MATCHED THEN
                                INSERT (CodArticulo, Precio, Moneda, UltimaActualizacion)
                                VALUES (@Cod, @Precio, @Moneda, GETDATE());
                        `);
                }
            }

            await transaction.commit();
            res.json({ success: true, count: items.length });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (e) {
        console.error("Error saveBasePricesBulk:", e);
        res.status(500).json({ error: e.message });
    }
};

// Endpoint de prueba para CALCULAR precio (Simulación)
const calculatePriceEndpoint = async (req, res) => {
    const { codArticulo, cantidad, clienteId, variables, targetCurrency } = req.body;
    try {
        const fallbackCurrency = targetCurrency || 'UYU';
        const result = await PricingService.calculatePrice(codArticulo, cantidad, clienteId, [], variables, fallbackCurrency, null);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getBasePrices,
    saveBasePrice,
    saveBasePricesBulk,
    calculatePriceEndpoint
};


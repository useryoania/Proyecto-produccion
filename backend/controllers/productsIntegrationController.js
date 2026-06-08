const { sql, getPool } = require('../config/db');
const axios = require('axios');
const https = require('https');
const { logAlert } = require('../services/alertsService');
const logger = require('../utils/logger');

// 1. Obtener Articulos Locales (Izquierda)
const getLocalArticles = async (req, res) => {
    try {
        const pool = await getPool();
        // Traemos más campos para poder armar el árbol (SupFlia, Grupo)
        const result = await pool.request().query(`
            SELECT TOP 5000 
                a.ProIdProducto, a.SupFlia, a.Grupo, 
                LTRIM(RTRIM(a.CodStock)) AS CodStock,
                LTRIM(RTRIM(a.CodArticulo)) AS CodArticulo,
                LTRIM(RTRIM(a.Descripcion)) AS Descripcion,
                a.IDProdReact, a.Mostrar, a.anchoimprimible, a.LLEVAPAPEL, a.MonIdMoneda,
                map.NombreReferencia AS DescripcionGrupo,
                LTRIM(RTRIM(sa.Articulo)) AS DescripcionStock,
                aw.producto_maestro_id,
                img.url_imagen,
                pb.Precio AS PrecioBase,
                ISNULL(wms_var.CantidadVariantes, 0) AS CantidadVariantes
            FROM Articulos a
            LEFT JOIN ConfigMapeoERP map ON LTRIM(RTRIM(map.CodigoERP)) = LTRIM(RTRIM(a.Grupo)) COLLATE Database_Default
            LEFT JOIN StockArt sa ON LTRIM(RTRIM(sa.CodStock)) = LTRIM(RTRIM(a.CodStock))
            LEFT JOIN Articulos_Wms aw ON a.ProIdProducto = aw.Idproid
            LEFT JOIN Articulos_Imagenes img ON a.ProIdProducto = img.Idproid AND img.orden = 1
            LEFT JOIN PreciosBase pb ON a.CodArticulo = pb.CodArticulo
            LEFT JOIN (
                SELECT Idproid, COUNT(id) as CantidadVariantes
                FROM Articulos_WMS_Variantes
                GROUP BY Idproid
            ) wms_var ON a.ProIdProducto = wms_var.Idproid
            ORDER BY a.SupFlia, a.Grupo, a.CodStock, a.Descripcion
        `);

        let wmsStockMap = {};
        try {
            const wmsRes = await axios.post(process.env.WMS_API_URL + '/sql', {
                query: `USE Ventas_Dev; SELECT v.producto_maestro_id, SUM(e.cantidad_actual) as stock FROM Stock_Etiquetas e INNER JOIN Stock_Variantes v ON e.variante_id = v.id WHERE e.estado = 'activo' AND e.cantidad_actual > 0 GROUP BY v.producto_maestro_id;`
            });
            wmsRes.data.forEach(s => {
                wmsStockMap[s.producto_maestro_id] = s.stock;
            });
        } catch (e) {
            logger.error("WMS Stock error:", e.message);
        }

        const finalData = result.recordset.map(row => {
            return {
                ...row,
                StockWMS: row.producto_maestro_id ? (wmsStockMap[row.producto_maestro_id] || 0) : null
            };
        });

        res.json(finalData);
    } catch (e) {
        logger.error("Error getLocalArticles:", e);
        res.status(500).json({ error: e.message });
    }
};

// 2. Obtener Productos (query directa a DB local)
const getRemoteProducts = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                p.ProIdProducto, p.ProCodigoOdooProducto, p.ProNombreProducto,
                p.ProDetalleProducto, p.SMaIdSubMarca, p.UniIdUnidad,
                p.ProVigente, p.MonIdMoneda, p.ProPrecioActual,
                sm.SMaNombreSubMarca AS SubMarca,
                u.UniNotación AS Unidad,
                m.MonSimbolo AS Moneda
            FROM Productos p WITH(NOLOCK)
            LEFT JOIN SubMarcas sm WITH(NOLOCK) ON sm.SMaIdSubMarca = p.SMaIdSubMarca
            LEFT JOIN Unidades u WITH(NOLOCK) ON u.UniIdUnidad = p.UniIdUnidad
            LEFT JOIN Monedas m WITH(NOLOCK) ON m.MonIdMoneda = p.MonIdMoneda
            ORDER BY p.ProNombreProducto
        `);
        res.json(result.recordset);
    } catch (e) {
        logger.error("Error getRemoteProducts:", e.message);
        res.status(500).json({ error: "Error al obtener productos", details: e.message });
    }
};

// 3. Vincular (Link)
const linkProduct = async (req, res) => {
    const { idProdReact, proIdProducto, codArticulo } = req.body;

    if (!idProdReact) {
        return res.status(400).json({ error: "Falta IdProdReact" });
    }
    if (!proIdProducto) {
        return res.status(400).json({ error: "Falta ProIdProducto" });
    }

    try {
        const pool = await getPool();
        await pool.request()
            .input('ProId', sql.Int, parseInt(proIdProducto))
            .input('ReactID', sql.Int, idProdReact)
            .query("UPDATE Articulos SET IDProdReact = @ReactID WHERE ProIdProducto = @ProId");

        logAlert('INFO', 'PRODUCTO', 'Producto vinculado manualmente', codArticulo || `ProID: ${proIdProducto}`, { idProdReact });

        res.json({ success: true, message: "Vinculado correctamente" });
    } catch (e) {
        logger.error("Error linkProduct:", e);
        logAlert('ERROR', 'PRODUCTO', 'Fallo al vincular producto', codArticulo || `ProID: ${proIdProducto}`, { error: e.message });
        res.status(500).json({ error: e.message });
    }
};

// 4. Desvincular (Unlink)
const unlinkProduct = async (req, res) => {
    const { proIdProducto, codArticulo } = req.body;

    if (!proIdProducto) return res.status(400).json({ error: "Falta ProIdProducto" });

    try {
        const pool = await getPool();
        await pool.request()
            .input('ProId', sql.Int, parseInt(proIdProducto))
            .query("UPDATE Articulos SET IDProdReact = NULL WHERE ProIdProducto = @ProId");

        logAlert('WARN', 'PRODUCTO', 'Producto desvinculado', codArticulo || `ProID: ${proIdProducto}`);

        res.json({ success: true, message: "Desvinculado correctamente" });
    } catch (e) {
        logger.error("Error unlinkProduct:", e);
        res.status(500).json({ error: e.message });
    }
};

// 5. Actualizar Producto Local
const updateLocalProduct = async (req, res) => {
    const { proIdProducto, codArticulo, idProdReact, descripcion, codStock, grupo, supFlia, mostrar, anchoImprimible, llevaPapel, monIdMoneda } = req.body;

    if (!proIdProducto) return res.status(400).json({ error: "Falta ProIdProducto" });

    try {
        const pool = await getPool();
        const req2 = pool.request()
            .input('ProId',    sql.Int,              parseInt(proIdProducto))
            .input('NewCod',   sql.VarChar(50),      codArticulo    || '')
            .input('ReactId',  sql.Int,              idProdReact != null && idProdReact !== '' ? parseInt(idProdReact) : null)
            .input('Desc',     sql.VarChar(255),     descripcion    || '')
            .input('Stock',    sql.VarChar(50),      codStock       || '')
            .input('Grp',      sql.VarChar(100),     grupo          || '')
            .input('Sup',      sql.VarChar(100),     supFlia        || '')
            .input('Mos',      sql.Bit,              mostrar ? 1 : 0)
            .input('Ancho',    sql.Decimal(10, 2),   parseFloat(anchoImprimible) || 0)
            .input('Papel',    sql.Bit,              llevaPapel ? 1 : 0)
            .input('MonId',    sql.Int,              monIdMoneda != null ? parseInt(monIdMoneda) : null);

        await req2.query(`
            UPDATE Articulos 
            SET CodArticulo     = @NewCod,
                IDProdReact     = @ReactId,
                Descripcion     = @Desc, 
                CodStock        = @Stock, 
                Grupo           = @Grp, 
                SupFlia         = @Sup, 
                Mostrar         = @Mos, 
                anchoimprimible = @Ancho, 
                LLEVAPAPEL      = @Papel,
                MonIdMoneda     = @MonId
            WHERE ProIdProducto = @ProId
        `);

        logAlert('INFO', 'PRODUCTO', 'Producto local actualizado', codArticulo || `ProID: ${proIdProducto}`, { descripcion, codStock, idProdReact });

        res.json({ success: true, message: "Producto actualizado correctamente" });
    } catch (e) {
        logger.error("Error updateLocalProduct:", e);
        res.status(500).json({ error: e.message });
    }
};

// 6. Crear Producto Local (INSERT)
const createLocalProduct = async (req, res) => {
    const { codArticulo, idProdReact, descripcion, codStock, grupo, supFlia, mostrar, anchoImprimible, llevaPapel, monIdMoneda } = req.body;

    if (!codArticulo) return res.status(400).json({ error: 'El CodArticulo es obligatorio' });

    try {
        const pool = await getPool();
        await pool.request()
            .input('Cod',   sql.VarChar(50),     codArticulo.trim())
            .input('React', sql.Int,              idProdReact != null && idProdReact !== '' ? parseInt(idProdReact) : null)
            .input('Desc',  sql.VarChar(255),     descripcion    || '')
            .input('Stock', sql.VarChar(50),      codStock       || '')
            .input('Grp',   sql.VarChar(100),     grupo          || '')
            .input('Sup',   sql.VarChar(100),     supFlia        || '')
            .input('Mos',   sql.Bit,              mostrar ? 1 : 0)
            .input('Ancho', sql.Decimal(10, 2),   parseFloat(anchoImprimible) || 0)
            .input('Papel', sql.Bit,              llevaPapel ? 1 : 0)
            .input('MonId', sql.Int,              monIdMoneda != null && monIdMoneda !== '' ? parseInt(monIdMoneda) : null)
            .query(`
                INSERT INTO Articulos
                    (CodArticulo, IDProdReact, Descripcion, CodStock, Grupo, SupFlia, Mostrar, anchoimprimible, LLEVAPAPEL, MonIdMoneda, borrar)
                VALUES
                    (@Cod, @React, @Desc, @Stock, @Grp, @Sup, @Mos, @Ancho, @Papel, @MonId, 0)
            `);

        logAlert('INFO', 'PRODUCTO', 'Nuevo artículo creado', codArticulo, { descripcion, codStock, idProdReact });
        res.status(201).json({ success: true, message: 'Artículo creado correctamente' });
    } catch (e) {
        logger.error('Error createLocalProduct:', e);
        res.status(500).json({ error: e.message });
    }
};

// 7. Update WMS Master ID
const updateWmsMasterId = async (req, res) => {
    const { id } = req.params;
    const { producto_maestro_id } = req.body;

    if (!id) return res.status(400).json({ error: 'Falta ProIdProducto' });

    try {
        const pool = await getPool();
        
        // Primero intentamos hacer UPDATE
        const updateRes = await pool.request()
            .input('Idproid', sql.Int, parseInt(id))
            .input('producto_maestro_id', sql.Int, producto_maestro_id != null && producto_maestro_id !== '' ? parseInt(producto_maestro_id) : null)
            .query(`
                UPDATE Articulos_Wms 
                SET producto_maestro_id = @producto_maestro_id 
                WHERE Idproid = @Idproid
            `);

        let nombre_wms = 'Sin Nombre';
        
        // Conseguir la descripcion para nombre_wms
        const articleRes = await pool.request()
            .input('Idproid', sql.Int, parseInt(id))
            .query(`SELECT Descripcion FROM Articulos WHERE ProIdProducto = @Idproid`);
            
        if (articleRes.recordset.length > 0) {
            nombre_wms = articleRes.recordset[0].Descripcion;
        }

        // Si no se actualizó nada, significa que no existe el registro, hacemos INSERT
        if (updateRes.rowsAffected[0] === 0) {
            await pool.request()
                .input('Idproid', sql.Int, parseInt(id))
                .input('producto_maestro_id', sql.Int, producto_maestro_id != null && producto_maestro_id !== '' ? parseInt(producto_maestro_id) : null)
                .input('nombre_wms', sql.VarChar(255), nombre_wms)
                .query(`
                    INSERT INTO Articulos_Wms (Idproid, producto_maestro_id, nombre_wms)
                    VALUES (@Idproid, @producto_maestro_id, @nombre_wms)
                `);
        }

        // --- NEW: Fetch variants from WMS and sync Articulos_WMS_Variantes ---
        if (producto_maestro_id) {
            try {
                const axios = require('axios');
                const wmsQuery = `
                    USE Ventas_Dev;
                    SELECT id as variante_id, nombre_variante, codigo_variante 
                    FROM Stock_Variantes 
                    WHERE producto_maestro_id = ${parseInt(producto_maestro_id)};
                `;
                const response = await axios.post('https://administracionuser.uy/api/sql', { query: wmsQuery }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                });
                
                const wmsData = response.data;
                const variants = wmsData.data || [];
                
                // Borrar variantes anteriores para este articulo
                await pool.request()
                    .input('Idproid', sql.Int, parseInt(id))
                    .query(`DELETE FROM Articulos_WMS_Variantes WHERE Idproid = @Idproid`);
                    
                // Insertar nuevas variantes
                for (const v of variants) {
                    await pool.request()
                        .input('Idproid', sql.Int, parseInt(id))
                        .input('WmsVarianteId', sql.Int, v.variante_id)
                        .input('Sku', sql.VarChar, v.codigo_variante || '')
                        .input('NombreVariante', sql.VarChar, v.nombre_variante || '')
                        .query(`
                            INSERT INTO Articulos_WMS_Variantes (Idproid, wms_variante_id, sku, nombre_variante)
                            VALUES (@Idproid, @WmsVarianteId, @Sku, @NombreVariante)
                        `);
                }
                logger.info(`Updated WMS Master ID for ProId: ${id}. Synced ${variants.length} variants.`);
            } catch (err) {
                logger.error('Error syncing WMS variants on updateWmsMasterId: ' + err.message);
            }
        }

        res.json({ success: true, message: 'ID Maestro WMS actualizado correctamente' });
    } catch (e) {
        logger.error('Error updateWmsMasterId:', e);
        res.status(500).json({ error: e.message });
    }
};

// 8. Upload Image
const uploadArticleImage = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Falta ID de articulo' });
    if (!req.file) return res.status(400).json({ error: 'No se subió ninguna imagen' });

    try {
        const pool = await getPool();
        const imageUrl = `/uploads/${req.file.filename}`;
        
        await pool.request()
            .input('Idproid', sql.Int, parseInt(id))
            .input('UrlImagen', sql.VarChar(500), imageUrl)
            .query(`
                IF EXISTS (SELECT 1 FROM Articulos_Imagenes WHERE Idproid = @Idproid)
                BEGIN
                    UPDATE Articulos_Imagenes SET url_imagen = @UrlImagen WHERE Idproid = @Idproid
                END
                ELSE
                BEGIN
                    INSERT INTO Articulos_Imagenes (Idproid, url_imagen, es_generica, orden)
                    VALUES (@Idproid, @UrlImagen, 0, 1)
                END
            `);

        res.json({ success: true, imageUrl, message: 'Imagen guardada correctamente' });
    } catch (e) {
    const { proIdProducto, codArticulo, idProdReact, descripcion, codStock, grupo, supFlia, mostrar, anchoImprimible, llevaPapel, monIdMoneda } = req.body;

    if (!proIdProducto) return res.status(400).json({ error: "Falta ProIdProducto" });

    try {
        const pool = await getPool();
        const req2 = pool.request()
            .input('ProId',    sql.Int,              parseInt(proIdProducto))
            .input('NewCod',   sql.VarChar(50),      codArticulo    || '')
            .input('ReactId',  sql.Int,              idProdReact != null && idProdReact !== '' ? parseInt(idProdReact) : null)
            .input('Desc',     sql.VarChar(255),     descripcion    || '')
            .input('Stock',    sql.VarChar(50),      codStock       || '')
            .input('Grp',      sql.VarChar(100),     grupo          || '')
            .input('Sup',      sql.VarChar(100),     supFlia        || '')
            .input('Mos',      sql.Bit,              mostrar ? 1 : 0)
            .input('Ancho',    sql.Decimal(10, 2),   parseFloat(anchoImprimible) || 0)
            .input('Papel',    sql.Bit,              llevaPapel ? 1 : 0)
            .input('MonId',    sql.Int,              monIdMoneda != null ? parseInt(monIdMoneda) : null);

        await req2.query(`
            UPDATE Articulos 
            SET CodArticulo     = @NewCod,
                IDProdReact     = @ReactId,
                Descripcion     = @Desc, 
                CodStock        = @Stock, 
                Grupo           = @Grp, 
                SupFlia         = @Sup, 
                Mostrar         = @Mos, 
                anchoimprimible = @Ancho, 
                LLEVAPAPEL      = @Papel,
                MonIdMoneda     = @MonId
            WHERE ProIdProducto = @ProId
        `);

        logAlert('INFO', 'PRODUCTO', 'Producto local actualizado', codArticulo || `ProID: ${proIdProducto}`, { descripcion, codStock, idProdReact });

        res.json({ success: true, message: "Producto actualizado correctamente" });
    } catch (e) {
        logger.error("Error updateLocalProduct:", e);
        res.status(500).json({ error: e.message });
    }
};

// 6. Crear Producto Local (INSERT)
const createLocalProduct = async (req, res) => {
    const { codArticulo, idProdReact, descripcion, codStock, grupo, supFlia, mostrar, anchoImprimible, llevaPapel, monIdMoneda } = req.body;

    if (!codArticulo) return res.status(400).json({ error: 'El CodArticulo es obligatorio' });

    try {
        const pool = await getPool();
        await pool.request()
            .input('Cod',   sql.VarChar(50),     codArticulo.trim())
            .input('React', sql.Int,              idProdReact != null && idProdReact !== '' ? parseInt(idProdReact) : null)
            .input('Desc',  sql.VarChar(255),     descripcion    || '')
            .input('Stock', sql.VarChar(50),      codStock       || '')
            .input('Grp',   sql.VarChar(100),     grupo          || '')
            .input('Sup',   sql.VarChar(100),     supFlia        || '')
            .input('Mos',   sql.Bit,              mostrar ? 1 : 0)
            .input('Ancho', sql.Decimal(10, 2),   parseFloat(anchoImprimible) || 0)
            .input('Papel', sql.Bit,              llevaPapel ? 1 : 0)
            .input('MonId', sql.Int,              monIdMoneda != null && monIdMoneda !== '' ? parseInt(monIdMoneda) : null)
            .query(`
                INSERT INTO Articulos
                    (CodArticulo, IDProdReact, Descripcion, CodStock, Grupo, SupFlia, Mostrar, anchoimprimible, LLEVAPAPEL, MonIdMoneda, borrar)
                VALUES
                    (@Cod, @React, @Desc, @Stock, @Grp, @Sup, @Mos, @Ancho, @Papel, @MonId, 0)
            `);

        logAlert('INFO', 'PRODUCTO', 'Nuevo artículo creado', codArticulo, { descripcion, codStock, idProdReact });
        res.status(201).json({ success: true, message: 'Artículo creado correctamente' });
    } catch (e) {
        logger.error('Error createLocalProduct:', e);
        res.status(500).json({ error: e.message });
    }
};

// 7. Update WMS Master ID
const updateWmsMasterId = async (req, res) => {
    const { id } = req.params;
    const { producto_maestro_id } = req.body;

    if (!id) return res.status(400).json({ error: 'Falta ProIdProducto' });

    try {
        const pool = await getPool();
        
        // Primero intentamos hacer UPDATE
        const updateRes = await pool.request()
            .input('Idproid', sql.Int, parseInt(id))
            .input('producto_maestro_id', sql.Int, producto_maestro_id != null && producto_maestro_id !== '' ? parseInt(producto_maestro_id) : null)
            .query(`
                UPDATE Articulos_Wms 
                SET producto_maestro_id = @producto_maestro_id 
                WHERE Idproid = @Idproid
            `);

        let nombre_wms = 'Sin Nombre';
        
        // Conseguir la descripcion para nombre_wms
        const articleRes = await pool.request()
            .input('Idproid', sql.Int, parseInt(id))
            .query(`SELECT Descripcion FROM Articulos WHERE ProIdProducto = @Idproid`);
            
        if (articleRes.recordset.length > 0) {
            nombre_wms = articleRes.recordset[0].Descripcion;
        }

        // Si no se actualizó nada, significa que no existe el registro, hacemos INSERT
        if (updateRes.rowsAffected[0] === 0) {
            await pool.request()
                .input('Idproid', sql.Int, parseInt(id))
                .input('producto_maestro_id', sql.Int, producto_maestro_id != null && producto_maestro_id !== '' ? parseInt(producto_maestro_id) : null)
                .input('nombre_wms', sql.VarChar(255), nombre_wms)
                .query(`
                    INSERT INTO Articulos_Wms (Idproid, producto_maestro_id, nombre_wms)
                    VALUES (@Idproid, @producto_maestro_id, @nombre_wms)
                `);
        }

        // --- NEW: Fetch variants from WMS and sync Articulos_WMS_Variantes ---
        if (producto_maestro_id) {
            try {
                const axios = require('axios');
                const wmsQuery = `
                    USE Ventas_Dev;
                    SELECT id as variante_id, nombre_variante, codigo_variante 
                    FROM Stock_Variantes 
                    WHERE producto_maestro_id = ${parseInt(producto_maestro_id)};
                `;
                const response = await axios.post('https://administracionuser.uy/api/sql', { query: wmsQuery }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                });
                
                const wmsData = response.data;
                const variants = wmsData.data || [];
                
                // Borrar variantes anteriores para este articulo
                await pool.request()
                    .input('Idproid', sql.Int, parseInt(id))
                    .query(`DELETE FROM Articulos_WMS_Variantes WHERE Idproid = @Idproid`);
                    
                // Insertar nuevas variantes
                for (const v of variants) {
                    await pool.request()
                        .input('Idproid', sql.Int, parseInt(id))
                        .input('WmsVarianteId', sql.Int, v.variante_id)
                        .input('Sku', sql.VarChar, v.codigo_variante || '')
                        .input('NombreVariante', sql.VarChar, v.nombre_variante || '')
                        .query(`
                            INSERT INTO Articulos_WMS_Variantes (Idproid, wms_variante_id, sku, nombre_variante)
                            VALUES (@Idproid, @WmsVarianteId, @Sku, @NombreVariante)
                        `);
                }
                logger.info(`Updated WMS Master ID for ProId: ${id}. Synced ${variants.length} variants.`);
            } catch (err) {
                logger.error('Error syncing WMS variants on updateWmsMasterId: ' + err.message);
            }
        }

        res.json({ success: true, message: 'ID Maestro WMS actualizado correctamente' });
    } catch (e) {
        logger.error('Error updateWmsMasterId:', e);
        res.status(500).json({ error: e.message });
    }
};

// 8. Upload Image
const uploadArticleImage = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Falta ID de articulo' });
    if (!req.file) return res.status(400).json({ error: 'No se subió ninguna imagen' });

    try {
        const pool = await getPool();
        const imageUrl = `/uploads/${req.file.filename}`;
        
        await pool.request()
            .input('Idproid', sql.Int, parseInt(id))
            .input('UrlImagen', sql.VarChar(500), imageUrl)
            .query(`
                IF EXISTS (SELECT 1 FROM Articulos_Imagenes WHERE Idproid = @Idproid)
                BEGIN
                    UPDATE Articulos_Imagenes SET url_imagen = @UrlImagen WHERE Idproid = @Idproid
                END
                ELSE
                BEGIN
                    INSERT INTO Articulos_Imagenes (Idproid, url_imagen, es_generica, orden)
                    VALUES (@Idproid, @UrlImagen, 0, 1)
                END
            `);

        res.json({ success: true, imageUrl, message: 'Imagen guardada correctamente' });
    } catch (e) {
        logger.error("Error uploadArticleImage:", e);
        res.status(500).json({ error: e.message });
    }
};

// 9. Get WMS Master Products
const getWmsMasters = async (req, res) => {
    try {
        const axios = require('axios');
        const wmsQuery = `
            USE Ventas_Dev;
            SELECT id, nombre 
            FROM Stock_Productos_Maestros 
            ORDER BY nombre;
        `;
        const response = await axios.post('https://administracionuser.uy/api/sql', { query: wmsQuery }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        const wmsData = response.data;
        res.json({ success: true, data: wmsData.data || [] });
    } catch (e) {
        logger.error("Error fetching WMS Masters:", e);
        res.status(500).json({ error: 'Error al obtener productos maestros del WMS' });
    }
};

// 10. Get WMS Variants for a specific Master ID
const getWmsVariants = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Falta ID de producto maestro' });

    try {
        const axios = require('axios');
        const wmsQuery = `
            USE Ventas_Dev;
            SELECT id as variante_id, nombre_variante, codigo_variante 
            FROM Stock_Variantes 
            WHERE producto_maestro_id = ${parseInt(id)};
        `;
        const response = await axios.post('https://administracionuser.uy/api/sql', { query: wmsQuery }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        const wmsData = response.data;
        res.json({ success: true, data: wmsData.data || [] });
    } catch (e) {
        logger.error("Error fetching WMS Variants:", e);
        res.status(500).json({ error: 'Error al obtener variantes del WMS' });
    }
};

module.exports = {
    getLocalArticles,
    getRemoteProducts,
    linkProduct,
    unlinkProduct,
    updateLocalProduct,
    createLocalProduct,
    updateWmsMasterId,
    uploadArticleImage,
    getWmsMasters,
    getWmsVariants
};

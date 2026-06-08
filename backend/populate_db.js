const { getPool, sql } = require('./config/db');
require('dotenv').config();

async function populate() {
    try {
        const pool = await getPool();
        
        // 1. Fetch WMS Data
        const wmsQuery = `
            USE Ventas_Dev;
            SELECT v.id as variante_id, v.nombre_variante, v.codigo_variante, 
                   v.producto_maestro_id, p.nombre as producto_nombre 
            FROM Stock_Variantes v 
            INNER JOIN Stock_Productos_Maestros p ON v.producto_maestro_id = p.id 
            ORDER BY p.nombre, v.nombre_variante;
        `;
        const response = await fetch('https://administracionuser.uy/api/sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: wmsQuery })
        });
        const wmsData = await response.json();
        const items = wmsData.data || [];

        console.log(`Fetched ${items.length} items from WMS.`);

        // 2. Fetch local prepopulated Articulos_Wms
        const localItemsRes = await pool.request().query(`
            SELECT a.ProIdProducto, a.Descripcion 
            FROM Articulos a 
            INNER JOIN Articulos_Wms aw ON a.ProIdProducto = aw.Idproid
        `);
        const localItems = localItemsRes.recordset;
        console.log(`Found ${localItems.length} local items to map.`);

        let mappedCount = 0;
        let variantCount = 0;

        for (const local of localItems) {
            // Find matching WMS item by name (partial or full)
            // Pet Film -> matches "Pet Film"
            // Tinta DTF -> matches "TINTA DTF UV"
            const match = items.find(wms => 
                wms.producto_nombre.toLowerCase().includes(local.Descripcion.toLowerCase()) || 
                local.Descripcion.toLowerCase().includes(wms.producto_nombre.toLowerCase())
            );

            if (match) {
                // UPDATE Articulos_Wms
                await pool.request()
                    .input('Idproid', sql.Int, local.ProIdProducto)
                    .input('WmsMasterId', sql.Int, match.producto_maestro_id)
                    .input('NombreWms', sql.VarChar, match.producto_nombre)
                    .query(`
                        UPDATE Articulos_Wms 
                        SET producto_maestro_id = @WmsMasterId, nombre_wms = @NombreWms 
                        WHERE Idproid = @Idproid
                    `);
                
                // Get all variants for this master id
                const variants = items.filter(i => i.producto_maestro_id === match.producto_maestro_id);
                
                // DELETE old placeholder variants
                await pool.request()
                    .input('Idproid', sql.Int, local.ProIdProducto)
                    .query(`DELETE FROM Articulos_WMS_Variantes WHERE Idproid = @Idproid`);

                // INSERT real variants
                for (const v of variants) {
                    await pool.request()
                        .input('Idproid', sql.Int, local.ProIdProducto)
                        .input('WmsVarianteId', sql.Int, v.variante_id)
                        .input('Sku', sql.VarChar, v.codigo_variante || '')
                        .input('NombreVariante', sql.VarChar, v.nombre_variante || '')
                        .query(`
                            INSERT INTO Articulos_WMS_Variantes (Idproid, wms_variante_id, sku, nombre_variante)
                            VALUES (@Idproid, @WmsVarianteId, @Sku, @NombreVariante)
                        `);
                    variantCount++;
                }

                // ASSIGN IMAGES
                let imageFile = null;
                const desc = local.Descripcion.toLowerCase();
                if (desc.includes('pet film') || desc.includes('film')) imageFile = '/uploads/pet_film.png';
                else if (desc.includes('tinta') || desc.includes('uv')) imageFile = '/uploads/tinta_dtf.png';
                else if (desc.includes('lona') || desc.includes('frontlight')) imageFile = '/uploads/lona_frontlight.png';
                else if (desc.includes('short')) imageFile = '/uploads/short.png';
                else if (desc.includes('gorro') && desc.includes('lana')) imageFile = '/uploads/gorro_lana.png';
                else if (desc.includes('gorro')) imageFile = '/uploads/gorro_liso.png';
                else if (desc.includes('media')) imageFile = '/uploads/medias.png';
                else imageFile = '/uploads/tinta_dtf.png'; // fallback
                
                // INSERT Image
                await pool.request()
                    .input('Idproid', sql.Int, local.ProIdProducto)
                    .input('UrlImagen', sql.VarChar, imageFile)
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
                
                mappedCount++;
            }
        }
        
        console.log(`Done! Mapped ${mappedCount} products and inserted ${variantCount} variants with images.`);
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

populate();

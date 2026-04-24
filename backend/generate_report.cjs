const { getPool } = require('./config/db');
const fs = require('fs');

async function generateReport() {
    try {
        const pool = await getPool();
        const res = await pool.request().query(`
            SELECT 
                SA.IDREACT AS [ID_React], 
                SA.Material AS [Descripcion_Sincro],
                A.Descripcion AS [Descripcion_Articulo],
                SA.PROIDPRODUCTO AS [Sincro_ProIdProducto],
                A.ProIdProducto AS [Articulo_ProIdProducto],
                SA.codArticulo AS [Sincro_CodArticulo],
                A.CodArticulo AS [Articulo_CodArticulo]
            FROM [SINCRO-ARTICULOS] SA
            INNER JOIN Articulos A ON try_cast(SA.IDREACT as int) = try_cast(A.IDProdReact as int)
            ORDER BY try_cast(SA.IDREACT as int) ASC
        `);
        
        let md = '# Reporte de Cruce: SINCRO-ARTICULOS vs Articulos\n\n';
        md += 'Este reporte muestra la intersección de ambas tablas basándose en el **IDREACT / IDProdReact**.\n\n';
        md += `**Total de coincidencias:** ${res.recordset.length}\n\n`;
        
        if (res.recordset.length > 0) {
            md += '| ID React | ProId (Sincro) | ProId (Artic) | CodArt (Sincro) | CodArt (Artic) | Descripción (Sincro) | Descripción (Artic) |\n';
            md += '| --- | --- | --- | --- | --- | --- | --- |\n';
            
            res.recordset.forEach(row => {
                const descSA = (row.Descripcion_Sincro || '-').toString().trim();
                const descA = (row.Descripcion_Articulo || '-').toString().trim();
                md += `| ${row.ID_React || '-'} | ${row.Sincro_ProIdProducto || '-'} | ${row.Articulo_ProIdProducto || '-'} | ${row.Sincro_CodArticulo || '-'} | ${row.Articulo_CodArticulo || '-'} | ${descSA} | ${descA} |\n`;
            });
        }
        
        fs.writeFileSync('cruce_articulos.md', md);
        console.log(md);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
generateReport();

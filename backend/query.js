const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        const query = `
            SELECT OrdCodigo, IDProdReact, OrdCodigoOdoo 
            FROM PedidosCobranza 
            WHERE OrdCodigo IN ('DF-91536','UVDF-91537') 
               OR OrdCodigoOdoo IN ('DF-91536','UVDF-91537')
        `;
        const res = await pool.request().query(query);
        console.table(res.recordset);
        
        // Also check what they are attached to
        if(res.recordset.length > 0) {
            console.log("Revisando los IDProdReact en Articulos...");
            const ids = res.recordset.map(r => r.IDProdReact).filter(Boolean);
            if(ids.length > 0) {
                const query2 = `SELECT IDProdReact, Descripcion FROM Articulos WHERE IDProdReact IN (${ids.map(i=>`'${i}'`).join(',')})`;
                const res2 = await pool.request().query(query2);
                console.table(res2.recordset);
            }
        }
    } catch(err){ 
        console.error(err); 
    } finally {
        process.exit(0);
    }
});

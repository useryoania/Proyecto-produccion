const { getPool, sql } = require('./backend/config/db');
getPool().then(async pool => {
    try {
        const query = `
        SELECT p.*, pr.Nombre as ArticuloNombre, c.Nombre as ClienteNombre 
        FROM dbo.PlanesMetros p 
        LEFT JOIN dbo.Articulos pr ON p.ProIdProducto = pr.IDArticulo 
        LEFT JOIN dbo.Clientes c ON p.CliIdCliente = c.CliIdCliente
        WHERE c.CodCliente LIKE '%CamiEspi%'
        `;
        const planes = await pool.request().query(query);
        console.log('Planes CamiEspi:', planes.recordset);
        
        const depQuery = await pool.request().query(`
            SELECT od.*, pr.Nombre as ArticuloNombre, c.Nombre as ClienteNombre
            FROM dbo.OrdenesDeposito od
            LEFT JOIN dbo.Articulos pr ON od.ProIdProducto = pr.IDArticulo
            LEFT JOIN dbo.Clientes c ON od.CliIdCliente = c.CliIdCliente
            WHERE od.OrdCodigoERP = 'UVDF-91774' OR od.OdeNumeroOrden = 'UVDF-91774'
        `);
        console.log('OrdenesDeposito UVDF-91774:', depQuery.recordset);
        
        const pdtf = await pool.request().query("SELECT IDArticulo, Codigo, Nombre FROM dbo.Articulos WHERE Nombre LIKE '%DTF%'");
        console.log('Todos los productos DTF:', pdtf.recordset);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
});

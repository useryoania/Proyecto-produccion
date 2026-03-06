const { getPool, sql } = require('./config/db');

async function test() {
    try {
        const pool = await getPool();
        const idReactQR = '47';

        const r1 = await pool.request()
            .input('IDReactQR', sql.NVarChar(50), String(idReactQR).trim())
            .query(`
        SELECT TOP 1 c.CliIdCliente, c.Nombre, c.IDReact, tc.TClDescripcion AS TipoCliente
        FROM Clientes c WITH(NOLOCK)
        LEFT JOIN TiposClientes tc WITH(NOLOCK) ON c.TClIdTipoCliente = tc.TClIdTipoCliente
        WHERE c.IDReact = @IDReactQR
      `);
        console.log('Client mapped:', r1.recordset[0]);

        const idProdReactQR = '47';
        const r2 = await pool.request()
            .input('IDProdReact', sql.Int, parseInt(idProdReactQR, 10))
            .query(`
        SELECT TOP 1 a.ProIdProducto,
          LTRIM(RTRIM(CONCAT(p.ProNombreProducto, ' ', ISNULL(p.ProDetalleProducto, '')))) AS ProductoNombre,
          m.MonSimbolo
        FROM Articulos a WITH(NOLOCK)
        LEFT JOIN Productos p WITH(NOLOCK) ON a.ProIdProducto = p.ProIdProducto
        LEFT JOIN Monedas m WITH(NOLOCK) ON p.MonIdMoneda = m.MonIdMoneda
        WHERE a.IDProdReact = @IDProdReact
      `);
        console.log('Product mapped:', r2.recordset[0]);

        process.exit(0);
    } catch (e) {
        console.error('ERROR LOG:', e.message);
        process.exit(1);
    }
}
test();

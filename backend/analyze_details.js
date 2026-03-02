const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function analyze() {
    try {
        let pool = await sql.connect(config);
        console.log('--- INDEPENDENT ANALYSYS (COSTURA, ESTAMPADO, BORDADO) ---');

        const exchangeRate = 40.0;
        const urgencyMarkup = 1.20; // 20%
        console.log('Rate used:', exchangeRate, 'Urgency markup:', urgencyMarkup);

        // 1. COSTURA (ORD-166 (3/5) / ID 10343)
        console.log('\n>>> 1. COSTURA (ID 10343)');
        const costuraRes = await pool.request().query("SELECT O.*, A.Descripcion as NombreArt FROM Ordenes O LEFT JOIN Articulos A ON O.CodArticulo = A.CodArticulo WHERE O.OrdenID = 10343");
        const oCostura = costuraRes.recordset[0];
        console.log(`Art: ${oCostura.CodArticulo} (${oCostura.NombreArt}) | Mag: ${oCostura.Magnitud} | Prioridad: ${oCostura.Prioridad}`);
        const pCostura = await pool.request().input('Cod', sql.VarChar, oCostura.CodArticulo).query("SELECT * FROM PreciosBase WHERE CodArticulo = @Cod");
        console.log('Precio Base:', pCostura.recordset[0] || 'SIN PRECIO BASE');

        const srvCostura = await pool.request().query("SELECT * FROM ServiciosExtraOrden WHERE OrdenID = 10343");
        console.log('Servicios:', srvCostura.recordset.map(s => `Desc: ${s.Descripcion}, Cant: ${s.Cantidad}, PU: ${s.PrecioUnitario}`).join(' | '));

        // 2. ESTAMPADO (ORD-166 (4/5) / ID 10344)
        console.log('\n>>> 2. ESTAMPADO (ID 10344)');
        const estRes = await pool.request().query("SELECT O.*, A.Descripcion as NombreArt FROM Ordenes O LEFT JOIN Articulos A ON O.CodArticulo = A.CodArticulo WHERE O.OrdenID = 10344");
        const oEst = estRes.recordset[0];
        console.log(`Art: ${oEst.CodArticulo} (${oEst.NombreArt}) | Mag: ${oEst.Magnitud} | Prioridad: ${oEst.Prioridad}`);
        const pEst = await pool.request().input('Cod', sql.VarChar, oEst.CodArticulo).query("SELECT * FROM PreciosBase WHERE CodArticulo = @Cod");
        console.log('Precio Base:', pEst.recordset[0] || 'SIN PRECIO BASE');

        const srvEst = await pool.request().query("SELECT * FROM ServiciosExtraOrden WHERE OrdenID = 10344");
        console.log('Servicios:', srvEst.recordset.map(s => `Desc: ${s.Descripcion}, Cant: ${s.Cantidad}, PU: ${s.PrecioUnitario}`).join(' | '));

        // 3. BORDADO (ORD-166 (5/5) / ID 10345)
        console.log('\n>>> 3. BORDADO (ID 10345)');
        const borRes = await pool.request().query("SELECT O.*, A.Descripcion as NombreArt FROM Ordenes O LEFT JOIN Articulos A ON O.CodArticulo = A.CodArticulo WHERE O.OrdenID = 10345");
        const oBor = borRes.recordset[0];
        console.log(`Art: ${oBor.CodArticulo} (${oBor.NombreArt}) | Mag: ${oBor.Magnitud} | Prioridad: ${oBor.Prioridad}`);
        const pBor = await pool.request().input('Cod', sql.VarChar, oBor.CodArticulo).query("SELECT * FROM PreciosBase WHERE CodArticulo = @Cod");
        console.log('Precio Base:', pBor.recordset[0] || 'SIN PRECIO BASE');

        const srvBor = await pool.request().query("SELECT * FROM ServiciosExtraOrden WHERE OrdenID = 10345");
        console.log('Servicios:', srvBor.recordset.map(s => `Desc: ${s.Descripcion}, Cant: ${s.Cantidad}, PU: ${s.PrecioUnitario}, Puntadas: ${s.Puntadas}`).join(' | '));

        await sql.close();
    } catch (err) {
        console.error('Analysis error:', err);
    }
}

analyze();

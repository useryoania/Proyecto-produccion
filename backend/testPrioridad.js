const { getPool, sql } = require('./config/db');

async function testIt() {
    const pool = await getPool();
    const orderRes = await pool.request()
        .input('Doc', sql.NVarChar, '174')
        .query(`
            SELECT O.*, PB.Moneda as MonedaBase, A.Descripcion as NombreArticulo, A.IDProdReact as ArtIdReact
            FROM Ordenes O
            LEFT JOIN PreciosBase PB ON LTRIM(RTRIM(O.CodArticulo)) = LTRIM(RTRIM(PB.CodArticulo))
            LEFT JOIN Articulos A ON LTRIM(RTRIM(O.CodArticulo)) = LTRIM(RTRIM(A.CodArticulo))
            WHERE LTRIM(RTRIM(O.NoDocERP)) = LTRIM(RTRIM(@Doc)) 
               OR LTRIM(RTRIM(O.NoDocERP)) = LTRIM(RTRIM(REPLACE(@Doc, 'ORD-', '')))
        `);

    const sib = orderRes.recordset[0];
    console.log("sib.Prioridad:", sib.Prioridad);
    
    const extraProfiles = [];
    if (sib.Prioridad && sib.Prioridad.toString().trim().toLowerCase().includes('urgente')) extraProfiles.push(2);
    if (sib.Tinta && (sib.Tinta.toUpperCase().includes('UV') || sib.Tinta.toUpperCase().includes('LATEX'))) extraProfiles.push(3);
    
    console.log("extraProfiles Evaluated:", extraProfiles);
    process.exit(0);
}

testIt();

const sql = require('mssql');
const { getPool } = require('./config/db.js');

const insumos = [
  { desc: "Pet Film 1,2 X100 m", precio: 200, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Pet Film 0,6 X100 m", precio: 100, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Pet Film 0,3 X100 m", precio: 50, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Pet Film Uv (A-Blanco y A-Transparente)0,6 X100 m", precio: 250, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Pet Film Uv (A-Blanco y A-Transparente)0,3 X100 m", precio: 125, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Hoja A3 100 Hojas", precio: 40, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Hoja A4 100 Hojas", precio: 20, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Tinta Blanca 1L", precio: 40, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Tinta de Color 1L", precio: 40, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Poliamida 1Kg", precio: 25, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Tinta Ecosolvente 1L", precio: 45, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Tinta Uv (Rigida y Soft)1L", precio: 90, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Liquido de Limpieza Suave DTF1L", precio: 40, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Liquido de Limpieza Subli1L", precio: 40, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Liquido de Limpieza UV1L", precio: 70, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Liquido de Limpieza Ecosolvente1L", precio: 70, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Papel de Sublimación 1,60 de 90 g100", precio: 90, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Papel de Sublimación 1,18 de 90 g100", precio: 66, moneda: "DOLAR", codStock: "2.2.1.1" },
  { desc: "Papel de Sublimación 0,914 de 90 g100", precio: 52, moneda: "DOLAR", codStock: "2.2.1.1" },
  
  // Productos Terminados
  { desc: "Backing Pop Up (Soporte para Tela o Lona)", precio: 100, moneda: "DOLAR", codStock: "2.2.1.2" },
  { desc: "Caña", precio: 100, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Media Antideslizante + Caña", precio: 180, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Shorts (Adulto)", precio: 160, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Shorts (Niño)", precio: 150, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Cuellos Polares Adulto", precio: 75, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Cuellos Polares Niño", precio: 70, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Media Antideslizante", precio: 100, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Maquinita pelo x1", precio: 120, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Maquinita pelo x 10", precio: 100, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Maquinita pelo x 100", precio: 85, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Auriculares Inalámbricos x Unidad", precio: 390, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Auriculares Inalámbricos x 10", precio: 340, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Auriculares Inalámbricos x 100", precio: 300, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Gorros Lisos y Jaspeados x Unidad", precio: 190, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Gorros Lisos y Jaspeados x 10", precio: 160, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Gorros Lisos y Jaspeados x 100", precio: 130, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Gorros de lana", precio: 99, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Medias premium adulto", precio: 218, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Medias basicas niño", precio: 175, moneda: "PESO", codStock: "2.2.1.2" },
  { desc: "Medias basicas adulto", precio: 185, moneda: "PESO", codStock: "2.2.1.2" }
];

async function main() {
  const pool = await getPool();
  
  for (let i = 0; i < insumos.length; i++) {
    const it = insumos[i];
    
    // Generar CodArticulo unico
    const prefix = it.codStock === "2.2.1.1" ? "INS" : "PT";
    const num = i + 1;
    const codArticulo = `${prefix}-${num.toString().padStart(3, '0')}-${Date.now().toString().slice(-4)}`;
    
    const monId = it.moneda === "DOLAR" ? 2 : 1;

    // Insert en Articulos
    console.log(`Inserting Articulo: ${it.desc}`);
    const rInsert = await pool.request()
      .input('CodArticulo', sql.VarChar(50), codArticulo)
      .input('SupFlia', sql.VarChar(50), "2")
      .input('Grupo', sql.VarChar(50), "2.1")
      .input('CodStock', sql.VarChar(50), it.codStock)
      .input('Descripcion', sql.VarChar(200), it.desc)
      .input('Mostrar', sql.Bit, 1)
      .input('MonIdMoneda', sql.Int, monId)
      .query(`
        INSERT INTO dbo.Articulos (CodArticulo, SupFlia, Grupo, CodStock, Descripcion, Mostrar, MonIdMoneda, borrar)
        OUTPUT INSERTED.ProIdProducto
        VALUES (@CodArticulo, @SupFlia, @Grupo, @CodStock, @Descripcion, @Mostrar, @MonIdMoneda, 0)
      `);
      
    const proId = rInsert.recordset[0].ProIdProducto;
    
    // Insert en PreciosListaPublica
    const familia = it.codStock === "2.2.1.1" ? "INSUMOS" : "PRODUCTO TERMINADO";
    console.log(`Inserting Precio for ProIdProducto=${proId}, Precio=${it.precio}, Moneda=${it.moneda}`);
    
    await pool.request()
      .input('Familia', sql.VarChar(50), familia)
      .input('Producto', sql.VarChar(200), it.desc)
      .input('Descripcion', sql.VarChar(500), "")
      .input('Moneda', sql.VarChar(10), it.moneda)
      .input('Precio', sql.Decimal(18,2), it.precio)
      .input('ProIdProducto', sql.Int, proId)
      .query(`
        INSERT INTO dbo.PreciosListaPublica (Familia, Producto, Descripcion, Moneda, Precio, Activo, UltimaSync, ProIdProducto)
        VALUES (@Familia, @Producto, @Descripcion, @Moneda, @Precio, 1, GETDATE(), @ProIdProducto)
      `);
  }
  
  console.log("Done.");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

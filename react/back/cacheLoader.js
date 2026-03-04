const cache = require('./cache'); // Importa la instancia de NodeCache
const { poolPromise } = require('./config/db'); // Importa la conexión a MSSQL
const { updateCache } = require('./cacheManager'); // Importa updateCache


async function loadCache() {
  try {
    console.log('Iniciando la carga de todas las tablas en la caché...');

    const pool = await poolPromise;

    // Cargar datos de todas las tablas

    // Tabla Cotizaciones
    const cotizacionesResult = await pool.request().query('SELECT TOP 1 CotFecha, CotDolar FROM [User].dbo.Cotizaciones WITH(NOLOCK) where datediff(d,CotFecha,getdate()) = 0 ORDER BY CotFecha DESC');
    cache.set('cotizaciones', cotizacionesResult.recordset);

    // Tabla Roles
    const rolesResult = await pool.request().query('SELECT * FROM [User].dbo.Roles WITH(NOLOCK)');
    cache.set('roles', rolesResult.recordset);

    // Tabla Usuarios
    const usuariosResult = await pool.request().query('SELECT * FROM [User].dbo.Usuarios WITH(NOLOCK)');
    cache.set('usuarios', usuariosResult.recordset);

    // Tabla Monedas
    const monedasResult = await pool.request().query('SELECT * FROM [User].dbo.Monedas WITH(NOLOCK)');
    cache.set('monedas', monedasResult.recordset);

    // Tabla Unidades
    const unidadesResult = await pool.request().query('SELECT * FROM [User].dbo.Unidades WITH(NOLOCK)');
    cache.set('unidades', unidadesResult.recordset);

    // Tabla SubMarcas
    const subMarcasResult = await pool.request().query('SELECT * FROM [User].dbo.SubMarcas WITH(NOLOCK)');
    cache.set('subMarcas', subMarcasResult.recordset);

    // Tabla Productos
    const productosResult = await pool.request().query('SELECT * FROM [User].dbo.Productos WITH(NOLOCK)');
    cache.set('productos', productosResult.recordset);

    // Tabla ModosOrdenes
    const modosOrdenesResult = await pool.request().query('SELECT * FROM [User].dbo.ModosOrdenes WITH(NOLOCK) WHERE MOrModoVigente = 1');
    cache.set('modosOrdenes', modosOrdenesResult.recordset);

    // Tabla LugaresRetiro
    const lugaresRetiroResult = await pool.request().query('SELECT * FROM [User].dbo.LugaresRetiro WITH(NOLOCK) WHERE LReLugarVigente = 1');
    cache.set('lugaresRetiro', lugaresRetiroResult.recordset);

    // Tabla TiposClientes
    const tiposClientesResult = await pool.request().query('SELECT * FROM [User].dbo.TiposClientes WITH(NOLOCK)');
    cache.set('tiposClientes', tiposClientesResult.recordset);

    // Tabla Clientes
    const clientesResult = await pool.request().query('SELECT * FROM [User].dbo.Clientes WITH(NOLOCK)');
    cache.set('clientes', clientesResult.recordset);

    // Tabla MetodosPagos
    const metodosPagosResult = await pool.request().query('SELECT * FROM [User].dbo.MetodosPagos WITH(NOLOCK)');
    cache.set('metodosPagos', metodosPagosResult.recordset);

    // Tabla Pagos
    const pagosResult = await pool.request().query('SELECT * FROM [User].dbo.Pagos WITH(NOLOCK)');
    cache.set('pagos', pagosResult.recordset);

    // Tabla Ordenes
    /*const ordenesResult = await pool.request().query('SELECT * FROM [User].dbo.Ordenes WITH(NOLOCK)');
    cache.set('ordenes', ordenesResult.recordset);*/

    // Tabla EstadosOrdenes
    const estadosOrdenesResult = await pool.request().query('SELECT * FROM [User].dbo.EstadosOrdenes WITH(NOLOCK)');
    cache.set('estadosOrdenes', estadosOrdenesResult.recordset);

    // Tabla OrdenesRetiro
    const ordenesRetiroResult = await pool.request().query('SELECT * FROM [User].dbo.OrdenesRetiro WITH(NOLOCK) WHERE cast(dateadd(d,-7,getdate()) as date) <= cast(OReFechaAlta as date) OR OreEstadoActual NOT IN (5,6)');
    cache.set('ordenesRetiro', ordenesRetiroResult.recordset);

    // Tabla EstadosOrdenesRetiro
    const estadosOrdenesRetiroResult = await pool.request().query('SELECT * FROM [User].dbo.EstadosOrdenesRetiro WITH(NOLOCK)');
    cache.set('estadosOrdenesRetiro', estadosOrdenesRetiroResult.recordset);

    // Usar `updateCache` para la tabla de órdenes
    await updateCache('ordenes', async () => {
      const result = await pool.request().query('SELECT * FROM [User].dbo.Ordenes WITH(NOLOCK) WHERE cast(dateadd(d,-7,getdate()) as date) <= cast(OrdFechaIngresoOrden as date) OR OrdEstadoActual NOT IN (9,10)');
      return result.recordset; // Actualiza la caché de forma segura
    });

    console.log('Caché cargada con todas las tablas.');

  } catch (error) {
    console.error('Error al cargar la caché:', error);
  }
}

module.exports = { loadCache };

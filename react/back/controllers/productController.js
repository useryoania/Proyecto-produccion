const sql = require('mssql');
const { poolPromise } = require('../config/db');
const cache = require('../cache'); // Importa la caché

// Controlador para obtener productos
const getProductos = async (req, res) => {
  try {
    // Verificar si los datos están en la caché
    let productos = cache.get('productos');
    if (productos) {
      console.log('Productos servidos desde la caché.');
    } else {
      // Si no están en la caché, consulta la base de datos
      const pool = await poolPromise;
      const result = await pool.request().query(`
        SELECT *
        FROM [User].dbo.Productos Pro WITH(NOLOCK)
      `);

      // Almacenar en la caché el resultado completo
      cache.set('productos', result.recordset);
      console.log('Productos consultados desde la base de datos y almacenados en la caché.');

      // Obtener los productos desde el resultado
      productos = result.recordset;
    }

    // Filtrar las columnas antes de responder
    const filteredProductos = productos.map(producto => ({
      ProIdProducto: producto.ProIdProducto,
      ProCodigoOdooProducto: producto.ProCodigoOdooProducto,
      ProNombreProducto: producto.ProNombreProducto,
      ProDetalleProducto: producto.ProDetalleProducto,
      SMaIdSubMarca: producto.SMaIdSubMarca,
      UniIdUnidad: producto.UniIdUnidad,
      ProVigente: producto.ProVigente,
      ProFechaHoraAlta: producto.ProFechaHoraAlta,
      ProUsuarioAlta: producto.ProUsuarioAlta,
      MonIdMoneda: producto.MonIdMoneda,
      ProPrecioActual: producto.ProPrecioActual,
    }));

    res.json(filteredProductos);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error al obtener los productos' });
  }
};

const createProducto = async (req, res) => {
  const { codigoOdoo, name, details, category, IdUnidad, IdMoneda, cost } = req.body;
  const UsuarioAlta = req.user.id; // Obtener el ID del usuario autenticado

  console.log("Datos recibidos en el backend:", req.body);
  console.log("Usuario autenticado:", UsuarioAlta);

  try {
    const pool = await poolPromise;
    
    // Realiza la inserción del nuevo producto y obtiene su ID
    const result = await pool.request()
      .input('codigoOdoo', sql.VarChar(50), codigoOdoo)
      .input('name', sql.VarChar(100), name)
      .input('details', sql.VarChar(50), details)
      .input('category', sql.Int, category)
      .input('IdUnidad', sql.Int, IdUnidad)
      .input('IdMoneda', sql.Int, IdMoneda)
      .input('cost', sql.Float, cost)
      .input('UsuarioAlta', sql.Int, UsuarioAlta)
      .input('FechaHoraAlta', sql.DateTime, new Date())
      .query(`
        DECLARE @newProductId TABLE (Codigo int);

        INSERT INTO [User].dbo.Productos (
          ProCodigoOdooProducto,
          ProNombreProducto,
          ProDetalleProducto,
          SMaIdSubMarca,
          UniIdUnidad,
          ProFechaHoraAlta,
          ProUsuarioAlta,
          MonIdMoneda,
          ProPrecioActual
        )
        OUTPUT INSERTED.ProIdProducto INTO @newProductId
        VALUES (
          @codigoOdoo, @name, @details, @category, @IdUnidad, @FechaHoraAlta, @UsuarioAlta, @IdMoneda, @cost
        );

        SELECT Codigo AS NewProductId FROM @newProductId;
      `);

    // Obtener el ID del nuevo producto
    const newProductId = result.recordset[0].NewProductId;

    // Inserta el registro en HistoricoPreciosProductos
    await pool.request()
      .input('ProIdProducto', sql.Int, newProductId)
      .input('MonIdMoneda', sql.Int, IdMoneda)
      .input('HPPPrecioProducto', sql.Float, cost)
      .input('HPPFechaDesde', sql.Date, new Date())
      .input('HPPFechaAlta', sql.DateTime, new Date())
      .input('HPPUsuarioAlta', sql.Int, UsuarioAlta)
      .query(`
        INSERT INTO [User].dbo.HistoricoPreciosProductos (
          ProIdProducto,
          MonIdMoneda,
          HPPPrecioProducto,
          HPPFechaDesde,
          HPPFechaHasta,
          HPPFechaAlta,
          HPPUsuarioAlta
        )
        VALUES (
          @ProIdProducto,
          @MonIdMoneda,
          @HPPPrecioProducto,
          @HPPFechaDesde,
          NULL,
          @HPPFechaAlta,
          @HPPUsuarioAlta
        )
      `);

    // Actualizar la caché
    let productos = cache.get('productos');
    if (!productos) {
      console.log('Caché no inicializada. Cargando productos desde la base de datos...');
      const productosResult = await pool.request().query('SELECT * FROM [User].dbo.Productos WITH(NOLOCK)');
      productos = productosResult.recordset;
    } else {
      console.log('Actualizando la caché con el nuevo producto...');
      // Agregar el nuevo producto a la caché
      productos.push({
        ProIdProducto: newProductId,
        ProCodigoOdooProducto: codigoOdoo,
        ProNombreProducto: name,
        ProDetalleProducto: details,
        SMaIdSubMarca: category,
        UniIdUnidad: IdUnidad,
        ProVigente: true,
        ProFechaHoraAlta: new Date(),
        ProUsuarioAlta: UsuarioAlta,
        MonIdMoneda: IdMoneda,
        ProPrecioActual: cost,
      });
    }

    // Actualizar la caché con los productos actualizados
    cache.set('productos', productos);

    res.status(201).json({ message: 'Producto creado correctamente' });
  } catch (err) {
    console.error('Error al crear producto:', err);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
};

// Controlador para actualizar el precio de un producto
const updateProducto = async (req, res) => {
  const { codigoOdoo, IdProducto, NuevoPrecio, NombreProducto, Detalle, Moneda } = req.body;
  const UsuarioAlta = req.user.id; // Obtener el ID del usuario autenticado

  try {
    const pool = await poolPromise;

    // Actualiza el producto en la base de datos
    const result = await pool.request()
      .input('codigoOdoo', sql.VarChar(50), codigoOdoo)
      .input('IdProducto', sql.Int, IdProducto)
      .input('NombreProducto', sql.VarChar, NombreProducto)
      .input('Detalle', sql.VarChar, Detalle)
      .input('NuevoPrecio', sql.Float, NuevoPrecio)
      .input('Moneda', sql.Int, Moneda)
      .query(`
        UPDATE [User].dbo.Productos
        SET ProCodigoOdooProducto = @codigoOdoo,
            ProNombreProducto = @NombreProducto,
            ProDetalleProducto = @Detalle,
            ProPrecioActual = @NuevoPrecio,
            MonIdMoneda = @Moneda
        WHERE ProIdProducto = @IdProducto;

        SELECT ProPrecioActual AS PrecioActual 
        FROM [User].dbo.Productos
        WHERE ProIdProducto = @IdProducto;
      `);

    // Verifica si se actualizó el producto
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Actualiza el historial de precios si el precio cambió
    const PrecioActual = result.recordset[0].PrecioActual;
    if (PrecioActual !== NuevoPrecio) {
      await pool.request()
        .input('IdProducto', sql.Int, IdProducto)
        .input('Moneda', sql.Int, Moneda)
        .input('NuevoPrecio', sql.Float, NuevoPrecio)
        .input('HPPFechaDesde', sql.Date, new Date())
        .input('HPPFechaAlta', sql.DateTime, new Date())
        .input('HPPUsuarioAlta', sql.Int, UsuarioAlta)
        .query(`
          UPDATE [User].dbo.HistoricoPreciosProductos
          SET HPPFechaHasta = GETDATE(),
              HPPFechaModificacion = GETDATE()
          WHERE ProIdProducto = @IdProducto
          AND HPPFechaHasta IS NULL;

          INSERT INTO [User].dbo.HistoricoPreciosProductos (
            ProIdProducto,
            MonIdMoneda,
            HPPPrecioProducto,
            HPPFechaDesde,
            HPPFechaHasta,
            HPPFechaAlta,
            HPPUsuarioAlta
          )
          VALUES (
            @IdProducto,
            @Moneda,
            @NuevoPrecio,
            @HPPFechaDesde,
            NULL,
            @HPPFechaAlta,
            @HPPUsuarioAlta
          );
        `);
    }

    // Actualizar la caché
    let productos = cache.get('productos');
    if (productos) {
      const index = productos.findIndex(p => p.ProIdProducto === IdProducto);
      if (index !== -1) {
        productos[index] = {
          ...productos[index],
          ProCodigoOdooProducto: codigoOdoo,
          ProNombreProducto: NombreProducto,
          ProDetalleProducto: Detalle,
          ProPrecioActual: NuevoPrecio,
          MonIdMoneda: Moneda,
        };
        cache.set('productos', productos);
        console.log(`Producto con ID ${IdProducto} actualizado en la caché.`);
      }
    }

    res.json({ message: 'Producto actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar el producto:', err);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
};


// Controlador para obtener las categorías (SubMarcas)
const getCategorias = async (req, res) => {
  try {
    // Verificar si los datos están en la caché
    let subMarcas = cache.get('subMarcas');
    if (subMarcas) {
      console.log('subMarcas servidas desde la caché.');
    } else {
      console.log('subMarcas no encontradas en la caché. Consultando la base de datos...');
      const pool = await poolPromise;
      const result = await pool.request().query(`
        SELECT *
        FROM [User].dbo.SubMarcas WITH(NOLOCK)
      `);

      // Guardar en la caché
      subMarcas = result.recordset;
      cache.set('subMarcas', subMarcas);
      console.log('subMarcas consultadas desde la base de datos y almacenadas en la caché.');
    }

    // Filtrar solo los campos necesarios antes de enviar la respuesta
    const filteredsubMarcas = subMarcas.map(subMarcas => ({
      SMaIdSubMarca: subMarcas.SMaIdSubMarca,
      SMaNombreSubMarca: subMarcas.SMaNombreSubMarca,
    }));

    // Enviar la respuesta
    res.json(filteredsubMarcas);
  } catch (err) {
    console.error('Error al obtener las categorías:', err);
    res.status(500).json({ error: 'Error al obtener las categorías' });
  }
};


// Controlador para obtener las monedas
const getMonedas = async (req, res) => {
  try {
    // Verificar si los datos están en la caché
    let monedas = cache.get('monedas');
    if (monedas) {
      console.log('Monedas servidas desde la caché.');
    } else {
      console.log('Monedas no encontradas en la caché. Consultando la base de datos...');
      const pool = await poolPromise;
      const result = await pool.request().query(`
        SELECT *  
        FROM [User].dbo.Monedas WITH(NOLOCK)
      `);

      // Guardar en la caché
      monedas = result.recordset;
      cache.set('monedas', monedas);
      console.log('Monedas consultadas desde la base de datos y almacenadas en la caché.');
    }

    // Filtrar solo los campos necesarios antes de enviar la respuesta
    const filteredMonedas = monedas.map(moneda => ({
      MonIdMoneda: moneda.MonIdMoneda,
      MonSimbolo: moneda.MonSimbolo,
      MonDescripcionMoneda: moneda.MonDescripcionMoneda,
    }));

    // Enviar la respuesta
    res.json(filteredMonedas);
  } catch (err) {
    console.error('Error al obtener las monedas:', err);
    res.status(500).json({ error: 'Error al obtener las monedas' });
  }
};


module.exports = { getProductos, createProducto, updateProducto, getCategorias, getMonedas };
const sql = require('mssql');
const { poolPromise } = require('../config/db');
const cache = require('../cache'); // Importa la caché

// Obtener cotizaciones de la fecha actual
const getCotizacionesHoy = async (req, res) => {
  try {
    // Verificar si las cotizaciones de hoy están en la caché
    let cotizaciones = cache.get('cotizaciones');
    if (cotizaciones) {
      console.log('Cotizaciones servidas desde la caché.');
    } else {
      console.log('Cotizaciones no encontradas en la caché. Consultando la base de datos...');
      const pool = await poolPromise;

      // Consultar cotizaciones de la fecha actual
      const result = await pool
        .request()
        .query(`
          SELECT TOP 1 CotFecha, CotDolar 
          FROM [User].dbo.Cotizaciones WITH(NOLOCK) 
          where datediff(d,CotFecha,getdate()) = 0 
          ORDER BY CotFecha DESC
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'No hay cotizaciones disponibles.' });
      }

      // Obtener el primer registro
      cotizaciones = result.recordset;
      console.log(cotizaciones);

      // Guardar en la caché
      cache.set('cotizaciones', cotizaciones);
      console.log('Cotizaciones consultadas desde la base de datos y almacenadas en la caché.');
    }

    // Devolver las cotizaciones al cliente como un objeto
    res.status(200).json({
      message: `Cotizaciones más recientes del ${cotizaciones.CotFecha}`,
      cotizaciones,
    });
  } catch (error) {
    console.error('Error al obtener las cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener las cotizaciones' });
  }
};


// Inserta cotizacion de forma manual
const insertCotizacion = async (req, res) => {
  const { cotizacion } = req.body;

  // Validar los datos recibidos
  if (!cotizacion || isNaN(cotizacion)) {
    return res.status(400).json({ error: 'Por favor, proporcione una cotización válida.' });
  }

  try {
    const pool = await poolPromise;

    // Verificar si ya existe una cotización para el día actual
    const checkCotizacion = await pool.request()
      .query(`
        SELECT COUNT(*) AS count
        FROM [User].dbo.Cotizaciones WITH(NOLOCK)
        WHERE CONVERT(DATE, CotFecha) = CONVERT(DATE, GETDATE())
      `);

    if (checkCotizacion.recordset[0].count > 0) {
      return res.status(400).json({ error: 'Ya existe una cotización para el día de hoy.' });
    }

    // Inserta la cotización en la base de datos
    await pool.request()
      .input('cotizacion', sql.Float, cotizacion)
      .query(`
        INSERT INTO [User].dbo.Cotizaciones (CotFecha, CotDolar)
        VALUES (GETDATE(), @cotizacion)
      `);

    // Limpiar la caché existente y cargar la nueva línea
    cache.del('cotizaciones'); // Limpia la clave específica
    console.log('Caché de cotizaciones limpiada');

    res.status(201).json({ message: 'Cotización insertada exitosamente.'});
  } catch (error) {
    console.error('Error al insertar la cotización:', error);
    res.status(500).json({ error: 'Hubo un error al intentar insertar la cotización.' });
  }
};

module.exports = {  getCotizacionesHoy, insertCotizacion };

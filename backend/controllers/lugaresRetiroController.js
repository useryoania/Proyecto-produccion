// Importar los módulos necesarios
const sql = require('mssql');
const { poolPromise } = require('../config/db');
const cache = require('../cache'); // Importa la caché

const getLugaresRetiro = async (req, res) => {
  try {
    // Verificar si los datos están en la caché
    let lugaresRetiro = cache.get('lugaresRetiro');
    if (lugaresRetiro) {
      console.log('Lugares de retiro servidos desde la caché.');
    } else {
      console.log('Lugares de retiro no encontrados en la caché. Consultando la base de datos...');
      const pool = await poolPromise;
      
      // Realizar la consulta para obtener todos los datos de la tabla
      const result = await pool.request().query(`
        SELECT *  
        FROM [User].dbo.LugaresRetiro WITH(NOLOCK) 
        WHERE LReLugarVigente = 1
      `);

      // Guardar los datos en la caché
      lugaresRetiro = result.recordset;
      cache.set('lugaresRetiro', lugaresRetiro);
      console.log('Lugares de retiro consultados desde la base de datos y almacenados en la caché.');
    }

    // Filtrar los datos para devolver únicamente los campos necesarios
    const filteredLugaresRetiro = lugaresRetiro.map(lugar => ({
        LReIdLugarRetiro: lugar.LReIdLugarRetiro,
        LReNombreLugar: lugar.LReNombreLugar,
      }));

    // Devolver los datos filtrados en la respuesta
    res.status(200).json(filteredLugaresRetiro);
  } catch (error) {
    console.error('Error al obtener los lugares de retiro:', error);
    res.status(500).json({ error: 'Error al obtener los lugares de retiro' });
  }
};


// Exportar el controlador
module.exports = { getLugaresRetiro };
const { getPool, sql } = require('../config/db');

const getLugaresRetiro = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ID AS LReIdLugarRetiro, Nombre AS LReNombreLugar  
      FROM FormasEnvio WITH(NOLOCK) 
      ORDER BY ID
    `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener los lugares de retiro:', error);
    res.status(500).json({ error: 'Error al obtener los lugares de retiro' });
  }
};

module.exports = { getLugaresRetiro };

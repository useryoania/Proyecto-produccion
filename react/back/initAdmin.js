const bcrypt = require('bcrypt');
const sql = require('mssql');
const { poolPromise } = require('./config/db'); // Importa la configuración de la base de datos

// Datos del primer usuario administrador
const username = 'admin'; // Cambia el nombre de usuario si lo deseas
const plainPassword = 'AdminPassword123'; // Usa una contraseña segura

// Función para crear el primer usuario
const createAdminUser = async () => {
  try {
    // Encripta la contraseña
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Conéctate a la base de datos y ejecuta la consulta de inserción
    const pool = await poolPromise;
    await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, hashedPassword)
      .query(`
        INSERT INTO [User].dbo.Usuarios (UsuUserName, UsuPassword, UsuActivado, RolIdRol, UsuFechaAlta)
        VALUES (@username, @password, 1, 1, GETDATE())
      `);

    console.log('Usuario administrador creado exitosamente.');
  } catch (error) {
    console.error('Error al crear el usuario administrador:', error);
  }
};

// Ejecuta la función
createAdminUser().then(() => process.exit());

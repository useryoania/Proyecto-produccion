const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { poolPromise } = require('../config/db'); // Importa la conexión desde tu archivo db
const SECRET_KEY = process.env.JWT_SECRET; // Cambia esto por una clave secreta segura

// Función para obtener el usuario desde la base de datos
const getUserFromDatabase = async (username) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT * FROM [User].dbo.Usuarios WITH(NOLOCK) WHERE UsuUserName = @username AND UsuActivado = 1');

    return result.recordset[0]; // Retorna el primer usuario encontrado, o undefined si no hay coincidencias
  } catch (error) {
    console.error('Error al buscar el usuario:', error);
    return null;
  }
};

// Función de login
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await poolPromise;

    // Consulta para obtener el usuario junto con su rol
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query(`
        SELECT u.UsuIdUsuario, u.UsuUserName, u.UsuPassword, r.RolDescripcionRol 
        FROM [User].dbo.Usuarios u WITH(NOLOCK)
        INNER JOIN [User].dbo.Roles r WITH(NOLOCK) ON u.RolIdRol = r.RolIdRol
        WHERE u.UsuUserName = @username AND u.UsuActivado = 1
      `);

    const user = result.recordset[0]; // Primer registro de la consulta

    if (user && await bcrypt.compare(password, user.UsuPassword)) {
      const token = jwt.sign(
        { id: user.UsuIdUsuario, username: user.UsuUserName, role: user.RolDescripcionRol },
        SECRET_KEY,
        { expiresIn: '720h' }
      );

      res.json({ token, role: user.RolDescripcionRol }); // Devuelve el token y el rol
    } else {
      res.status(401).json({ message: 'Credenciales incorrectas' });
    }
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};


// Controlador para registrar un usuario administrador
const registerUser = async (req, res) => {
  const { username, password, role, adminSecret } = req.body;

  // Verificar el código de administración
  const ADMIN_SECRET = 'clavesecreta'; // Cambia esto por una variable de entorno en producción
  if (adminSecret !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Código de administración incorrecto' });
  }

  try {
    const pool = await poolPromise;

    // Verificar si el rol existe en la base de datos
    const roleResult = await pool.request()
      .input('role', sql.VarChar, role)
      .query('SELECT RolIdRol FROM [User].dbo.Roles WITH(NOLOCK) WHERE RolDescripcionRol = @role');

    if (roleResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Rol no válido' });
    }

    const rolId = roleResult.recordset[0].RolIdRol;

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar el usuario en la base de datos
    await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, hashedPassword)
      .input('rolId', sql.Int, rolId)
      .query(`
        INSERT INTO [User].dbo.Usuarios (UsuUserName, UsuPassword, UsuActivado, RolIdRol, UsuFechaAlta)
        VALUES (@username, @password, 1, @rolId, GETDATE())
      `);

    res.status(201).json({ message: 'Usuario creado con éxito' });
  } catch (error) {
    console.error('Error al crear el usuario:', error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
};


const getRoles = async (req, res) => {
  try {
    const pool = await poolPromise;

    // Consulta para obtener todos los roles
    const result = await pool.request()
      .query('SELECT RolIdRol, RolDescripcionRol FROM [User].dbo.Roles WITH(NOLOCK)');

    res.json(result.recordset); // Envía los roles al frontend
  } catch (error) {
    console.error('Error al obtener los roles:', error);
    res.status(500).json({ error: 'Error al obtener los roles' });
  }
};

/**
 * Genera un token JWT para integraciones específicas.
 * @param {Object} req - La solicitud HTTP.
 * @param {Object} res - La respuesta HTTP.
 */
const generateToken = (req, res) => {
  const { apiKey } = req.body;

  // Verificar si la API Key es válida (defínela en tus variables de entorno o en código seguro)
  const VALID_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  if (apiKey !== VALID_API_KEY) {
    return res.status(401).json({ message: 'API Key inválida' });
  }

  // Generar el token con una carga útil específica para esta integración
  const token = jwt.sign(
    { app: 'Google Sheets Integration', role: 'integration' },
    SECRET_KEY,
    { expiresIn: '24h' } // Validez del token (ajusta según tu necesidad)
  );

  res.json({ token });
};

module.exports = { login, registerUser, getRoles, generateToken };

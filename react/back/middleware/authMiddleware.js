const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;; // Usa una variable de entorno en producción

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.error('Token no proporcionado');
    return res.status(401).json({ message: 'No autorizado' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.error('Error al verificar el token:', err.message); // Detalla el error
      return res.status(403).json({ message: 'Token inválido' });
    }

    req.user = user;
    next();
  });
};


module.exports = { authenticateToken };

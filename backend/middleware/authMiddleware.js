const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Clave secreta para firmar el token
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined in environment variables');

// =====================================================================
// MIDDLEWARE: VERIFICAR TOKEN
// =====================================================================
exports.verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return res.status(403).json({ message: 'No se proporcionó token de autenticación.' });
        }

        const token = authHeader.split(' ')[1]; // Bearer <TOKEN>
        if (!token) {
            return res.status(403).json({ message: 'Formato de token inválido.' });
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Token inválido o expirado.' });
            }
            
            // Guardamos datos decodificados en req.user
            req.user = decoded;

            const { iat, exp, ...userData } = decoded;
            const newToken = jwt.sign(userData, JWT_SECRET, { expiresIn: '30d' });
            res.setHeader('x-renewed-token', newToken);

            // Actualizar actividad en sessionTracker
            const { touchSession } = require('../utils/sessionTracker');
            if (decoded.id) {
                const sessionUsername = decoded.username || decoded.name || decoded.email || 'Desconocido';
                const sessionType = decoded.userType || decoded.role || 'UNKNOWN';
                touchSession(decoded.id, sessionUsername, req.ip, sessionType);
            }

            next();
        });

    } catch (error) {
        logger.error('Error en verifyToken middleware:', error);
        return res.status(500).json({ message: 'Error interno de autenticación.' });
    }
};

// =====================================================================
// MIDDLEWARE: AUTORIZAR ADMIN O ÁREA
// =====================================================================
exports.authorizeAdminOrArea = (req, res, next) => {
    // Requiere verifyToken antes
    if (!req.user) {
        return res.status(401).json({ message: 'Usuario no autenticado.' });
    }

    const { role } = req.user;

    if (!role) {
        return res.status(403).json({ message: 'Usuario sin rol asignado.' });
    }

    next();
};

exports.JWT_SECRET = JWT_SECRET;

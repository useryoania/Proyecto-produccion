const jwt = require('jsonwebtoken');

// Clave secreta para firmar el token (Idealmente en .env, fallback seguro para dev)
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-macrosoft-production';

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
            const newToken = jwt.sign(userData, JWT_SECRET, { expiresIn: '15m' });
            res.setHeader('x-renewed-token', newToken)
            /* 
               decoded espera tener:
               { id, username, role, areaKey, ... }
            */
            next();
        });

    } catch (error) {
        console.error('Error en verifyToken middleware:', error);
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

    // Si la ruta tiene un parámetro :area, verificamos coincidencia
    // Nota: Para getActiveOrdersSummary no hay :area en path, se usa req.user.areaKey directamente en el controller.
    // Este middleware es más útil si protegemos rutas tipo /orders/:area

    // De momento, simplemente dejamos pasar, ya que el controller hace el filtrado final.
    // Solo validamos que tenga rol válido.

    if (!role) {
        return res.status(403).json({ message: 'Usuario sin rol asignado.' });
    }

    next();
};

exports.JWT_SECRET = JWT_SECRET;

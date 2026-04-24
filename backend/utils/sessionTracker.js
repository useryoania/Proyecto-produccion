/**
 * In-memory session tracker.
 * Tracks active users (login time, IP, last activity).
 * Tracks login history (last 200 entries).
 */

const activeSessions = new Map(); // userId -> { username, ip, loginAt, lastActivity, userType }
const loginHistory = [];          // { timestamp, username, ip, success, userType, reason }
const MAX_HISTORY = 500;
const SESSION_EXPIRATION_MS = 1500000; // 25 minutos de inactividad máxima

const trackLogin = (userId, username, ip, userType, success, reason) => {
    // Always log to history
    loginHistory.unshift({
        timestamp: new Date().toISOString(),
        userId,
        username,
        ip: (ip || '').replace(/^::ffff:/, ''),
        userType,
        success,
        reason: reason || (success ? 'OK' : 'Credenciales inválidas'),
    });
    if (loginHistory.length > MAX_HISTORY) loginHistory.length = MAX_HISTORY;

    // Track active session on success
    if (success && userId) {
        activeSessions.set(userId, {
            username,
            ip: (ip || '').replace(/^::ffff:/, ''),
            loginAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            userType,
        });
    }
};

const touchSession = (userId, username, ip, userType) => {
    let s = activeSessions.get(userId);
    if (s) {
        s.lastActivity = new Date().toISOString();
        if (ip && s.ip !== ip) s.ip = ip.replace(/^::ffff:/, ''); // update IP si cambió
    } else if (username) {
        // Es un usuario con token válido usando el sistema que no estaba en memoria
        activeSessions.set(userId, {
            username: username,
            ip: (ip || '').replace(/^::ffff:/, ''),
            loginAt: new Date().toISOString(), // momento en que lo detectamos activo
            lastActivity: new Date().toISOString(),
            userType: userType || 'UNKNOWN',
        });
    }
};

const removeSession = (userId) => {
    activeSessions.delete(userId);
};

const getActiveSessions = () => {
    return Array.from(activeSessions.entries()).map(([id, s]) => ({ userId: id, ...s }));
};

const getLoginHistory = (limit = 100) => {
    return loginHistory.slice(0, limit);
};

// Cleanup routine: remueve las sesiones inactivas cada 15 min
setInterval(() => {
    const now = Date.now();
    for (const [userId, session] of activeSessions.entries()) {
        const lastAct = new Date(session.lastActivity).getTime();
        if (now - lastAct > SESSION_EXPIRATION_MS) {
            activeSessions.delete(userId);
        }
    }
}, 300000); // 5 minutos

module.exports = { trackLogin, touchSession, removeSession, getActiveSessions, getLoginHistory };

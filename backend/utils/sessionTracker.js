/**
 * In-memory session tracker.
 * Tracks active users (login time, IP, last activity).
 * Tracks login history (last 200 entries).
 */

const activeSessions = new Map(); // userId -> { username, ip, loginAt, lastActivity, userType }
const loginHistory = [];          // { timestamp, username, ip, success, userType, reason }
const MAX_HISTORY = 500;

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

const touchSession = (userId) => {
    const s = activeSessions.get(userId);
    if (s) s.lastActivity = new Date().toISOString();
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

module.exports = { trackLogin, touchSession, removeSession, getActiveSessions, getLoginHistory };

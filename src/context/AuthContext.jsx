import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { API_URL } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        console.log("🔍 [AuthStep 1] Revisando LocalStorage:", savedUser);

        if (savedUser && savedUser !== "undefined" && savedUser !== "null") {
            try {
                const parsed = JSON.parse(savedUser);
                if (parsed.token) {
                    try {
                        const payload = JSON.parse(atob(parsed.token.split('.')[1]));
                        if (payload.exp * 1000 < Date.now()) {
                            console.warn("Token expirado, cerrando sesión...");
                            localStorage.removeItem("user");
                            localStorage.removeItem("auth_token");
                            localStorage.removeItem("user_session");
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.error("❌ [AuthError] Error parseando token:", e);
                        localStorage.removeItem('user');
                    }
                }

                console.log("✅ [AuthStep 2] Usuario recuperado:", parsed);
                setUser(parsed);
            } catch (e) {
                console.error("❌ [AuthError] Error parseando usuario:", e);
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        console.log("🚀 [LoginStep 1] Intentando login para:", username);
        try {
            // --- 1. Intentar login de usuario INTERNO ---
            const internalRes = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const internalData = await internalRes.json();
            console.log("📥 [LoginStep 2a] Respuesta interno:", internalData);

            if (internalRes.ok && internalData.user) {
                // Usuario interno encontrado
                const receivedToken = internalData.token || internalData.user.token;
                const userData = {
                    id: internalData.user.userId || internalData.user.IdUsuario || internalData.user.id,
                    nombre: internalData.user.Nombre || internalData.user.username || internalData.user.Usuario || internalData.user.name,
                    rol: internalData.user.role || internalData.user.IdRol,
                    idRol: internalData.user.idRol || internalData.user.IdRol,
                    usuario: internalData.user.username || internalData.user.Usuario || internalData.user.email,
                    token: receivedToken,
                    areaKey: (internalData.user.area || internalData.user.AreaUsuario || internalData.user.AreaKey || '').trim(),
                    userType: internalData.userType,
                    redirectUrl: internalData.redirectUrl,
                    requireReset: internalData.user.requireReset || false
                };
                if (userData.idRol === 1 || userData.rol === 1) userData.rol = 'ADMIN';
                localStorage.setItem('user', JSON.stringify(userData));
                if (receivedToken) {
                    localStorage.setItem('auth_token', receivedToken);
                    localStorage.setItem('user_session', JSON.stringify(internalData.user));
                }
                setUser(userData);
                return userData;
            }

            // --- 2. Intentar login de CLIENTE WEB ---
            console.log("📥 [LoginStep 2b] No es interno, probando cliente web...");
            const clientRes = await fetch(`${API_URL}/web-auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: username, password })
            });
            const clientData = await clientRes.json();
            console.log("📥 [LoginStep 2c] Respuesta cliente web:", clientData);

            if (clientRes.ok && clientData.user) {
                const receivedToken = clientData.token;
                const userData = {
                    id: clientData.user.id || clientData.user.codCliente,
                    nombre: clientData.user.name,
                    rol: clientData.user.role || 'WEB_CLIENT',
                    idRol: null,
                    usuario: clientData.user.email,
                    token: receivedToken,
                    areaKey: '',
                    userType: 'CLIENT',
                    redirectUrl: '/portal/pickup',
                    requireReset: clientData.user.requireReset || false,
                    codCliente: clientData.user.codCliente,
                    role: 'WEB_CLIENT',
                };

                if (userData.requireReset) {
                    if (receivedToken) localStorage.setItem('auth_token', receivedToken);
                    return userData;
                }

                localStorage.setItem('user', JSON.stringify(userData));
                if (receivedToken) {
                    localStorage.setItem('auth_token', receivedToken);
                    localStorage.setItem('user_session', JSON.stringify(clientData.user));
                }
                setUser(userData);
                return userData;
            }

            // --- 3. Ambos fallaron: mostrar el error más relevante ---
            // Priorizar mensaje del endpoint web si el usuario intentó con formato de IDCliente
            const errorMsg = clientData.message || internalData.message || 'Credenciales inválidas';
            console.warn(`⚠️ [Login] Ambos endpoints fallaron. Último error: ${errorMsg}`);
            throw new Error(errorMsg);

        } catch (error) {
            console.error("🔥 [LoginError]:", error);
            throw error;
        }
    };


    const googleLogin = async (credential) => {
        try {
            const response = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential })
            });

            const data = await response.json();

            if (response.ok && data.user) {
                const receivedToken = data.token || data.user.token;

                const userData = {
                    id: data.user.userId || data.user.id,
                    nombre: data.user.name || data.user.Nombre,
                    rol: data.user.role,
                    idRol: data.user.idRol || 99,
                    usuario: data.user.email,
                    token: receivedToken,
                    userType: data.userType,
                    redirectUrl: data.redirectUrl
                };

                localStorage.setItem('user', JSON.stringify(userData));
                if (receivedToken) {
                    localStorage.setItem('auth_token', receivedToken);
                    localStorage.setItem('user_session', JSON.stringify(data.user));
                }

                setUser(userData);
                return userData;
            } else {
                const err = new Error(data.message || 'No se pudo iniciar sesión con Google');
                err.notFound = data.notFound;
                err.email = data.email;
                throw err;
            }
        } catch (error) {
            console.error("🔥 [GoogleLoginError]:", error);
            throw error;
        }
    };

    const logout = () => {
        console.log("🚪 [Auth] Cerrando sesión...");
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_session');
        // No llamar setUser(null) — provoca re-renders que crashean componentes antes del redirect
        window.location.href = '/login';
    };

    const value = useMemo(() => ({ user, login, googleLogin, logout, loading }), [user, loading]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
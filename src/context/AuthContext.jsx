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
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            console.log("📥 [LoginStep 2] Respuesta del servidor:", data);

            if (response.ok && data.user) {
                // FALLBACK: Check if token is directly in data or inside user object
                const receivedToken = data.token || data.user.token;
                console.log("🔑 [LoginStep 2.5] Token recibido:", receivedToken ? "SÍ (Length: " + receivedToken.length + ")" : "NO (undefined)");

                const userData = {
                    id: data.user.userId || data.user.IdUsuario || data.user.id, // Support both formats
                    nombre: data.user.Nombre || data.user.username || data.user.Usuario || data.user.name,
                    rol: data.user.role || data.user.IdRol, // Support both formats
                    idRol: data.user.idRol || data.user.IdRol, // Explicitly store IdRol
                    usuario: data.user.username || data.user.Usuario || data.user.email,
                    token: receivedToken, // Store the found token
                    areaKey: (data.user.area || data.user.AreaUsuario || data.user.AreaKey || '').trim(),
                    userType: data.userType, // INTERNAL or CLIENT
                    redirectUrl: data.redirectUrl, // Where to go
                    requireReset: data.user.requireReset || false // Force password change
                };

                // Normalize Role for Frontend Checks
                if (userData.idRol === 1 || userData.rol === 1) {
                    userData.rol = 'ADMIN';
                }

                // Log what we mapped to debug
                console.log("📍 [Auth] Mapped User Data:", userData);
                console.log("💾 [LoginStep 3] Guardando en LocalStorage:", userData);

                // If client needs to reset password, only store token (for API call)
                // but DON'T store user/session (prevents back-button session restore)
                if (userData.requireReset) {
                    if (receivedToken) {
                        localStorage.setItem('auth_token', receivedToken);
                    }
                    return userData;
                }

                // MAIN STORAGE (Shared)
                localStorage.setItem('user', JSON.stringify(userData));

                // ALSO STORE TOKEN IN 'auth_token' FOR CLIENT PORTAL COMPATIBILITY
                if (receivedToken) {
                    localStorage.setItem('auth_token', receivedToken);
                    localStorage.setItem('user_session', JSON.stringify(data.user));
                } else {
                    console.error("No token to write to auth_token!");
                }

                setUser(userData);

                return userData;
            } else {
                // Mostrar el mensaje exacto del servidor (ej: "pendiente de aprobación")
                const errorMsg = data.message || 'Credenciales inválidas';
                console.warn(`⚠️ [Login] Server response (${response.status}):`, errorMsg);
                throw new Error(errorMsg);
            }
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
                throw new Error(data.message || 'No se pudo iniciar sesión con Google');
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
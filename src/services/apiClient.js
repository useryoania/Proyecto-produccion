import axios from 'axios';

// Detecta URL de entorno (Vite) o usa localhost por defecto
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor para agregar token si existe (mejora de seguridad proactiva)
api.interceptors.request.use(config => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user && user.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
            }
        } catch (e) {
            console.error("Error parsing user token:", e);
        }
    }
    return config;
}, error => {
    return Promise.reject(error);
});

export default api;

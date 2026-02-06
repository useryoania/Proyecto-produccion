import axios from 'axios';

const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // En Producción con Proxy (Vite Preview), usamos ruta relativa
    // para evitar problemas de HTTPS vs HTTP (Mixed Content).
    return '/api';
};

export const API_URL = getBaseUrl();

// Socket también relativo
export const SOCKET_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : '/';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

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
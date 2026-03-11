import React from 'react';
import { useAuth } from './AuthContext';

export const ProtectedRoute = ({ children }) => {
    const { isLoggedIn } = useAuth();

    if (!isLoggedIn) {
        // Usar window.location en vez de <Navigate> para salir del contexto
        // de rutas del portal y evitar loop infinito con el catch-all
        window.location.href = '/login';
        return null;
    }

    return children;
};

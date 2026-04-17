import React from 'react';
import { useAuth } from './AuthContext';

export const ProtectedRoute = ({ children }) => {
    const { isLoggedIn } = useAuth();

    if (!isLoggedIn) {
        const currentPath = window.location.pathname;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        return null;
    }

    return children;
};

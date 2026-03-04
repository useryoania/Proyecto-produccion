import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token'); // Verifica si hay un token
  const userRole = localStorage.getItem('role'); // Obtén el rol del usuario

  // Función para verificar si el token ha expirado
  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])); // Decodificar el payload del token
      return payload.exp * 1000 < Date.now(); // Comparar la fecha de expiración con el tiempo actual
    } catch (error) {
      console.error('Error al verificar el token:', error);
      return true;
    }
  };

  // Si no hay token o está expirado, redirigir a /login
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem('token'); // Limpia el token expirado
    localStorage.removeItem('role'); // Limpia el rol del usuario
    alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
    return <Navigate to="/login" />;
  }

  // Si el rol no está permitido, redirigir (por ejemplo, a una página de acceso denegado o login)
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" />;
  }

  // Si todo está bien, renderiza el contenido
  return children;
};

export default ProtectedRoute;

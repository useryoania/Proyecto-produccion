import React, { createContext, useContext, useState } from 'react';

// Creamos el contexto
const AuthContext = createContext();

// Proveedor de contexto
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Aquí almacenaremos el usuario autenticado (incluyendo el rol)

  // Función para iniciar sesión
  const login = (userData) => {
    setUser(userData); // Guardamos los datos del usuario autenticado
  };

  // Función para cerrar sesión
  const logout = () => {
    setUser(null); // Limpiamos el usuario al cerrar sesión
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar el contexto
export const useAuth = () => useContext(AuthContext);

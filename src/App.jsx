// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/pages/LoginPage';
import MainAppContent from './components/layout/MainAppContent'; // ESTE ES EL IMPORT
import { menuService } from './services/api';
import { ClientPortalApp } from './client-portal/ClientPortalApp';

function App() {
  const { user, loading: authLoading } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const userId = user?.id || user?.IdUsuario;
    if (userId) {
      const loadMenu = async () => {
        setDataLoading(true);
        try {
          const menuData = await menuService.getByUser(userId);
          setMenuItems(menuData || []);
        } catch (error) {
          console.error("Error cargando menú:", error);
        } finally {
          setDataLoading(false);
        }
      };
      loadMenu();
    }
  }, [user]);

  if (authLoading) return <div>Cargando sesión...</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/portal/*" element={<ClientPortalApp />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/portal/*" element={<ClientPortalApp />} />
      <Route path="*" element={<MainAppContent menuItems={menuItems} />} />
    </Routes>
  );
}

export default App;
// src/App.jsx
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/pages/LoginPage';
import RegisterPage from './components/pages/RegisterPage';
import ForgotPasswordPage from './components/pages/ForgotPasswordPage';
import { ClientPortalApp } from './client-portal/ClientPortalApp';
import MainAppContent from './components/layout/MainAppContent'; // ESTE ES EL IMPORT
import PaymentResult from './components/pages/PaymentResult';
import { TotemApp } from './client-portal/modulos/totem/TotemApp';
import PrintStationPage from './components/logistics/PrintStationPage';
import { menuService } from './services/api';

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
      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/portal/*" element={<ClientPortalApp />} />
          <Route path="/payment-status" element={<PaymentResult />} />
          <Route path="/totem/*" element={<TotemApp />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    );
  }
  // CHECK USER TYPE FOR ROUTING
  const isClient = user?.userType === 'CLIENT' || user?.role === 'WEB_CLIENT';

  if (isClient) {
    return (
      <main>
        <Routes>
          <Route path="/portal/*" element={<ClientPortalApp />} />
          <Route path="/payment-status" element={<PaymentResult />} />
          <Route path="/totem/*" element={<TotemApp />} />
          <Route path="*" element={<Navigate to="/portal/pickup" replace />} />
        </Routes>
      </main>
    );
  }
  // ADMIN / INTERNAL ROUTING
  return (
    <main>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/totem/*" element={<TotemApp />} />
        <Route path="/print-station" element={<PrintStationPage />} />
        <Route path="*" element={<MainAppContent menuItems={menuItems} />} />
      </Routes>
    </main>
  );
}
// 🚀 ESTA LÍNEA ES LA QUE TE FALTA Y CAUSA EL ERROR
export default App;
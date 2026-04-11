// src/App.jsx
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/pages/LoginPage';
import RegisterPage from './components/pages/RegisterPage';
import ForgotPasswordPage from './components/pages/ForgotPasswordPage';
import ResetPasswordPage from './components/pages/ResetPasswordPage';
import LandingPage from './components/pages/LandingPage';
import ContactPage from './components/pages/ContactPage';
import { ClientPortalApp } from './client-portal/ClientPortalApp';
import MainAppContent from './components/layout/MainAppContent'; // ESTE ES EL IMPORT
import PaymentResult from './components/pages/PaymentResult';
import { TotemApp } from './client-portal/modulos/totem/TotemApp';
import PrintStationPage from './components/logistics/PrintStationPage';
import EncomiendaPrintStation from './components/logistics/EncomiendaPrintStation';
import { menuService } from './services/api';

function App() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
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
      <main className="bg-custom-dark min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Routes location={location}>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/contacto" element={<ContactPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/portal/*" element={<ClientPortalApp />} />
              <Route path="/payment-status" element={<PaymentResult />} />
              <Route path="/totem/*" element={<TotemApp />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    );
  }
  // CHECK USER TYPE FOR ROUTING
  const isClient = user?.userType === 'CLIENT' || user?.role === 'WEB_CLIENT';

  if (isClient) {
    return (
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/portal/pickup" replace />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/contacto" element={<ContactPage />} />
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
        <Route path="/encomienda-station" element={<EncomiendaPrintStation />} />
        {/* /portal pertenece al portal cliente — si un admin llega aquí, redirigir al dashboard */}
        <Route path="/portal/*" element={<Navigate to="/" replace />} />
        <Route path="*" element={<MainAppContent menuItems={menuItems} />} />
      </Routes>
    </main>
  );
}
// 🚀 ESTA LÍNEA ES LA QUE TE FALTA Y CAUSA EL ERROR
export default App;
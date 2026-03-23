import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/design-system.css'; // <-- IMPORTAR AQUÍ
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx'; // 👈 Importamos el proveedor
import { BrowserRouter } from 'react-router-dom';      // 👈 Importamos el enrutador

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import './utils/errorReporter'; // Global frontend error reporter → /api/client-error

// FORCE REFRESH TIMESTAMP
console.log(`🚀 APP VERSION REFRESH: ${new Date().toLocaleString()}`);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('[SW] Registration failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
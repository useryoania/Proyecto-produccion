// src/App.jsx
import React, { useState } from 'react';
import { AppProvider } from './components/contexts/AppContext.jsx';
import { ProductionProvider } from './components/production/context/ProductionContext.jsx';

import Navbar from './components/layout/Navbar.js';

// Páginas
import Dashboard from './components/pages/Dashboard.jsx';
import Chat from './components/pages/Chat.jsx';
import Metricas from './components/pages/Metricas.jsx';
import Planilla from './components/pages/Planilla.jsx';

// Áreas genéricas
import GenericArea from './components/production/areas/AreaGenerica.jsx';

// Áreas específicas
import ECOUVArea from './components/production/areas/ECOUVArea.jsx';
import TPUUVArea from './components/production/areas/TPUUVArea.js';
import Directa320Area from './components/production/areas/Directa320Area.js';
import SublimationArea from './components/production/areas/SublimationArea.js';
import EstampadoArea from './components/production/areas/EstampadoArea.js';
import LaserArea from './components/production/areas/LaserArea.js';
import CosturaArea from './components/production/areas/CosturaArea.js';
import TerminacionUVArea from './components/production/areas/TerminacionUVArea.js';
import CoordinacionArea from './components/production/areas/CoordinacionArea.js';
import DepositoArea from './components/production/areas/DepositoArea.js';

// Vistas extra
import Despacho from './components/production/areas/Despacho.js';
import ServicioTecnico from './components/production/areas/ServicioTecnico.js';
import Infraestructura from './components/production/areas/Infraestructura.js';

// Data
import { mockMachines, mockOrders } from './data/mockData.js';

import './styles/custom.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const switchTab = (view) => setCurrentView(view);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            currentView={currentView}
            onSwitchTab={switchTab}
            machines={mockMachines}
            orders={mockOrders}
          />
        );

      case 'chat':
        return <Chat onSwitchTab={switchTab} />;

      case 'metricas':
        return <Metricas onSwitchTab={switchTab} machines={mockMachines} />;

      case 'planilla':
        return <Planilla onSwitchTab={switchTab} />;

      //
      // ===== ÁREAS GENÉRICAS =====
      //
      case 'planilla-dtf':
        return <GenericArea areaKey="DTF" onSwitchTab={switchTab} />;

      case 'planilla-bordado':
        return <GenericArea areaKey="Bordado" onSwitchTab={switchTab} />;

      //
      // ===== ÁREAS ESPECÍFICAS =====
      //
      case 'planilla-uv':
        return <ECOUVArea onSwitchTab={switchTab} />;

      case 'planilla-tpu-uv':
        return <TPUUVArea onSwitchTab={switchTab} />;

      case 'planilla-directa':
        return <Directa320Area onSwitchTab={switchTab} />;

      case 'planilla-estampado':
        return <EstampadoArea onSwitchTab={switchTab} />;

      case 'planilla-laser':
        return <LaserArea onSwitchTab={switchTab} />;

      case 'planilla-costura':
        return <CosturaArea onSwitchTab={switchTab} />;

      case 'planilla-terminacion':
        return <TerminacionUVArea onSwitchTab={switchTab} />;

      case 'planilla-coordinacion':
        return <CoordinacionArea onSwitchTab={switchTab} />;

      case 'planilla-deposito':
        return <DepositoArea onSwitchTab={switchTab} />;

      //
      // EXTRA
      //
      case 'servicio':
        return <ServicioTecnico onSwitchTab={switchTab} />;

      case 'infraestructura':
        return <Infraestructura onSwitchTab={switchTab} />;

      case 'despacho':
        return <Despacho onSwitchTab={switchTab} />;

      default:
        return <Dashboard onSwitchTab={switchTab} />;
    }
  };

  return (
    <AppProvider value={{ currentView, switchTab }}>
      <ProductionProvider>
        <div
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Navbar currentView={currentView} onSwitchTab={switchTab} />
          {renderCurrentView()}
        </div>
      </ProductionProvider>
    </AppProvider>
  );
}

export default App;

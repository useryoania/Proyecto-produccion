import React from 'react';
import { useApp } from '../contexts/AppContext';
import DTFArea from '../components/areas/DTFArea';
import SublimationArea from '../components/areas/SublimationArea';
import UVArea from '../components/areas/UVArea';
import BordadoArea from '../components/areas/BordadoArea';
import CoordinationArea from '../components/areas/CoordinationArea';
import './Production.css';

const Production = () => {
  const { currentView, currentArea } = useApp();

  // Solo renderiza si la vista actual es 'production'
  if (currentView !== 'production') return null;

  const renderArea = () => {
    switch (currentArea) {
      case 'DTF':
        return <DTFArea />;
      case 'SUB':
        return <SublimationArea />;
      case 'UV':
        return <UVArea />;
      case 'BORD':
        return <BordadoArea />;
      case 'COORD':
        return <CoordinationArea />;
      default:
        return (
          <div className="production-default">
            <h2>Selecciona un área de producción</h2>
            <p>Elige un área del menú lateral para comenzar</p>
          </div>
        );
    }
  };

  return (
    <div className="production-page">
      {renderArea()}
    </div>
  );
};

export default Production;
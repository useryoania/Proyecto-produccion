import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentArea, setCurrentArea] = useState(null);

  const switchTab = (view) => {
    setCurrentView(view);
  };

  const setCurrentAreaAndSwitch = (area) => {
    setCurrentArea(area);
    setCurrentView('production');
  };

  const value = {
    currentView,
    currentArea,
    switchTab,
    setCurrentArea: setCurrentAreaAndSwitch
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider');
  }
  return context;
};
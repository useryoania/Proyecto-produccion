import { useState, useCallback } from 'react';
import { AREA_CONFIGS } from '../utils/configs/areaConfigs.js';

export const useAreaManagement = (areaKey, extensions = []) => {
  const [modals, setModals] = useState([]);
  const [filters, setFilters] = useState({});
  const [views, setViews] = useState({ currentView: 'table' });

  const openModal = useCallback((modal) => setModals((prev) => [...prev, modal]), []);
  const closeModal = useCallback((id) => setModals((prev) => prev.filter((m) => m.id !== id)), []);
  const updateFilter = useCallback((key, value) => setFilters((prev) => ({ ...prev, [key]: value })), []);
  const switchView = useCallback((view) => setViews({ currentView: view }), []);

  return {
    modals,
    filters,
    views,
    openModal,
    closeModal,
    updateFilter,
    switchView,
  };
};

  
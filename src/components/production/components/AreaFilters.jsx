import React from 'react';
import styles from './AreaFilters.module.css';

const AreaFilters = ({ areaConfig, filters, onFilterChange }) => {
  const { filters: filterConfig } = areaConfig;
  
  const renderCommonFilter = (filterKey) => {
    const commonFilters = {
      status: {
        label: 'Estado',
        options: [
          { value: 'ALL', label: 'Todos los Estados' },
          { value: 'PENDING', label: 'Pendiente' },
          { value: 'IN_PROGRESS', label: 'En Progreso' },
          { value: 'COMPLETED', label: 'Completado' }
        ]
      },
      priority: {
        label: 'Prioridad',
        options: [
          { value: 'ALL', label: 'Todas' },
          { value: 'HIGH', label: 'Alta' },
          { value: 'NORMAL', label: 'Normal' },
          { value: 'LOW', label: 'Baja' }
        ]
      }
    };
    
    const config = commonFilters[filterKey];
    if (!config) return null;
    
    return (
      <select
        value={filters[filterKey] || 'ALL'}
        onChange={(e) => onFilterChange(filterKey, e.target.value)}
        className={styles.commonFilter}
      >
        {config.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };
  
  const renderUniqueFilter = (filterConfig) => {
    return (
      <select
        value={filters[filterConfig.key] || 'ALL'}
        onChange={(e) => onFilterChange(filterConfig.key, e.target.value)}
        className={styles.uniqueFilter}
        style={{ 
          backgroundColor: `var(--area-${areaConfig.theme}-light)`,
          borderColor: `var(--area-${areaConfig.theme}-border)`
        }}
      >
        {filterConfig.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className={styles.filtersContainer}>
      {/* Filtros Comunes */}
      <div className={styles.commonFilters}>
        {filterConfig.common.map(filterKey => 
          renderCommonFilter(filterKey)
        )}
      </div>
      
      {/* Filtros Únicos del Área */}
      <div className={styles.uniqueFilters}>
        {filterConfig.unique.map(filterConfig => 
          renderUniqueFilter(filterConfig)
        )}
      </div>
    </div>
  );
};

export default AreaFilters;
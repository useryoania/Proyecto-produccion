import React from 'react';
import styles from './AreaFilters.css';

const AreaFilters = ({ areaConfig, filters, onFilterChange }) => {

  console.log("🎛 [AreaFilters] CARGANDO FILTROS PARA:", areaConfig?.name);
  console.log("🎛 filterConfig recibido:", areaConfig?.filters);
  console.log("🎛 filters state:", filters);

  const { filters: filterConfig } = areaConfig;

  if (!filterConfig) {
    console.error("❌ [AreaFilters] FALTA filterConfig en areaConfig:", areaConfig);
    return <div>❌ Esta área no tiene filtros</div>;
  }

  console.log("🎛 Filtros comunes:", filterConfig.common);
  console.log("🎛 Filtros únicos:", filterConfig.unique);
  
  return (
    <div className={styles.filtersContainer}>
      <div className={styles.commonFilters}>
        {filterConfig.common.map(filterKey => {
          console.log("🧩 Render filtro común:", filterKey);
          return (
            <select
              key={filterKey}
              onChange={(e) => {
                console.log("🔄 Cambio filtro común:", filterKey, e.target.value);
                onFilterChange(filterKey, e.target.value);
              }}
            >
              <option value="ALL">Todos</option>
            </select>
          );
        })}
      </div>

      <div className={styles.uniqueFilters}>
        {filterConfig.unique.map(f => {
          console.log("🧩 Render filtro único:", f.key);
          return (
            <select
              key={f.key}
              onChange={(e) => {
                console.log("🔄 Cambio filtro único:", f.key, e.target.value);
                onFilterChange(f.key, e.target.value);
              }}
            >
              {f.options.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          );
        })}
      </div>
    </div>
  );
};

export default AreaFilters;

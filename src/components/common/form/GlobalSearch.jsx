import React from 'react';
import styles from './GlobalSearch.module.css';

const GlobalSearch = () => {
  const [searchTerm, setSearchTerm] = React.useState('');

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchCard}>
        <div className={styles.searchHeader}>
          <i className="fa-solid fa-magnifying-glass-location"></i>
          <label>Rastreo Global de Órdenes</label>
        </div>
        <div className={styles.searchInput}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input 
            type="text" 
            placeholder="Buscar por ID, Cliente o Trabajo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.input}
          />
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
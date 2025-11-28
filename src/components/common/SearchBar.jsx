import React, { useState, useEffect, useRef } from 'react';
import './SearchBar.css';

const SearchBar = ({ 
  placeholder = "Buscar...", 
  onSearch, 
  searchResults = [], 
  onResultSelect,
  disabled = false 
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length > 0);
    
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleResultClick = (result) => {
    setQuery('');
    setIsOpen(false);
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  const handleInputFocus = () => {
    if (query.length > 0) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
    if (e.key === 'Enter' && query.length > 0 && searchResults.length > 0) {
      handleResultClick(searchResults[0]);
    }
  };

  return (
    <div className="searchBarContainer" ref={searchRef}>
      <div className="searchBarInputContainer">
        <i className="fa-solid fa-magnifying-glass searchBarIcon"></i>
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="searchBarInput"
        />
        
        {/* Clear button */}
        {query.length > 0 && (
          <button 
            className="searchBarClearButton"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              if (onSearch) onSearch('');
            }}
          >
            <i className="fa-solid fa-times"></i>
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="searchBarResults">
          {searchResults.length > 0 ? (
            searchResults.map((result, index) => (
              <div
                key={result.id || index}
                className="searchBarResultItem"
                onClick={() => handleResultClick(result)}
              >
                <div className="searchBarResultContent">
                  <div className="searchBarResultMain">
                    {result.code && (
                      <span className="searchBarResultCode">#{result.code}</span>
                    )}
                    <span className="searchBarResultText">
                      {result.client || result.name || result.title}
                    </span>
                  </div>
                  {result.description && (
                    <div className="searchBarResultDescription">
                      {result.description}
                    </div>
                  )}
                </div>
                
                <div className="searchBarResultMeta">
                  {result.area && (
                    <span className="searchBarResultArea">{result.area}</span>
                  )}
                  {result.status && (
                    <span className={`searchBarResultStatus statusBadge statusBadge${result.status === 'Finalizado' ? 'Success' : 'Info'}`}>
                      {result.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : query.length > 0 ? (
            <div className="searchBarEmpty">
              <i className="fa-solid fa-search mb-2"></i>
              <p>No se encontraron resultados</p>
              <p className="searchBarEmptySubtext">Intenta con otros términos de búsqueda</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
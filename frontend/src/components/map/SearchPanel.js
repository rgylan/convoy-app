import React, { useState, useEffect, useRef } from 'react';
import CloseButton from '../common/CloseButton';
import './SearchPanel.css';

const SearchPanel = ({ isExpanded, onClose, onDestinationSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Focus input when panel expands
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      // Small delay to ensure the panel animation has started
      setTimeout(() => {
        inputRef.current.focus();
      }, 150);
    }
  }, [isExpanded]);

  // Clear search when panel closes
  useEffect(() => {
    if (!isExpanded) {
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
    }
  }, [isExpanded]);

  // Debounced search function
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query) => {
    setIsLoading(true);
    setError(null);

    try {
      // Using Nominatim API (OpenStreetMap) for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph&limit=5&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const results = await response.json();
      
      const formattedResults = results.map(result => ({
        id: result.place_id,
        name: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        type: result.type,
        importance: result.importance
      }));

      setSearchResults(formattedResults);
    } catch (err) {
      setError('Failed to search locations. Please try again.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (result) => {
    const location = {
      x: result.lng,
      y: result.lat,
      label: result.name,
      raw: result
    };

    onDestinationSelect(location);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
    // Enhanced keyboard navigation for search results
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // Focus management for result items
      const resultItems = document.querySelectorAll('.search-result-item');
      if (resultItems.length > 0) {
        const currentFocus = document.activeElement;
        const currentIndex = Array.from(resultItems).indexOf(currentFocus);

        if (e.key === 'ArrowDown') {
          const nextIndex = currentIndex < resultItems.length - 1 ? currentIndex + 1 : 0;
          resultItems[nextIndex].focus();
        } else if (e.key === 'ArrowUp') {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : resultItems.length - 1;
          resultItems[prevIndex].focus();
        }
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isExpanded && (
        <div
          className="search-panel-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`search-panel ${isExpanded ? 'expanded' : ''}`}
        role="dialog"
        aria-label="Search destination panel"
        aria-hidden={!isExpanded}
      >
        <div className="search-panel-header">
          <div className="search-panel-title">
            <span className="material-icons">search</span>
            <span>Search Destination</span>
          </div>
          <CloseButton
            onClick={onClose}
            ariaLabel="Close search panel"
          />
        </div>
        
        <div className="search-input-container">
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter destination address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="search-input"
            aria-label="Search for destination"
            aria-describedby="search-hint"
            autoComplete="off"
            spellCheck="false"
          />
          <span className="material-icons search-icon">search</span>
          {searchQuery && (
            <button
              className="clear-search-button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              type="button"
            >
              <span className="material-icons">clear</span>
            </button>
          )}
          {isLoading && (
            <div
              className="loading-spinner"
              aria-label="Searching for locations"
              role="status"
            >
              <span className="material-icons">refresh</span>
            </div>
          )}
        </div>

        {error && (
          <div
            className="search-error"
            role="alert"
            aria-live="polite"
          >
            <span className="material-icons">error</span>
            {error}
          </div>
        )}

        <div className="search-results">
          {searchResults.length > 0 && (
            <>
              <div className="results-header">
                <span>Search Results</span>
              </div>
              {searchResults.map((result, index) => (
                <div
                  key={result.id}
                  className="search-result-item"
                  onClick={() => handleResultClick(result)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleResultClick(result);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select destination: ${result.name}`}
                >
                  <span className="material-icons result-icon">place</span>
                  <div className="result-content">
                    <div className="result-name">{result.name}</div>
                    <div className="result-coords">
                      {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          
          {searchQuery.length >= 3 && searchResults.length === 0 && !isLoading && !error && (
            <div
              className="no-results"
              role="status"
              aria-live="polite"
            >
              <span className="material-icons">search_off</span>
              No locations found for "{searchQuery}"
            </div>
          )}

          {searchQuery.length < 3 && searchQuery.length > 0 && (
            <div
              className="search-hint"
              id="search-hint"
              role="status"
              aria-live="polite"
            >
              <span className="material-icons">info</span>
              Type at least 3 characters to search
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SearchPanel;

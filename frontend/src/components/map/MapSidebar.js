import React, { useState } from 'react';
import SearchPanel from './SearchPanel';
import StatusPanel from './StatusPanel';
import './MapSidebar.css';

const MapSidebar = ({
  onSearchClick,
  onShareClick,
  onStatusClick,
  onLeaveClick,
  onDestinationSelect,
  convoyHealth = 'healthy',
  // StatusPanel props
  members = [],
  destination = null,
  alerts = []
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isStatusExpanded, setIsStatusExpanded] = useState(false);

  const handleSearchClick = () => {
    setIsSearchExpanded(!isSearchExpanded);
    // Close status panel if open to avoid conflicts
    if (isStatusExpanded) {
      setIsStatusExpanded(false);
    }
    // Call the original onSearchClick if provided for backward compatibility
    if (onSearchClick) {
      onSearchClick();
    }
  };

  const handleSearchPanelClose = () => {
    setIsSearchExpanded(false);
  };

  const handleStatusClick = () => {
    setIsStatusExpanded(!isStatusExpanded);
    // Close search panel if open to avoid conflicts
    if (isSearchExpanded) {
      setIsSearchExpanded(false);
    }
    // Call the original onStatusClick if provided for backward compatibility
    if (onStatusClick) {
      onStatusClick();
    }
  };

  const handleStatusPanelClose = () => {
    setIsStatusExpanded(false);
  };

  const sidebarButtons = [
    {
      id: 'search',
      icon: 'search',
      title: 'Search Destination',
      onClick: handleSearchClick,
      hasIndicator: false,
      isActive: isSearchExpanded
    },
    {
      id: 'share',
      icon: 'share',
      title: 'Share Convoy',
      onClick: onShareClick,
      hasIndicator: false
    },
    {
      id: 'status',
      icon: 'dashboard',
      title: 'Convoy Status',
      onClick: handleStatusClick,
      hasIndicator: true,
      indicatorHealth: convoyHealth,
      isActive: isStatusExpanded
    },
    {
      id: 'leave',
      icon: 'exit_to_app',
      title: 'Leave Convoy',
      onClick: onLeaveClick,
      hasIndicator: false
    }
  ];

  const handleButtonClick = (button, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (button.onClick) {
      button.onClick();
    }
  };

  return (
    <>
      <div className={`map-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-content">
          {sidebarButtons.map((button) => (
            <button
              key={button.id}
              className={`sidebar-button ${button.id}-button ${button.isActive ? 'active' : ''}`}
              onClick={(e) => handleButtonClick(button, e)}
              title={button.title}
              aria-label={button.title}
            >
              <div className="button-content">
                <span className="material-icons button-icon">
                  {button.icon}
                </span>
                {button.hasIndicator && (
                  <div
                    className="status-indicator"
                    data-health={button.indicatorHealth}
                  />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Mobile toggle button */}
        <button
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="material-icons">
            {isCollapsed ? 'menu' : 'close'}
          </span>
        </button>
      </div>

      {/* Search Panel */}
      <SearchPanel
        isExpanded={isSearchExpanded}
        onClose={handleSearchPanelClose}
        onDestinationSelect={onDestinationSelect}
      />

      {/* Status Panel */}
      <StatusPanel
        isExpanded={isStatusExpanded}
        onClose={handleStatusPanelClose}
        members={members}
        destination={destination}
        alerts={alerts}
      />
    </>
  );
};

export default MapSidebar;

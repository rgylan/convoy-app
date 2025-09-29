import React, { useState } from 'react';
import { MemberStatusList } from './MemberStatusIndicator';
import './MemberStatusPanel.css';

const MemberStatusPanel = ({ 
  members = [], 
  destination = null, 
  position = "bottom-right",
  collapsible = true,
  showDetails = false 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Calculate member status summary
  const connectedCount = members.filter(m => m.status === 'connected').length;
  const inactiveCount = members.filter(m => m.status === 'inactive').length;
  const laggingCount = members.filter(m => m.status === 'lagging').length;
  const disconnectedCount = members.filter(m => m.status === 'disconnected').length;

  return (
    <div className={`member-status-panel member-status-panel--${position}`}>
      <div className="member-status-panel-header" onClick={toggleCollapse}>
        <div className="member-status-panel-title">
          <span className="member-status-panel-title-text">
            Members ({members.length})
          </span>
          <div className="member-status-panel-summary">
            {connectedCount > 0 && (
              <span className="member-status-summary-item member-status-summary-item--connected">
                {connectedCount}
              </span>
            )}
            {inactiveCount > 0 && (
              <span className="member-status-summary-item member-status-summary-item--inactive">
                {inactiveCount}
              </span>
            )}
            {laggingCount > 0 && (
              <span className="member-status-summary-item member-status-summary-item--lagging">
                {laggingCount}
              </span>
            )}
            {disconnectedCount > 0 && (
              <span className="member-status-summary-item member-status-summary-item--disconnected">
                {disconnectedCount}
              </span>
            )}
          </div>
        </div>
        {collapsible && (
          <button 
            className="member-status-panel-toggle"
            aria-label={isCollapsed ? "Expand member list" : "Collapse member list"}
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
        )}
      </div>
      
      {!isCollapsed && (
        <div className="member-status-panel-content">
          <MemberStatusList
            members={members}
            destination={destination}
            variant="card"
            showDetails={showDetails}
            className="member-status-compact"
          />
        </div>
      )}
    </div>
  );
};

export default MemberStatusPanel;

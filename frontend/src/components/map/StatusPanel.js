import React from 'react';
import './StatusPanel.css';

const StatusPanel = ({ 
  isExpanded, 
  onClose, 
  members = [],
  destination = null,
  alerts = []
}) => {
  // Calculate convoy health metrics (same logic as ConvoyStatusBar)
  const totalMembers = members.length;
  const connectedMembers = members.filter(member => member.status === 'connected').length;
  const inactiveMembers = members.filter(member => member.status === 'inactive').length;
  const laggingMembers = members.filter(member => member.status === 'lagging').length;
  const disconnectedMembers = members.filter(member => member.status === 'disconnected').length;
  
  // Calculate overall convoy health status
  const getConvoyHealthStatus = () => {
    if (totalMembers === 0) return 'empty';

    const disconnectedRatio = disconnectedMembers / totalMembers;
    const inactiveRatio = inactiveMembers / totalMembers;
    const laggingRatio = laggingMembers / totalMembers;

    // Critical: majority disconnected
    if (disconnectedRatio >= 0.5) return 'critical';

    // Warning: significant disconnections or majority lagging/inactive
    if (disconnectedRatio > 0.2 || laggingRatio >= 0.5 || inactiveRatio >= 0.5) return 'warning';

    // Caution: any issues present
    if (disconnectedMembers > 0 || laggingMembers > 0 || inactiveMembers > 0) return 'caution';

    return 'healthy';
  };

  const convoyHealth = getConvoyHealthStatus();
  
  // Get active critical alerts count
  const criticalAlerts = alerts.filter(alert => 
    alert.type === 'error' || 
    (alert.type === 'warning' && alert.message.includes('scattered'))
  ).length;

  // Get health status display info
  const getHealthStatusInfo = (status) => {
    switch (status) {
      case 'healthy':
        return { icon: 'check_circle', text: 'All Good', color: '#27ae60' };
      case 'caution':
        return { icon: 'warning', text: 'Minor Issues', color: '#f39c12' };
      case 'warning':
        return { icon: 'error', text: 'Attention Needed', color: '#e67e22' };
      case 'critical':
        return { icon: 'dangerous', text: 'Critical', color: '#e74c3c' };
      case 'empty':
        return { icon: 'group_off', text: 'No Members', color: '#95a5a6' };
      default:
        return { icon: 'help', text: 'Unknown', color: '#95a5a6' };
    }
  };

  const healthInfo = getHealthStatusInfo(convoyHealth);

  // Get connection status summary
  const getConnectionSummary = () => {
    if (totalMembers === 0) return 'No members';

    // Count members with active connections (connected + inactive)
    const activeConnections = connectedMembers + inactiveMembers;

    if (activeConnections === totalMembers) {
      if (connectedMembers === totalMembers) return 'All connected';
      return `${connectedMembers} active, ${inactiveMembers} inactive`;
    }

    return `${activeConnections}/${totalMembers} connected`;
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isExpanded && (
        <div 
          className="status-panel-backdrop" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      <div 
        className={`status-panel ${isExpanded ? 'expanded' : ''}`}
        role="dialog"
        aria-label="Convoy status panel"
        aria-hidden={!isExpanded}
      >
        <div className="status-panel-header">
          <div className="status-panel-title">
            <span className="material-icons">dashboard</span>
            <span>Convoy Status</span>
          </div>
          <div className="status-panel-header-actions">
            {criticalAlerts > 0 && (
              <span className="status-panel-alerts-badge">
                {criticalAlerts}
              </span>
            )}
            <button 
              className="status-panel-close" 
              onClick={onClose}
              aria-label="Close status panel"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        {/* Main Status Indicator */}
        <div className="status-panel-main">
          <div 
            className="status-panel-health"
            style={{ color: healthInfo.color }}
          >
            <span className="material-icons status-panel-icon">{healthInfo.icon}</span>
            <span className="status-panel-text">{healthInfo.text}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="status-panel-metrics">
          <div className="status-panel-metric">
            <span className="status-panel-metric-label">Members</span>
            <span className="status-panel-metric-value">{totalMembers}</span>
          </div>
          
          <div className="status-panel-metric">
            <span className="status-panel-metric-label">Connected</span>
            <span className="status-panel-metric-value status-panel-metric-value--connected">
              {connectedMembers}
            </span>
          </div>

          {inactiveMembers > 0 && (
            <div className="status-panel-metric">
              <span className="status-panel-metric-label">Inactive</span>
              <span className="status-panel-metric-value status-panel-metric-value--inactive">
                {inactiveMembers}
              </span>
            </div>
          )}

          {laggingMembers > 0 && (
            <div className="status-panel-metric">
              <span className="status-panel-metric-label">Lagging</span>
              <span className="status-panel-metric-value status-panel-metric-value--lagging">
                {laggingMembers}
              </span>
            </div>
          )}

          {disconnectedMembers > 0 && (
            <div className="status-panel-metric">
              <span className="status-panel-metric-label">Disconnected</span>
              <span className="status-panel-metric-value status-panel-metric-value--disconnected">
                {disconnectedMembers}
              </span>
            </div>
          )}
        </div>

        {/* Destination Status */}
        {destination && (
          <div className="status-panel-destination">
            <span className="material-icons status-panel-destination-icon">place</span>
            <span className="status-panel-destination-text">
              En route to {destination.name}
            </span>
          </div>
        )}

        {/* Connection Summary */}
        <div className="status-panel-summary">
          {getConnectionSummary()}
        </div>
      </div>
    </>
  );
};

export default StatusPanel;

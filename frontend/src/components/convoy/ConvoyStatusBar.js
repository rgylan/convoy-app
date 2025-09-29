import React from 'react';
import './ConvoyStatusBar.css';

const ConvoyStatusBar = ({
  members = [],
  destination = null,
  alerts = [],
  position = "top-left",
  onClose = null
}) => {
  // Calculate convoy health metrics
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
        return { icon: '✅', text: 'All Good', color: '#27ae60' };
      case 'caution':
        return { icon: '⚠️', text: 'Minor Issues', color: '#f39c12' };
      case 'warning':
        return { icon: '🟡', text: 'Attention Needed', color: '#e67e22' };
      case 'critical':
        return { icon: '🔴', text: 'Critical', color: '#e74c3c' };
      case 'empty':
        return { icon: '⭕', text: 'No Members', color: '#95a5a6' };
      default:
        return { icon: '❓', text: 'Unknown', color: '#95a5a6' };
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
    <div className={`convoy-status-bar convoy-status-bar--${position}`}>
      <div className="convoy-status-content">
        {/* Header */}
        <div className="convoy-status-header">
          <span className="convoy-status-title">Convoy Status</span>
          <div className="convoy-status-header-actions">
            {criticalAlerts > 0 && (
              <span className="convoy-status-alerts-badge">
                {criticalAlerts}
              </span>
            )}
            {onClose && (
              <button
                className="convoy-status-close-button"
                onClick={onClose}
                title="Close Status"
                aria-label="Close convoy status"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Main Status Indicator */}
        <div className="convoy-status-main">
          <div 
            className="convoy-status-health"
            style={{ color: healthInfo.color }}
          >
            <span className="convoy-status-icon">{healthInfo.icon}</span>
            <span className="convoy-status-text">{healthInfo.text}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="convoy-status-metrics">
          <div className="convoy-status-metric">
            <span className="convoy-status-metric-label">Members</span>
            <span className="convoy-status-metric-value">{totalMembers}</span>
          </div>
          
          <div className="convoy-status-metric">
            <span className="convoy-status-metric-label">Connected</span>
            <span className="convoy-status-metric-value convoy-status-metric-value--connected">
              {connectedMembers}
            </span>
          </div>

          {inactiveMembers > 0 && (
            <div className="convoy-status-metric">
              <span className="convoy-status-metric-label">Inactive</span>
              <span className="convoy-status-metric-value convoy-status-metric-value--inactive">
                {inactiveMembers}
              </span>
            </div>
          )}

          {laggingMembers > 0 && (
            <div className="convoy-status-metric">
              <span className="convoy-status-metric-label">Lagging</span>
              <span className="convoy-status-metric-value convoy-status-metric-value--lagging">
                {laggingMembers}
              </span>
            </div>
          )}

          {disconnectedMembers > 0 && (
            <div className="convoy-status-metric">
              <span className="convoy-status-metric-label">Disconnected</span>
              <span className="convoy-status-metric-value convoy-status-metric-value--disconnected">
                {disconnectedMembers}
              </span>
            </div>
          )}
        </div>

        {/* Destination Status */}
        {destination && (
          <div className="convoy-status-destination">
            <span className="convoy-status-destination-icon">📍</span>
            <span className="convoy-status-destination-text">
              En route to {destination.name}
            </span>
          </div>
        )}

        {/* Connection Summary */}
        <div className="convoy-status-summary">
          {getConnectionSummary()}
        </div>
      </div>
    </div>
  );
};

export default ConvoyStatusBar;

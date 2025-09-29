import React from 'react';
import './MemberStatusIndicator.css';

const MemberStatusIndicator = ({ 
  member, 
  destination = null, 
  variant = 'tooltip', // 'tooltip', 'badge', 'card'
  showDetails = false,
  className = ''
}) => {
  // Get status-specific styling and icons
  const getStatusInfo = (status) => {
    switch (status) {
      case 'connected':
        return {
          color: '#27ae60',
          backgroundColor: '#27ae60',
          icon: '🟢',
          text: 'Connected',
          description: 'Online and tracking'
        };
      case 'lagging':
        return {
          color: '#f39c12',
          backgroundColor: '#f39c12',
          icon: '⏰',
          text: 'Lagging',
          description: 'Falling behind convoy'
        };
      case 'inactive':
        return {
          color: '#9b59b6',
          backgroundColor: '#9b59b6',
          icon: '⏸️',
          text: 'Inactive',
          description: 'Connected but not tracking location'
        };
      case 'disconnected':
        return {
          color: '#e74c3c',
          backgroundColor: '#e74c3c',
          icon: '⚠️',
          text: 'Disconnected',
          description: 'Connection lost'
        };
      default:
        return {
          color: '#95a5a6',
          backgroundColor: '#95a5a6',
          icon: '❓',
          text: 'Unknown',
          description: 'Status unknown'
        };
    }
  };

  const statusInfo = getStatusInfo(member.status);

  // Visual-only tooltip variant (for permanent status display)
  if (variant === 'visual-only-tooltip') {
    // Determine if this is the leader (current user) - for display name only
    const isLeader = member.name === 'You';
    const displayName = isLeader ? 'You' : member.name;

    return (
      <div
        className={`member-status-visual-tooltip ${className}`}
        style={{ backgroundColor: statusInfo.backgroundColor }}
        data-status={member.status}
      >
        <span className="member-visual-status-icon">{statusInfo.icon}</span>
        <span className="member-visual-name">{displayName}</span>
      </div>
    );
  }

  // Enhanced tooltip variant (for improved map marker tooltips)
  if (variant === 'enhanced-tooltip') {
    return (
      <div
        className={`member-status-enhanced-tooltip ${className}`}
        data-status={member.status}
      >
        <div className="member-tooltip-header">
          <div
            className="member-tooltip-status-indicator"
            style={{ backgroundColor: statusInfo.backgroundColor }}
          >
            <span className="member-tooltip-status-icon">{statusInfo.icon}</span>
          </div>
          <div className="member-tooltip-info">
            <div className="member-tooltip-name">{member.name}</div>
            {member.status !== 'connected' && (
              <div
                className="member-tooltip-status"
                style={{ color: statusInfo.color }}
              >
                {statusInfo.text}
              </div>
            )}
          </div>
        </div>
        {member.status !== 'connected' && (
          <div className="member-tooltip-description">
            {statusInfo.description}
          </div>
        )}
      </div>
    );
  }

  // Tooltip variant (for map markers - legacy)
  if (variant === 'tooltip') {
    return (
      <div
        className={`member-status-tooltip ${className}`}
        style={{
          backgroundColor: statusInfo.backgroundColor,
          color: 'white'
        }}
      >
        <span className="member-status-name">{member.name}</span>
        {member.status !== 'connected' && (
          <span className="member-status-icon">
            {statusInfo.icon}
          </span>
        )}
      </div>
    );
  }

  // Badge variant (compact status indicator)
  if (variant === 'badge') {
    return (
      <div className={`member-status-badge ${className}`}>
        <div 
          className="member-status-indicator"
          style={{ backgroundColor: statusInfo.color }}
          title={`${member.name} - ${statusInfo.text}`}
        >
          <span className="member-status-badge-icon">{statusInfo.icon}</span>
        </div>
        <span className="member-status-badge-name">{member.name}</span>
      </div>
    );
  }

  // Card variant (detailed status card)
  if (variant === 'card') {
    return (
      <div className={`member-status-card ${className}`}>
        <div className="member-status-card-header">
          <div 
            className="member-status-card-indicator"
            style={{ backgroundColor: statusInfo.color }}
          >
            <span className="member-status-card-icon">{statusInfo.icon}</span>
          </div>
          <div className="member-status-card-info">
            <div className="member-status-card-name">{member.name}</div>
            <div 
              className="member-status-card-status"
              style={{ color: statusInfo.color }}
            >
              {statusInfo.text}
            </div>
          </div>
        </div>
        
        {showDetails && (
          <div className="member-status-card-details">
            <div className="member-status-card-detail">
              <span className="member-status-card-label">Status:</span>
              <span className="member-status-card-value">{statusInfo.description}</span>
            </div>
            <div className="member-status-card-detail">
              <span className="member-status-card-label">Location:</span>
              <span className="member-status-card-value">
                {member.location[0].toFixed(4)}, {member.location[1].toFixed(4)}
              </span>
            </div>
            {destination && (
              <div className="member-status-card-detail">
                <span className="member-status-card-label">Destination:</span>
                <span className="member-status-card-value">{destination.name}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default fallback
  return (
    <div className={`member-status-default ${className}`}>
      <span style={{ color: statusInfo.color }}>
        {statusInfo.icon} {member.name} - {statusInfo.text}
      </span>
    </div>
  );
};

// Helper component for member status list
export const MemberStatusList = ({ 
  members = [], 
  destination = null, 
  variant = 'card',
  showDetails = false,
  className = ''
}) => {
  return (
    <div className={`member-status-list ${className}`}>
      {members.map(member => (
        <MemberStatusIndicator
          key={member.id}
          member={member}
          destination={destination}
          variant={variant}
          showDetails={showDetails}
          className="member-status-list-item"
        />
      ))}
    </div>
  );
};

export default MemberStatusIndicator;

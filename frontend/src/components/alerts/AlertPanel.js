import React, { useState, useEffect } from 'react';
import './AlertPanel.css';

const AlertPanel = ({ 
  alerts = [], 
  onDismiss, 
  position = "top-right",
  autoCloseDelay = 5000 
}) => {
  const [visibleAlerts, setVisibleAlerts] = useState([]);

  useEffect(() => {
    // Update visible alerts when props change
    setVisibleAlerts(alerts);

    // Set up auto-dismiss timers for new alerts
    alerts.forEach(alert => {
      if (alert.dismissible !== false && autoCloseDelay > 0) {
        setTimeout(() => {
          handleDismiss(alert.id);
        }, autoCloseDelay);
      }
    });
  }, [alerts, autoCloseDelay]);

  const handleDismiss = (alertId) => {
    // Remove from visible alerts with animation
    setVisibleAlerts(prev => prev.filter(alert => alert.id !== alertId));
    
    // Notify parent component
    if (onDismiss) {
      onDismiss(alertId);
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error':
        return '⚠️';
      case 'warning':
        return '⚡';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className={`alert-panel alert-panel--${position}`}>
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`alert-item alert-item--${alert.type}`}
        >
          <div className="alert-content">
            <div className="alert-header">
              <span className="alert-icon">
                {getAlertIcon(alert.type)}
              </span>
              <span className="alert-timestamp">
                {formatTimestamp(alert.timestamp)}
              </span>
              {alert.dismissible !== false && (
                <button
                  className="alert-close"
                  onClick={() => handleDismiss(alert.id)}
                  aria-label="Dismiss alert"
                >
                  ×
                </button>
              )}
            </div>
            <div className="alert-message">
              {alert.message}
            </div>
            {alert.details && (
              <div className="alert-details">
                {alert.details}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertPanel;
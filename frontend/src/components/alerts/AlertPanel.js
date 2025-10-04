import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AlertPanel.css';

const AlertPanel = ({
  alerts = [],
  onDismiss,
  position = "top-right",
  autoCloseDelay = 10000
}) => {
  const [alertQueue, setAlertQueue] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoCloseTimerRef = useRef(null);
  const processedAlertsRef = useRef(new Set());

  // Process new alerts and add them to the queue
  useEffect(() => {
    const newAlerts = alerts.filter(alert => !processedAlertsRef.current.has(alert.id));

    if (newAlerts.length > 0) {
      // Mark alerts as processed
      newAlerts.forEach(alert => processedAlertsRef.current.add(alert.id));

      // Add new alerts to the queue
      setAlertQueue(prev => [...prev, ...newAlerts]);
    }
  }, [alerts]);

  // Show next alert from queue
  const showNextAlert = useCallback(() => {
    if (isTransitioning) return;

    setAlertQueue(prev => {
      if (prev.length === 0) {
        setCurrentAlert(null);
        return prev;
      }

      const [nextAlert, ...remainingQueue] = prev;
      setCurrentAlert(nextAlert);
      return remainingQueue;
    });
  }, [isTransitioning]);

  // Handle alert dismissal
  const handleDismiss = useCallback((alertId) => {
    // Clear auto-close timer
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    // Set transitioning state to prevent multiple dismissals
    setIsTransitioning(true);

    // Notify parent component
    if (onDismiss) {
      onDismiss(alertId);
    }

    // Clear current alert and show next after a brief delay for animation
    setTimeout(() => {
      setCurrentAlert(null);
      setIsTransitioning(false);
      showNextAlert();
    }, 100);
  }, [onDismiss, showNextAlert]);

  // Auto-dismiss timer effect
  useEffect(() => {
    if (currentAlert && currentAlert.dismissible !== false && autoCloseDelay > 0) {
      autoCloseTimerRef.current = setTimeout(() => {
        handleDismiss(currentAlert.id);
      }, autoCloseDelay);
    }

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [currentAlert, autoCloseDelay, handleDismiss]);

  // Show next alert when current alert is cleared and queue is not empty
  useEffect(() => {
    if (!currentAlert && alertQueue.length > 0 && !isTransitioning) {
      showNextAlert();
    }
  }, [currentAlert, alertQueue.length, isTransitioning, showNextAlert]);

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#dc3545"/>
            <path d="M15 9l-6 6m0-6l6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22h20L12 2z" fill="#fd7e14"/>
            <path d="M12 8v4m0 4h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'info':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#0d6efd"/>
            <path d="M12 16v-4m0-4h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#198754"/>
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#0d6efd"/>
            <path d="M12 16v-4m0-4h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Don't render anything if no current alert
  if (!currentAlert) {
    return null;
  }

  return (
    <div className={`alert-panel alert-panel--${position}`}>
      <div
        key={currentAlert.id}
        className={`alert-item alert-item--${currentAlert.type}`}
      >
        {/* Floating close button in top-right corner */}
        {currentAlert.dismissible !== false && (
          <button
            className="standard-close-button alert-close--floating"
            onClick={() => handleDismiss(currentAlert.id)}
            aria-label="Dismiss alert"
          >
            <span className="material-icons">close</span>
          </button>
        )}

        {/* Top bar with timestamp only */}
        <div className="alert-top-bar">
          <span className="alert-timestamp">
            {formatTimestamp(currentAlert.timestamp)}
          </span>
        </div>

        {/* Main content area with icon and text */}
        <div className="alert-main-content">
          <div className="alert-icon-container">
            <span className="alert-icon">
              {getAlertIcon(currentAlert.type)}
            </span>
          </div>
          <div className="alert-text-content">
            <div className="alert-message">
              {currentAlert.message}
            </div>
            {currentAlert.details && (
              <div className="alert-details">
                {currentAlert.details}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optional: Queue indicator for debugging/development */}
      {process.env.NODE_ENV === 'development' && alertQueue.length > 0 && (
        <div className="alert-queue-indicator">
          +{alertQueue.length} more
        </div>
      )}
    </div>
  );
};

export default AlertPanel;
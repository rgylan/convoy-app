import React, { useState, useEffect } from 'react';
import AlertPanel from './AlertPanel';

const AlertPanelDemo = () => {
  const [alerts, setAlerts] = useState([]);
  const [alertCounter, setAlertCounter] = useState(1);

  // Sample alert data for testing different scenarios
  const sampleAlerts = [
    {
      type: 'error',
      message: 'Connection Error',
      details: 'Unable to connect to the server. Please check your internet connection.',
    },
    {
      type: 'warning',
      message: 'Low Battery Warning',
      details: 'Device battery is running low. Please charge your device.',
    },
    {
      type: 'success',
      message: 'Operation Successful',
      details: 'Your changes have been saved successfully.',
    },
    {
      type: 'info',
      message: 'System Update Available',
      details: 'A new system update is available for download. Click here to learn more.',
    },
    {
      type: 'error',
      message: 'This is a very long alert message that should wrap properly across multiple lines to test layout',
      details: 'This is also a very long details section that contains additional information about the alert and should also wrap properly to demonstrate how the layout handles longer content gracefully without breaking the design.',
    },
  ];

  const addAlert = (alertData) => {
    const newAlert = {
      id: `alert-${alertCounter}`,
      timestamp: new Date().toISOString(),
      dismissible: true,
      ...alertData,
    };
    
    setAlerts(prev => [...prev, newAlert]);
    setAlertCounter(prev => prev + 1);
  };

  const handleDismiss = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const addRandomAlert = () => {
    const randomAlert = sampleAlerts[Math.floor(Math.random() * sampleAlerts.length)];
    addAlert(randomAlert);
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  // Auto-add alerts for demo purposes
  useEffect(() => {
    const interval = setInterval(() => {
      if (alerts.length < 3) {
        addRandomAlert();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [alerts.length]);

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      background: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        background: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ marginBottom: '20px', color: '#333' }}>
          Alert Panel Layout Demo
        </h1>
        
        <p style={{ marginBottom: '30px', color: '#666', lineHeight: '1.5' }}>
          This demo showcases the enhanced alert panel layout with modern circular design:
          <br />• Circular close button (50% border-radius) for contemporary appearance
          <br />• Floating close button in top-right corner for vertical space savings
          <br />• Top bar containing only timestamp (no longer contains close button)
          <br />• Main content area with icon on the left and text content on the right
          <br />• Responsive design across all device sizes
          <br />• WCAG AA accessibility compliance maintained
        </p>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '15px', color: '#333' }}>Controls</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={addRandomAlert}
              style={{
                padding: '8px 16px',
                background: '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Add Random Alert
            </button>
            
            <button 
              onClick={() => addAlert(sampleAlerts[0])}
              style={{
                padding: '8px 16px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Add Error Alert
            </button>
            
            <button 
              onClick={() => addAlert(sampleAlerts[1])}
              style={{
                padding: '8px 16px',
                background: '#fd7e14',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Add Warning Alert
            </button>
            
            <button 
              onClick={() => addAlert(sampleAlerts[2])}
              style={{
                padding: '8px 16px',
                background: '#198754',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Add Success Alert
            </button>
            
            <button 
              onClick={() => addAlert(sampleAlerts[4])}
              style={{
                padding: '8px 16px',
                background: '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Add Long Content Alert
            </button>
            
            <button 
              onClick={clearAllAlerts}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Clear All
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '15px', color: '#333' }}>Current Alerts</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Active alerts: {alerts.length} | 
            Alerts will appear in the top-right corner and auto-dismiss after 5 seconds
          </p>
        </div>

        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginBottom: '10px', color: '#333' }}>Layout Features</h3>
          <ul style={{ color: '#666', lineHeight: '1.6', paddingLeft: '20px' }}>
            <li>✅ Circular close button (50% border-radius) for modern appearance</li>
            <li>✅ Floating close button in top-right corner (space-efficient)</li>
            <li>✅ Top bar contains only timestamp (reduced vertical height)</li>
            <li>✅ Icon positioned on the left side of main content</li>
            <li>✅ Text content (message + details) on the right side</li>
            <li>✅ Responsive design for mobile (320px+), tablet (768px+), and desktop (1025px+)</li>
            <li>✅ WCAG AA compliant font sizes and line heights</li>
            <li>✅ Preserved all original visual design elements</li>
            <li>✅ Keyboard navigation support with focus indicators</li>
            <li>✅ Improved vertical space efficiency</li>
          </ul>
        </div>
      </div>

      {/* Alert Panel Component */}
      <AlertPanel
        alerts={alerts}
        onDismiss={handleDismiss}
        position="top-right"
        autoCloseDelay={5000}
      />
    </div>
  );
};

export default AlertPanelDemo;

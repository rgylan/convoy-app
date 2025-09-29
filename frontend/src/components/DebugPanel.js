import React, { useState, useEffect } from 'react';
import { toggleVConsole, mobileLog } from '../utils/vconsole';
import { API_BASE_URL, WS_BASE_URL } from '../config/api';
import geolocationDebugger from '../utils/geolocationDebugger';

/**
 * Debug Panel Component for Convoy App
 * Provides easy access to debugging tools and information
 * Only visible in development mode
 *
 * HIDDEN BY DEFAULT to save screen real estate
 * Enable by clicking the 🐛 button or localStorage.setItem('debug-panel-enabled', 'true')
 */
const DebugPanel = () => {
  // Check localStorage for debug panel preference (hidden by default)
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem('debug-panel-enabled') === 'true';
  });
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Collect debug information
    const info = {
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      online: navigator.onLine,
      geolocationSupported: 'geolocation' in navigator,
      touchSupported: 'ontouchstart' in window,
      orientation: window.screen.orientation?.type || 'unknown'
    };
    setDebugInfo(info);
  }, []);

  // Don't render in production
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleToggleVConsole = () => {
    toggleVConsole();
    mobileLog.info('VConsole toggled by user');
  };

  const handleTestError = () => {
    mobileLog.error('Test error triggered by user');
    throw new Error('This is a test error for debugging purposes');
  };

  const handleTestLog = () => {
    mobileLog.info('Test log message', { timestamp: new Date().toISOString() });
    mobileLog.warn('Test warning message');
    mobileLog.debug('Test debug message with data', debugInfo);
  };

  const handleTestNetworkError = () => {
    fetch('/api/test-endpoint-that-does-not-exist')
      .then(response => {
        mobileLog.network('/api/test-endpoint-that-does-not-exist', 'GET', response.status);
      })
      .catch(error => {
        mobileLog.error('Network test error:', error);
      });
  };

  const handleTestApiConnection = () => {
    mobileLog.info('Testing API connection...', {
      apiBaseUrl: API_BASE_URL,
      wsBaseUrl: WS_BASE_URL,
      hostname: window.location.hostname
    });

    fetch(`${API_BASE_URL}/health`)
      .then(response => {
        mobileLog.network(`${API_BASE_URL}/health`, 'GET', response.status);
        return response.json();
      })
      .then(data => {
        mobileLog.info('API health check successful:', data);
      })
      .catch(error => {
        mobileLog.error('API health check failed:', error);
      });
  };

  const handleTestGeolocation = async () => {
    mobileLog.info('Testing geolocation...');
    try {
      const result = await geolocationDebugger.testGeolocation();
      mobileLog.info('Geolocation test successful:', result);
    } catch (error) {
      mobileLog.error('Geolocation test failed:', error);
    }
  };

  const handleGeolocationDiagnostic = async () => {
    mobileLog.info('Running comprehensive geolocation diagnostic...');
    try {
      const diagnostic = await geolocationDebugger.runGeolocationDiagnostic();
      mobileLog.info('Geolocation diagnostic complete:', diagnostic);
    } catch (error) {
      mobileLog.error('Geolocation diagnostic failed:', error);
    }
  };

  const handleRequestLocationPermission = async () => {
    mobileLog.info('Requesting location permission...');
    try {
      await geolocationDebugger.requestLocationPermission();
      mobileLog.info('Location permission granted successfully');
    } catch (error) {
      mobileLog.error('Location permission request failed:', error);
    }
  };

  const handleForcePermissionRequest = async () => {
    mobileLog.info('Forcing fresh permission request (no cache)...');
    try {
      const position = await geolocationDebugger.forcePermissionRequest();
      mobileLog.info('Fresh permission request successful:', position);
    } catch (error) {
      mobileLog.error('Fresh permission request failed:', error);
    }
  };

  const handleAnalyzePermissions = async () => {
    mobileLog.info('Analyzing permission state...');
    try {
      const analysis = await geolocationDebugger.analyzePermissionState();
      mobileLog.info('Permission analysis complete:', analysis);
    } catch (error) {
      mobileLog.error('Permission analysis failed:', error);
    }
  };

  const debugPanelStyle = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    width: '300px',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: 'white',
    padding: '15px',
    borderRadius: '8px',
    fontSize: '12px',
    zIndex: 9999,
    fontFamily: 'monospace',
    border: '1px solid #333',
    display: isVisible ? 'block' : 'none',
    transition: 'opacity 0.3s ease',
    opacity: isVisible ? 1 : 0
  };

  const buttonStyle = {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    margin: '2px',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer'
  };

  const toggleButtonStyle = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    backgroundColor: isVisible ? '#dc3545' : '#6c757d',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '50%',
    fontSize: '14px',
    cursor: 'pointer',
    zIndex: 10000,
    width: '40px',
    height: '40px',
    opacity: isVisible ? 1 : 0.5,
    transition: 'all 0.3s ease'
  };

  const handleTogglePanel = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    localStorage.setItem('debug-panel-enabled', newVisibility.toString());

    if (newVisibility) {
      mobileLog.info('🐛 Debug Panel ENABLED');
    } else {
      mobileLog.info('🐛 Debug Panel HIDDEN - Screen real estate restored');
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        style={toggleButtonStyle}
        onClick={handleTogglePanel}
        title={isVisible ? "Hide Debug Panel" : "Show Debug Panel"}
      >
        🐛
      </button>

      {/* Debug panel */}
      <div style={debugPanelStyle}>
        <h4 style={{ margin: '0 0 10px 0', color: '#ffc107' }}>🚛 Convoy Debug Panel</h4>
        
        <div style={{ marginBottom: '10px' }}>
          <strong>Device Info:</strong><br />
          Screen: {debugInfo.screenSize}<br />
          Viewport: {debugInfo.viewportSize}<br />
          DPR: {debugInfo.devicePixelRatio}<br />
          Online: {debugInfo.online ? '✅' : '❌'}<br />
          Touch: {debugInfo.touchSupported ? '✅' : '❌'}<br />
          GPS: {debugInfo.geolocationSupported ? '✅' : '❌'}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>API Config:</strong><br />
          Host: {window.location.hostname}<br />
          API: {API_BASE_URL}<br />
          WS: {WS_BASE_URL}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Debug Actions:</strong><br />
          <button style={buttonStyle} onClick={handleToggleVConsole}>
            Toggle VConsole
          </button>
          <button style={buttonStyle} onClick={handleTestLog}>
            Test Logs
          </button>
          <button style={buttonStyle} onClick={handleTestError}>
            Test Error
          </button>
          <button style={buttonStyle} onClick={handleTestNetworkError}>
            Test Network
          </button>
          <button style={buttonStyle} onClick={handleTestApiConnection}>
            Test API
          </button>
          <button style={buttonStyle} onClick={handleTestGeolocation}>
            Test GPS
          </button>
          <button style={buttonStyle} onClick={handleRequestLocationPermission}>
            Request GPS
          </button>
          <button style={buttonStyle} onClick={handleForcePermissionRequest}>
            Force GPS
          </button>
          <button style={buttonStyle} onClick={handleAnalyzePermissions}>
            Analyze GPS
          </button>
          <button style={buttonStyle} onClick={handleGeolocationDiagnostic}>
            GPS Diagnostic
          </button>
        </div>

        <div style={{ fontSize: '10px', color: '#ccc' }}>
          <strong>Tips:</strong><br />
          • VConsole disabled by default (click Toggle VConsole)<br />
          • Use mobileLog for enhanced logging<br />
          • Check Network tab for API calls<br />
          • Panel hidden by default to save screen space
        </div>
      </div>
    </>
  );
};

export default DebugPanel;

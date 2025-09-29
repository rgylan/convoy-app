/**
 * Geolocation Debugger for Mobile Web Apps
 * Provides comprehensive debugging tools for geolocation issues on mobile devices
 */

import { mobileLog } from './vconsole';

/**
 * Check geolocation support and permissions
 */
export const checkGeolocationSupport = async () => {
  const results = {
    isSupported: false,
    permissions: 'unknown',
    userAgent: navigator.userAgent,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /Android/.test(navigator.userAgent),
    isMobile: /Mobi|Android/i.test(navigator.userAgent),
    timestamp: new Date().toISOString()
  };

  // Check basic geolocation support
  results.isSupported = 'geolocation' in navigator;
  
  if (!results.isSupported) {
    mobileLog.error('Geolocation not supported', results);
    return results;
  }

  // Check permissions API support (modern browsers)
  if ('permissions' in navigator) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      results.permissions = permission.state;
      results.permissionAPI = true;
      
      mobileLog.info('Geolocation permission status:', {
        state: permission.state,
        supported: true
      });
    } catch (error) {
      results.permissionAPI = false;
      mobileLog.warn('Permissions API not supported or failed:', error.message);
    }
  } else {
    results.permissionAPI = false;
    mobileLog.warn('Permissions API not supported');
  }

  mobileLog.info('Geolocation support check:', results);
  return results;
};

/**
 * Test geolocation with comprehensive error handling
 */
export const testGeolocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 30000, // 30 seconds for iOS
      maximumAge: 60000 // 1 minute cache
    };
    
    const geoOptions = { ...defaultOptions, ...options };
    
    mobileLog.info('Testing geolocation with options:', geoOptions);
    
    const startTime = Date.now();
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const result = {
          success: true,
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          },
          duration,
          options: geoOptions
        };
        
        mobileLog.info('Geolocation test successful:', result);
        resolve(result);
      },
      (error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const result = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            name: getErrorName(error.code)
          },
          duration,
          options: geoOptions
        };
        
        mobileLog.error('Geolocation test failed:', result);
        reject(result);
      },
      geoOptions
    );
  });
};

/**
 * Get human-readable error name
 */
const getErrorName = (code) => {
  switch (code) {
    case 1: return 'PERMISSION_DENIED';
    case 2: return 'POSITION_UNAVAILABLE';
    case 3: return 'TIMEOUT';
    default: return 'UNKNOWN_ERROR';
  }
};

/**
 * iOS-specific geolocation troubleshooting
 */
export const iosGeolocationTroubleshoot = async () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (!isIOS) {
    mobileLog.info('Not an iOS device, skipping iOS-specific troubleshooting');
    return { isIOS: false };
  }
  
  mobileLog.info('Running iOS geolocation troubleshooting...');
  
  const results = {
    isIOS: true,
    userAgent: navigator.userAgent,
    isStandalone: window.navigator.standalone,
    isInWebView: window.navigator.standalone === false,
    protocol: window.location.protocol,
    isSecure: window.location.protocol === 'https:',
    timestamp: new Date().toISOString()
  };
  
  // Check if running in standalone mode (PWA)
  if (results.isStandalone) {
    mobileLog.warn('Running in standalone mode (PWA) - geolocation may have different behavior');
  }
  
  // Check protocol (HTTPS required for some features)
  if (!results.isSecure && window.location.hostname !== 'localhost') {
    mobileLog.warn('Not running on HTTPS - some geolocation features may be restricted');
  }
  
  // Test with different timeout values
  const timeoutTests = [5000, 15000, 30000];
  results.timeoutTests = [];
  
  for (const timeout of timeoutTests) {
    try {
      mobileLog.info(`Testing with ${timeout}ms timeout...`);
      const result = await testGeolocation({ timeout });
      results.timeoutTests.push({ timeout, success: true, duration: result.duration });
      mobileLog.info(`✅ Success with ${timeout}ms timeout`);
      break; // Stop on first success
    } catch (error) {
      results.timeoutTests.push({ timeout, success: false, error: error.error });
      mobileLog.warn(`❌ Failed with ${timeout}ms timeout:`, error.error);
    }
  }
  
  mobileLog.info('iOS troubleshooting complete:', results);
  return results;
};

/**
 * Comprehensive geolocation diagnostic
 */
export const runGeolocationDiagnostic = async () => {
  mobileLog.info('🔍 Starting comprehensive geolocation diagnostic...');
  
  const diagnostic = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  try {
    // Step 1: Check support and permissions
    mobileLog.info('Step 1: Checking geolocation support...');
    diagnostic.support = await checkGeolocationSupport();
    
    // Step 2: Test basic geolocation
    mobileLog.info('Step 2: Testing basic geolocation...');
    try {
      diagnostic.basicTest = await testGeolocation();
    } catch (error) {
      diagnostic.basicTest = error;
    }
    
    // Step 3: iOS-specific troubleshooting
    mobileLog.info('Step 3: iOS-specific troubleshooting...');
    diagnostic.iosTroubleshooting = await iosGeolocationTroubleshoot();
    
    // Step 4: Test with different options
    mobileLog.info('Step 4: Testing with different options...');
    const optionTests = [
      { enableHighAccuracy: false, timeout: 10000 },
      { enableHighAccuracy: true, timeout: 10000 },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 300000 }
    ];
    
    diagnostic.optionTests = [];
    for (const options of optionTests) {
      try {
        const result = await testGeolocation(options);
        diagnostic.optionTests.push({ options, success: true, result });
      } catch (error) {
        diagnostic.optionTests.push({ options, success: false, error });
      }
    }
    
  } catch (error) {
    diagnostic.error = error;
    mobileLog.error('Diagnostic failed:', error);
  }
  
  mobileLog.info('🏁 Geolocation diagnostic complete:', diagnostic);
  return diagnostic;
};

/**
 * Quick permission check for UI
 */
export const quickPermissionCheck = async () => {
  if (!('geolocation' in navigator)) {
    return { supported: false, permission: 'not-supported' };
  }

  if ('permissions' in navigator) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return { supported: true, permission: permission.state };
    } catch (error) {
      return { supported: true, permission: 'unknown' };
    }
  }

  return { supported: true, permission: 'unknown' };
};

/**
 * Detailed permission state analysis
 */
export const analyzePermissionState = async () => {
  mobileLog.info('🔍 Analyzing permission state...');

  const analysis = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    url: window.location.href,
    protocol: window.location.protocol
  };

  // Check basic support
  analysis.geolocationSupported = 'geolocation' in navigator;

  if (!analysis.geolocationSupported) {
    mobileLog.error('❌ Geolocation not supported');
    return analysis;
  }

  // Check Permissions API support
  analysis.permissionsAPISupported = 'permissions' in navigator;

  if (analysis.permissionsAPISupported) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      analysis.permissionState = permission.state;
      analysis.permissionStateSource = 'permissions-api';
    } catch (error) {
      analysis.permissionState = 'unknown';
      analysis.permissionStateSource = 'permissions-api-failed';
      analysis.permissionError = error.message;
    }
  } else {
    analysis.permissionState = 'unknown';
    analysis.permissionStateSource = 'permissions-api-not-supported';
  }

  // Test actual geolocation call to determine real state
  mobileLog.info('Testing actual geolocation call...');

  try {
    const testResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Test timeout'));
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout);
          resolve({
            success: true,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          clearTimeout(timeout);
          resolve({
            success: false,
            code: error.code,
            message: error.message,
            name: getErrorName(error.code)
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 0 // No cache
        }
      );
    });

    analysis.actualTest = testResult;

    if (testResult.success) {
      analysis.realPermissionState = 'granted';
      mobileLog.info('✅ Actual permission state: GRANTED');
    } else if (testResult.code === 1) {
      analysis.realPermissionState = 'denied';
      mobileLog.warn('❌ Actual permission state: DENIED');
    } else {
      analysis.realPermissionState = 'error';
      mobileLog.warn('⚠️ Actual permission state: ERROR', testResult);
    }

  } catch (error) {
    analysis.actualTest = { success: false, error: error.message };
    analysis.realPermissionState = 'test-failed';
    mobileLog.error('❌ Permission test failed:', error);
  }

  // Provide recommendations
  if (analysis.realPermissionState === 'denied') {
    analysis.recommendation = 'CLEAR_BROWSER_DATA';
    analysis.recommendationText = 'Permission cached as denied. Clear Chrome site data or use "Force GPS" button.';
  } else if (analysis.realPermissionState === 'granted') {
    analysis.recommendation = 'PERMISSION_OK';
    analysis.recommendationText = 'Permission is working correctly.';
  } else {
    analysis.recommendation = 'CHECK_SETTINGS';
    analysis.recommendationText = 'Check iOS Location Services and Chrome settings.';
  }

  mobileLog.info('🔍 Permission analysis complete:', analysis);
  return analysis;
};

/**
 * Request permission with user-friendly prompts
 */
export const requestLocationPermission = async () => {
  mobileLog.info('Requesting location permission...');

  const support = await checkGeolocationSupport();

  if (!support.isSupported) {
    throw new Error('Geolocation is not supported by this browser');
  }

  // For iOS, we need to actually call getCurrentPosition to trigger permission
  return new Promise((resolve, reject) => {
    const options = {
      enableHighAccuracy: false, // Start with low accuracy for faster response
      timeout: 15000,
      maximumAge: 0 // Force fresh permission request, no cache
    };

    mobileLog.info('Requesting permission with options:', options);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        mobileLog.info('Location permission granted:', {
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        resolve(true);
      },
      (error) => {
        mobileLog.error('Location permission denied or failed:', {
          code: error.code,
          message: error.message,
          name: getErrorName(error.code)
        });
        reject(error);
      },
      options
    );
  });
};

/**
 * Force fresh permission request (no cache)
 */
export const forcePermissionRequest = async () => {
  mobileLog.info('🔄 Forcing fresh permission request...');

  return new Promise((resolve, reject) => {
    const options = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0 // Critical: No cache, force fresh request
    };

    mobileLog.info('Force request options:', options);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        mobileLog.info('✅ Fresh permission granted:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        resolve(position);
      },
      (error) => {
        const errorInfo = {
          code: error.code,
          message: error.message,
          name: getErrorName(error.code),
          timestamp: new Date().toISOString()
        };

        mobileLog.error('❌ Fresh permission request failed:', errorInfo);

        // Provide specific guidance based on error
        if (error.code === 1) {
          mobileLog.warn('🚨 Permission denied - user needs to clear browser data or reset permissions');
        }

        reject(errorInfo);
      },
      options
    );
  });
};

export default {
  checkGeolocationSupport,
  testGeolocation,
  iosGeolocationTroubleshoot,
  runGeolocationDiagnostic,
  quickPermissionCheck,
  requestLocationPermission,
  forcePermissionRequest,
  analyzePermissionState
};

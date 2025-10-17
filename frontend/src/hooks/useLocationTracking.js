import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import locationService from '../services/locationService';
import convoyService from '../services/convoyService';
import ConvoyLogger from '../utils/logger';
import locationTrackingDebugger from '../utils/locationTrackingDebugger';

/**
 * Custom hook for automatic location tracking in convoys
 *
 * @param {string} convoyId - The convoy ID to track location for
 * @param {string} memberId - The member ID to update location for
 * @param {Object} options - Configuration options
 * @returns {Object} - Location tracking state and controls
 */
const useLocationTracking = (convoyId, memberId, options = {}) => {
  const [isTracking, setIsTracking] = useState(false);
  const [lastPosition, setLastPosition] = useState(null);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [updateCount, setUpdateCount] = useState(0);
  const [wakeLockStatus, setWakeLockStatus] = useState('unsupported'); // 'unsupported', 'available', 'active', 'released'

  // Refs to prevent stale closures and track state
  const convoyIdRef = useRef(convoyId);
  const memberIdRef = useRef(memberId);
  const isTrackingRef = useRef(false);
  const lastSentLocationRef = useRef(null);
  const configuredRef = useRef(false);
  const startTrackingPromiseRef = useRef(null);

  // Background/visibility state management
  const wasTrackingBeforeBackgroundRef = useRef(false);
  const wakeLockRef = useRef(null);
  const visibilityListenerRef = useRef(null);

  // Update refs when props change
  useEffect(() => {
    convoyIdRef.current = convoyId;
    memberIdRef.current = memberId;
  }, [convoyId, memberId]);

  // Memoize configuration to prevent unnecessary re-renders
  const config = useMemo(() => {
    const defaultConfig = {
      updateIntervalMs: 30000, // 30 seconds
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
      autoStart: true,
      mockMode: false,
      mockPositions: [],
      onLocationUpdate: null,
      onError: null,
      // New options for duplicate detection
      minDistanceMeters: 10, // Minimum distance to trigger update
      duplicateTimeoutMs: 5000, // Don't send same location within 5 seconds
    };
    return { ...defaultConfig, ...options };
  }, [options]);

  // Wake Lock API functions
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      setWakeLockStatus('unsupported');
      console.log('📱 Wake Lock API not supported in this browser');
      return null;
    }

    try {
      const wakeLock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = wakeLock;
      setWakeLockStatus('active');
      console.log('🔒 Screen wake lock acquired - screen will stay awake during convoy tracking');

      // Listen for wake lock release
      wakeLock.addEventListener('release', () => {
        console.log('🔓 Screen wake lock released');
        setWakeLockStatus('released');
        wakeLockRef.current = null;
      });

      return wakeLock;
    } catch (err) {
      console.warn('⚠️ Failed to acquire wake lock:', err);
      setWakeLockStatus('available');
      return null;
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockStatus('released');
      console.log('🔓 Screen wake lock manually released');
    }
  }, []);

  // Page Visibility API functions
  const handleVisibilityChange = useCallback(() => {
    const isHidden = document.hidden;

    if (isHidden) {
      // App backgrounded
      console.log('📱 App backgrounded - preserving tracking state');
      wasTrackingBeforeBackgroundRef.current = isTrackingRef.current;

      // Release wake lock when backgrounded (browser requirement)
      if (wakeLockRef.current) {
        releaseWakeLock();
      }
    } else {
      // App foregrounded
      console.log('📱 App foregrounded - checking if tracking should resume');

      // Automatically restart tracking if it was active before backgrounding
      if (wasTrackingBeforeBackgroundRef.current && !isTrackingRef.current) {
        console.log('🔄 Auto-resuming location tracking after returning to foreground');
        // Use a timeout to avoid circular dependency issues
        setTimeout(() => {
          if (wasTrackingBeforeBackgroundRef.current && !isTrackingRef.current) {
            // Call startTracking through the ref to avoid dependency issues
            const startTrackingFn = async () => {
              try {
                // Create inline handlers to avoid dependency issues
                const onLocationUpdate = (position) => {
                  const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                  };
                  setLastPosition(location);
                  setUpdateCount(prev => prev + 1);
                  setError(null);
                };

                const onLocationError = (error) => {
                  console.error('Location tracking error:', error);
                  setError(error);
                  if (error.code === 1) {
                    setPermissionStatus('denied');
                  }
                };

                await locationService.startTracking(onLocationUpdate, onLocationError);
                setIsTracking(true);
                isTrackingRef.current = true;
                await requestWakeLock();
                console.log('🔄 Location tracking auto-resumed successfully');
              } catch (err) {
                console.error('❌ Failed to auto-resume location tracking:', err);
                setError(err);
              }
            };
            startTrackingFn();
          }
        }, 100);
      }

      // Re-acquire wake lock if tracking is active
      if (isTrackingRef.current) {
        requestWakeLock();
      }
    }
  }, [releaseWakeLock, requestWakeLock]);

  // Configure location service only once or when config changes
  useEffect(() => {
    if (!configuredRef.current) {
      console.log('🔧 Configuring location service with:', {
        updateIntervalMs: config.updateIntervalMs,
        minDistanceMeters: config.minDistanceMeters,
        heartbeatIntervalMs: config.heartbeatIntervalMs,
        enableHighAccuracy: config.enableHighAccuracy,
        mockMode: config.mockMode
      });

      locationService.configure({
        updateIntervalMs: config.updateIntervalMs,
        enableHighAccuracy: config.enableHighAccuracy,
        timeout: config.timeout,
        maximumAge: config.maximumAge,
        mockMode: config.mockMode,
        mockPositions: config.mockPositions,
      });
      configuredRef.current = true;
    }
  }, [config]);

  // Set up Page Visibility API listener for background/foreground detection
  useEffect(() => {
    // Check if Page Visibility API is supported
    if (typeof document.hidden !== 'undefined') {
      setWakeLockStatus('wakeLock' in navigator ? 'available' : 'unsupported');

      // Add visibility change listener
      visibilityListenerRef.current = handleVisibilityChange;
      document.addEventListener('visibilitychange', handleVisibilityChange);

      console.log('📱 Page Visibility API listener added for background/foreground detection');
    } else {
      console.warn('⚠️ Page Visibility API not supported in this browser');
    }

    // Cleanup function
    return () => {
      if (visibilityListenerRef.current) {
        document.removeEventListener('visibilitychange', visibilityListenerRef.current);
        visibilityListenerRef.current = null;
        console.log('📱 Page Visibility API listener removed');
      }

      // Release wake lock on cleanup
      releaseWakeLock();
    };
  }, [handleVisibilityChange, releaseWakeLock]);

  // Utility function to calculate distance between two coordinates
  const calculateDistance = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }, []);

  // Check if location update should be sent (duplicate detection with GPS accuracy filtering)
  const shouldSendLocationUpdate = useCallback((newLocation, accuracy) => {
    const lastSent = lastSentLocationRef.current;

    if (!lastSent) {
      console.log('🆕 First location update, sending...');
      return true; // First update
    }

    const now = Date.now();
    const timeDiff = now - lastSent.timestamp;

    const distance = calculateDistance(
      lastSent.lat, lastSent.lng,
      newLocation.lat, newLocation.lng
    );

    // Calculate GPS accuracy threshold - if movement is less than GPS accuracy, it's likely noise
    const gpsAccuracy = accuracy || 50; // Default 50m if accuracy not provided
    const accuracyThreshold = Math.max(config.minDistanceMeters, gpsAccuracy * 0.5); // Use 50% of GPS accuracy or minDistance, whichever is larger

    console.log(`🔍 Duplicate check: distance=${distance.toFixed(1)}m, time=${timeDiff}ms, minDistance=${config.minDistanceMeters}m, gpsAccuracy=${gpsAccuracy}m, threshold=${accuracyThreshold.toFixed(1)}m`);

    // Check for GPS jitter - if distance is small compared to GPS accuracy, likely noise
    if (distance < accuracyThreshold && gpsAccuracy > 100) {
      console.log(`🌊 GPS jitter detected (distance: ${distance.toFixed(1)}m < threshold: ${accuracyThreshold.toFixed(1)}m, accuracy: ${gpsAccuracy}m), skipping update`);
      return false;
    }

    // Send if significant distance moved (user actually moved)
    if (distance >= config.minDistanceMeters) {
      // Additional check for rapid updates with poor GPS accuracy
      if (gpsAccuracy > 150 && timeDiff < 5000) {
        console.log(`⚠️ Poor GPS accuracy (${gpsAccuracy}m) with rapid update (${timeDiff}ms), requiring larger movement`);
        const poorGpsThreshold = Math.max(config.minDistanceMeters * 2, gpsAccuracy * 0.3);
        if (distance < poorGpsThreshold) {
          console.log(`🚫 Movement too small for poor GPS (${distance.toFixed(1)}m < ${poorGpsThreshold.toFixed(1)}m), skipping`);
          return false;
        }
      }

      console.log(`📍 Distance threshold reached (${distance.toFixed(1)}m >= ${config.minDistanceMeters}m), sending update`);
      return true;
    }

    // For identical/very close locations, check if we should send a "heartbeat" update
    const heartbeatInterval = config.heartbeatIntervalMs || 60000; // Default 1 minute heartbeat
    if (timeDiff >= heartbeatInterval) {
      console.log(`💓 Heartbeat update for stationary user (${timeDiff}ms >= ${heartbeatInterval}ms), sending update`);
      return true;
    }

    // Skip duplicate - same location within heartbeat period
    console.log(`🚫 Skipping duplicate location update (distance: ${distance.toFixed(1)}m < ${config.minDistanceMeters}m, time: ${timeDiff}ms < ${heartbeatInterval}ms)`);
    return false;
  }, [config.minDistanceMeters, config.heartbeatIntervalMs, calculateDistance]);

  // Handle location updates with duplicate detection
  const handleLocationUpdate = useCallback(async (position) => {
    if (!isTrackingRef.current || !convoyIdRef.current || !memberIdRef.current) {
      console.log('Skipping location update - tracking stopped or missing IDs');
      return;
    }

    try {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      // Check if we should send this update (duplicate detection with GPS accuracy)
      if (!shouldSendLocationUpdate(location, position.coords.accuracy)) {
        locationTrackingDebugger.logEvent('DUPLICATE_DETECTED', {
          lat: location.lat,
          lng: location.lng,
          accuracy: position.coords.accuracy
        });
        return; // Skip duplicate update
      }

      console.log(`Sending location update: [${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}] accuracy: ${position.coords.accuracy}m`);

      // Log to debugger
      locationTrackingDebugger.logEvent('LOCATION_UPDATE', {
        lat: location.lat,
        lng: location.lng,
        accuracy: position.coords.accuracy
      });

      // Update location on backend
      await convoyService.updateMemberLocation(
        convoyIdRef.current,
        memberIdRef.current,
        location
      );

      // Update tracking state
      lastSentLocationRef.current = {
        ...location,
        timestamp: Date.now()
      };

      // Update local state
      setLastPosition({
        ...location,
        timestamp: position.timestamp,
        accuracy: position.coords.accuracy,
      });

      setUpdateCount(prev => prev + 1);
      setError(null);

      // Call custom callback if provided (without extra logging)
      config.onLocationUpdate?.(position, location);

    } catch (err) {
      console.error('Failed to update location:', err);
      setError(err);
      config.onError?.(err);
    }
  }, [config.onLocationUpdate, config.onError, shouldSendLocationUpdate]);

  // Handle location errors
  const handleLocationError = useCallback((error) => {
    console.error('Location tracking error:', error);
    setError(error);
    
    // Update permission status based on error
    if (error.code === 1) { // PERMISSION_DENIED
      setPermissionStatus('denied');
    }
    
    config.onError?.(error);
  }, [config.onError]);

  // Start location tracking with promise deduplication
  const startTracking = useCallback(async () => {
    // Prevent multiple simultaneous start attempts
    if (startTrackingPromiseRef.current) {
      console.log('Start tracking already in progress, waiting...');
      return startTrackingPromiseRef.current;
    }

    if (isTrackingRef.current) {
      console.log('Location tracking is already active');
      return Promise.resolve();
    }

    if (!convoyId || !memberId) {
      const error = new Error('Convoy ID and Member ID are required for location tracking');
      setError(error);
      throw error;
    }

    // Create and store the start promise
    startTrackingPromiseRef.current = (async () => {
      try {
        setError(null);

        // Check if geolocation is supported
        if (!locationService.isGeolocationSupported()) {
          throw new Error('Geolocation is not supported by this browser');
        }

        console.log(`Starting location tracking for member ${memberId} in convoy ${convoyId}`);

        // Request permission and start tracking
        await locationService.startTracking(handleLocationUpdate, handleLocationError);

        setIsTracking(true);
        isTrackingRef.current = true;
        setPermissionStatus('granted');

        // Request wake lock to keep screen awake during tracking
        await requestWakeLock();

        console.log(`✅ Location tracking started successfully (interval: ${config.updateIntervalMs}ms)`);

      } catch (err) {
        console.error('❌ Failed to start location tracking:', err);
        setError(err);
        setIsTracking(false);
        isTrackingRef.current = false;

        if (err.message.includes('permission denied')) {
          setPermissionStatus('denied');
        }

        throw err;
      } finally {
        startTrackingPromiseRef.current = null;
      }
    })();

    return startTrackingPromiseRef.current;
  }, [convoyId, memberId, handleLocationUpdate, handleLocationError, config.updateIntervalMs]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    if (!isTrackingRef.current) {
      console.log('Location tracking is not active, nothing to stop');
      return;
    }

    console.log(`🛑 Stopping location tracking for member ${memberIdRef.current} in convoy ${convoyIdRef.current}`);

    locationService.stopTracking();
    setIsTracking(false);
    isTrackingRef.current = false;
    setError(null);

    // Release wake lock when stopping tracking
    releaseWakeLock();

    // Clear the start promise ref
    startTrackingPromiseRef.current = null;

    console.log('✅ Location tracking stopped successfully');
  }, []);

  // Get current position once (without starting tracking)
  const getCurrentPosition = useCallback(async () => {
    try {
      const position = await locationService.getCurrentPosition();
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      
      setLastPosition({
        ...location,
        timestamp: position.timestamp,
        accuracy: position.coords.accuracy,
      });
      
      return { position, location };
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  // Auto-start tracking when component mounts (if enabled) - FIXED DEPENDENCIES
  useEffect(() => {
    let mounted = true;

    const autoStartTracking = async () => {
      if (config.autoStart && convoyId && memberId && !isTrackingRef.current && mounted) {
        try {
          console.log('🚀 Auto-starting location tracking...');
          await startTracking();
        } catch (err) {
          console.error('❌ Auto-start location tracking failed:', err);
        }
      }
    };

    autoStartTracking();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (isTrackingRef.current) {
        console.log('🧹 Component unmounting, stopping location tracking');
        stopTracking();
      }
    };
  }, [convoyId, memberId]); // Removed config.autoStart, startTracking, stopTracking to prevent loops

  // Stop tracking when convoyId or memberId changes - OPTIMIZED
  useEffect(() => {
    const currentConvoyId = convoyIdRef.current;
    const currentMemberId = memberIdRef.current;

    if (isTrackingRef.current &&
        (convoyId !== currentConvoyId || memberId !== currentMemberId)) {
      console.log(`🔄 Convoy/Member changed (${currentConvoyId}/${currentMemberId} -> ${convoyId}/${memberId}), stopping tracking`);
      stopTracking();
    }
  }, [convoyId, memberId]); // Removed stopTracking dependency

  // Get location service status
  const getLocationServiceStatus = useCallback(() => {
    return locationService.getStatus();
  }, []);

  return {
    // State
    isTracking,
    lastPosition,
    error,
    permissionStatus,
    updateCount,
    wakeLockStatus,

    // Actions
    startTracking,
    stopTracking,
    getCurrentPosition,
    requestWakeLock,
    releaseWakeLock,

    // Utilities
    isSupported: locationService.isGeolocationSupported(),
    getLocationServiceStatus,

    // Configuration
    config: {
      updateIntervalMs: config.updateIntervalMs,
      mockMode: config.mockMode,
    },
  };
};

export default useLocationTracking;

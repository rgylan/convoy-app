/**
 * LocationService - Handles automatic geolocation tracking for convoy members
 *
 * Features:
 * - Automatic location updates at configurable intervals
 * - Proper permission handling
 * - Error handling and retry logic
 * - Battery optimization considerations
 * - Mock support for testing
 */

import locationTrackingDebugger from '../utils/locationTrackingDebugger';

class LocationService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.updateInterval = null;
    this.lastKnownPosition = null;
    this.errorCallback = null;
    this.successCallback = null;
    
    // Configuration
    this.config = {
      updateIntervalMs: 30000, // 30 seconds - reasonable for battery life
      enableHighAccuracy: true,
      timeout: 15000, // 15 seconds timeout
      maximumAge: 10000, // Accept cached position up to 10 seconds old
      retryAttempts: 3,
      retryDelayMs: 5000,
      mockMode: false, // For testing
      mockPositions: [] // Array of mock positions for testing
    };
    
    this.currentRetryAttempt = 0;
    this.mockPositionIndex = 0;
  }

  /**
   * Configure the location service
   * @param {Object} options - Configuration options
   */
  configure(options = {}) {
    this.config = { ...this.config, ...options };
  }

  /**
   * Check if geolocation is supported
   * @returns {boolean}
   */
  isGeolocationSupported() {
    return 'geolocation' in navigator;
  }

  /**
   * Request geolocation permission
   * @returns {Promise<boolean>}
   */
  async requestPermission() {
    if (!this.isGeolocationSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    // Try to get current position to trigger permission request
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location permission denied. Please enable location access in your browser settings.'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information is unavailable. Please check your device settings.'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out. Please try again.'));
              break;
            default:
              reject(new Error('An unknown error occurred while requesting location.'));
              break;
          }
        },
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge
        }
      );
    });
  }

  /**
   * Start automatic location tracking
   * @param {Function} onLocationUpdate - Callback for location updates
   * @param {Function} onError - Callback for errors
   * @returns {Promise<void>}
   */
  async startTracking(onLocationUpdate, onError) {
    if (this.isTracking) {
      console.warn('⚠️ Location tracking is already active, ignoring start request');
      return;
    }

    // Clear any existing interval first
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.successCallback = onLocationUpdate;
    this.errorCallback = onError;

    if (this.config.mockMode) {
      this._startMockTracking();
      return;
    }

    if (!this.isGeolocationSupported()) {
      const error = new Error('Geolocation is not supported');
      this.errorCallback?.(error);
      throw error;
    }

    try {
      // Request permission first
      await this.requestPermission();

      this.isTracking = true;
      this.currentRetryAttempt = 0;

      console.log(`🎯 Starting location tracking with ${this.config.updateIntervalMs}ms interval`);

      // Log to debugger
      locationTrackingDebugger.logEvent('TRACKING_STARTED', {
        interval: this.config.updateIntervalMs,
        mockMode: this.config.mockMode
      });

      // Start with immediate position update
      this._getCurrentPosition();

      // Set up interval for regular updates
      this.updateInterval = setInterval(() => {
        if (this.isTracking) { // Double-check we're still tracking
          this._getCurrentPosition();
        }
      }, this.config.updateIntervalMs);

      console.log(`✅ Location tracking started successfully (interval ID: ${this.updateInterval})`);

    } catch (error) {
      this.isTracking = false; // Reset state on error
      this.errorCallback?.(error);
      throw error;
    }
  }

  /**
   * Stop location tracking
   */
  stopTracking() {
    if (!this.isTracking) {
      console.log('📍 Location tracking is not active, nothing to stop');
      return;
    }

    console.log(`🛑 Stopping location tracking (interval ID: ${this.updateInterval})`);

    // Log to debugger
    locationTrackingDebugger.logEvent('TRACKING_STOPPED', {
      intervalId: this.updateInterval,
      wasTracking: this.isTracking
    });

    this.isTracking = false;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('📍 Cleared geolocation watch');
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏰ Cleared update interval');
    }

    this.successCallback = null;
    this.errorCallback = null;
    this.currentRetryAttempt = 0;

    console.log('✅ Location tracking stopped successfully');
  }

  /**
   * Get current position once
   * @returns {Promise<GeolocationPosition>}
   */
  getCurrentPosition() {
    if (this.config.mockMode && this.config.mockPositions.length > 0) {
      return Promise.resolve(this._getMockPosition());
    }

    return new Promise((resolve, reject) => {
      if (!this.isGeolocationSupported()) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge
        }
      );
    });
  }

  /**
   * Internal method to get current position with retry logic
   * @private
   */
  _getCurrentPosition() {
    if (!this.isTracking) return;

    const options = {
      enableHighAccuracy: this.config.enableHighAccuracy,
      timeout: this.config.timeout,
      maximumAge: this.config.maximumAge
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Check GPS accuracy before processing
        const accuracy = position.coords.accuracy;
        const maxAccuracy = this.config.maxGpsAccuracyMeters || 200;

        if (accuracy > maxAccuracy) {
          console.warn(`🌊 Poor GPS accuracy (${accuracy}m > ${maxAccuracy}m), skipping position update`);
          return; // Skip this reading
        }

        this.lastKnownPosition = position;
        this.currentRetryAttempt = 0;
        this.successCallback?.(position);
      },
      (error) => {
        console.error('Geolocation error:', error);
        
        if (this.currentRetryAttempt < this.config.retryAttempts) {
          this.currentRetryAttempt++;
          console.log(`Retrying location update (attempt ${this.currentRetryAttempt}/${this.config.retryAttempts})`);
          
          setTimeout(() => {
            if (this.isTracking) {
              this._getCurrentPosition();
            }
          }, this.config.retryDelayMs);
        } else {
          // Max retries reached, call error callback
          this.errorCallback?.(error);
          this.currentRetryAttempt = 0;
        }
      },
      options
    );
  }

  /**
   * Start mock tracking for testing
   * @private
   */
  _startMockTracking() {
    if (this.config.mockPositions.length === 0) {
      // Default mock positions around Manila for testing
      this.config.mockPositions = [
        { lat: 14.5995, lng: 120.9842 }, // Manila
        { lat: 14.6042, lng: 120.9822 }, // Slightly north
        { lat: 14.6089, lng: 120.9802 }, // Further north
        { lat: 14.6136, lng: 120.9782 }, // Even further north
      ];
    }

    this.isTracking = true;
    this.mockPositionIndex = 0;

    // Immediate first update
    const position = this._getMockPosition();
    this.successCallback?.(position);

    // Set up interval for regular updates
    this.updateInterval = setInterval(() => {
      if (this.isTracking) {
        const position = this._getMockPosition();
        this.successCallback?.(position);
      }
    }, this.config.updateIntervalMs);

    console.log('Mock location tracking started');
  }

  /**
   * Get next mock position
   * @private
   * @returns {GeolocationPosition}
   */
  _getMockPosition() {
    const mockCoords = this.config.mockPositions[this.mockPositionIndex];
    this.mockPositionIndex = (this.mockPositionIndex + 1) % this.config.mockPositions.length;

    return {
      coords: {
        latitude: mockCoords.lat,
        longitude: mockCoords.lng,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now()
    };
  }

  /**
   * Get tracking status
   * @returns {Object}
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      isSupported: this.isGeolocationSupported(),
      lastKnownPosition: this.lastKnownPosition,
      config: { ...this.config },
      mockMode: this.config.mockMode
    };
  }
}

export default new LocationService();

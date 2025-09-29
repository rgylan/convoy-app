/**
 * Location Tracking Configuration
 * 
 * Centralized configuration for location tracking behavior
 * across the convoy application.
 */

// Default location tracking configuration
export const DEFAULT_LOCATION_CONFIG = {
  // Update frequency
  updateIntervalMs: 30000, // 30 seconds - balanced for battery life and accuracy
  
  // Geolocation API options
  enableHighAccuracy: true, // Request high accuracy GPS
  timeout: 15000, // 15 seconds timeout for location requests
  maximumAge: 10000, // Accept cached position up to 10 seconds old
  
  // Error handling and retry logic
  retryAttempts: 3, // Number of retry attempts on failure
  retryDelayMs: 5000, // Delay between retry attempts
  
  // Auto-start behavior
  autoStart: true, // Automatically start tracking when joining convoy
  
  // Testing and development
  mockMode: false, // Enable mock location for testing
  mockPositions: [], // Custom mock positions
  
  // Battery optimization
  backgroundUpdateIntervalMs: 60000, // 1 minute when app is in background
  
  // Accuracy thresholds
  minAccuracyMeters: 100, // Minimum acceptable accuracy in meters
  significantChangeMeters: 10, // Minimum distance change to trigger update

  // Duplicate detection
  minDistanceMeters: 10, // Minimum distance to trigger update (alias for significantChangeMeters)
  duplicateTimeoutMs: 5000, // Don't send same location within 5 seconds (deprecated)
  heartbeatIntervalMs: 60000, // Send heartbeat update for stationary users every 1 minute

  // GPS accuracy filtering
  maxGpsAccuracyMeters: 200, // Reject GPS readings with accuracy worse than 200m
  gpsJitterThreshold: 0.5, // Use 50% of GPS accuracy as jitter threshold
};

// Environment-specific configurations
export const LOCATION_CONFIGS = {
  development: {
    ...DEFAULT_LOCATION_CONFIG,
    updateIntervalMs: 10000, // 10 seconds for faster testing
    mockMode: false, // Can be overridden for testing
    retryAttempts: 2,
  },
  
  production: {
    ...DEFAULT_LOCATION_CONFIG,
    updateIntervalMs: 30000, // 30 seconds for production
    enableHighAccuracy: true,
    retryAttempts: 3,
  },
  
  testing: {
    ...DEFAULT_LOCATION_CONFIG,
    mockMode: true,
    updateIntervalMs: 5000, // 5 seconds for testing
    mockPositions: [
      { lat: 14.5995, lng: 120.9842 }, // Manila
      { lat: 14.6042, lng: 120.9822 }, // Slightly north
      { lat: 14.6089, lng: 120.9802 }, // Further north
      { lat: 14.6136, lng: 120.9782 }, // Even further north
      { lat: 14.6183, lng: 120.9762 }, // Continuing north
    ],
  },
};

// Get configuration based on environment
export const getLocationConfig = (environment = null) => {
  const env = environment || process.env.NODE_ENV || 'development';
  return LOCATION_CONFIGS[env] || DEFAULT_LOCATION_CONFIG;
};

// Preset configurations for different use cases
export const LOCATION_PRESETS = {
  // High frequency updates for testing or critical situations
  highFrequency: {
    ...DEFAULT_LOCATION_CONFIG,
    updateIntervalMs: 10000, // 10 seconds
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
  },
  
  // Balanced configuration for normal convoy operation
  balanced: {
    ...DEFAULT_LOCATION_CONFIG,
    updateIntervalMs: 30000, // 30 seconds
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 10000,
  },
  
  // Battery-saving configuration for long trips
  batterySaver: {
    ...DEFAULT_LOCATION_CONFIG,
    updateIntervalMs: 60000, // 1 minute
    enableHighAccuracy: false,
    timeout: 20000,
    maximumAge: 30000,
  },
  
  // Mock configuration for testing without GPS
  mock: {
    ...DEFAULT_LOCATION_CONFIG,
    mockMode: true,
    updateIntervalMs: 5000, // 5 seconds
    mockPositions: [
      { lat: 14.5995, lng: 120.9842 }, // Manila
      { lat: 14.6042, lng: 120.9822 },
      { lat: 14.6089, lng: 120.9802 },
      { lat: 14.6136, lng: 120.9782 },
      { lat: 14.6183, lng: 120.9762 },
    ],
  },
};

// Utility function to merge custom config with preset
export const createLocationConfig = (preset = 'balanced', customConfig = {}) => {
  const baseConfig = LOCATION_PRESETS[preset] || LOCATION_PRESETS.balanced;
  return { ...baseConfig, ...customConfig };
};

// Validation function for location configuration
export const validateLocationConfig = (config) => {
  const errors = [];
  
  if (config.updateIntervalMs < 1000) {
    errors.push('updateIntervalMs must be at least 1000ms (1 second)');
  }
  
  if (config.timeout < 1000) {
    errors.push('timeout must be at least 1000ms (1 second)');
  }
  
  if (config.retryAttempts < 0) {
    errors.push('retryAttempts must be non-negative');
  }
  
  if (config.retryDelayMs < 0) {
    errors.push('retryDelayMs must be non-negative');
  }
  
  if (config.mockMode && (!config.mockPositions || config.mockPositions.length === 0)) {
    errors.push('mockPositions must be provided when mockMode is enabled');
  }
  
  if (config.mockPositions) {
    config.mockPositions.forEach((pos, index) => {
      if (typeof pos.lat !== 'number' || typeof pos.lng !== 'number') {
        errors.push(`mockPositions[${index}] must have numeric lat and lng properties`);
      }
      if (pos.lat < -90 || pos.lat > 90) {
        errors.push(`mockPositions[${index}].lat must be between -90 and 90`);
      }
      if (pos.lng < -180 || pos.lng > 180) {
        errors.push(`mockPositions[${index}].lng must be between -180 and 180`);
      }
    });
  }
  
  return errors;
};

// Helper function to get user-friendly description of update frequency
export const getUpdateFrequencyDescription = (intervalMs) => {
  const seconds = intervalMs / 1000;
  
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    const hours = Math.round(seconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
};

// Export commonly used configurations
export default {
  DEFAULT_LOCATION_CONFIG,
  LOCATION_CONFIGS,
  LOCATION_PRESETS,
  getLocationConfig,
  createLocationConfig,
  validateLocationConfig,
  getUpdateFrequencyDescription,
};

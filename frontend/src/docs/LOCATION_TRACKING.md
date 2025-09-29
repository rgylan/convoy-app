# Automatic Location Tracking

This document describes the automatic location tracking functionality implemented in the convoy application.

## Overview

The application now automatically tracks and updates user locations when they are part of a convoy. This enables real-time tracking of convoy members on the map.

## Architecture

### Components

1. **LocationService** (`src/services/locationService.js`)
   - Core service for handling geolocation API
   - Manages automatic updates with configurable intervals
   - Handles permissions, errors, and retry logic
   - Supports mock mode for testing

2. **ConvoyService** (`src/services/convoyService.js`)
   - Extended with `updateMemberLocation()` method
   - Handles API communication with backend

3. **useLocationTracking Hook** (`src/hooks/useLocationTracking.js`)
   - React hook that integrates LocationService with ConvoyService
   - Manages component lifecycle and state
   - Provides easy-to-use interface for components

4. **Location Configuration** (`src/config/locationConfig.js`)
   - Centralized configuration for location tracking
   - Environment-specific settings
   - Preset configurations for different use cases

## Features

### Automatic Updates
- Configurable update intervals (default: 30 seconds)
- Automatic retry on failures
- Battery optimization considerations

### Permission Handling
- Proper geolocation permission requests
- User-friendly error messages
- Graceful degradation when permissions denied

### Error Handling
- Comprehensive error handling for various failure scenarios
- Retry logic with exponential backoff
- User notifications via alert system

### Testing Support
- Mock mode for testing without GPS
- Configurable mock positions
- Development-friendly settings

## Usage

### Basic Usage in Components

```javascript
import useLocationTracking from '../hooks/useLocationTracking';

const MyComponent = () => {
  const { convoyId } = useParams();
  const memberId = sessionStorage.getItem('memberId');
  
  const {
    isTracking,
    lastPosition,
    error,
    permissionStatus,
    startTracking,
    stopTracking
  } = useLocationTracking(convoyId, memberId);
  
  // Location tracking starts automatically
  // Manual control available via startTracking/stopTracking
};
```

### Configuration

```javascript
import { getLocationConfig, LOCATION_PRESETS } from '../config/locationConfig';

// Use environment-specific config
const config = getLocationConfig();

// Use preset configuration
const config = LOCATION_PRESETS.batterySaver;

// Custom configuration
const config = {
  updateIntervalMs: 15000, // 15 seconds
  enableHighAccuracy: true,
  mockMode: false
};
```

### Testing with Mock Data

```javascript
const mockConfig = {
  mockMode: true,
  updateIntervalMs: 5000,
  mockPositions: [
    { lat: 14.5995, lng: 120.9842 },
    { lat: 14.6042, lng: 120.9822 },
    // ... more positions
  ]
};
```

## API Integration

### Backend Endpoint
- **PUT** `/api/convoys/{convoyId}/members/{memberId}/location`
- **Body**: `{ "lat": number, "lng": number }`
- **Response**: `{ "message": "location updated" }`

### WebSocket Updates
- Location updates are broadcast to all convoy members via WebSocket
- Real-time map updates for all connected clients

## Configuration Options

### Update Intervals
- **High Frequency**: 10 seconds (testing/critical)
- **Balanced**: 30 seconds (default)
- **Battery Saver**: 60 seconds (long trips)

### Accuracy Settings
- **High Accuracy**: Uses GPS for precise location
- **Standard**: Uses network/cell tower location
- **Battery Optimized**: Balances accuracy with battery life

### Error Handling
- **Retry Attempts**: 3 (configurable)
- **Retry Delay**: 5 seconds (configurable)
- **Timeout**: 15 seconds (configurable)

## Browser Compatibility

### Supported Browsers
- Chrome 5+
- Firefox 3.5+
- Safari 5+
- Edge 12+
- Mobile browsers (iOS Safari, Chrome Mobile)

### Geolocation API Requirements
- HTTPS required for production (browser security)
- User permission required
- Location services must be enabled on device

## Privacy and Security

### Data Handling
- Location data only sent to convoy backend
- No persistent storage of location history
- Data only shared with convoy members

### Permissions
- Explicit user permission required
- Clear error messages when permission denied
- Graceful fallback when location unavailable

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - User needs to enable location access in browser
   - HTTPS required for location API
   - Check browser location settings

2. **Location Unavailable**
   - GPS/location services disabled on device
   - Poor signal/indoor location
   - Network connectivity issues

3. **High Battery Usage**
   - Reduce update frequency
   - Use battery saver preset
   - Disable high accuracy mode

### Debug Information
- Console logs for all location updates
- Error details in browser console
- Location service status available via hook

## Future Enhancements

### Planned Features
- Background location tracking
- Geofencing for convoy boundaries
- Speed and heading tracking
- Location history and breadcrumbs
- Offline location caching

### Performance Optimizations
- Adaptive update intervals based on movement
- Smart battery management
- Compression for location data
- Batch updates for multiple changes

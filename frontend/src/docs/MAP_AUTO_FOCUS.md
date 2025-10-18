# Map Auto-Focus Implementation

## Overview

The Map Auto-Focus feature provides intelligent automatic map positioning for the ConvoyMap component. It automatically pans and zooms the map to relevant locations when specific events occur, while respecting user control and preventing intrusive behavior.

## Features

### 1. Member Join Auto-Focus
- **Trigger**: When a new member joins the convoy
- **Behavior**: Automatically pan the map to center on the new member's location
- **Zoom Level**: Fixed at zoom level 13
- **Frequency**: **One-time only** per member (prevents repeated auto-focusing)
- **User Control**: After initial auto-focus, user's manual zoom/pan actions are preserved

### 2. Destination Selection Auto-Focus
- **Trigger**: When a destination is selected/set for the convoy
- **Behavior**: Automatically pan the map to center on the selected destination marker
- **Zoom Level**: Fixed at zoom level 13
- **Frequency**: **Every time** a different destination is selected (allows repeated auto-focusing)
- **User Control**: User's manual zoom/pan actions are preserved between destination changes

## Implementation Architecture

### Core Components

1. **`useMapAutoFocus` Hook** (`frontend/src/hooks/useMapAutoFocus.js`)
   - Custom React hook that handles auto-focus logic
   - Tracks state changes and triggers map movements
   - Maintains one-time-only behavior tracking

2. **`MapAutoFocusController` Component** (`frontend/src/components/map/MapAutoFocusController.js`)
   - React component that integrates the hook with the map
   - Placed inside MapContainer to access map instance
   - Handles debug logging in development mode

3. **Integration in `MapComponent`** (`frontend/src/components/map/MapComponent.js`)
   - MapAutoFocusController is added inside the MapContainer
   - Receives members and destination props from parent

### State Tracking

The implementation uses `useRef` to maintain persistent state across re-renders:

```javascript
const autoFocusTracker = useRef({
  memberJoins: new Set(), // Track member IDs that triggered auto-focus (one-time only)
  lastDestinationLocation: null // Track last destination location for comparison (allows repeated auto-focus)
});

const previousState = useRef({
  memberIds: new Set(),      // Previous member IDs for comparison
  destinationLocation: null  // Previous destination location
});
```

### Auto-Focus Logic

#### Member Join Detection
1. Compare current member IDs with previous member IDs
2. Identify new members (present in current but not in previous)
3. For each new member:
   - Check if already triggered auto-focus (skip if yes)
   - Focus map on member's location
   - Mark member as having triggered auto-focus

#### Destination Selection Detection
1. Compare current destination location with last destination location
2. If destination changed (different coordinates):
   - Focus map on destination location
   - Update last destination location for next comparison

## Configuration

### Default Settings
- **Zoom Level**: 13 (fixed as per requirements)
- **Animation Duration**: 1000ms (1 second)
- **Animation Easing**: Smooth with `easeLinearity: 0.1`

### Customization Options
The hook accepts an options object for customization:

```javascript
const options = {
  zoomLevel: 13,        // Target zoom level
  animationDuration: 1000 // Animation duration in milliseconds
};
```

## Usage

### Basic Integration
The auto-focus functionality is automatically enabled in the MapComponent:

```javascript
<MapContainer>
  <MapAutoFocusController
    members={members}
    destination={destination}
  />
  {/* Other map components */}
</MapContainer>
```

### Manual Control
The hook returns utility functions for manual control:

```javascript
const {
  focusOnLocation,        // Manually focus on a location
  resetAutoFocusTracking, // Reset one-time tracking
  getAutoFocusStatus     // Get current tracking status
} = useMapAutoFocus(members, destination);
```

## Testing

### Development Tools
In development mode, test utilities are available in the browser console:

```javascript
// Run all auto-focus tests
window.mapAutoFocusTests.runAllAutoFocusTests();

// Test specific scenarios
window.mapAutoFocusTests.testMemberJoinAutoFocus();
window.mapAutoFocusTests.testDestinationAutoFocus();
window.mapAutoFocusTests.testMultipleDestinationChanges();
window.mapAutoFocusTests.simulateConvoyScenario();
```

### Test Scenarios
1. **Member Join**: Simulates new members joining the convoy (one-time auto-focus)
2. **Destination Selection**: Simulates destination being set (repeated auto-focus)
3. **Multiple Destinations**: Tests sequential destination changes
4. **Behavior Differences**: Verifies member vs destination auto-focus differences
5. **Edge Cases**: Tests invalid data handling
6. **Real-World Scenario**: Complete convoy workflow simulation

## Edge Cases Handled

1. **Empty Data**: Gracefully handles empty members array or null destination
2. **Invalid Locations**: Validates location format before focusing
3. **Missing Map Instance**: Checks for valid map reference
4. **Rapid Changes**: Prevents race conditions with state tracking
5. **Component Unmounting**: Proper cleanup of refs and state

## Performance Considerations

1. **Efficient Comparisons**: Uses Set operations for fast member ID comparisons
2. **Minimal Re-renders**: Uses useRef to avoid unnecessary effect triggers
3. **Smooth Animations**: Uses Leaflet's optimized flyTo method
4. **Memory Management**: Proper cleanup of tracking state

## Browser Compatibility

- **Modern Browsers**: Full support with smooth animations
- **Older Browsers**: Graceful degradation with basic pan/zoom
- **Mobile Devices**: Optimized for touch interactions
- **Safari**: Includes webkit-specific optimizations

## Debugging

### Console Logging
In development mode, the implementation provides detailed logging:

```
New member joined: Alice (ID: 123) - Auto-focusing map
Map auto-focused to [14.5995, 120.9842] at zoom 13
Destination selected: SM Mall of Asia - Auto-focusing map
```

### Status Monitoring
Check auto-focus status programmatically:

```javascript
const status = getAutoFocusStatus();
console.log('Members focused:', status.memberJoinsFocused);
console.log('Destination focused:', status.destinationFocused);
```

## Future Enhancements

1. **Configurable Zoom Levels**: Different zoom levels for different event types
2. **Smart Grouping**: Auto-focus on convoy center when multiple members join
3. **Route-Based Focus**: Focus on route path when destination is set
4. **User Preferences**: Allow users to disable auto-focus
5. **Analytics**: Track auto-focus effectiveness and user interactions

## Troubleshooting

### Common Issues

1. **Auto-focus not working**
   - Check if MapAutoFocusController is inside MapContainer
   - Verify members/destination props are passed correctly
   - Check browser console for error messages

2. **Repeated auto-focusing**
   - Verify one-time tracking is working
   - Check if member IDs are stable across updates
   - Reset tracking if needed: `resetAutoFocusTracking()`

3. **Animation issues**
   - Check if Leaflet map instance is properly initialized
   - Verify location coordinates are valid [lat, lng] arrays
   - Test with different animation durations

### Debug Commands
```javascript
// Reset auto-focus tracking
window.mapAutoFocusTests.resetAutoFocusTracking();

// Check current status
window.mapAutoFocusTests.getAutoFocusStatus();

// Run comprehensive tests
window.mapAutoFocusTests.runAllAutoFocusTests();
```

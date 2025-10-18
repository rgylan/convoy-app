import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Custom hook for automatic map focus behavior
 * Handles one-time auto-focus for member joins and destination selection
 * 
 * @param {Array} members - Array of convoy members
 * @param {Object} destination - Convoy destination object
 * @param {Object} options - Configuration options
 * @param {number} options.zoomLevel - Zoom level for auto-focus (default: 13)
 * @param {number} options.animationDuration - Animation duration in ms (default: 1000)
 */
const useMapAutoFocus = (members = [], destination = null, options = {}) => {
  const map = useMap();
  const {
    zoomLevel = 13,
    animationDuration = 1000
  } = options;

  // Track which events have already triggered auto-focus
  const autoFocusTracker = useRef({
    memberJoins: new Set(), // Track member IDs that have already triggered auto-focus (one-time only)
    lastDestinationLocation: null // Track last destination location for comparison (allows repeated auto-focus)
  });

  // Track previous state to detect new members and destination changes
  const previousState = useRef({
    memberIds: new Set(),
    destinationLocation: null
  });

  /**
   * Smoothly pan and zoom the map to a specific location
   * @param {Array} location - [lat, lng] coordinates
   * @param {number} zoom - Target zoom level
   */
  const focusMapOnLocation = (location, zoom = zoomLevel) => {
    if (!map || !location || !Array.isArray(location) || location.length !== 2) {
      console.warn('useMapAutoFocus: Invalid location or map instance');
      return;
    }

    try {
      // Use flyTo for smooth animated transition
      map.flyTo(location, zoom, {
        animate: true,
        duration: animationDuration / 1000, // Leaflet expects duration in seconds
        easeLinearity: 0.1 // Smooth easing
      });

      console.log(`Map auto-focused to [${location[0].toFixed(4)}, ${location[1].toFixed(4)}] at zoom ${zoom}`);
    } catch (error) {
      console.error('useMapAutoFocus: Error focusing map:', error);
    }
  };

  // Effect to handle member join auto-focus
  useEffect(() => {
    if (!members || members.length === 0) return;

    const currentMemberIds = new Set(members.map(member => member.id));
    const previousMemberIds = previousState.current.memberIds;

    // Find new members (members that weren't in the previous state)
    const newMemberIds = [...currentMemberIds].filter(id => !previousMemberIds.has(id));

    // Process each new member
    newMemberIds.forEach(memberId => {
      // Check if this member has already triggered auto-focus
      if (autoFocusTracker.current.memberJoins.has(memberId)) {
        return; // Skip - already auto-focused for this member
      }

      // Find the member object
      const newMember = members.find(member => member.id === memberId);
      if (!newMember || !newMember.location) {
        return; // Skip if member not found or no location
      }

      // Trigger auto-focus for new member
      console.log(`New member joined: ${newMember.name} (ID: ${memberId}) - Auto-focusing map`);
      focusMapOnLocation(newMember.location, zoomLevel);

      // Mark this member as having triggered auto-focus (one-time only)
      autoFocusTracker.current.memberJoins.add(memberId);
    });

    // Update previous state
    previousState.current.memberIds = currentMemberIds;
  }, [members, map, zoomLevel]);

  // Effect to handle destination selection auto-focus (triggers every time destination changes)
  useEffect(() => {
    if (!destination || !destination.location) {
      // Reset destination tracking if destination is removed
      if (autoFocusTracker.current.lastDestinationLocation) {
        autoFocusTracker.current.lastDestinationLocation = null;
        previousState.current.destinationLocation = null;
      }
      return;
    }

    const currentDestinationLocation = destination.location;
    const lastDestinationLocation = autoFocusTracker.current.lastDestinationLocation;

    // Check if destination has changed (new destination or location changed)
    const destinationChanged = !lastDestinationLocation ||
      currentDestinationLocation[0] !== lastDestinationLocation[0] ||
      currentDestinationLocation[1] !== lastDestinationLocation[1];

    if (destinationChanged) {
      // Trigger auto-focus for every destination change (not one-time only)
      console.log(`Destination selected: ${destination.name} - Auto-focusing map`);
      focusMapOnLocation(currentDestinationLocation, zoomLevel);

      // Update tracking to current destination location (for next comparison)
      autoFocusTracker.current.lastDestinationLocation = [...currentDestinationLocation];
      previousState.current.destinationLocation = [...currentDestinationLocation];
    }
  }, [destination, map, zoomLevel]);

  // Return utility functions for manual control (if needed)
  return {
    focusOnLocation: focusMapOnLocation,
    resetAutoFocusTracking: () => {
      autoFocusTracker.current.memberJoins.clear();
      autoFocusTracker.current.lastDestinationLocation = null;
      previousState.current.memberIds = new Set();
      previousState.current.destinationLocation = null;
    },
    getAutoFocusStatus: () => ({
      memberJoinsFocused: Array.from(autoFocusTracker.current.memberJoins),
      lastDestinationLocation: autoFocusTracker.current.lastDestinationLocation
    })
  };
};

export default useMapAutoFocus;

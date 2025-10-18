import { useEffect } from 'react';
import useMapAutoFocus from '../../hooks/useMapAutoFocus';

/**
 * MapAutoFocusController - A component that handles automatic map focus behavior
 * This component should be placed inside the MapContainer to have access to the map instance
 * 
 * @param {Array} members - Array of convoy members
 * @param {Object} destination - Convoy destination object
 * @param {Object} options - Auto-focus configuration options
 */
const MapAutoFocusController = ({ members, destination, options = {} }) => {
  const {
    focusOnLocation,
    resetAutoFocusTracking,
    getAutoFocusStatus
  } = useMapAutoFocus(members, destination, {
    zoomLevel: 13, // Fixed zoom level as per requirements
    animationDuration: 1000, // Smooth 1-second animation
    ...options
  });

  // Debug logging in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const status = getAutoFocusStatus();
      console.log('MapAutoFocus Status:', {
        memberJoinsFocused: status.memberJoinsFocused,
        destinationFocused: status.destinationFocused,
        currentMembers: members?.length || 0,
        hasDestination: !!destination
      });
    }
  }, [members, destination, getAutoFocusStatus]);

  // This component doesn't render anything - it only handles map control logic
  return null;
};

export default MapAutoFocusController;

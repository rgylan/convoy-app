import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';

// Zoom levels for different scenarios
const ZOOM_LEVELS = {
  destination: 16,        // Close zoom for destination selection
  userLocation: 15,       // Slightly wider for user location
  convoy: 14,            // Good overview for convoy members
  mobile: {
    destination: 15,      // Slightly less zoom on mobile
    userLocation: 14,
    convoy: 13
  }
};

// Animation options for smooth transitions
const FLY_TO_OPTIONS = {
  duration: 1.2,          // 1.2 seconds for smooth animation
  easeLinearity: 0.1,     // Smooth easing
  animate: true
};

/**
 * SmartZoomManager - Professional map zoom behavior similar to Apple Maps and Google Maps
 *
 * Features:
 * - Smooth destination selection zoom with flyTo animation
 * - User location zoom when starting convoy
 * - Responsive zoom levels for different screen sizes
 * - Prevents excessive re-zooming
 */
const SmartZoomManager = ({
  destination,
  userLocation,
  members = [],
  onDestinationSelect
}) => {
  const map = useMap();
  const hasZoomedToDestinationRef = useRef(false);
  const hasZoomedToUserLocationRef = useRef(false);
  const lastDestinationRef = useRef(null);
  const lastUserLocationRef = useRef(null);

  // Helper function to determine if we're on mobile
  const isMobile = useCallback(() => window.innerWidth <= 768, []);

  // Helper function to get appropriate zoom level
  const getZoomLevel = useCallback((type) => {
    const levels = isMobile() ? ZOOM_LEVELS.mobile : ZOOM_LEVELS;
    return levels[type] || ZOOM_LEVELS.destination;
  }, [isMobile]);

  // Helper function to check if location has changed significantly
  const hasLocationChanged = useCallback((newLocation, oldLocation, threshold = 0.001) => {
    if (!newLocation || !oldLocation) return true;

    const latDiff = Math.abs(newLocation[0] - oldLocation[0]);
    const lngDiff = Math.abs(newLocation[1] - oldLocation[1]);

    return latDiff > threshold || lngDiff > threshold;
  }, []);

  // Handle destination selection zoom
  useEffect(() => {
    if (!map || !destination || !destination.location) return;

    const newDestination = destination.location;
    const hasChanged = hasLocationChanged(newDestination, lastDestinationRef.current);

    // Only zoom if destination has changed significantly or this is the first destination
    if (hasChanged || !hasZoomedToDestinationRef.current) {
      console.log('🎯 Flying to destination:', destination.name, newDestination);
      
      // Use flyTo for smooth animation to destination
      map.flyTo(newDestination, getZoomLevel('destination'), {
        ...FLY_TO_OPTIONS,
        duration: hasZoomedToDestinationRef.current ? 1.5 : 1.0 // Slightly longer for subsequent destinations
      });

      hasZoomedToDestinationRef.current = true;
      lastDestinationRef.current = [...newDestination];

      // Call the destination select callback if provided
      if (onDestinationSelect) {
        onDestinationSelect(destination);
      }
    }
  }, [map, destination, onDestinationSelect, getZoomLevel, hasLocationChanged]);

  // Handle user location zoom (for new convoy creation)
  useEffect(() => {
    if (!map || !userLocation) return;

    const newUserLocation = [userLocation.lat, userLocation.lng];
    const hasChanged = hasLocationChanged(newUserLocation, lastUserLocationRef.current);

    // Only zoom to user location if it's the first time or location has changed significantly
    if (hasChanged || !hasZoomedToUserLocationRef.current) {
      console.log('📍 Flying to user location:', newUserLocation);
      
      // Use flyTo for smooth animation to user location
      map.flyTo(newUserLocation, getZoomLevel('userLocation'), {
        ...FLY_TO_OPTIONS,
        duration: 1.0
      });

      hasZoomedToUserLocationRef.current = true;
      lastUserLocationRef.current = [...newUserLocation];
    }
  }, [map, userLocation, getZoomLevel, hasLocationChanged]);

  // Handle convoy overview zoom when multiple members are present
  useEffect(() => {
    if (!map || !members || members.length <= 1) return;
    if (hasZoomedToDestinationRef.current || hasZoomedToUserLocationRef.current) return;

    // If we have multiple members but no destination or user location zoom has occurred,
    // fit the map to show all convoy members
    const memberLocations = members
      .filter(member => member.location && Array.isArray(member.location))
      .map(member => member.location);

    if (memberLocations.length > 1) {
      console.log('👥 Fitting map to convoy members:', memberLocations.length);
      
      try {
        // Create bounds that include all member locations
        const bounds = memberLocations.reduce((bounds, location) => {
          return bounds.extend(location);
        }, map.getBounds().extend(memberLocations[0]));

        // Fit the map to show all members with padding
        map.fitBounds(bounds, {
          padding: [50, 50], // 50px padding on all sides
          maxZoom: getZoomLevel('convoy'),
          animate: true,
          duration: 1.0
        });
      } catch (error) {
        console.warn('Could not fit bounds to convoy members:', error);
      }
    }
  }, [map, members, getZoomLevel]);

  // Reset zoom flags when map is reset or convoy changes
  const resetZoomFlags = () => {
    hasZoomedToDestinationRef.current = false;
    hasZoomedToUserLocationRef.current = false;
    lastDestinationRef.current = null;
    lastUserLocationRef.current = null;
  };

  // Expose reset function for external use
  useEffect(() => {
    if (map) {
      map._smartZoomReset = resetZoomFlags;
    }
  }, [map]);

  // Handle window resize to adjust zoom levels if needed
  useEffect(() => {
    const handleResize = () => {
      // Debounce resize events
      clearTimeout(window._resizeTimeout);
      window._resizeTimeout = setTimeout(() => {
        // Re-zoom to current view with mobile-appropriate zoom level if needed
        if (map && (hasZoomedToDestinationRef.current || hasZoomedToUserLocationRef.current)) {
          const currentZoom = map.getZoom();

          // Adjust zoom level for mobile if we switched between mobile/desktop
          const targetZoom = hasZoomedToDestinationRef.current
            ? getZoomLevel('destination')
            : getZoomLevel('userLocation');

          if (Math.abs(currentZoom - targetZoom) > 1) {
            map.setZoom(targetZoom);
          }
        }
      }, 300);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(window._resizeTimeout);
    };
  }, [map, getZoomLevel]);

  return null;
};

export default SmartZoomManager;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import MapSidebar from './MapSidebar';
import ZoomControl from './ZoomControl';
import OpenFreeMapLayer from './OpenFreeMapLayer';

import LocationStatusControl from './LocationStatusControl';
import MemberStatusIndicator from '../convoy/MemberStatusIndicator';
import reverseGeocodingService from '../../services/reverseGeocodingService';
import './LocationStatusControl.css';
import './ZoomControl.css';
import './CustomMarkers.css';
import './MemberTooltip.css';





// Helper function to extract member initials
const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '??';

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    // Single name: use first two characters
    return words[0].substring(0, 2).toUpperCase();
  } else {
    // Multiple names: use first letter of first and last name
    const firstInitial = words[0].charAt(0).toUpperCase();
    const lastInitial = words[words.length - 1].charAt(0).toUpperCase();
    return firstInitial + lastInitial;
  }
};

// Helper function to get status-based colors (enhanced with purple status)
const getStatusColor = (status) => {
  switch (status) {
    case 'connected':
      return '#27ae60'; // Green - actively sending location
    case 'lagging':
      return '#f39c12'; // Orange - location updates delayed
    case 'disconnected':
      return '#e74c3c'; // Red - no connection
    case 'inactive':
    case 'not_sending_location':
      return '#9b59b6'; // Purple - connected but not sending location
    default:
      return '#2E86DE'; // App's brand color as fallback
  }
};

// Create custom Apple Maps-style teardrop DivIcon marker with member initials
const createMemberMarker = (member) => {
  const initials = getInitials(member.name);
  const status = member.status || '';

  return new DivIcon({
    className: 'custom-member-marker apple-maps-marker',
    html: `
      <div class="member-marker-container" data-status="${status}">
        <div class="member-marker-circle">
          <span class="member-initials">${initials}</span>
        </div>
        <div class="member-marker-tail">
          <div class="marker-tail-body"></div>
          <div class="marker-position-dot"></div>
        </div>
      </div>
    `,
    iconSize: [44, 52], // Reduced height for shorter teardrop tail
    iconAnchor: [22, 50], // Anchor point at the tip of the teardrop (red dot)
    popupAnchor: [0, -50] // Popup appears above the marker
  });
};

// Legacy function maintained for compatibility (now uses createMemberMarker)
const getMarkerIcon = (memberStatus, member) => {
  return createMemberMarker(member || { status: memberStatus, name: 'Unknown' });
};

const getMarkerOpacity = (memberStatus) => {
  switch (memberStatus) {
    case 'disconnected':
      return 0.6;
    case 'lagging':
      return 0.8;
    case 'connected':
    default:
      return 1.0;
  }
};



const destinationIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle auto-focus on current user's location (one-time on initial render)
const AutoFocusOnUser = ({ members, currentUserId }) => {
  const map = useMap();
  const hasAutoFocused = useRef(false);

  useEffect(() => {
    // Only auto-focus once on initial render
    if (hasAutoFocused.current || !currentUserId || !members.length) {
      return;
    }

    // Find current user's member object
    const currentUserMember = members.find(member =>
      member.id.toString() === currentUserId.toString()
    );

    if (currentUserMember && currentUserMember.location) {
      // Auto-focus on current user's location with zoom level 13
      map.setView(currentUserMember.location, 13);
      hasAutoFocused.current = true;

      if (process.env.NODE_ENV === 'development') {
        console.log('MapComponent: Auto-focused on current user location', {
          userId: currentUserId,
          userName: currentUserMember.name,
          location: currentUserMember.location,
          zoom: 13
        });
      }
    }
  }, [map, members, currentUserId]);

  return null; // This component doesn't render anything
};

// A new component to automatically adjust the map's view
const MapComponent = ({
  members,
  destination,
  onDestinationSelect,
  setShowShareModal,
  onLeaveConvoy,
  onToggleStatus,
  convoyHealth,
  alerts = [], // Add alerts prop for StatusPanel
  locationTracking = null, // Optional location tracking props
  currentUserId = null // Current user ID for auto-focus functionality
}) => {
  // State for storing reverse geocoded location names
  const [locationNames, setLocationNames] = useState(new Map());
  const [loadingLocations, setLoadingLocations] = useState(new Set());

  // Debounce timer for geocoding requests
  const geocodingTimeoutRef = useRef(null);

  /**
   * Lazy load location name for a member when tooltip is about to be shown
   */
  const loadLocationName = useCallback(async (member) => {
    const [lat, lng] = member.location;
    const locationKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

    // Skip if already loaded or loading
    if (locationNames.has(locationKey) || loadingLocations.has(locationKey)) {
      return;
    }

    // Mark as loading
    setLoadingLocations(prev => new Set(prev).add(locationKey));

    try {
      console.log(`🔍 Loading location name for ${member.name} at ${locationKey}`);

      // Get location name from reverse geocoding service
      const locationName = await reverseGeocodingService.getLocationName(lat, lng);

      // Update location names state
      setLocationNames(prev => new Map(prev).set(locationKey, locationName));

      console.log(`📍 Location loaded for ${member.name}: ${locationName}`);

    } catch (error) {
      console.warn(`⚠️ Failed to load location for ${member.name}:`, error);

      // Set coordinate fallback on error
      const fallback = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
      setLocationNames(prev => new Map(prev).set(locationKey, fallback));

    } finally {
      // Remove from loading set
      setLoadingLocations(prev => {
        const newSet = new Set(prev);
        newSet.delete(locationKey);
        return newSet;
      });
    }
  }, [locationNames, loadingLocations]);

  /**
   * Handle tooltip show event with debounced geocoding
   */
  const handleTooltipShow = useCallback((member) => {
    // Clear any existing timeout
    if (geocodingTimeoutRef.current) {
      clearTimeout(geocodingTimeoutRef.current);
    }

    // Debounce geocoding requests to avoid excessive API calls
    geocodingTimeoutRef.current = setTimeout(() => {
      loadLocationName(member);
    }, 100); // 100ms debounce
  }, [loadLocationName]);

  /**
   * Get display text for member location (location name or coordinates)
   */
  const getLocationDisplayText = useCallback((member) => {
    const [lat, lng] = member.location;
    const locationKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

    // Check if we have a cached location name
    if (locationNames.has(locationKey)) {
      return locationNames.get(locationKey);
    }

    // Check if currently loading
    if (loadingLocations.has(locationKey)) {
      return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`; // Show coordinates while loading
    }

    // Default to coordinates
    return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
  }, [locationNames, loadingLocations]);

  // Cleanup effect for component unmounting
  useEffect(() => {
    return () => {
      // Clear any pending geocoding timeouts
      if (geocodingTimeoutRef.current) {
        clearTimeout(geocodingTimeoutRef.current);
      }
      console.log('🧹 MapComponent unmounted, cleared geocoding timeouts');
    };
  }, []);

  // Set an initial center
  const initialCenter = [14.5995, 120.9842]; // Manila

  // Sidebar button handlers (search is now handled by MapSidebar)

  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const handleStatusClick = () => {
    onToggleStatus();
  };

  const handleLeaveClick = () => {
    onLeaveConvoy();
  };

  // Helper function to apply small offset to prevent marker overlap
  const applyMarkerOffset = (position, destination) => {
    if (!destination) return position;
    
    const [lat, lng] = position;
    const [destLat, destLng] = destination.location;
    
    // Check if markers are at exactly the same location (within 0.00001 degrees)
    const latDiff = Math.abs(lat - destLat);
    const lngDiff = Math.abs(lng - destLng);
    
    if (latDiff < 0.00001 && lngDiff < 0.00001) {
      // Apply small offset to position member marker slightly northeast of destination
      return [lat + 0.0001, lng + 0.0001];
    }
    
    return position;
  };

  return (
    <>
      <MapContainer
        center={initialCenter}
        zoom={13}
        className="map-container"
        zoomControl={false} // Disable default zoom control
      >
        {/* Auto-focus on current user's location (one-time on initial render) */}
        <AutoFocusOnUser members={members} currentUserId={currentUserId} />

        {/* OpenFreeMap vector tiles using MapLibre GL */}
        <OpenFreeMapLayer
          mapStyle="liberty"
          attribution='OpenFreeMap © OpenMapTiles Data from OpenStreetMap'
        />

        {/* Custom zoom control positioned at bottom-left */}
        <ZoomControl />

        {/* Render destination marker FIRST so it appears underneath member markers */}
        {destination && (
          <Marker position={destination.location} icon={destinationIcon}>
            <Popup>
              <strong>Destination:</strong><br />
              {destination.name}<br />
              Lat: {destination.location[0].toFixed(4)}, Lng: {destination.location[1].toFixed(4)}
            </Popup>
            <Tooltip
              direction="top"
              offset={[0, -45]}
              permanent={true}
              className="convoy-destination-tooltip"
            >
              <div className="destination-tooltip-text">
                {destination.name}
              </div>
            </Tooltip>
          </Marker>
        )}

      {/* Markers for each convoy member with status indicators */}
      {members.map(member => {
        const adjustedPosition = applyMarkerOffset(member.location, destination);
        const memberIcon = createMemberMarker(member);
        const memberOpacity = getMarkerOpacity(member.status);

        return (
          <Marker
            key={member.id}
            position={adjustedPosition}
            icon={memberIcon}
            opacity={memberOpacity}
            eventHandlers={{
              // Trigger geocoding when marker is hovered (desktop) or touched (mobile)
              mouseover: () => handleTooltipShow(member),
              click: () => handleTooltipShow(member), // For mobile touch interaction
            }}
          >
            <Popup>
              <MemberStatusIndicator
                member={member}
                destination={destination}
                variant="card"
                showDetails={true}
              />
            </Popup>
            {/* Enhanced member tooltip with reverse geocoding and Apple Maps-inspired design */}
            {/* Phase 2: Implemented reverse geocoding with human-readable location names */}
            <Tooltip
              direction="top"
              offset={[0, -55]}
              permanent={false}
              className="convoy-member-tooltip"
              interactive={false}
              opacity={1}
            >
              <div
                className="member-tooltip-content"
                data-status={member.status} // Enable status-specific styling
                role="tooltip"
                aria-label={`${member.name} location information`}
              >
                <div className="member-tooltip-name">
                  {member.name}
                </div>
                <div className="member-tooltip-location">
                  {getLocationDisplayText(member)}
                </div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}

        {/* Location tracking status control - kept separate as requested */}
        {locationTracking && (
          <LocationStatusControl
            isTracking={locationTracking.isTracking}
            permissionStatus={locationTracking.permissionStatus}
            isSupported={locationTracking.isSupported}
            updateCount={locationTracking.updateCount}
            onToggleTracking={locationTracking.onToggleTracking}
          />
        )}
      </MapContainer>

      {/* Map Sidebar with integrated search and status panels */}
      <MapSidebar
        onShareClick={handleShareClick}
        onStatusClick={handleStatusClick}
        onLeaveClick={handleLeaveClick}
        onDestinationSelect={onDestinationSelect}
        convoyHealth={convoyHealth}
        members={members}
        destination={destination}
        alerts={alerts}
      />
    </>
  );
};

export default MapComponent;

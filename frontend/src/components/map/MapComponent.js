import React from 'react';
import { MapContainer, Marker, Popup, Tooltip } from 'react-leaflet';
import { Icon } from 'leaflet';
import MapSidebar from './MapSidebar';
import ZoomControl from './ZoomControl';
import OpenFreeMapLayer from './OpenFreeMapLayer';
import MapAutoFocusController from './MapAutoFocusController';
import CustomTeardropMarker from './CustomTeardropMarker';

import LocationStatusControl from './LocationStatusControl';
import './LocationStatusControl.css';
import './ZoomControl.css';





// Note: Custom teardrop markers are now used for member markers
// Destination marker still uses traditional Leaflet icon

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
  locationTracking = null // Optional location tracking props
}) => {
  // Set an initial center
  const initialCenter = [14.5832, 120.9794]; // Luneta Park (Kilometer Zero), Manila

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
        {/* OpenFreeMap vector tiles using MapLibre GL */}
        <OpenFreeMapLayer
          mapStyle="liberty"
          attribution='OpenFreeMap © OpenMapTiles Data from OpenStreetMap'
        />

        {/* Auto-focus controller for member joins and destination selection */}
        <MapAutoFocusController
          members={members}
          destination={destination}
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

      {/* Custom teardrop markers for each convoy member */}
      {members.map(member => {
        const adjustedPosition = applyMarkerOffset(member.location, destination);
        const memberOpacity = getMarkerOpacity(member.status);

        return (
          <CustomTeardropMarker
            key={member.id}
            member={member}
            destination={destination}
            position={adjustedPosition}
            opacity={memberOpacity}
          />
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

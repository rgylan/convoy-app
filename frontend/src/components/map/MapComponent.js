import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import SearchControl from './SearchControl';
import ShareConvoyControl from './ShareConvoyControl';
import LeaveConvoyControl from './LeaveConvoyControl';
import StatusControl from './StatusControl';
import LocationStatusControl from './LocationStatusControl';
import MemberStatusIndicator from '../convoy/MemberStatusIndicator';
import './LocationStatusControl.css';

// Component to handle initial destination zoom (only once)
const InitialDestinationZoom = ({ destination }) => {
  const map = useMap();
  const hasZoomedRef = useRef(false);

  useEffect(() => {
    // Only zoom if we have a destination and haven't zoomed before
    if (destination && destination.location && !hasZoomedRef.current) {
      map.setView(destination.location, 13);
      hasZoomedRef.current = true;
    }
  }, [map, destination]);

  return null;
};



// Custom icons for better visualization with status indicators
const carIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const carIconDisconnected = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const carIconLagging = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const getMarkerIcon = (memberStatus) => {
  switch (memberStatus) {
    case 'disconnected':
      return carIconDisconnected;
    case 'lagging':
      return carIconLagging;
    case 'connected':
    default:
      return carIcon;
  }
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

// A new component to automatically adjust the map's view
const MapComponent = ({
  members,
  destination,
  onDestinationSelect,
  setShowShareModal,
  onLeaveConvoy,
  onToggleStatus,
  convoyHealth,
  locationTracking = null // Optional location tracking props
}) => {
  // Set an initial center
  const initialCenter = [14.5995, 120.9842]; // Manila

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
    <MapContainer center={initialCenter} zoom={13} className="map-container">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Initial destination zoom - only triggers once when destination is first set */}
      <InitialDestinationZoom destination={destination} />

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
        const memberIcon = getMarkerIcon(member.status);
        const memberOpacity = getMarkerOpacity(member.status);
        
        return (
          <Marker 
            key={member.id} 
            position={adjustedPosition} 
            icon={memberIcon}
            opacity={memberOpacity}
          >
            <Popup>
              <MemberStatusIndicator
                member={member}
                destination={destination}
                variant="card"
                showDetails={true}
              />
            </Popup>
            <Tooltip
              direction="top"
              offset={[0, -45]}
              permanent={true}
              className="convoy-member-tooltip"
            >
              <MemberStatusIndicator
                member={member}
                destination={destination}
                variant="visual-only-tooltip"
              />
            </Tooltip>
          </Marker>
        );
      })}

      {/* This component adds the search bar */}
      <SearchControl onDestinationSelect={onDestinationSelect} />
      <ShareConvoyControl setShowShareModal={setShowShareModal} />
      <StatusControl onToggleStatus={onToggleStatus} convoyHealth={convoyHealth} />
      <LeaveConvoyControl onLeaveConvoy={onLeaveConvoy} />

      {/* Location tracking status control */}
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
  );
};

export default MapComponent;

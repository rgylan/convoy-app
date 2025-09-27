import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { Icon, latLngBounds } from 'leaflet';
import SearchControl from './SearchControl';
import ShareConvoyControl from './ShareConvoyControl';
import LeaveConvoyControl from './LeaveConvoyControl';

// Custom icons for better visualization
const carIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png', // A simple default icon
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const destinationIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// A new component to automatically adjust the map's view
const MapComponent = ({ members, destination, onDestinationSelect, setShowShareModal, onLeaveConvoy }) => {
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

      {/* Render destination marker FIRST so it appears underneath member markers */}
      {destination && (
        <Marker position={destination.location} icon={destinationIcon}>
          <Popup>
            <strong>Destination:</strong><br />
            {destination.name}<br />
            Lat: {destination.location[0].toFixed(4)}, Lng: {destination.location[1].toFixed(4)}
          </Popup>
          <Tooltip direction="top" offset={[0, -41]} permanent>
            {destination.name}
          </Tooltip>
        </Marker>
      )}

      {/* Markers for each convoy member with overlap prevention */}
      {members.map(member => {
        const adjustedPosition = applyMarkerOffset(member.location, destination);
        
        return (
          <Marker key={member.id} position={adjustedPosition} icon={carIcon}>
            <Popup>
              <strong>{member.name}</strong><br />
              Location: {member.location[0].toFixed(4)}, {member.location[1].toFixed(4)}<br />
              {destination && (
                <>
                  Destination: {destination.name}<br />
                  Lat: {destination.location[0].toFixed(4)}, Lng: {destination.location[1].toFixed(4)}
                </>
              )}
            </Popup>
            <Tooltip direction="top" offset={[0, -41]} permanent>
              {member.name}
            </Tooltip>
          </Marker>
        );
      })}

      {/* This component adds the search bar */}
      <SearchControl onDestinationSelect={onDestinationSelect} />
      <ShareConvoyControl setShowShareModal={setShowShareModal} />
      <LeaveConvoyControl onLeaveConvoy={onLeaveConvoy} />
    </MapContainer>
  );
};

export default MapComponent;

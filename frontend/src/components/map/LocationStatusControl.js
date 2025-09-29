import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const LocationStatusControl = ({ 
  isTracking, 
  permissionStatus, 
  isSupported, 
  updateCount,
  onToggleTracking 
}) => {
  const map = useMap();

  useEffect(() => {
    const LocationStatusControlClass = L.Control.extend({
      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar location-status-control');
        
        // Create the button
        const button = L.DomUtil.create('button', 'location-status-button', container);
        
        // Create the button content
        const buttonContent = document.createElement('div');
        buttonContent.className = 'location-button-content';
        
        // Add the location icon
        const icon = document.createElement('span');
        icon.className = 'material-icons location-icon';
        icon.textContent = 'my_location';
        
        // Add the status indicator dot
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'location-status-indicator';
        
        // Add update count badge
        const updateBadge = document.createElement('div');
        updateBadge.className = 'location-update-badge';
        updateBadge.textContent = updateCount || '0';
        
        buttonContent.appendChild(icon);
        buttonContent.appendChild(statusIndicator);
        buttonContent.appendChild(updateBadge);
        button.appendChild(buttonContent);
        
        // Set initial state
        updateButtonState(button, isTracking, permissionStatus, isSupported, updateCount);
        
        // Add click handler
        L.DomEvent.on(button, 'click', (e) => {
          L.DomEvent.stop(e); // Prevent map click events
          if (onToggleTracking) {
            onToggleTracking();
          }
        });

        return container;
      },

      onRemove: function(map) {
        // Nothing to do here
      }
    });

    const locationStatusControl = new LocationStatusControlClass({ position: 'topright' });
    map.addControl(locationStatusControl);

    return () => map.removeControl(locationStatusControl);
  }, [map, onToggleTracking]);

  // Update button state when props change
  useEffect(() => {
    const button = document.querySelector('.location-status-button');
    if (button) {
      updateButtonState(button, isTracking, permissionStatus, isSupported, updateCount);
    }
  }, [isTracking, permissionStatus, isSupported, updateCount]);

  return null;
};

// Helper function to update button state
const updateButtonState = (button, isTracking, permissionStatus, isSupported, updateCount) => {
  const statusIndicator = button.querySelector('.location-status-indicator');
  const updateBadge = button.querySelector('.location-update-badge');
  const icon = button.querySelector('.location-icon');
  
  if (!statusIndicator || !updateBadge || !icon) return;

  // Update badge
  updateBadge.textContent = updateCount || '0';
  
  // Determine status and update classes
  let status = 'unknown';
  let title = 'Location Status';
  
  if (!isSupported) {
    status = 'unsupported';
    title = 'Location not supported by browser';
    icon.textContent = 'location_disabled';
  } else if (permissionStatus === 'denied') {
    status = 'denied';
    title = 'Location permission denied';
    icon.textContent = 'location_disabled';
  } else if (isTracking) {
    status = 'active';
    title = `Location tracking active (${updateCount} updates)`;
    icon.textContent = 'my_location';
  } else {
    status = 'inactive';
    title = 'Location tracking inactive';
    icon.textContent = 'location_searching';
  }
  
  // Update button attributes
  button.setAttribute('data-status', status);
  button.title = title;
  
  // Update status indicator
  statusIndicator.setAttribute('data-status', status);
};

export default LocationStatusControl;

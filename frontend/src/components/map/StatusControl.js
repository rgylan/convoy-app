import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const StatusControl = ({ onToggleStatus, convoyHealth = 'healthy' }) => {
  const map = useMap();

  useEffect(() => {
    const StatusControlClass = L.Control.extend({
      onAdd: function(map) {
        const button = L.DomUtil.create('button', 'leaflet-bar status-convoy-button');
        
        // Create the button content with status indicator
        const buttonContent = document.createElement('div');
        buttonContent.className = 'status-button-content';
        
        // Add the dashboard icon
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.textContent = 'dashboard';
        
        // Add the status indicator dot
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'status-alert-indicator';
        statusIndicator.setAttribute('data-health', convoyHealth);
        
        buttonContent.appendChild(icon);
        buttonContent.appendChild(statusIndicator);
        button.appendChild(buttonContent);
        
        button.title = 'Convoy Status';

        L.DomEvent.on(button, 'click', (e) => {
          L.DomEvent.stop(e); // Prevent map click events
          onToggleStatus();
        });

        return button;
      },

      onRemove: function(map) {
        // Nothing to do here
      }
    });

    const statusControl = new StatusControlClass({ position: 'topleft' });
    map.addControl(statusControl);

    return () => map.removeControl(statusControl);
  }, [map, onToggleStatus]);

  // Update the status indicator when convoy health changes
  useEffect(() => {
    const statusButton = document.querySelector('.status-convoy-button .status-alert-indicator');
    if (statusButton) {
      statusButton.setAttribute('data-health', convoyHealth);
    }
  }, [convoyHealth]);

  return null;
};

export default StatusControl;

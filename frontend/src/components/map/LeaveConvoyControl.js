import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const LeaveConvoyControl = ({ onLeaveConvoy }) => {
  const map = useMap();

  useEffect(() => {
    const LeaveControl = L.Control.extend({
      onAdd: function(map) {
        const button = L.DomUtil.create('button', 'leaflet-bar leave-convoy-button');
        button.innerHTML = '<span class="material-icons">exit_to_app</span>'; // Using Material Icons for the leave icon
        button.title = 'Leave Convoy';

        L.DomEvent.on(button, 'click', (e) => {
          L.DomEvent.stop(e); // Prevent map click events
          onLeaveConvoy();
        });

        return button;
      },

      onRemove: function(map) {
        // Nothing to do here
      }
    });

    const leaveControl = new LeaveControl({ position: 'topleft' });
    map.addControl(leaveControl);

    return () => map.removeControl(leaveControl);
  }, [map, onLeaveConvoy]);

  return null;
};

export default LeaveConvoyControl;

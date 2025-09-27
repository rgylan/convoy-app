import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const ShareConvoyControl = ({ setShowShareModal }) => {
  const map = useMap();

  useEffect(() => {
    const ShareControl = L.Control.extend({
      onAdd: function(map) {
        const button = L.DomUtil.create('button', 'leaflet-bar share-convoy-button');
        button.innerHTML = '<span class="material-icons">share</span>'; // Using Material Icons for the share icon
        button.title = 'Share Convoy';

        L.DomEvent.on(button, 'click', (e) => {
          L.DomEvent.stop(e); // Prevent map click events
          setShowShareModal(true);
        });

        return button;
      },

      onRemove: function(map) {
        // Nothing to do here
      }
    });

    const shareControl = new ShareControl({ position: 'topleft' });
    map.addControl(shareControl);

    return () => map.removeControl(shareControl);
  }, [map, setShowShareModal]);

  return null;
};

export default ShareConvoyControl;
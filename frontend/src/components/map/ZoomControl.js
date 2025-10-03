import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const ZoomControl = () => {
  const map = useMap();

  useEffect(() => {
    // Check if map is ready and properly initialized
    if (!map) return;

    // Since we disabled the default zoom control with zoomControl={false} in MapContainer,
    // we don't need to remove it - just add our custom one

    // Add a small delay to ensure the map is fully initialized
    const timeoutId = setTimeout(() => {
      // Create a custom zoom control positioned at bottom-left
      const customZoomControl = new L.Control.Zoom({
        position: 'bottomleft'
      });

      // Add the custom zoom control to the map
      try {
        map.addControl(customZoomControl);
      } catch (error) {
        console.error('Could not add custom zoom control:', error);
        return;
      }

      // Store the control reference for cleanup
      map._customZoomControl = customZoomControl;
    }, 100); // Small delay to ensure map is ready

    // Cleanup function to remove the control when component unmounts
    return () => {
      // Clear the timeout if component unmounts before it executes
      clearTimeout(timeoutId);

      try {
        if (map && map._customZoomControl && map.removeControl) {
          map.removeControl(map._customZoomControl);
          delete map._customZoomControl;
        }
      } catch (error) {
        // Control might already be removed, ignore error
        console.warn('Could not remove custom zoom control during cleanup:', error);
      }
    };
  }, [map]);

  return null;
};

export default ZoomControl;

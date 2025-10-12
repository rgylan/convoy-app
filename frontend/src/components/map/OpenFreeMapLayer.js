import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';

// Import the MapLibre GL Leaflet plugin
// Note: We need to import it this way to ensure it extends Leaflet properly
import '@maplibre/maplibre-gl-leaflet';

/**
 * OpenFreeMapLayer - A React component that adds OpenFreeMap vector tiles to a Leaflet map
 * using the MapLibre GL Leaflet plugin.
 * 
 * This component integrates with react-leaflet and allows you to use OpenFreeMap's
 * vector tiles while keeping all existing Leaflet functionality.
 */
const OpenFreeMapLayer = ({
  mapStyle = 'liberty', // Default to liberty style
  attribution = 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap'
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Available OpenFreeMap styles
    const styleUrls = {
      liberty: 'https://tiles.openfreemap.org/styles/liberty',
      bright: 'https://tiles.openfreemap.org/styles/bright',
      positron: 'https://tiles.openfreemap.org/styles/positron',
      '3d': 'https://tiles.openfreemap.org/styles/3d'
    };

    const styleUrl = styleUrls[mapStyle] || styleUrls.liberty;

    // Create the MapLibre GL layer
    const maplibreLayer = L.maplibreGL({
      style: styleUrl,
      attribution: attribution
    });

    // Add the layer to the map
    maplibreLayer.addTo(map);

    // Store reference for cleanup
    map._openFreeMapLayer = maplibreLayer;

    // Cleanup function
    return () => {
      if (map._openFreeMapLayer) {
        try {
          map.removeLayer(map._openFreeMapLayer);
          map._openFreeMapLayer = null;
        } catch (error) {
          console.warn('Error removing OpenFreeMap layer:', error);
        }
      }
    };
  }, [map, mapStyle, attribution]);

  // This component doesn't render anything directly
  return null;
};

export default OpenFreeMapLayer;

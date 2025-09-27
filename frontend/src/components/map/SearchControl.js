import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

const SearchControl = ({ onDestinationSelect }) => {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider({
      params: {
        countrycodes: 'ph', // Restrict search results to the Philippines
        'accept-language': 'en', // Prefer English results
      },
    });

    const searchControl = new GeoSearchControl({
      provider,
      style: 'button',
      showMarker: false, // We will handle the marker ourselves
      autoClose: true,
      searchLabel: 'Enter destination address', // Custom placeholder text
    });

    map.addControl(searchControl);
    map.on('geosearch/showlocation', (result) => onDestinationSelect(result.location));

    return () => map.removeControl(searchControl);
  }, [map, onDestinationSelect]);

  return null;
};

export default SearchControl;
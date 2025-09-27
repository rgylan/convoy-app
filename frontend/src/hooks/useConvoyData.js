import { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';

export const useConvoyData = (convoyId) => {
  const [convoyData, setConvoyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConvoyData = async () => {
      try {
        setLoading(true);
        const response = await fetch(API_ENDPOINTS.CONVOY_BY_ID(convoyId));
        if (!response.ok) {
          throw new Error('Convoy not found');
        }
        const convoy = await response.json();
        
        // Transform data
        const transformedConvoy = transformConvoyData(convoy);
        setConvoyData(transformedConvoy);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    if (convoyId) {
      fetchConvoyData();
    }
  }, [convoyId]);

  return { convoyData, loading, error, setConvoyData };
};

const transformConvoyData = (convoy) => {
  const transformedMembers = (convoy.members || []).map(member => ({
    ...member,
    location: [member.location.lat, member.location.lng]
  }));
  
  let transformedDestination = null;
  if (convoy.destination) {
    transformedDestination = {
      ...convoy.destination,
      location: [convoy.destination.lat, convoy.destination.lng]
    };
  }

  return {
    ...convoy,
    members: transformedMembers,
    destination: transformedDestination
  };
};
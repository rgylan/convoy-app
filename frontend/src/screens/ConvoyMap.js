import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MapComponent from '../components/map/MapComponent';
import ShareConvoy from '../components/convoy/ShareConvoy';
import useWebSocket from '../hooks/useWebSocket';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ConvoyLogger from '../utils/logger';

const ConvoyMap = () => {
  const { convoyId } = useParams();
  const navigate = useNavigate();
  const wsConvoyData = useWebSocket(convoyId);

  const [convoyData, setConvoyData] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/convoys/${convoyId}`);
        if (!response.ok) {
          throw new Error('Convoy not found');
        }
        const convoy = await response.json();

        // Transform members' locations
        const transformedMembers = (convoy.members || []).map(member => ({
          ...member,
          location: [member.location.lat, member.location.lng]
        }));
        
        // Transform destination location if it exists
        let transformedDestination = null;
        if (convoy.destination) {
          transformedDestination = {
            ...convoy.destination,
            location: [convoy.destination.lat, convoy.destination.lng]
          };
        }

        setConvoyData({
          ...convoy,
          members: transformedMembers,
          destination: transformedDestination
        });

        // Protect session storage: ensure memberId persists
        const currentMemberId = sessionStorage.getItem('memberId');
        if (currentMemberId) {
          console.log('DEBUG: Session memberId preserved:', currentMemberId);
        } else {
          console.warn('WARNING: No memberId found in session storage during initial data fetch');
        }

      } catch (error) {
        console.error('Error fetching convoy data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [convoyId]);

  const finalConvoyData = wsConvoyData || convoyData;

  const handleDestinationSelect = useCallback(async (location) => {
    // Extract destination name from search result or use fallback
    let destinationName = location.label || location.name || 'Selected Location';
    
    // Apply same truncation logic as backend: extract portion before first comma
    const commaIndex = destinationName.indexOf(',');
    if (commaIndex !== -1) {
      destinationName = destinationName.substring(0, commaIndex);
    }
    
    // Enforce 100-character limit to match backend validation
    if (destinationName.length > 100) {
      destinationName = destinationName.substring(0, 100);
    }
    
    // Trim whitespace from the processed name
    destinationName = destinationName.trim();
    
    // Create destination object matching backend DestinationRequest format
    const newDestination = {
      name: destinationName,
      description: location.raw?.display_name || '', // Optional description from search result
      lat: location.y,
      lng: location.x,
    };

    try {
      const response = await fetch(`http://localhost:8080/api/convoys/${convoyId}/destination`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDestination),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: Failed to set destination`;
        throw new Error(errorMessage);
      }
      
      console.log(`DESTINATION_SET: Set destination "${destinationName}" for convoy ${convoyId} at [${newDestination.lat}, ${newDestination.lng}] - ${new Date().toISOString()}`);
      
      // Log destination setting if ConvoyLogger is available
      if (ConvoyLogger?.logDestinationSet) {
        ConvoyLogger.logDestinationSet(convoyId, newDestination);
      }
      
    } catch (error) {
      console.error('Error setting destination:', error);
      alert(`Failed to set destination: ${error.message}`);
    }
  }, [convoyId]);

  const handleLeaveConvoy = async () => {
    if (window.confirm('Are you sure you want to leave this convoy?')) {
      try {
        // Enhanced session debugging
        const memberId = sessionStorage.getItem('memberId');
        console.log('DEBUG: Session state check:', {
          memberId,
          sessionStorageKeys: Object.keys(sessionStorage),
          finalConvoyData: finalConvoyData?.members?.map(m => ({ id: m.id, name: m.name }))
        });
        
        if (!memberId) {
          // Attempt recovery by checking if user is the only member or has a predictable ID
          const members = finalConvoyData?.members || [];
          console.log('DEBUG: Attempting member ID recovery from convoy data:', members);
          
          if (members.length === 1) {
            // If only one member, assume it's the current user
            const recoveredId = members[0].id.toString();
            console.log('DEBUG: Recovered member ID from single member:', recoveredId);
            sessionStorage.setItem('memberId', recoveredId);
            
            // Proceed with the recovered ID
            await performLeaveConvoy(recoveredId);
            return;
          }
          
          throw new Error('Could not determine your member ID. Session may have been corrupted.');
        }

        await performLeaveConvoy(memberId);
        
      } catch (error) {
        console.error('Error leaving convoy:', error);
        console.error('DEBUG: Full error context:', {
          error: error.message,
          stack: error.stack,
          convoyId,
          sessionStorage: Object.keys(sessionStorage),
          finalConvoyData: finalConvoyData
        });
        alert(`Failed to leave convoy: ${error.message}`);
      }
    }
  };

  // Extracted leave convoy logic for reuse
  const performLeaveConvoy = async (memberId) => {
    // Determine if this is the leader or a regular member
    const currentMember = finalConvoyData?.members?.find(m => m.id.toString() === memberId);
    const isLeader = currentMember?.name === 'You'; // Leaders are named 'You' in this app

    console.log('DEBUG: Performing leave convoy:', {
      memberId,
      currentMember,
      isLeader,
      convoyId
    });

    const response = await fetch(`http://localhost:8080/api/convoys/${convoyId}/members/${memberId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to leave convoy (HTTP ${response.status}): ${errorText}`);
    }
    
    // Log appropriate leave event
    if (isLeader) {
      console.log(`LEADER_LEFT: Leader left convoy ${convoyId}, member ID ${memberId} at ${new Date().toISOString()}`);
    } else {
      console.log(`MEMBER_LEFT: Member left convoy ${convoyId}, member ID ${memberId} at ${new Date().toISOString()}`);
    }
    
    // Clear session storage and navigate
    sessionStorage.removeItem('memberId');
    console.log('DEBUG: Session cleared, navigating to home');
    navigate('/');
  };

  return (
    <div className="App">
      <main>
        <MapComponent
          members={finalConvoyData?.members || []}
          destination={finalConvoyData?.destination}
          onDestinationSelect={handleDestinationSelect}
          setShowShareModal={setShowShareModal}
          onLeaveConvoy={handleLeaveConvoy}
        />
      </main>
      {showShareModal && (
        <ShareConvoy convoyId={convoyId} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
};

export default ConvoyMap;










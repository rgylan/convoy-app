import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MapComponent from '../components/map/MapComponent';
import ShareConvoy from '../components/convoy/ShareConvoy';
import LeaveConvoyModal from '../components/convoy/LeaveConvoyModal';
import AlertPanel from '../components/alerts/AlertPanel';

import MemberStatusPanel from '../components/convoy/MemberStatusPanel';
import useWebSocket from '../hooks/useWebSocket';
import useLocationTracking from '../hooks/useLocationTracking';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ConvoyLogger from '../utils/logger';
import { getLocationConfig } from '../config/locationConfig';
import { API_ENDPOINTS } from '../config/api';

// Import test utilities in development mode
if (process.env.NODE_ENV === 'development') {
  import('../utils/testLocationTracking').then(module => {
    window.locationTrackingTests = module;
    console.log('🔧 Location tracking tests loaded. Use window.locationTrackingTests to run tests.');
  });
}

const ConvoyMap = () => {
  const { convoyId } = useParams();
  const navigate = useNavigate();
  const { convoyData: wsConvoyData, alerts: wsAlerts } = useWebSocket(convoyId);

  const [convoyData, setConvoyData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showStatusBar, setShowStatusBar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get member ID from session storage
  const memberId = sessionStorage.getItem('memberId');

  // Get location configuration
  const locationConfig = getLocationConfig();

  // Initialize location tracking
  const {
    isTracking,
    lastPosition,
    error: locationError,
    permissionStatus,
    updateCount,
    startTracking,
    stopTracking,
    getCurrentPosition,
    isSupported: isLocationSupported
  } = useLocationTracking(convoyId, memberId, {
    ...locationConfig,
    onLocationUpdate: (position, location) => {
      // Location update handled - no additional logging needed
      // (Main logging happens in locationTrackingDebugger)
    },
    onError: (error) => {
      console.error('Location tracking error:', error);
      // Generate alert for location errors
      generateConvoyAlert('error', 'Location tracking error', error.message);
    }
  });

  // Merge WebSocket alerts with local alerts
  useEffect(() => {
    if (wsAlerts && wsAlerts.length > 0) {
      setAlerts(prevAlerts => {
        const newAlerts = wsAlerts.filter(wsAlert => 
          !prevAlerts.some(existing => existing.id === wsAlert.id)
        );
        return [...prevAlerts, ...newAlerts];
      });
    }
  }, [wsAlerts]);

  const handleDismissAlert = useCallback((alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  // Generate alerts for convoy status events
  const generateConvoyAlert = useCallback((type, message, details = null) => {
    const alert = {
      id: Date.now() + Math.random(), // Ensure unique IDs
      type,
      message,
      timestamp: new Date().toISOString(),
      dismissible: true,
      details
    };

    setAlerts(prev => {
      // Prevent duplicate alerts with same message
      const isDuplicate = prev.some(existing =>
        existing.message === message &&
        Date.now() - new Date(existing.timestamp).getTime() < 30000 // 30 seconds
      );

      if (isDuplicate) return prev;
      return [...prev, alert];
    });
  }, []);

  // Handle location permission issues
  useEffect(() => {
    if (permissionStatus === 'denied') {
      generateConvoyAlert(
        'warning',
        'Location access denied',
        'Your location won\'t be shared with the convoy. Enable location access in your browser settings to participate fully.'
      );
    } else if (!isLocationSupported) {
      generateConvoyAlert(
        'warning',
        'Location not supported',
        'Your browser doesn\'t support location tracking. Your position won\'t be updated automatically.'
      );
    } else if (locationError && !locationError.message.includes('permission')) {
      generateConvoyAlert(
        'error',
        'Location tracking issue',
        locationError.message
      );
    }
  }, [permissionStatus, isLocationSupported, locationError, generateConvoyAlert]);

  // Show success alert when location tracking starts
  useEffect(() => {
    if (isTracking && updateCount === 1) {
      generateConvoyAlert(
        'success',
        'Location tracking active',
        'Your position is being shared with the convoy automatically.'
      );
    }
  }, [isTracking, updateCount, generateConvoyAlert]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.CONVOY_BY_ID(convoyId));
        if (!response.ok) {
          throw new Error('Convoy not found');
        }
        const convoy = await response.json();

        // Transform members' locations and ensure status is set
        const transformedMembers = (convoy.members || []).map(member => ({
          ...member,
          location: [member.location.lat, member.location.lng],
          status: member.status || 'connected' // Ensure all members default to 'connected' status
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
      const response = await fetch(API_ENDPOINTS.CONVOY_DESTINATION(convoyId), {
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

  // Calculate convoy health status for the status indicator
  const getConvoyHealthStatus = useCallback(() => {
    if (!finalConvoyData?.members || finalConvoyData.members.length === 0) return 'empty';

    const totalMembers = finalConvoyData.members.length;
    const connectedMembers = finalConvoyData.members.filter(member => member.status === 'connected').length;
    const laggingMembers = finalConvoyData.members.filter(member => member.status === 'lagging').length;
    const disconnectedMembers = finalConvoyData.members.filter(member => member.status === 'disconnected').length;

    const disconnectedRatio = disconnectedMembers / totalMembers;
    const laggingRatio = laggingMembers / totalMembers;

    if (disconnectedRatio >= 0.5) return 'critical';
    if (disconnectedRatio > 0.2 || laggingRatio >= 0.5) return 'warning';
    if (disconnectedMembers > 0 || laggingMembers > 0) return 'caution';
    return 'healthy';
  }, [finalConvoyData]);

  // Toggle status bar visibility (now handled by MapSidebar)
  const handleToggleStatus = useCallback(() => {
    // This is now handled by the MapSidebar's StatusPanel
    // Keep for backward compatibility but functionality moved to sidebar
  }, []);

  const [showLeaveModal, setShowLeaveModal] = useState({
    show: false,
    memberCount: 0,
    isLeader: false,
    convoyHealth: ''
  });

  const handleLeaveConvoy = async () => {
    const memberCount = finalConvoyData?.members?.length || 0;
    // Find the current member to determine if they are the leader
    const currentMember = finalConvoyData?.members?.find(m => m.id.toString() === memberId);
    const isLeader = currentMember?.name === 'You';

    setShowLeaveModal({
      show: true,
      memberCount,
      isLeader,
      convoyHealth: getConvoyHealthStatus()
    });
  };

  // Extracted leave convoy logic for reuse
  const performLeaveConvoy = async () => {
    // Validate memberId before proceeding
    if (!memberId) {
      console.error('ERROR: No memberId found in session storage');
      alert('Error: Unable to leave convoy. Member ID not found.');
      return;
    }

    // Stop location tracking before leaving
    if (isTracking) {
      stopTracking();
      console.log('Location tracking stopped before leaving convoy');
    }

    // Determine if this is the leader or a regular member
    const currentMember = finalConvoyData?.members?.find(m => m.id.toString() === memberId);
    const isLeader = currentMember?.name === 'You'; // Leaders are named 'You' in this app

    console.log('DEBUG: Performing leave convoy:', {
      memberId,
      currentMember,
      isLeader,
      convoyId
    });

    const response = await fetch(API_ENDPOINTS.CONVOY_MEMBER(convoyId, memberId), {
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

  // Handle location tracking toggle
  const handleToggleLocationTracking = useCallback(() => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking().catch(error => {
        console.error('Failed to start location tracking:', error);
      });
    }
  }, [isTracking, startTracking, stopTracking]);

  return (
    <div className="map-screen">
      <main>
        <MapComponent
          members={finalConvoyData?.members || []}
          destination={finalConvoyData?.destination}
          onDestinationSelect={handleDestinationSelect}
          setShowShareModal={setShowShareModal}
          onLeaveConvoy={handleLeaveConvoy}
          onToggleStatus={handleToggleStatus}
          convoyHealth={getConvoyHealthStatus()}
          alerts={alerts}
          locationTracking={{
            isTracking,
            permissionStatus,
            isSupported: isLocationSupported,
            updateCount,
            onToggleTracking: handleToggleLocationTracking
          }}
        />

        <AlertPanel
          alerts={alerts}
          onDismiss={handleDismissAlert}
          position="bottom-right"
          autoCloseDelay={5000}
        />

        {/* Optional: Member Status Panel - uncomment to enable */}
        {/*
        <MemberStatusPanel
          members={finalConvoyData?.members || []}
          destination={finalConvoyData?.destination}
          position="bottom-right"
          collapsible={true}
          showDetails={false}
        />
        */}
      </main>
      
      {showShareModal && (
        <ShareConvoy convoyId={convoyId} onClose={() => setShowShareModal(false)} />
      )}

      {showLeaveModal.show && (
        <LeaveConvoyModal
          memberCount={showLeaveModal.memberCount}
          isLeader={showLeaveModal.isLeader}
          convoyHealth={showLeaveModal.convoyHealth}
          onConfirm={performLeaveConvoy}
          onCancel={() => setShowLeaveModal({ show: false })}
        />
      )}
    </div>
  );
};

export default ConvoyMap;










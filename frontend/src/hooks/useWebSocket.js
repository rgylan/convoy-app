import { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '../config/api';

const useWebSocket = (convoyId) => {
  const [convoyData, setConvoyData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const webSocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 5;

  const createAlertFromEvent = (eventType, data) => {
    const alertId = Date.now() + Math.random();
    const timestamp = new Date().toISOString();
    
    switch (eventType) {
      case 'MEMBER_LAGGING':
        return {
          id: alertId,
          type: 'warning',
          message: `${data.memberName} is falling behind`,
          details: `Distance: ${data.distance}km from convoy`,
          timestamp,
          dismissible: true
        };
      
      case 'MEMBER_DISCONNECTED':
        return {
          id: alertId,
          type: 'error',
          message: `${data.memberName} has disconnected`,
          details: `Last seen: ${new Date(data.lastSeen).toLocaleTimeString()}`,
          timestamp,
          dismissible: true
        };
      
      case 'CONVOY_SCATTERED':
        return {
          id: alertId,
          type: 'warning',
          message: 'Convoy is scattered',
          details: `${data.scatteredCount} members are far from the group`,
          timestamp,
          dismissible: true
        };
      
      case 'MEMBER_RECONNECTED':
        return {
          id: alertId,
          type: 'success',
          message: `${data.memberName} has reconnected`,
          details: 'Back online and tracking location',
          timestamp,
          dismissible: true
        };

      case 'MEMBER_INACTIVE':
        return {
          id: alertId,
          type: 'info',
          message: `${data.memberName} stopped location tracking`,
          details: 'Still connected but not sharing location',
          timestamp,
          dismissible: true
        };

      case 'MEMBER_REACTIVATED':
        return {
          id: alertId,
          type: 'success',
          message: `${data.memberName} resumed location tracking`,
          details: 'Now actively sharing location again',
          timestamp,
          dismissible: true
        };
      
      default:
        return null;
    }
  };

  useEffect(() => {
    if (!convoyId || isConnectingRef.current) {
      return;
    }

    const connect = () => {
      if (isConnectingRef.current || (webSocketRef.current && webSocketRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      isConnectingRef.current = true;

      try {
        // Get member ID from session storage for connection tracking
        const memberId = sessionStorage.getItem('memberId');
        const baseWsUrl = API_ENDPOINTS.WS_CONVOY(convoyId);
        const wsUrl = memberId
          ? `${baseWsUrl}?memberId=${memberId}`
          : baseWsUrl;

        const ws = new WebSocket(wsUrl);
        webSocketRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected to convoy:', convoyId);
          isConnectingRef.current = false;
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          // Handle alert events
          if (data.eventType && ['MEMBER_LAGGING', 'MEMBER_DISCONNECTED', 'MEMBER_INACTIVE', 'MEMBER_REACTIVATED', 'CONVOY_SCATTERED', 'MEMBER_RECONNECTED'].includes(data.eventType)) {
            const alert = createAlertFromEvent(data.eventType, data);
            if (alert) {
              setAlerts(prev => [...prev, alert]);
            }
            return;
          }
          
          // Handle regular convoy data updates
          const transformedMembers = (data.members || []).map(member => ({
            ...member,
            location: [member.location.lat, member.location.lng],
            status: member.status || 'connected' // Add status field for visual indicators
          }));
          
          // WebSocket location updates received (logging reduced to prevent duplicates)
          // Use browser dev tools Network tab to monitor actual WebSocket traffic
          
          let transformedDestination = null;
          if (data.destination) {
            transformedDestination = {
              ...data.destination,
              location: [data.destination.lat, data.destination.lng]
            };
          }

          setConvoyData({
            ...data,
            members: transformedMembers,
            destination: transformedDestination
          });
        };

        ws.onclose = (event) => {
          console.log('WebSocket disconnected', event.code, event.reason);
          isConnectingRef.current = false;
          
          // Only reconnect for abnormal closures and if not too many attempts
          if (event.code !== 1000 && event.code !== 1001 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            // Use exponential backoff with jitter to prevent thundering herd
            const baseDelay = 1000 * Math.pow(2, reconnectAttemptsRef.current);
            const jitter = Math.random() * 1000; // Add up to 1 second of jitter
            const delay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
            
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          isConnectingRef.current = false;
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        isConnectingRef.current = false;
      }
    };

    connect();

    // Enhanced cleanup function
    return () => {
      isConnectingRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (webSocketRef.current) {
        // Remove event listeners before closing
        webSocketRef.current.onopen = null;
        webSocketRef.current.onmessage = null;
        webSocketRef.current.onclose = null;
        webSocketRef.current.onerror = null;
        
        if (webSocketRef.current.readyState === WebSocket.OPEN) {
          webSocketRef.current.close(1000, 'Component unmounting');
        }
        webSocketRef.current = null;
      }
    };
  }, [convoyId]);

  return { convoyData, alerts };
};

export default useWebSocket;







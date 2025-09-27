import { useState, useEffect, useRef } from 'react';

const useWebSocket = (convoyId) => {
  const [convoyData, setConvoyData] = useState(null);
  const webSocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 5;

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
        if (webSocketRef.current) {
          webSocketRef.current.close();
        }

        const ws = new WebSocket(`ws://localhost:8080/ws/convoys/${convoyId}`);
        webSocketRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          isConnectingRef.current = false;
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          const transformedMembers = (data.members || []).map(member => ({
            ...member,
            location: [member.location.lat, member.location.lng]
          }));
          
          // Log location updates for testing
          transformedMembers.forEach(member => {
            console.log(`WEBSOCKET_LOCATION_UPDATE: Member ${member.id} (${member.name}) at [${member.location[0]}, ${member.location[1]}] - ${new Date().toISOString()}`);
          });
          
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
            
            console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current + 1})`);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.error('Max reconnection attempts reached. Please refresh the page.');
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          isConnectingRef.current = false;
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
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

  return convoyData;
};

export default useWebSocket;







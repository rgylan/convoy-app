/**
 * Automatically detect the appropriate API base URL based on the current environment
 * Supports localhost development, Caddy HTTPS proxy, and custom configurations
 */
const getApiBaseUrl = () => {
  // If environment variable is set, use it (for production or custom setups)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Get the current hostname and protocol from the browser
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // If we're on localhost, use localhost for API (desktop development)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080';
  }

  // If we're accessing via Caddy proxy (HTTPS on IP), use same origin for API
  // Caddy will proxy /api/* requests to the backend
  if (protocol === 'https:' && hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    console.log('🔧 [CADDY] Detected Caddy HTTPS proxy setup');
    return `${protocol}//${hostname}`;
  }

  // If we're on an IP address (mobile testing), use the same IP for API
  return `http://${hostname}:8080`;
};

const getWsBaseUrl = () => {
  // If environment variable is set, use it (for production or custom setups)
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }

  // Get the current hostname and protocol from the browser
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // If we're on localhost, use localhost for WebSocket (desktop development)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://localhost:8080';
  }

  // If we're accessing via Caddy proxy (HTTPS on IP), use WSS with same origin
  // Caddy will proxy /ws/* requests to the backend
  if (protocol === 'https:' && hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    console.log('🔧 [CADDY] Detected Caddy HTTPS proxy setup for WebSocket');
    return `wss://${hostname}`;
  }

  // If we're on an IP address (mobile testing), use the same IP for WebSocket
  return `ws://${hostname}:8080`;
};

const API_BASE_URL = getApiBaseUrl();
const WS_BASE_URL = getWsBaseUrl();

// Log the detected configuration for debugging
console.log('🌐 API Configuration:', {
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  apiBaseUrl: API_BASE_URL,
  wsBaseUrl: WS_BASE_URL,
  detectedSetup: (() => {
    if (window.location.hostname === 'localhost') return 'localhost-dev';
    if (window.location.protocol === 'https:' && window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) return 'caddy-proxy';
    return 'ip-direct';
  })()
});

export const API_ENDPOINTS = {
  CONVOYS: `${API_BASE_URL}/api/convoys`,
  CONVOY_BY_ID: (id) => `${API_BASE_URL}/api/convoys/${id}`,
  CONVOY_MEMBERS: (id) => `${API_BASE_URL}/api/convoys/${id}/members`,
  CONVOY_MEMBER: (convoyId, memberId) => `${API_BASE_URL}/api/convoys/${convoyId}/members/${memberId}`,
  CONVOY_MEMBER_LOCATION: (convoyId, memberId) => `${API_BASE_URL}/api/convoys/${convoyId}/members/${memberId}/location`,
  CONVOY_DESTINATION: (id) => `${API_BASE_URL}/api/convoys/${id}/destination`,
  WS_CONVOY: (id) => `${WS_BASE_URL}/ws/convoys/${id}`
};

// Export base URLs for use in other components
export { API_BASE_URL, WS_BASE_URL };
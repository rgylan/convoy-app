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

  // If we're accessing via HTTPS (Caddy proxy, ngrok, or production), use same origin
  // This covers:
  // - Caddy HTTPS proxy (https://192.168.1.18)
  // - ngrok tunnels (https://xyz.ngrok-free.app or https://xyz.ngrok.app)
  // - Production domains (https://convoy.com.ph)
  if (protocol === 'https:') {
    console.log('🔧 [HTTPS] Detected HTTPS setup - using same origin for API');
    return `${protocol}//${hostname}`;
  }

  // If we're on an IP address (mobile testing without HTTPS), use the same IP for API
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

  // If we're accessing via HTTPS (Caddy proxy, ngrok, or production), use WSS with same origin
  // This covers:
  // - Caddy HTTPS proxy (https://192.168.1.18)
  // - ngrok tunnels (https://xyz.ngrok-free.app or https://xyz.ngrok.app)
  // - Production domains (https://convoy.com.ph)
  if (protocol === 'https:') {
    console.log('🔧 [HTTPS] Detected HTTPS setup - using WSS for WebSocket');
    return `wss://${hostname}`;
  }

  // If we're on an IP address (mobile testing without HTTPS), use the same IP for WebSocket
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
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'localhost-dev';
    if (protocol === 'https:') {
      // Detect specific HTTPS setups
      if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) return 'caddy-local-https';
      if (hostname.includes('ngrok')) return 'ngrok-tunnel';
      return 'https-proxy';
    }
    return 'http-direct';
  })()
});

export const API_ENDPOINTS = {
  CONVOYS: `${API_BASE_URL}/api/convoys`,
  CONVOYS_WITH_VERIFICATION: `${API_BASE_URL}/api/convoys/create-with-verification`,
  CONVOY_VERIFY: (token) => `${API_BASE_URL}/api/convoys/verify/${token}`,
  CONVOY_RESEND_VERIFICATION: (id) => `${API_BASE_URL}/api/convoys/${id}/resend-verification`,
  CONVOY_BY_ID: (id) => `${API_BASE_URL}/api/convoys/${id}`,
  CONVOY_MEMBERS: (id) => `${API_BASE_URL}/api/convoys/${id}/members`,
  CONVOY_MEMBER: (convoyId, memberId) => `${API_BASE_URL}/api/convoys/${convoyId}/members/${memberId}`,
  CONVOY_MEMBER_LOCATION: (convoyId, memberId) => `${API_BASE_URL}/api/convoys/${convoyId}/members/${memberId}/location`,
  CONVOY_DESTINATION: (id) => `${API_BASE_URL}/api/convoys/${id}/destination`,
  WS_CONVOY: (id) => `${WS_BASE_URL}/ws/convoys/${id}`
};

// Export base URLs for use in other components
export { API_BASE_URL, WS_BASE_URL };
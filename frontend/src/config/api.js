const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

export const API_ENDPOINTS = {
  CONVOYS: `${API_BASE_URL}/api/convoys`,
  CONVOY_BY_ID: (id) => `${API_BASE_URL}/api/convoys/${id}`,
  CONVOY_MEMBERS: (id) => `${API_BASE_URL}/api/convoys/${id}/members`,
  CONVOY_MEMBER: (convoyId, memberId) => `${API_BASE_URL}/api/convoys/${convoyId}/members/${memberId}`,
  CONVOY_DESTINATION: (id) => `${API_BASE_URL}/api/convoys/${id}/destination`,
  WS_CONVOY: (id) => `${WS_BASE_URL}/ws/convoys/${id}`
};
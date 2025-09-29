import { API_ENDPOINTS } from '../config/api';

class ConvoyService {
  async createConvoy() {
    const response = await fetch(API_ENDPOINTS.CONVOYS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to create convoy');
    return response.json();
  }

  async joinConvoy(convoyId, member) {
    const response = await fetch(API_ENDPOINTS.CONVOY_MEMBERS(convoyId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
    if (!response.ok) throw new Error('Failed to join convoy');
    return response.json();
  }

  async leaveConvoy(convoyId, memberId) {
    const response = await fetch(API_ENDPOINTS.CONVOY_MEMBER(convoyId, memberId), {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to leave convoy');
  }

  async setDestination(convoyId, destination) {
    const response = await fetch(API_ENDPOINTS.CONVOY_DESTINATION(convoyId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(destination),
    });
    if (!response.ok) throw new Error('Failed to set destination');
  }

  async updateMemberLocation(convoyId, memberId, location) {
    const response = await fetch(API_ENDPOINTS.CONVOY_MEMBER_LOCATION(convoyId, memberId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to update location (HTTP ${response.status}): ${errorText}`);
    }
    return response.json();
  }
}

export default new ConvoyService();
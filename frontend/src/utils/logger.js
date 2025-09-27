// Centralized logging utility for convoy events
class ConvoyLogger {
  static logConvoyCreated(convoyId) {
    const timestamp = new Date().toISOString();
    console.log(`CONVOY_CREATED: Leader started convoy ${convoyId} at ${timestamp}`);
  }

  static logLeaderJoined(convoyId, memberId) {
    const timestamp = new Date().toISOString();
    console.log(`LEADER_JOINED: Leader joined convoy ${convoyId} with member ID ${memberId} at ${timestamp}`);
  }

  static logMemberJoined(convoyId, memberId, memberName) {
    const timestamp = new Date().toISOString();
    console.log(`MEMBER_JOINED: ${memberName} joined convoy ${convoyId} with member ID ${memberId} at ${timestamp}`);
  }

  static logLeaderLeft(convoyId, memberId) {
    const timestamp = new Date().toISOString();
    console.log(`LEADER_LEFT: Leader left convoy ${convoyId}, member ID ${memberId} at ${timestamp}`);
  }

  static logMemberLeft(convoyId, memberId) {
    const timestamp = new Date().toISOString();
    console.log(`MEMBER_LEFT: Member left convoy ${convoyId}, member ID ${memberId} at ${timestamp}`);
  }

  static logDestinationSet(convoyId, destination) {
    const timestamp = new Date().toISOString();
    console.log(`DESTINATION_SET: Destination set for convoy ${convoyId} to [${destination.lat}, ${destination.lng}] at ${timestamp}`);
  }

  static logLocationUpdate(convoyId, memberId, location) {
    const timestamp = new Date().toISOString();
    console.log(`LOCATION_UPDATED: Member ${memberId} in convoy ${convoyId} updated location to [${location.lat}, ${location.lng}] at ${timestamp}`);
  }

  static logWebSocketConnected(convoyId) {
    const timestamp = new Date().toISOString();
    console.log(`WEBSOCKET_CONNECTED: Connected to convoy ${convoyId} WebSocket at ${timestamp}`);
  }

  static logWebSocketDisconnected(convoyId) {
    const timestamp = new Date().toISOString();
    console.log(`WEBSOCKET_DISCONNECTED: Disconnected from convoy ${convoyId} WebSocket at ${timestamp}`);
  }
}

export default ConvoyLogger;
/**
 * Location Duplicate Detection Test
 * 
 * Test utility to verify duplicate detection logic works correctly
 */

// Mock the distance calculation function
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Mock duplicate detection logic
const shouldSendLocationUpdate = (newLocation, lastSent, config) => {
  if (!lastSent) {
    console.log('🆕 First location update, sending...');
    return true; // First update
  }

  const now = Date.now();
  const timeDiff = now - lastSent.timestamp;
  
  const distance = calculateDistance(
    lastSent.lat, lastSent.lng,
    newLocation.lat, newLocation.lng
  );
  
  console.log(`🔍 Duplicate check: distance=${distance.toFixed(1)}m, time=${timeDiff}ms, minDistance=${config.minDistanceMeters}m`);
  
  // Always send if significant distance moved (user actually moved)
  if (distance >= config.minDistanceMeters) {
    console.log(`📍 Distance threshold reached (${distance.toFixed(1)}m >= ${config.minDistanceMeters}m), sending update`);
    return true;
  }
  
  // For identical/very close locations, check if we should send a "heartbeat" update
  const heartbeatInterval = config.heartbeatIntervalMs || 60000; // Default 1 minute heartbeat
  if (timeDiff >= heartbeatInterval) {
    console.log(`💓 Heartbeat update for stationary user (${timeDiff}ms >= ${heartbeatInterval}ms), sending update`);
    return true;
  }
  
  // Skip duplicate - same location within heartbeat period
  console.log(`🚫 Skipping duplicate location update (distance: ${distance.toFixed(1)}m < ${config.minDistanceMeters}m, time: ${timeDiff}ms < ${heartbeatInterval}ms)`);
  return false;
};

// Test scenarios
export const testDuplicateDetection = () => {
  console.group('🧪 Testing Location Duplicate Detection');
  
  const config = {
    minDistanceMeters: 10,
    heartbeatIntervalMs: 60000 // 1 minute
  };
  
  let lastSent = null;
  const baseTime = Date.now();
  
  // Test 1: First update (should send)
  console.log('\n📝 Test 1: First location update');
  const location1 = { lat: 14.675744, lng: 121.038375 };
  const result1 = shouldSendLocationUpdate(location1, lastSent, config);
  console.log(`Result: ${result1 ? '✅ SENT' : '❌ SKIPPED'}`);
  
  if (result1) {
    lastSent = { ...location1, timestamp: baseTime };
  }
  
  // Test 2: Same location after 5 seconds (should skip)
  console.log('\n📝 Test 2: Same location after 5 seconds');
  const location2 = { lat: 14.675744, lng: 121.038375 }; // Identical
  lastSent.timestamp = baseTime; // Reset timestamp
  const mockNow = baseTime + 5000; // 5 seconds later
  Date.now = () => mockNow;
  const result2 = shouldSendLocationUpdate(location2, lastSent, config);
  console.log(`Result: ${result2 ? '✅ SENT' : '❌ SKIPPED'}`);
  
  // Test 3: Same location after 65 seconds (should send heartbeat)
  console.log('\n📝 Test 3: Same location after 65 seconds (heartbeat)');
  const location3 = { lat: 14.675744, lng: 121.038375 }; // Identical
  const mockNow2 = baseTime + 65000; // 65 seconds later
  Date.now = () => mockNow2;
  const result3 = shouldSendLocationUpdate(location3, lastSent, config);
  console.log(`Result: ${result3 ? '✅ SENT' : '❌ SKIPPED'}`);
  
  if (result3) {
    lastSent = { ...location3, timestamp: mockNow2 };
  }
  
  // Test 4: Moved 15 meters (should send immediately)
  console.log('\n📝 Test 4: Moved 15 meters');
  const location4 = { lat: 14.675880, lng: 121.038375 }; // ~15m north
  const mockNow3 = mockNow2 + 5000; // 5 seconds after heartbeat
  Date.now = () => mockNow3;
  const result4 = shouldSendLocationUpdate(location4, lastSent, config);
  console.log(`Result: ${result4 ? '✅ SENT' : '❌ SKIPPED'}`);
  
  // Test 5: Moved 5 meters (should skip - GPS noise)
  console.log('\n📝 Test 5: Moved 5 meters (GPS noise)');
  const location5 = { lat: 14.675925, lng: 121.038375 }; // ~5m north from location4
  if (result4) {
    lastSent = { ...location4, timestamp: mockNow3 };
  }
  const mockNow4 = mockNow3 + 10000; // 10 seconds later
  Date.now = () => mockNow4;
  const result5 = shouldSendLocationUpdate(location5, lastSent, config);
  console.log(`Result: ${result5 ? '✅ SENT' : '❌ SKIPPED'}`);
  
  console.groupEnd();
  
  // Restore original Date.now
  Date.now = () => new Date().getTime();
  
  return {
    test1_firstUpdate: result1,
    test2_sameLocationShortTime: result2,
    test3_heartbeat: result3,
    test4_significantMovement: result4,
    test5_gpsNoise: result5
  };
};

// Expected results:
// Test 1: ✅ SENT (first update)
// Test 2: ❌ SKIPPED (same location, too soon)
// Test 3: ✅ SENT (heartbeat after 1 minute)
// Test 4: ✅ SENT (moved 15m > 10m threshold)
// Test 5: ❌ SKIPPED (moved 5m < 10m threshold, within heartbeat period)

// Make available in browser console
if (typeof window !== 'undefined') {
  window.testLocationDuplicates = testDuplicateDetection;
  console.log('🧪 Location duplicate test available as window.testLocationDuplicates()');
}

export default testDuplicateDetection;

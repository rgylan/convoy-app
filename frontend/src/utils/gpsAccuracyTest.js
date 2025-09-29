/**
 * GPS Accuracy Test - Simulate GPS jitter scenarios
 * 
 * Tests the improved duplicate detection logic with GPS accuracy filtering
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

// Mock improved duplicate detection logic
const shouldSendLocationUpdate = (newLocation, accuracy, lastSent, config) => {
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
  
  // Calculate GPS accuracy threshold
  const gpsAccuracy = accuracy || 50;
  const accuracyThreshold = Math.max(config.minDistanceMeters, gpsAccuracy * 0.5);
  
  console.log(`🔍 Duplicate check: distance=${distance.toFixed(1)}m, time=${timeDiff}ms, minDistance=${config.minDistanceMeters}m, gpsAccuracy=${gpsAccuracy}m, threshold=${accuracyThreshold.toFixed(1)}m`);
  
  // Check for GPS jitter
  if (distance < accuracyThreshold && gpsAccuracy > 100) {
    console.log(`🌊 GPS jitter detected (distance: ${distance.toFixed(1)}m < threshold: ${accuracyThreshold.toFixed(1)}m, accuracy: ${gpsAccuracy}m), skipping update`);
    return false;
  }
  
  // Send if significant distance moved
  if (distance >= config.minDistanceMeters) {
    // Additional check for rapid updates with poor GPS accuracy
    if (gpsAccuracy > 150 && timeDiff < 5000) {
      console.log(`⚠️ Poor GPS accuracy (${gpsAccuracy}m) with rapid update (${timeDiff}ms), requiring larger movement`);
      const poorGpsThreshold = Math.max(config.minDistanceMeters * 2, gpsAccuracy * 0.3);
      if (distance < poorGpsThreshold) {
        console.log(`🚫 Movement too small for poor GPS (${distance.toFixed(1)}m < ${poorGpsThreshold.toFixed(1)}m), skipping`);
        return false;
      }
    }
    
    console.log(`📍 Distance threshold reached (${distance.toFixed(1)}m >= ${config.minDistanceMeters}m), sending update`);
    return true;
  }
  
  // Heartbeat logic
  const heartbeatInterval = config.heartbeatIntervalMs || 60000;
  if (timeDiff >= heartbeatInterval) {
    console.log(`💓 Heartbeat update for stationary user (${timeDiff}ms >= ${heartbeatInterval}ms), sending update`);
    return true;
  }
  
  console.log(`🚫 Skipping duplicate location update (distance: ${distance.toFixed(1)}m < ${config.minDistanceMeters}m, time: ${timeDiff}ms < ${heartbeatInterval}ms)`);
  return false;
};

// Test scenarios
export const testGpsAccuracyFiltering = () => {
  console.group('🧪 Testing GPS Accuracy Filtering');
  
  const config = {
    minDistanceMeters: 10,
    heartbeatIntervalMs: 60000
  };
  
  let lastSent = null;
  const baseTime = Date.now();
  
  // Test 1: First update (should send)
  console.log('\n📝 Test 1: First location update');
  const location1 = { lat: 14.675860, lng: 121.038376 };
  const result1 = shouldSendLocationUpdate(location1, 50, lastSent, config);
  console.log(`Result: ${result1 ? '✅ SENT' : '❌ SKIPPED'}`);
  
  if (result1) {
    lastSent = { ...location1, timestamp: baseTime };
  }
  
  // Test 2: GPS jitter with poor accuracy (should skip)
  console.log('\n📝 Test 2: GPS jitter with 187m accuracy (27.9m movement)');
  const location2 = { lat: 14.675860 + 0.00025, lng: 121.038376 }; // ~27.9m movement
  lastSent.timestamp = baseTime;
  const mockNow = baseTime + 1000; // 1 second later
  Date.now = () => mockNow;
  const result2 = shouldSendLocationUpdate(location2, 187, lastSent, config);
  console.log(`Result: ${result2 ? '✅ SENT' : '❌ SKIPPED'}`);
  
  // Test 3: Same movement with good GPS accuracy (should send)
  console.log('\n📝 Test 3: Same 27.9m movement with 30m accuracy');
  const location3 = { lat: 14.675860 + 0.00025, lng: 121.038376 };
  const mockNow2 = mockNow + 1000; // 1 second later
  Date.now = () => mockNow2;
  const result3 = shouldSendLocationUpdate(location3, 30, lastSent, config);
  console.log(`Result: ${result3 ? '✅ SENT' : '❌ SKIPPED'}`);
  
  if (result3) {
    lastSent = { ...location3, timestamp: mockNow2 };
  }
  
  // Test 4: Rapid updates with poor GPS (should require larger movement)
  console.log('\n📝 Test 4: Rapid update with poor GPS (15m movement, 200m accuracy)');
  const location4 = { lat: 14.675860 + 0.000135, lng: 121.038376 }; // ~15m movement
  const mockNow3 = mockNow2 + 2000; // 2 seconds later (rapid)
  Date.now = () => mockNow3;
  const result4 = shouldSendLocationUpdate(location4, 200, lastSent, config);
  console.log(`Result: ${result4 ? '✅ SENT' : '❌ SKIPPED'}`);
  
  // Test 5: Large movement with poor GPS (should send)
  console.log('\n📝 Test 5: Large movement with poor GPS (100m movement, 200m accuracy)');
  const location5 = { lat: 14.675860 + 0.0009, lng: 121.038376 }; // ~100m movement
  const mockNow4 = mockNow3 + 2000; // 2 seconds later
  Date.now = () => mockNow4;
  const result5 = shouldSendLocationUpdate(location5, 200, lastSent, config);
  console.log(`Result: ${result5 ? '✅ SENT' : '❌ SKIPPED'}`);
  
  console.groupEnd();
  
  // Restore original Date.now
  Date.now = () => new Date().getTime();
  
  return {
    test1_firstUpdate: result1,
    test2_gpsJitter: result2,
    test3_goodAccuracy: result3,
    test4_rapidPoorGps: result4,
    test5_largeMovePoorgps: result5
  };
};

// Expected results:
// Test 1: ✅ SENT (first update)
// Test 2: ❌ SKIPPED (GPS jitter with poor accuracy)
// Test 3: ✅ SENT (same movement with good accuracy)
// Test 4: ❌ SKIPPED (rapid update with poor GPS, movement too small)
// Test 5: ✅ SENT (large movement overcomes poor GPS)

// Make available in browser console
if (typeof window !== 'undefined') {
  window.testGpsAccuracy = testGpsAccuracyFiltering;
  console.log('🧪 GPS accuracy test available as window.testGpsAccuracy()');
}

export default testGpsAccuracyFiltering;

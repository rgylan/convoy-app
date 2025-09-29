/**
 * Test utility for location tracking functionality
 * 
 * This utility helps test the location tracking implementation
 * with mock data and provides debugging information.
 */

import locationService from '../services/locationService';
import convoyService from '../services/convoyService';
import { LOCATION_PRESETS } from '../config/locationConfig';

/**
 * Test location service with mock data
 */
export const testLocationServiceMock = async () => {
  console.log('🧪 Testing Location Service with Mock Data');
  
  // Configure for mock mode
  locationService.configure(LOCATION_PRESETS.mock);
  
  return new Promise((resolve, reject) => {
    let updateCount = 0;
    const maxUpdates = 3;
    
    const onLocationUpdate = (position) => {
      updateCount++;
      console.log(`📍 Mock Location Update ${updateCount}:`, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: new Date(position.timestamp).toISOString()
      });
      
      if (updateCount >= maxUpdates) {
        locationService.stopTracking();
        console.log('✅ Mock location test completed successfully');
        resolve({ success: true, updateCount });
      }
    };
    
    const onError = (error) => {
      console.error('❌ Mock location test failed:', error);
      locationService.stopTracking();
      reject(error);
    };
    
    locationService.startTracking(onLocationUpdate, onError)
      .catch(reject);
  });
};

/**
 * Test convoy service location update
 */
export const testConvoyLocationUpdate = async (convoyId, memberId) => {
  console.log('🧪 Testing Convoy Location Update');
  
  const testLocation = {
    lat: 14.5995,
    lng: 120.9842
  };
  
  try {
    const result = await convoyService.updateMemberLocation(convoyId, memberId, testLocation);
    console.log('✅ Convoy location update successful:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Convoy location update failed:', error);
    throw error;
  }
};

/**
 * Test full location tracking flow
 */
export const testFullLocationTracking = async (convoyId, memberId) => {
  console.log('🧪 Testing Full Location Tracking Flow');
  
  // Import the hook dynamically (for testing outside React components)
  const { default: useLocationTracking } = await import('../hooks/useLocationTracking');
  
  // Note: This is a simplified test - in real usage, the hook would be used within a React component
  console.log('📝 Location tracking hook imported successfully');
  console.log('ℹ️  For full testing, use the hook within a React component');
  
  return { success: true, message: 'Hook import successful' };
};

/**
 * Test geolocation API availability
 */
export const testGeolocationSupport = () => {
  console.log('🧪 Testing Geolocation Support');
  
  const isSupported = locationService.isGeolocationSupported();
  const status = locationService.getStatus();
  
  console.log('📊 Geolocation Status:', {
    isSupported,
    status
  });
  
  if (isSupported) {
    console.log('✅ Geolocation is supported');
  } else {
    console.log('❌ Geolocation is not supported');
  }
  
  return { isSupported, status };
};

/**
 * Test location permission request
 */
export const testLocationPermission = async () => {
  console.log('🧪 Testing Location Permission');
  
  try {
    const hasPermission = await locationService.requestPermission();
    console.log('✅ Location permission granted:', hasPermission);
    return { success: true, hasPermission };
  } catch (error) {
    console.log('❌ Location permission denied or failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Run all tests
 */
export const runAllLocationTests = async (convoyId = null, memberId = null) => {
  console.log('🚀 Running All Location Tracking Tests');
  console.log('=====================================');
  
  const results = {};
  
  try {
    // Test 1: Geolocation support
    console.log('\n1️⃣ Testing Geolocation Support...');
    results.geolocationSupport = testGeolocationSupport();
    
    // Test 2: Location permission (only if supported)
    if (results.geolocationSupport.isSupported) {
      console.log('\n2️⃣ Testing Location Permission...');
      results.locationPermission = await testLocationPermission();
    }
    
    // Test 3: Mock location service
    console.log('\n3️⃣ Testing Mock Location Service...');
    results.mockLocationService = await testLocationServiceMock();
    
    // Test 4: Convoy location update (only if convoy/member provided)
    if (convoyId && memberId) {
      console.log('\n4️⃣ Testing Convoy Location Update...');
      results.convoyLocationUpdate = await testConvoyLocationUpdate(convoyId, memberId);
    }
    
    // Test 5: Full location tracking flow
    console.log('\n5️⃣ Testing Full Location Tracking Flow...');
    results.fullLocationTracking = await testFullLocationTracking(convoyId, memberId);
    
    console.log('\n🎉 All tests completed!');
    console.log('📊 Test Results:', results);
    
    return results;
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    results.error = error.message;
    return results;
  }
};

/**
 * Helper function to create a test convoy and member
 */
export const createTestConvoyAndMember = async () => {
  console.log('🏗️ Creating test convoy and member...');
  
  try {
    // Create convoy
    const convoy = await convoyService.createConvoy();
    console.log('✅ Test convoy created:', convoy.id);
    
    // Add test member
    const member = await convoyService.joinConvoy(convoy.id, {
      name: 'Test User',
      location: { lat: 14.5995, lng: 120.9842 }
    });
    console.log('✅ Test member added:', member.id);
    
    return { convoyId: convoy.id, memberId: member.id };
    
  } catch (error) {
    console.error('❌ Failed to create test convoy/member:', error);
    throw error;
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.locationTrackingTests = {
    testLocationServiceMock,
    testConvoyLocationUpdate,
    testFullLocationTracking,
    testGeolocationSupport,
    testLocationPermission,
    runAllLocationTests,
    createTestConvoyAndMember
  };
  
  console.log('🔧 Location tracking tests available in window.locationTrackingTests');
}

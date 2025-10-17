/**
 * Test utilities for reverse geocoding functionality
 * 
 * This file provides testing functions to verify the reverse geocoding
 * service is working correctly with various Philippine locations.
 */

import reverseGeocodingService from '../services/reverseGeocodingService';

/**
 * Test reverse geocoding with known Philippine locations
 */
export const testPhilippineLocations = async () => {
  console.log('🧪 Testing reverse geocoding with Philippine locations...');
  
  const testLocations = [
    { name: 'Manila', lat: 14.5995, lng: 120.9842 },
    { name: 'Makati City', lat: 14.5547, lng: 121.0244 },
    { name: 'Quezon City', lat: 14.6760, lng: 121.0437 },
    { name: 'Cebu City', lat: 10.3157, lng: 123.8854 },
    { name: 'Davao City', lat: 7.1907, lng: 125.4553 },
  ];
  
  const results = [];
  
  for (const location of testLocations) {
    try {
      console.log(`🔍 Testing ${location.name}...`);
      
      const startTime = Date.now();
      const result = await reverseGeocodingService.getLocationName(location.lat, location.lng);
      const duration = Date.now() - startTime;
      
      const testResult = {
        expected: location.name,
        coordinates: `${location.lat}, ${location.lng}`,
        result,
        duration,
        success: true
      };
      
      results.push(testResult);
      console.log(`✅ ${location.name}: ${result} (${duration}ms)`);
      
    } catch (error) {
      const testResult = {
        expected: location.name,
        coordinates: `${location.lat}, ${location.lng}`,
        result: null,
        error: error.message,
        success: false
      };
      
      results.push(testResult);
      console.error(`❌ ${location.name}: ${error.message}`);
    }
    
    // Add delay between requests to respect rate limiting
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
  
  // Print summary
  console.log('\n📊 Test Results Summary:');
  console.table(results);
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Successful: ${successCount}/${results.length}`);
  console.log(`❌ Failed: ${results.length - successCount}/${results.length}`);
  
  // Print service stats
  console.log('\n📈 Service Statistics:');
  console.log(reverseGeocodingService.getStats());
  
  return results;
};

/**
 * Test caching behavior
 */
export const testCaching = async () => {
  console.log('🧪 Testing caching behavior...');
  
  const testLat = 14.5995;
  const testLng = 120.9842;
  
  // Clear cache first
  reverseGeocodingService.clearCache();
  
  // First request (should hit API)
  console.log('🌐 First request (should hit API)...');
  const start1 = Date.now();
  const result1 = await reverseGeocodingService.getLocationName(testLat, testLng);
  const duration1 = Date.now() - start1;
  
  // Second request (should hit cache)
  console.log('💾 Second request (should hit cache)...');
  const start2 = Date.now();
  const result2 = await reverseGeocodingService.getLocationName(testLat, testLng);
  const duration2 = Date.now() - start2;
  
  console.log(`First request: ${result1} (${duration1}ms)`);
  console.log(`Second request: ${result2} (${duration2}ms)`);
  console.log(`Cache hit speedup: ${Math.round(duration1 / duration2)}x faster`);
  
  // Verify results are identical
  const cacheWorking = result1 === result2 && duration2 < duration1;
  console.log(`Cache working: ${cacheWorking ? '✅' : '❌'}`);
  
  return {
    result1,
    result2,
    duration1,
    duration2,
    cacheWorking
  };
};

/**
 * Test error handling with invalid coordinates
 */
export const testErrorHandling = async () => {
  console.log('🧪 Testing error handling...');
  
  const invalidLocations = [
    { name: 'Invalid coordinates', lat: 999, lng: 999 },
    { name: 'Ocean location', lat: 0, lng: 0 },
    { name: 'Antarctica', lat: -90, lng: 0 },
  ];
  
  const results = [];
  
  for (const location of invalidLocations) {
    try {
      console.log(`🔍 Testing ${location.name}...`);
      
      const result = await reverseGeocodingService.getLocationName(location.lat, location.lng);
      
      results.push({
        name: location.name,
        coordinates: `${location.lat}, ${location.lng}`,
        result,
        success: true
      });
      
      console.log(`✅ ${location.name}: ${result}`);
      
    } catch (error) {
      results.push({
        name: location.name,
        coordinates: `${location.lat}, ${location.lng}`,
        error: error.message,
        success: false
      });
      
      console.log(`❌ ${location.name}: ${error.message}`);
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
  
  console.log('\n📊 Error Handling Results:');
  console.table(results);
  
  return results;
};

/**
 * Run all tests
 */
export const runAllTests = async () => {
  console.log('🚀 Running all reverse geocoding tests...\n');
  
  try {
    // Test service initialization
    console.log('📋 Service Stats:', reverseGeocodingService.getStats());
    
    // Test basic functionality
    const basicTest = await reverseGeocodingService.testService();
    console.log('✅ Basic test passed:', basicTest);
    
    // Test Philippine locations
    await testPhilippineLocations();
    
    // Test caching
    await testCaching();
    
    // Test error handling
    await testErrorHandling();
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  }
};

// Export for window access in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.testReverseGeocoding = {
    testPhilippineLocations,
    testCaching,
    testErrorHandling,
    runAllTests
  };
  
  console.log('🔧 Reverse geocoding tests available in window.testReverseGeocoding');
}

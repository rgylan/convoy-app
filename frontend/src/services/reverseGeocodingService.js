/**
 * Reverse Geocoding Service - Convert coordinates to human-readable location names
 * 
 * Features:
 * - Uses Nominatim API (OpenStreetMap) for reverse geocoding
 * - In-memory caching with LRU eviction and expiration
 * - Request deduplication and throttling
 * - Graceful error handling with coordinate fallback
 * - Philippines-focused results with countrycodes=ph
 * - Respects Nominatim usage policy (1 request/second max)
 */

class ReverseGeocodingService {
  constructor() {
    // Cache configuration
    this.cache = new Map(); // { key: { data, timestamp, accessTime } }
    this.maxCacheSize = 100; // Maximum number of cached entries
    this.cacheExpirationMs = 3600000; // 1 hour cache expiration
    
    // Request management
    this.requestQueue = new Map(); // Prevent duplicate simultaneous requests
    this.lastRequestTime = 0; // For rate limiting
    this.minRequestInterval = 1000; // 1 second between requests (Nominatim policy)
    
    // API configuration
    this.apiTimeout = 5000; // 5 second timeout
    this.baseUrl = 'https://nominatim.openstreetmap.org/reverse';
    
    // User-Agent header for Nominatim compliance
    this.userAgent = 'ConvoyApp/1.0 (https://convoy-app.com)';
    
    console.log('🗺️ Reverse Geocoding Service initialized');
  }

  /**
   * Get human-readable location name from coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<string>} Location name or coordinate fallback
   */
  async getLocationName(lat, lng) {
    try {
      // Generate cache key with 4 decimal precision for reasonable grouping
      const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      
      // Check cache first
      const cachedResult = this._getCachedResult(cacheKey);
      if (cachedResult) {
        console.log(`📍 Cache hit for ${cacheKey}: ${cachedResult}`);
        return cachedResult;
      }
      
      // Check if request is already in progress
      if (this.requestQueue.has(cacheKey)) {
        console.log(`⏳ Request already in progress for ${cacheKey}`);
        return await this.requestQueue.get(cacheKey);
      }
      
      // Create new request promise
      const requestPromise = this._fetchLocationName(lat, lng, cacheKey);
      this.requestQueue.set(cacheKey, requestPromise);
      
      try {
        const result = await requestPromise;
        
        // Cache the result
        this._cacheResult(cacheKey, result);
        
        console.log(`✅ Geocoded ${cacheKey}: ${result}`);
        return result;
        
      } finally {
        // Always clean up the request queue
        this.requestQueue.delete(cacheKey);
      }
      
    } catch (error) {
      console.warn('⚠️ Reverse geocoding failed:', error.message);
      // Return coordinate fallback on any error
      return this._formatCoordinateFallback(lat, lng);
    }
  }

  /**
   * Internal method to fetch location name from API
   * @private
   */
  async _fetchLocationName(lat, lng, cacheKey) {
    // Implement rate limiting
    await this._enforceRateLimit();
    
    const url = new URL(this.baseUrl);
    url.searchParams.set('format', 'json');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', 'ph'); // Focus on Philippines
    url.searchParams.set('zoom', '14'); // City/town level detail
    
    console.log(`🌐 Fetching location for ${cacheKey}:`, url.toString());
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Extract location name from response
      const locationName = this._extractLocationName(data);
      
      if (locationName) {
        return locationName;
      } else {
        console.warn('⚠️ No location name found in response:', data);
        return this._formatCoordinateFallback(lat, lng);
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      } else {
        throw error;
      }
    }
  }

  /**
   * Extract the most appropriate location name from Nominatim response
   * @private
   */
  _extractLocationName(data) {
    if (!data || !data.address) {
      return null;
    }
    
    const address = data.address;
    
    // Fallback hierarchy: city → municipality → county → state → country
    const locationHierarchy = [
      address.city,
      address.municipality,
      address.town,
      address.village,
      address.county,
      address.state,
      address.country
    ];
    
    // Return the first non-empty location name
    for (const location of locationHierarchy) {
      if (location && location.trim()) {
        return location.trim();
      }
    }
    
    // If no structured address found, try display_name
    if (data.display_name) {
      // Extract first part of display name (usually the most specific location)
      const firstPart = data.display_name.split(',')[0];
      if (firstPart && firstPart.trim()) {
        return firstPart.trim();
      }
    }
    
    return null;
  }

  /**
   * Get cached result if valid and not expired
   * @private
   */
  _getCachedResult(cacheKey) {
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    
    // Check if expired
    if (now - cached.timestamp > this.cacheExpirationMs) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    // Update access time for LRU
    cached.accessTime = now;
    
    return cached.data;
  }

  /**
   * Cache the result with LRU eviction
   * @private
   */
  _cacheResult(cacheKey, data) {
    const now = Date.now();
    
    // Add to cache
    this.cache.set(cacheKey, {
      data,
      timestamp: now,
      accessTime: now,
    });
    
    // Implement LRU eviction if cache is full
    if (this.cache.size > this.maxCacheSize) {
      this._evictLRU();
    }
  }

  /**
   * Evict least recently used cache entry
   * @private
   */
  _evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, value] of this.cache.entries()) {
      if (value.accessTime < oldestTime) {
        oldestTime = value.accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ Evicted LRU cache entry: ${oldestKey}`);
    }
  }

  /**
   * Enforce rate limiting (1 request per second)
   * @private
   */
  async _enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Format coordinate fallback string
   * @private
   */
  _formatCoordinateFallback(lat, lng) {
    return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
  }

  /**
   * Get service statistics for debugging
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      activeRequests: this.requestQueue.size,
      lastRequestTime: this.lastRequestTime,
    };
  }

  /**
   * Clear cache (for testing or memory management)
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 Reverse geocoding cache cleared');
  }

  /**
   * Test the service with a known location (for debugging)
   */
  async testService() {
    console.log('🧪 Testing reverse geocoding service...');

    try {
      // Test with Manila coordinates
      const result = await this.getLocationName(14.5995, 120.9842);
      console.log('✅ Test successful:', result);

      // Log service stats
      console.log('📊 Service stats:', this.getStats());

      return result;
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const reverseGeocodingService = new ReverseGeocodingService();

// Add service to window for debugging (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.reverseGeocodingService = reverseGeocodingService;
  console.log('🔧 Reverse geocoding service available in window.reverseGeocodingService');
}

export default reverseGeocodingService;

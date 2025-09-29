/**
 * Location Tracking Debugger
 * 
 * Utility for debugging location tracking issues including:
 * - Rapid start/stop cycles
 * - Duplicate location updates
 * - Performance monitoring
 */

class LocationTrackingDebugger {
  constructor() {
    this.events = [];
    this.maxEvents = 100; // Keep last 100 events
    this.startTime = Date.now();
    this.locationHistory = [];
    this.duplicateCount = 0;
    this.restartCount = 0;
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  /**
   * Log a location tracking event
   */
  logEvent(type, data = {}) {
    if (!this.isEnabled) return;

    const event = {
      timestamp: Date.now(),
      relativeTime: Date.now() - this.startTime,
      type,
      data: { ...data }
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Special handling for different event types
    switch (type) {
      case 'TRACKING_STARTED':
        this.restartCount++;
        console.log(`🚀 [${this.restartCount}] Location tracking started:`, data);
        break;
      
      case 'TRACKING_STOPPED':
        console.log('🛑 Location tracking stopped:', data);
        break;
      
      case 'LOCATION_UPDATE':
        this.handleLocationUpdate(data);
        break;
      
      case 'DUPLICATE_DETECTED':
        this.duplicateCount++;
        console.log(`🔄 [${this.duplicateCount}] Duplicate location detected:`, data);
        break;
      
      case 'ERROR':
        console.error('❌ Location tracking error:', data);
        break;
      
      default:
        console.log(`📍 ${type}:`, data);
    }
  }

  /**
   * Handle location update events
   */
  handleLocationUpdate(data) {
    const location = {
      lat: data.lat,
      lng: data.lng,
      timestamp: Date.now(),
      accuracy: data.accuracy
    };

    this.locationHistory.push(location);

    // Keep only recent locations
    if (this.locationHistory.length > 50) {
      this.locationHistory.shift();
    }

    // Check for rapid updates
    const recentUpdates = this.locationHistory.filter(
      loc => Date.now() - loc.timestamp < 5000 // Last 5 seconds
    );

    if (recentUpdates.length > 3) {
      console.warn(`⚠️ Rapid location updates detected: ${recentUpdates.length} updates in 5 seconds`);
    }

    console.log(`📍 Location update sent: [${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}] accuracy: ${data.accuracy}m - ${new Date().toISOString()}`);
  }

  /**
   * Get debugging statistics
   */
  getStats() {
    const now = Date.now();
    const totalTime = now - this.startTime;
    
    const eventCounts = this.events.reduce((counts, event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
      return counts;
    }, {});

    const recentEvents = this.events.filter(
      event => now - event.timestamp < 60000 // Last minute
    );

    const locationUpdates = this.events.filter(e => e.type === 'LOCATION_UPDATE');
    const avgUpdateInterval = locationUpdates.length > 1 
      ? (locationUpdates[locationUpdates.length - 1].timestamp - locationUpdates[0].timestamp) / (locationUpdates.length - 1)
      : 0;

    return {
      totalTime: Math.round(totalTime / 1000), // seconds
      totalEvents: this.events.length,
      eventCounts,
      recentEvents: recentEvents.length,
      restartCount: this.restartCount,
      duplicateCount: this.duplicateCount,
      locationUpdates: locationUpdates.length,
      avgUpdateInterval: Math.round(avgUpdateInterval),
      lastUpdate: locationUpdates.length > 0 
        ? new Date(locationUpdates[locationUpdates.length - 1].timestamp).toISOString()
        : null
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(minutes = 5) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.events.filter(event => event.timestamp > cutoff);
  }

  /**
   * Detect rapid start/stop cycles
   */
  detectRapidCycles() {
    const recentEvents = this.getRecentEvents(1); // Last minute
    const startEvents = recentEvents.filter(e => e.type === 'TRACKING_STARTED');
    const stopEvents = recentEvents.filter(e => e.type === 'TRACKING_STOPPED');
    
    const cycles = Math.min(startEvents.length, stopEvents.length);
    
    if (cycles > 2) {
      console.warn(`🔄 Rapid start/stop cycles detected: ${cycles} cycles in last minute`);
      return {
        detected: true,
        cycles,
        startEvents: startEvents.length,
        stopEvents: stopEvents.length
      };
    }
    
    return { detected: false, cycles: 0 };
  }

  /**
   * Analyze location update patterns
   */
  analyzeUpdatePatterns() {
    const updates = this.events.filter(e => e.type === 'LOCATION_UPDATE');
    
    if (updates.length < 2) {
      return { insufficient_data: true };
    }

    const intervals = [];
    for (let i = 1; i < updates.length; i++) {
      intervals.push(updates[i].timestamp - updates[i-1].timestamp);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const minInterval = Math.min(...intervals);
    const maxInterval = Math.max(...intervals);

    // Check for duplicates
    const duplicates = this.events.filter(e => e.type === 'DUPLICATE_DETECTED').length;

    return {
      totalUpdates: updates.length,
      avgInterval: Math.round(avgInterval),
      minInterval,
      maxInterval,
      duplicates,
      intervals: intervals.slice(-10) // Last 10 intervals
    };
  }

  /**
   * Generate a comprehensive report
   */
  generateReport() {
    const stats = this.getStats();
    const cycles = this.detectRapidCycles();
    const patterns = this.analyzeUpdatePatterns();

    const report = {
      timestamp: new Date().toISOString(),
      summary: stats,
      rapidCycles: cycles,
      updatePatterns: patterns,
      recentEvents: this.getRecentEvents(2).map(e => ({
        type: e.type,
        timestamp: new Date(e.timestamp).toISOString(),
        data: e.data
      }))
    };

    console.group('📊 Location Tracking Debug Report');
    console.log('Summary:', stats);
    console.log('Rapid Cycles:', cycles);
    console.log('Update Patterns:', patterns);
    console.groupEnd();

    return report;
  }

  /**
   * Clear all debugging data
   */
  clear() {
    this.events = [];
    this.locationHistory = [];
    this.duplicateCount = 0;
    this.restartCount = 0;
    this.startTime = Date.now();
    console.log('🧹 Location tracking debug data cleared');
  }

  /**
   * Enable/disable debugging
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🔧 Location tracking debugging ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create singleton instance
const locationTrackingDebugger = new LocationTrackingDebugger();

// Export for use in other modules
export default locationTrackingDebugger;

// Make available in browser console for debugging
if (typeof window !== 'undefined') {
  window.locationDebugger = locationTrackingDebugger;
  console.log('🔧 Location tracking debugger available as window.locationDebugger');
}

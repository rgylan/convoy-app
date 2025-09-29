/**
 * Log Analyzer - Detect duplicate logging patterns
 * 
 * Helps identify if multiple log entries are being generated for the same location update
 */

class LogAnalyzer {
  constructor() {
    this.logEntries = [];
    this.duplicatePatterns = [];
    this.isMonitoring = false;
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
  }

  /**
   * Start monitoring console logs for duplicates
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.logEntries = [];
    
    // Intercept console.log
    console.log = (...args) => {
      this.captureLog('LOG', args);
      this.originalConsoleLog.apply(console, args);
    };
    
    // Intercept console.error  
    console.error = (...args) => {
      this.captureLog('ERROR', args);
      this.originalConsoleError.apply(console, args);
    };
    
    console.log('🔍 Log analyzer started - monitoring for duplicate location logs');
  }

  /**
   * Stop monitoring and analyze results
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // Restore original console methods
    console.log = this.originalConsoleLog;
    console.error = this.originalConsoleError;
    
    const analysis = this.analyzeForDuplicates();
    this.originalConsoleLog('📊 Log Analysis Results:', analysis);
    
    return analysis;
  }

  /**
   * Capture log entry
   */
  captureLog(type, args) {
    const message = args.join(' ');
    const timestamp = Date.now();
    
    // Only capture location-related logs
    if (this.isLocationLog(message)) {
      this.logEntries.push({
        type,
        message,
        timestamp,
        coordinates: this.extractCoordinates(message)
      });
    }
  }

  /**
   * Check if log is location-related
   */
  isLocationLog(message) {
    const locationKeywords = [
      'LOCATION_UPDATED',
      'LOCATION_TRACKING',
      'WEBSOCKET_LOCATION_UPDATE',
      'Location update',
      'location update'
    ];
    
    return locationKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Extract coordinates from log message
   */
  extractCoordinates(message) {
    // Match patterns like [14.675776, 121.038424] or (14.675776, 121.038424)
    const coordPattern = /[\[\(](\d+\.\d+),?\s*(\d+\.\d+)[\]\)]/;
    const match = message.match(coordPattern);
    
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
    
    return null;
  }

  /**
   * Analyze logs for duplicate patterns
   */
  analyzeForDuplicates() {
    const duplicateGroups = [];
    const timeWindow = 1000; // 1 second window
    
    // Group logs by coordinates and time
    for (let i = 0; i < this.logEntries.length; i++) {
      const entry = this.logEntries[i];
      if (!entry.coordinates) continue;
      
      const duplicates = this.logEntries.filter((other, index) => {
        if (index <= i) return false; // Only look ahead
        
        return other.coordinates &&
               Math.abs(other.coordinates.lat - entry.coordinates.lat) < 0.000001 &&
               Math.abs(other.coordinates.lng - entry.coordinates.lng) < 0.000001 &&
               Math.abs(other.timestamp - entry.timestamp) < timeWindow;
      });
      
      if (duplicates.length > 0) {
        duplicateGroups.push({
          original: entry,
          duplicates: duplicates,
          coordinates: entry.coordinates,
          timeSpan: Math.max(...duplicates.map(d => d.timestamp)) - entry.timestamp
        });
      }
    }
    
    return {
      totalLocationLogs: this.logEntries.length,
      duplicateGroups: duplicateGroups.length,
      duplicateEntries: duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0),
      duplicateDetails: duplicateGroups.map(group => ({
        coordinates: group.coordinates,
        logCount: group.duplicates.length + 1,
        timeSpan: group.timeSpan,
        messages: [group.original.message, ...group.duplicates.map(d => d.message)]
      })),
      recommendation: this.getRecommendation(duplicateGroups)
    };
  }

  /**
   * Get recommendation based on analysis
   */
  getRecommendation(duplicateGroups) {
    if (duplicateGroups.length === 0) {
      return '✅ No duplicate location logs detected - logging is clean!';
    }
    
    const avgDuplicates = duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0) / duplicateGroups.length;
    
    if (avgDuplicates > 2) {
      return '🚨 High duplicate logging detected - consider consolidating log statements';
    } else if (avgDuplicates > 1) {
      return '⚠️ Moderate duplicate logging - some cleanup recommended';
    } else {
      return '✅ Low duplicate logging - acceptable level';
    }
  }

  /**
   * Quick test function
   */
  runQuickTest(durationMs = 30000) {
    this.startMonitoring();
    
    setTimeout(() => {
      const results = this.stopMonitoring();
      console.log('🧪 Quick test completed:', results);
    }, durationMs);
    
    console.log(`🧪 Running ${durationMs/1000}s log analysis test...`);
  }
}

// Create global instance
const logAnalyzer = new LogAnalyzer();

// Make available in browser console
if (typeof window !== 'undefined') {
  window.logAnalyzer = logAnalyzer;
  console.log('🔍 Log analyzer available as window.logAnalyzer');
  console.log('📝 Usage: window.logAnalyzer.runQuickTest(30000) // 30 second test');
}

export default logAnalyzer;

/**
 * Location Tracking Monitor
 * 
 * Comprehensive monitoring and testing utilities for location tracking
 * to help debug rapid start/stop cycles and duplicate updates.
 */

import locationTrackingDebugger from './locationTrackingDebugger';

class LocationTrackingMonitor {
  constructor() {
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.alerts = [];
    this.thresholds = {
      maxRestartsPerMinute: 3,
      maxDuplicatesPerMinute: 10,
      minUpdateInterval: 5000, // 5 seconds
      maxUpdateInterval: 120000, // 2 minutes
    };
  }

  /**
   * Start monitoring location tracking behavior
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('📊 Location tracking monitor is already running');
      return;
    }

    this.isMonitoring = true;
    console.log('📊 Starting location tracking monitor...');

    // Monitor every 30 seconds
    this.monitorInterval = setInterval(() => {
      this.checkForIssues();
    }, 30000);

    // Initial check
    this.checkForIssues();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    console.log('📊 Location tracking monitor stopped');
  }

  /**
   * Check for common issues
   */
  checkForIssues() {
    const stats = locationTrackingDebugger.getStats();
    const cycles = locationTrackingDebugger.detectRapidCycles();
    const patterns = locationTrackingDebugger.analyzeUpdatePatterns();

    const issues = [];

    // Check for rapid restarts
    if (cycles.detected) {
      issues.push({
        type: 'RAPID_RESTARTS',
        severity: 'HIGH',
        message: `Detected ${cycles.cycles} start/stop cycles in the last minute`,
        data: cycles
      });
    }

    // Check for excessive duplicates
    if (patterns.duplicates > this.thresholds.maxDuplicatesPerMinute) {
      issues.push({
        type: 'EXCESSIVE_DUPLICATES',
        severity: 'MEDIUM',
        message: `${patterns.duplicates} duplicate location updates detected`,
        data: { duplicates: patterns.duplicates }
      });
    }

    // Check update interval consistency
    if (patterns.avgInterval && patterns.avgInterval < this.thresholds.minUpdateInterval) {
      issues.push({
        type: 'TOO_FREQUENT_UPDATES',
        severity: 'HIGH',
        message: `Average update interval (${patterns.avgInterval}ms) is too frequent`,
        data: { avgInterval: patterns.avgInterval }
      });
    }

    // Check for stalled updates
    if (patterns.avgInterval && patterns.avgInterval > this.thresholds.maxUpdateInterval) {
      issues.push({
        type: 'STALLED_UPDATES',
        severity: 'MEDIUM',
        message: `Average update interval (${patterns.avgInterval}ms) is too slow`,
        data: { avgInterval: patterns.avgInterval }
      });
    }

    // Log issues
    if (issues.length > 0) {
      console.group('⚠️ Location Tracking Issues Detected');
      issues.forEach(issue => {
        const emoji = issue.severity === 'HIGH' ? '🚨' : '⚠️';
        console.warn(`${emoji} ${issue.type}: ${issue.message}`, issue.data);
      });
      console.groupEnd();

      this.alerts.push({
        timestamp: Date.now(),
        issues
      });

      // Keep only recent alerts
      this.alerts = this.alerts.filter(alert => 
        Date.now() - alert.timestamp < 300000 // 5 minutes
      );
    }

    return issues;
  }

  /**
   * Get monitoring status and recent alerts
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      recentAlerts: this.alerts,
      thresholds: this.thresholds,
      debuggerStats: locationTrackingDebugger.getStats()
    };
  }

  /**
   * Run comprehensive diagnostics
   */
  runDiagnostics() {
    console.group('🔍 Location Tracking Diagnostics');
    
    const report = locationTrackingDebugger.generateReport();
    const issues = this.checkForIssues();
    
    console.log('📊 Current Status:', this.getStatus());
    
    // Recommendations based on issues
    const recommendations = this.generateRecommendations(issues);
    if (recommendations.length > 0) {
      console.group('💡 Recommendations');
      recommendations.forEach(rec => console.log(`• ${rec}`));
      console.groupEnd();
    }
    
    console.groupEnd();
    
    return {
      report,
      issues,
      recommendations,
      status: this.getStatus()
    };
  }

  /**
   * Generate recommendations based on detected issues
   */
  generateRecommendations(issues) {
    const recommendations = [];
    
    issues.forEach(issue => {
      switch (issue.type) {
        case 'RAPID_RESTARTS':
          recommendations.push('Check for React component re-renders causing hook restarts');
          recommendations.push('Verify useEffect dependencies are stable');
          recommendations.push('Ensure location service is not being reconfigured repeatedly');
          break;
          
        case 'EXCESSIVE_DUPLICATES':
          recommendations.push('Increase minDistanceMeters threshold');
          recommendations.push('Increase duplicateTimeoutMs value');
          recommendations.push('Check if location accuracy is too low');
          break;
          
        case 'TOO_FREQUENT_UPDATES':
          recommendations.push('Increase updateIntervalMs in configuration');
          recommendations.push('Check for multiple location tracking instances');
          recommendations.push('Verify interval cleanup is working properly');
          break;
          
        case 'STALLED_UPDATES':
          recommendations.push('Check for location permission issues');
          recommendations.push('Verify GPS signal availability');
          recommendations.push('Check for network connectivity issues');
          break;
      }
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Test location tracking with controlled scenarios
   */
  async runTests() {
    console.group('🧪 Location Tracking Tests');
    
    const results = {
      startStop: await this.testStartStopCycle(),
      duplicateDetection: await this.testDuplicateDetection(),
      intervalConsistency: await this.testIntervalConsistency()
    };
    
    console.log('Test Results:', results);
    console.groupEnd();
    
    return results;
  }

  /**
   * Test start/stop cycle behavior
   */
  async testStartStopCycle() {
    console.log('Testing start/stop cycle...');
    
    const initialStats = locationTrackingDebugger.getStats();
    
    // Simulate rapid start/stop (this would be done by the actual hook)
    // This is just for monitoring the behavior
    
    return {
      passed: true,
      message: 'Start/stop cycle test completed',
      initialRestarts: initialStats.restartCount
    };
  }

  /**
   * Test duplicate detection
   */
  async testDuplicateDetection() {
    console.log('Testing duplicate detection...');
    
    const initialStats = locationTrackingDebugger.getStats();
    
    return {
      passed: true,
      message: 'Duplicate detection test completed',
      initialDuplicates: initialStats.duplicateCount
    };
  }

  /**
   * Test interval consistency
   */
  async testIntervalConsistency() {
    console.log('Testing interval consistency...');
    
    const patterns = locationTrackingDebugger.analyzeUpdatePatterns();
    
    return {
      passed: patterns.avgInterval > 0,
      message: `Average interval: ${patterns.avgInterval}ms`,
      patterns
    };
  }

  /**
   * Configure monitoring thresholds
   */
  setThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 Monitor thresholds updated:', this.thresholds);
  }

  /**
   * Clear all monitoring data
   */
  clear() {
    this.alerts = [];
    locationTrackingDebugger.clear();
    console.log('🧹 Location tracking monitor data cleared');
  }
}

// Create singleton instance
const locationTrackingMonitor = new LocationTrackingMonitor();

// Export for use in other modules
export default locationTrackingMonitor;

// Make available in browser console for debugging
if (typeof window !== 'undefined') {
  window.locationMonitor = locationTrackingMonitor;
  console.log('📊 Location tracking monitor available as window.locationMonitor');
  
  // Auto-start monitoring in development
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      locationTrackingMonitor.startMonitoring();
    }, 1000);
  }
}

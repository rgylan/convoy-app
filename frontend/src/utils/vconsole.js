/**
 * VConsole utility for mobile debugging
 * Provides console logging, error tracking, and network monitoring on mobile devices
 *
 * DISABLED BY DEFAULT to save screen real estate on mobile devices
 *
 * To enable VConsole:
 * 1. Open browser console (desktop) or use any console method
 * 2. Run: localStorage.setItem('vconsole-enabled', 'true')
 * 3. Refresh the page
 *
 * To disable VConsole:
 * 1. Run: localStorage.setItem('vconsole-enabled', 'false')
 * 2. Refresh the page
 *
 * Or use the toggle function: window.vconsoleUtils.toggle()
 */

let vConsole = null;

/**
 * Initialize VConsole for mobile debugging
 * Only loads in development mode and when explicitly enabled
 * DISABLED BY DEFAULT - Enable by setting localStorage.setItem('vconsole-enabled', 'true')
 */
export const initVConsole = () => {
  // Only enable in development mode
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // VConsole is now DISABLED BY DEFAULT to save screen real estate
  // Enable it manually by calling: localStorage.setItem('vconsole-enabled', 'true')
  // Then refresh the page or call initVConsole() again
  const vConsoleEnabled = localStorage.getItem('vconsole-enabled') === 'true';

  if (vConsoleEnabled) {
    // Dynamic import to avoid including vconsole in production bundle
    import('vconsole').then((VConsole) => {
      if (!vConsole) {
        vConsole = new VConsole.default({
          theme: 'dark', // or 'light'
          defaultPlugins: ['system', 'network', 'element', 'storage'],
          maxLogNumber: 1000,
          onReady: function () {
            console.log('VConsole is ready for mobile debugging!');
            console.log('Convoy App - Mobile Debug Mode Active');
          },
          onClearLog: function () {
            console.log('VConsole logs cleared');
          }
        });
        
        // Add some helpful debug info
        console.log('=== CONVOY APP DEBUG INFO ===');
        console.log('User Agent:', navigator.userAgent);
        console.log('Screen Size:', window.screen.width + 'x' + window.screen.height);
        console.log('Viewport Size:', window.innerWidth + 'x' + window.innerHeight);
        console.log('Device Pixel Ratio:', window.devicePixelRatio);
        console.log('Online Status:', navigator.onLine);
        console.log('Current Hostname:', window.location.hostname);
        console.log('Current Origin:', window.location.origin);
        console.log('=== END DEBUG INFO ===');
      }
    }).catch((error) => {
      console.error('Failed to load VConsole:', error);
    });
  }
};

/**
 * Destroy VConsole instance
 */
export const destroyVConsole = () => {
  if (vConsole) {
    vConsole.destroy();
    vConsole = null;
    console.log('VConsole destroyed');
  }
};

/**
 * Toggle VConsole on/off (useful for testing)
 * Provides clear feedback about the current state
 */
export const toggleVConsole = () => {
  if (vConsole) {
    destroyVConsole();
    localStorage.setItem('vconsole-enabled', 'false');
    console.log('🔧 VConsole DISABLED - Screen real estate restored');
    console.log('💡 To re-enable: localStorage.setItem("vconsole-enabled", "true") then refresh');
  } else {
    localStorage.setItem('vconsole-enabled', 'true');
    initVConsole();
    console.log('🔧 VConsole ENABLED - Mobile debugging active');
    console.log('💡 To disable: localStorage.setItem("vconsole-enabled", "false") then refresh');
  }
};

/**
 * Enhanced console logging for mobile debugging
 */
export const mobileLog = {
  info: (message, ...args) => {
    console.log(`📱 [MOBILE] ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`🚨 [MOBILE ERROR] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`⚠️ [MOBILE WARNING] ${message}`, ...args);
  },
  debug: (message, ...args) => {
    console.debug(`🔍 [MOBILE DEBUG] ${message}`, ...args);
  },
  network: (url, method, status, data) => {
    console.log(`🌐 [NETWORK] ${method} ${url} - Status: ${status}`, data);
  },
  interaction: (element, action, data) => {
    console.log(`👆 [INTERACTION] ${action} on ${element}`, data);
  }
};

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  mobileLog.error('Unhandled Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  mobileLog.error('Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise
  });
});

const vconsoleUtils = {
  init: initVConsole,
  destroy: destroyVConsole,
  toggle: toggleVConsole,
  log: mobileLog
};

export default vconsoleUtils;

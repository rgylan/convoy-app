import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import vconsoleUtils from './utils/vconsole';

// Initialize VConsole for mobile debugging (disabled by default)
vconsoleUtils.init();

// Make VConsole utilities available globally for easy debugging
window.vconsoleUtils = vconsoleUtils;

// Make debug panel utilities available globally
window.debugPanelUtils = {
  show: () => {
    localStorage.setItem('debug-panel-enabled', 'true');
    console.log('🐛 Debug Panel will show on next refresh');
  },
  hide: () => {
    localStorage.setItem('debug-panel-enabled', 'false');
    console.log('🐛 Debug Panel will hide on next refresh');
  },
  toggle: () => {
    const current = localStorage.getItem('debug-panel-enabled') === 'true';
    localStorage.setItem('debug-panel-enabled', (!current).toString());
    console.log(`🐛 Debug Panel will ${!current ? 'show' : 'hide'} on next refresh`);
  }
};

// Log instructions for enabling debugging tools
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Debugging Tools (DISABLED by default to save screen space):');
  console.log('💡 VConsole: localStorage.setItem("vconsole-enabled", "true") or window.vconsoleUtils.toggle()');
  console.log('💡 Debug Panel: localStorage.setItem("debug-panel-enabled", "true") or window.debugPanelUtils.toggle()');
  console.log('💡 Or click the 🐛 button in the top-right corner');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // Remove StrictMode to prevent double execution in development
  <App />
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();


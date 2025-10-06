# Caddy + mkcert HTTPS Setup Guide

This guide explains how to use Caddy with mkcert for local HTTPS development, providing the perfect solution for mobile testing with proper SSL certificates.

## 🎯 **Why Caddy + mkcert is Perfect**

### **Advantages**
- ✅ **Local certificates**: No external dependencies
- ✅ **Fast performance**: No internet round-trip
- ✅ **Stable URLs**: Always `https://192.168.1.18`
- ✅ **HTTPS geolocation**: Works on all mobile browsers
- ✅ **Production-like**: Matches production environment
- ✅ **Cross-device**: Desktop and mobile compatibility

## 🚀 **Current Setup**

### **Architecture**
```
Mobile Browser → https://192.168.1.18 → Caddy Proxy → Local Services
                                      ├─ /api/* → Backend (localhost:8080)
                                      ├─ /ws/*  → WebSocket (localhost:8080)
                                      └─ /*     → Frontend (localhost:3000)
```

### **Your Caddyfile Configuration**
```caddy
192.168.1.18:443 {
    # mkcert certificates
    tls C:\Users\rgyla\AppData\Local\mkcert\192.168.1.18.pem C:\Users\rgyla\AppData\Local\mkcert\192.168.1.18-key.pem
    
    # API traffic → Go backend
    handle_path /api* {
        reverse_proxy 127.0.0.1:8080
    }
    
    # WebSocket traffic → Go backend  
    handle_path /ws* {
        reverse_proxy 127.0.0.1:8080
    }
    
    # Everything else → React dev server
    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

## 🔧 **How to Use**

### **Step 1: Start Your Services**
```bash
# Terminal 1: Start backend
cd backend
./convoy-server.exe

# Terminal 2: Start frontend
cd frontend  
npm start

# Terminal 3: Start Caddy
caddy run
```

### **Step 2: Access via HTTPS**
- **Desktop**: `https://192.168.1.18`
- **Mobile**: `https://192.168.1.18`
- **Certificate**: Automatically trusted (mkcert)

### **Step 3: Test Functionality**
- **Geolocation**: Should work on all browsers
- **API calls**: Proxied through Caddy
- **WebSocket**: Real-time updates
- **Mobile debugging**: VConsole available

## ✅ **Expected Behavior**

### **API Configuration (VConsole)**
```javascript
🌐 API Configuration: {
  hostname: "192.168.1.18",
  protocol: "https:",
  apiBaseUrl: "https://192.168.1.18",        // ← Caddy proxy
  wsBaseUrl: "wss://192.168.1.18",           // ← Caddy proxy
  isCaddyProxy: true,                        // ← Detected
  detectedSetup: "caddy-proxy"               // ← Setup type
}
```

### **Backend Logs**
```
CORS: Allowed origin https://192.168.1.18 for POST /api/convoys
SUCCESS: Convoy created with ID abc123...
WebSocket connection established for convoy abc123
```

### **Caddy Logs**
```
INFO: Proxying /api/convoys to 127.0.0.1:8080
INFO: Proxying /ws/convoys/abc123 to 127.0.0.1:8080
```

## 🚨 **Troubleshooting**

### **Issue: Certificate not trusted**
**Cause**: mkcert not properly installed
**Solution**:
```bash
# Reinstall mkcert root CA
mkcert -install

# Regenerate certificates
mkcert 192.168.1.18
```

### **Issue: Caddy won't start**
**Cause**: Port 443 already in use
**Solution**:
```bash
# Check what's using port 443
netstat -ano | findstr :443

# Stop conflicting services (IIS, etc.)
net stop http
```

### **Issue: API calls fail**
**Cause**: Backend not running or CORS issues
**Solution**:
1. Verify backend is running on localhost:8080
2. Check backend logs for CORS messages
3. Ensure `https://192.168.1.18` is in CORS allowlist

### **Issue: WebSocket connection fails**
**Cause**: WebSocket proxy configuration
**Solution**:
1. Check Caddy logs for WebSocket upgrade
2. Verify `/ws/*` path is correct
3. Test WebSocket endpoint directly

## 📱 **Mobile Testing**

### **Setup**
1. **Connect mobile to same WiFi**: Ensure same network as development machine
2. **Open browser**: Chrome, Safari, Firefox
3. **Navigate to**: `https://192.168.1.18`
4. **Accept certificate**: If prompted (should be automatic with mkcert)

### **Expected Results**
- ✅ **HTTPS lock icon**: Green/secure indicator
- ✅ **Geolocation works**: No Chrome flags needed
- ✅ **API calls succeed**: No mixed content errors
- ✅ **WebSocket connects**: Real-time updates
- ✅ **VConsole debugging**: Mobile error tracking

### **Mobile Browser Compatibility**
- ✅ **iOS Safari**: Full support
- ✅ **iOS Chrome**: Full support  
- ✅ **Android Chrome**: Full support
- ✅ **Android Firefox**: Full support

## 🔄 **Development Workflow**

### **Daily Usage**
```bash
# 1. Start services (3 terminals)
./convoy-server.exe     # Backend
npm start              # Frontend  
caddy run             # Proxy

# 2. Develop normally
# - Edit code in your IDE
# - Hot reload works through proxy
# - Test on desktop: https://192.168.1.18
# - Test on mobile: https://192.168.1.18

# 3. Debug with VConsole
# - Mobile debugging available
# - Network requests visible
# - Console logs accessible
```

### **Switching Between Setups**
```bash
# HTTP-only (simple, no geolocation)
http://localhost:3000
http://192.168.1.18:3000

# Caddy HTTPS (recommended)
https://192.168.1.18

# ngrok (external sharing)
https://your-domain.ngrok-free.dev
```

## 🎯 **Advantages for Your Use Case**

### **Mobile Geolocation Testing**
- ✅ **HTTPS requirement**: Satisfied by mkcert certificates
- ✅ **No browser flags**: Works out of the box
- ✅ **Consistent URLs**: Same URL for all testing
- ✅ **Fast iteration**: No external dependencies

### **Cross-Device Development**
- ✅ **Team sharing**: Share `https://192.168.1.18` with team
- ✅ **Multiple devices**: Test on phones, tablets, laptops
- ✅ **Network independence**: Works on any local network
- ✅ **Offline capable**: No internet required

### **Production Similarity**
- ✅ **HTTPS everywhere**: Matches production setup
- ✅ **Reverse proxy**: Similar to production architecture
- ✅ **SSL termination**: Proper certificate handling
- ✅ **Header forwarding**: X-Forwarded-* headers

## 📋 **Quick Reference**

### **URLs**
- **Frontend**: `https://192.168.1.18` (Caddy → localhost:3000)
- **API**: `https://192.168.1.18/api/*` (Caddy → localhost:8080)
- **WebSocket**: `wss://192.168.1.18/ws/*` (Caddy → localhost:8080)

### **Commands**
```bash
# Start all services
./convoy-server.exe && npm start && caddy run

# Check Caddy config
caddy validate

# Reload Caddy config
caddy reload

# View Caddy logs
tail -f caddy.log
```

### **Files**
- **Caddyfile**: Proxy configuration
- **mkcert certs**: `C:\Users\rgyla\AppData\Local\mkcert\192.168.1.18.*`
- **Caddy logs**: `C:\Users\rgyla\VSCodeProjects\convoy-app\caddy.log`

This setup provides the perfect balance of simplicity, security, and functionality for your Convoy App development!

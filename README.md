# Convoy App

Real-time location sharing and convoy coordination web application.

## 🚀 **Quick Start**

### **First Time Setup**
```bash
# 1. Install dependencies
cd frontend
npm install
cd ..

# 2. Build everything
build-and-prepare.bat
```

### **Daily Development**
```bash
# Option 1: Simple local development
cd backend && ./convoy-server.exe
cd frontend && npm start
# Access: http://localhost:3000

# Option 2: Use launcher script for local HTTPS
start-local-setup.bat
# Access: https://192.168.1.18
```

### **Internet Access (ngrok)**
```bash
start-ngrok-setup.bat
# Access: https://xyz.ngrok-free.app (shown in terminal)
```

---

## 📋 **Features**

- ✅ **Real-time location sharing** via WebSocket
- ✅ **Convoy coordination** with multiple members
- ✅ **Interactive maps** with Leaflet
- ✅ **Mobile-first design** with geolocation support
- ✅ **HTTPS support** for secure connections
- ✅ **Internet access** via ngrok tunneling

---

## 🏗️ **Architecture**

### **Frontend**
- React.js with React Router
- Leaflet for interactive maps
- WebSocket for real-time updates
- Responsive mobile-first design

### **Backend**
- Go with standard library HTTP server
- In-memory storage
- WebSocket hub for real-time communication
- CORS-enabled API

### **Deployment**
- **Local**: Direct access via localhost
- **LAN**: Caddy reverse proxy with HTTPS (mkcert)
- **Internet**: Caddy + ngrok tunnel

---

## 📁 **Project Structure**

```
convoy-app/
├── backend/                    # Go backend
│   ├── cmd/convoy-server/     # Main server executable
│   └── src/                   # Source code
│       ├── api/               # REST API handlers
│       ├── domain/            # Domain models
│       ├── storage/           # Data storage
│       └── ws/                # WebSocket hub
├── frontend/                  # React frontend
│   ├── public/                # Static assets
│   ├── src/                   # Source code
│   │   ├── components/        # React components
│   │   ├── config/            # Configuration
│   │   ├── hooks/             # Custom hooks
│   │   ├── screens/           # Page components
│   │   └── services/          # API services
│   └── build/                 # Production build
├── Caddyfile                  # Local HTTPS config
├── Caddyfile.ngrok            # ngrok proxy config
├── build-and-prepare.bat      # Build script
├── start-local-setup.bat      # Local HTTPS launcher
├── start-ngrok-setup.bat      # ngrok launcher
└── Documentation files
```

---

## 🔧 **Configuration**

### **Environment Variables**
See `.env.example` for available options.

### **Backend**
- Port: 8080 (configurable via `PORT` env var)
- CORS: Auto-configured for localhost, LAN, and ngrok
- WebSocket: Automatic origin detection

### **Frontend**
- API URL: Auto-detected based on environment
- WebSocket URL: Auto-detected based on environment
- No manual configuration needed!

---

## 📚 **Documentation**

- **[Quick Reference](QUICK_REFERENCE.md)** - Common commands and tasks
- **[Deployment Modes](DEPLOYMENT_MODES.md)** - Detailed guide for all deployment options
- **[ngrok Setup](NGROK_SETUP_GUIDE.md)** - Internet access configuration
- **[Local HTTPS Setup](frontend/CADDY_SETUP_GUIDE.md)** - LAN testing with HTTPS

---

## 🛠️ **Development**

### **Backend Development**
```bash
cd backend
go build -o convoy-server.exe ./cmd/convoy-server
./convoy-server.exe
```

### **Frontend Development**
```bash
cd frontend
npm start
```

### **Production Build**
```bash
# Build both frontend and backend
build-and-prepare.bat

# Or manually:
cd backend && go build -o convoy-server.exe ./cmd/convoy-server
cd frontend && npm run build
```

---

## 🌐 **Deployment Modes**

| Mode | Access | Use Case | Guide |
|------|--------|----------|-------|
| **Simple Local** | `http://localhost:3000` | Quick development | Built-in |
| **Local HTTPS** | `https://192.168.1.18` | Mobile testing (LAN) | [Caddy Guide](frontend/CADDY_SETUP_GUIDE.md) |
| **Internet** | `https://xyz.ngrok-free.app` | External sharing | [ngrok Guide](NGROK_SETUP_GUIDE.md) |

---

## 🚨 **Troubleshooting**

### **Common Issues**

**CORS Errors**
- Check backend logs for CORS messages
- Verify origin is allowed in backend code
- Rebuild backend after changes

**Port Conflicts**
```bash
netstat -ano | findstr :8080   # Backend
netstat -ano | findstr :3000   # Frontend
netstat -ano | findstr :8000   # Caddy ngrok
```

**Frontend Not Updating (ngrok)**
```bash
cd frontend
npm run build
# Restart Caddy
```

See [Quick Reference](QUICK_REFERENCE.md) for more troubleshooting tips.

---

## 📦 **Dependencies**

### **Backend**
- Go 1.25+
- gorilla/websocket

### **Frontend**
- React 18+
- React Router
- Leaflet
- react-toastify
- qrcode.react

### **Infrastructure**
- Caddy (reverse proxy)
- ngrok (optional, for internet access)
- mkcert (optional, for local HTTPS)

---

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 **License**

See [LICENSE](LICENSE) file for details.

---

## 🎯 **Roadmap**

- [ ] Persistent storage (database)
- [ ] User authentication
- [ ] Convoy history
- [ ] Route planning
- [ ] Push notifications
- [ ] Production deployment to convoy.com.ph

---

## 💡 **Tips**

1. **Use launcher scripts** for quick setup
2. **Check logs** when debugging issues
3. **Rebuild frontend** after changes when using ngrok
4. **Monitor ngrok dashboard** at http://127.0.0.1:4040
5. **Test on mobile** using local HTTPS setup first

---

## 📞 **Support**

For issues and questions:
1. Check the documentation files
2. Review troubleshooting guides
3. Check backend and Caddy logs
4. Open an issue on GitHub

---

**Happy Convoying! 🚗💨**

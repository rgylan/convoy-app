package ws

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")

		// Allow empty origin (for testing tools)
		if origin == "" {
			return true
		}

		// Allow localhost development (both HTTP and HTTPS)
		if origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000" ||
			origin == "https://localhost:3000" || origin == "https://127.0.0.1:3000" ||
			origin == "http://localhost:8000" || origin == "http://127.0.0.1:8000" ||
			origin == "https://localhost:8000" || origin == "https://127.0.0.1:8000" {
			return true
		}

		// Allow Caddy HTTPS proxy (192.168.1.18:443)
		if origin == "https://192.168.1.18" || origin == "https://192.168.1.18:443" {
			return true
		}

		// Allow ngrok domains (for internet access)
		// Check for ngrok-free.app, ngrok-free.dev, ngrok.app, or ngrok.io domains
		if len(origin) > 8 && origin[:8] == "https://" {
			hostname := origin[8:]

			// Remove port if present
			if colonIdx := len(hostname) - 1; colonIdx > 0 {
				for i := len(hostname) - 1; i >= 0; i-- {
					if hostname[i] == ':' {
						hostname = hostname[:i]
						break
					}
					if hostname[i] == '/' {
						break
					}
				}
			}

			// Allow *.ngrok-free.dev (current free tier domain) - 15 characters
			if len(hostname) > 15 && hostname[len(hostname)-15:] == ".ngrok-free.dev" {
				log.Printf("WebSocket: Allowing ngrok free domain (.ngrok-free.dev): %s", origin)
				return true
			}
			// Allow *.ngrok-free.app (older free tier domain) - 15 characters
			if len(hostname) > 15 && hostname[len(hostname)-15:] == ".ngrok-free.app" {
				log.Printf("WebSocket: Allowing ngrok free domain (.ngrok-free.app): %s", origin)
				return true
			}
			// Allow *.ngrok.app (paid tier domain) - 10 characters
			if len(hostname) > 10 && hostname[len(hostname)-10:] == ".ngrok.app" {
				log.Printf("WebSocket: Allowing ngrok paid domain (.ngrok.app): %s", origin)
				return true
			}
			// Allow *.ngrok.io (legacy domain) - 9 characters
			if len(hostname) > 9 && hostname[len(hostname)-9:] == ".ngrok.io" {
				log.Printf("WebSocket: Allowing ngrok legacy domain (.ngrok.io): %s", origin)
				return true
			}
		}

		// Allow custom origin from environment variable (for production or custom setups)
		if customOrigin := os.Getenv("ALLOWED_ORIGIN"); customOrigin != "" {
			if origin == customOrigin {
				log.Printf("WebSocket: Allowing custom origin from env: %s", origin)
				return true
			}
		}

		// Allow local network IPs on port 3000 (for mobile testing)
		if len(origin) > 7 && origin[:7] == "http://" {
			// Extract the part after "http://"
			hostPort := origin[7:]

			// Check if it ends with ":3000"
			if len(hostPort) > 5 && hostPort[len(hostPort)-5:] == ":3000" {
				// Extract the IP part
				ip := hostPort[:len(hostPort)-5]

				// Allow private IP ranges commonly used in local networks
				return isPrivateIPForWebSocket(ip)
			}
		}

		return false
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// isPrivateIPForWebSocket checks if an IP address is in a private range for WebSocket connections
func isPrivateIPForWebSocket(ip string) bool {
	// Common private IP ranges:
	// 192.168.x.x (most common home networks)
	// 10.x.x.x (corporate networks)
	// 172.16.x.x - 172.31.x.x (less common)
	// 127.x.x.x (localhost)

	if len(ip) >= 7 {
		// Check 192.168.x.x
		if len(ip) >= 8 && ip[:8] == "192.168." {
			return true
		}

		// Check 10.x.x.x
		if len(ip) >= 3 && ip[:3] == "10." {
			return true
		}

		// Check 127.x.x.x (localhost)
		if len(ip) >= 4 && ip[:4] == "127." {
			return true
		}

		// Check 172.16.x.x - 172.31.x.x
		if len(ip) >= 7 && ip[:4] == "172." {
			// This is a simplified check - in production you'd want more precise validation
			return true
		}
	}

	return false
}

// Handler handles WebSocket connections.
func (h *Hub) Handler(w http.ResponseWriter, r *http.Request) {
	convoyID := r.PathValue("convoyId")
	if convoyID == "" {
		http.Error(w, "Convoy ID is required", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error upgrading to WebSocket: %v", err)
		return
	}

	// Register this specific connection
	h.Register(convoyID, conn)

	// Check if member ID is provided in query parameters
	memberIDStr := r.URL.Query().Get("memberId")
	var memberID int64
	if memberIDStr != "" {
		if parsedID, err := strconv.ParseInt(memberIDStr, 10, 64); err == nil {
			memberID = parsedID
			h.RegisterMember(convoyID, memberID, conn)
			log.Printf("WebSocket connection established for convoy %s with member %d", convoyID, memberID)
		} else {
			log.Printf("WebSocket connection established for convoy %s (invalid member ID: %s)", convoyID, memberIDStr)
		}
	} else {
		log.Printf("WebSocket connection established for convoy %s (no member ID provided)", convoyID)
	}

	defer func() {
		h.Unregister(convoyID, conn)
		if memberID != 0 {
			h.UnregisterMember(convoyID, memberID)
			log.Printf("WebSocket cleanup: Member %d unregistered from convoy %s", memberID, convoyID)
		}
		conn.Close()
		log.Printf("WebSocket handler cleanup completed for convoy %s", convoyID)
	}()

	// Configure ping/pong handling
	const (
		writeWait  = 10 * time.Second
		pongWait   = 60 * time.Second
		pingPeriod = (pongWait * 9) / 10
	)

	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	// Start ping ticker
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	// Channel to signal when to stop
	done := make(chan struct{})

	// Goroutine to handle ping messages
	go func() {
		defer close(done)
		for {
			select {
			case <-ticker.C:
				conn.SetWriteDeadline(time.Now().Add(writeWait))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					log.Printf("Failed to send ping to convoy %s (member %d): %v", convoyID, memberID, err)
					return
				}
			case <-done:
				return
			}
		}
	}()

	// Main message reading loop
	for {
		messageType, _, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNormalClosure) {
				log.Printf("WebSocket unexpected close for convoy %s (member %d): %v", convoyID, memberID, err)
			} else {
				log.Printf("WebSocket normal close for convoy %s (member %d): %v", convoyID, memberID, err)
			}
			break
		}

		// Reset read deadline on any message
		conn.SetReadDeadline(time.Now().Add(pongWait))

		// Handle ping messages
		if messageType == websocket.PingMessage {
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PongMessage, nil); err != nil {
				log.Printf("Failed to send pong for convoy %s: %v", convoyID, err)
				break
			}
		}
	}
}

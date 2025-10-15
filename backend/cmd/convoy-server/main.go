package main

import (
	"context"
	"convoy-app/backend/src/api"
	"convoy-app/backend/src/storage"
	"convoy-app/backend/src/ws"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// corsMiddleware adds CORS headers to the response with dynamic origin detection.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Allow requests from development origins (localhost and local network IPs on port 3000)
		if isAllowedOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			log.Printf("CORS: Allowed origin %s for %s %s", origin, r.Method, r.URL.Path)
		} else if origin != "" {
			log.Printf("CORS: Blocked origin %s for %s %s", origin, r.Method, r.URL.Path)
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// isAllowedOrigin checks if the origin is allowed for CORS requests
func isAllowedOrigin(origin string) bool {
	if origin == "" {
		return false
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
			log.Printf("CORS: Allowing ngrok free domain (.ngrok-free.dev): %s", origin)
			return true
		}
		// Allow *.ngrok-free.app (older free tier domain) - 15 characters
		if len(hostname) > 15 && hostname[len(hostname)-15:] == ".ngrok-free.app" {
			log.Printf("CORS: Allowing ngrok free domain (.ngrok-free.app): %s", origin)
			return true
		}
		// Allow *.ngrok.app (paid tier domain) - 10 characters
		if len(hostname) > 10 && hostname[len(hostname)-10:] == ".ngrok.app" {
			log.Printf("CORS: Allowing ngrok paid domain (.ngrok.app): %s", origin)
			return true
		}
		// Allow *.ngrok.io (legacy domain) - 9 characters
		if len(hostname) > 9 && hostname[len(hostname)-9:] == ".ngrok.io" {
			log.Printf("CORS: Allowing ngrok legacy domain (.ngrok.io): %s", origin)
			return true
		}
	}

	// Allow custom origin from environment variable (for production or custom setups)
	if customOrigin := os.Getenv("ALLOWED_ORIGIN"); customOrigin != "" {
		if origin == customOrigin {
			log.Printf("CORS: Allowing custom origin from env: %s", origin)
			return true
		}
	}

	// Allow local network IPs on port 3000 (for mobile testing)
	// This matches patterns like http://192.168.1.18:3000, http://10.0.0.5:3000, etc.
	if len(origin) > 7 && origin[:7] == "http://" {
		// Extract the part after "http://"
		hostPort := origin[7:]

		// Check if it ends with ":3000"
		if len(hostPort) > 5 && hostPort[len(hostPort)-5:] == ":3000" {
			// Extract the IP part
			ip := hostPort[:len(hostPort)-5]

			// Allow private IP ranges commonly used in local networks
			return isPrivateIP(ip)
		}
	}

	return false
}

// isPrivateIP checks if an IP address is in a private range
func isPrivateIP(ip string) bool {
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

func main() {
	// 1. Initialize the storage layer.
	memStorage := storage.NewMemoryStorage()
	log.Println("In-memory storage initialized.")

	// 2. Initialize the WebSocket hub.
	wsHub := ws.NewHub()
	log.Println("WebSocket hub initialized.")

	// 3. Wire the WebSocket hub to the storage layer for connection status checking
	memStorage.SetWebSocketHub(wsHub)
	log.Println("WebSocket hub connected to storage layer.")

	// 4. Initialize the API layer, injecting the storage and wsHub dependencies.
	apiServer := api.New(memStorage, wsHub)
	log.Println("API layer initialized.")

	// 5. Start the convoy monitoring service.
	apiServer.StartMonitoring()
	log.Println("Convoy monitoring service started.")

	// 6. Set up the HTTP router and register our handlers.
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		totalConnections := wsHub.GetTotalConnections()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status":"healthy","websocket_connections":%d}`, totalConnections)
	})

	// Convoy endpoints
	mux.HandleFunc("POST /api/convoys", apiServer.HandleCreateConvoy)
	mux.HandleFunc("GET /api/convoys/{convoyId}", apiServer.HandleGetConvoy)
	mux.HandleFunc("POST /api/convoys/{convoyId}/members", apiServer.HandleAddMember)
	mux.HandleFunc("POST /api/convoys/{convoyId}/destination", apiServer.HandleSetConvoyDestination)
	mux.HandleFunc("PUT /api/convoys/{convoyId}/members/{memberId}/location", apiServer.HandleUpdateMemberLocation)
	mux.HandleFunc("DELETE /api/convoys/{convoyId}/members/{memberId}", apiServer.HandleLeaveConvoy)
	mux.HandleFunc("OPTIONS /api/convoys/{convoyId}/members/{memberId}", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// WebSocket endpoint
	mux.HandleFunc("GET /ws/convoys/{convoyId}", wsHub.Handler)

	// 6. Configure and start the HTTP server with graceful shutdown.
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: corsMiddleware(mux), // Wrap the mux with CORS middleware
	}

	// Run server in a goroutine so that it doesn't block.
	go func() {
		log.Printf("Starting Convoy backend server on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Could not start server: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Stop the monitoring service first
	apiServer.StopMonitoring()
	log.Println("Convoy monitoring service stopped.")

	// The context is used to inform the server it has 5 seconds to finish
	// the requests it is currently handling.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}

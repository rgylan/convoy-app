package main

import (
	"context"
	"convoy-app/backend/src/api"
	"convoy-app/backend/src/storage"
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

	// Allow localhost development
	if origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000" {
		return true
	}

	// Allow local network IPs on port 3000 (for mobile testing)
	// This matches patterns like http://192.168.1.14:3000, http://10.0.0.5:3000, etc.
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

	// 2. Initialize the API layer, injecting the storage dependency.
	apiServer := api.New(memStorage)
	log.Println("API layer initialized.")

	// 3. Set up the HTTP router and register our handlers.
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "Convoy backend is running!")
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

	// 4. Configure and start the HTTP server with graceful shutdown.
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

	// The context is used to inform the server it has 5 seconds to finish
	// the requests it is currently handling.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}

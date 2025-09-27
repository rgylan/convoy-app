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

// corsMiddleware adds CORS headers to the response.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow requests from your frontend origin
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
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

func main() {
	// 1. Initialize the storage layer.
	memStorage := storage.NewMemoryStorage()
	log.Println("In-memory storage initialized.")

	// 2. Initialize the WebSocket hub.
	wsHub := ws.NewHub()
	log.Println("WebSocket hub initialized.")

	// 3. Initialize the API layer, injecting the storage and wsHub dependencies.
	apiServer := api.New(memStorage, wsHub)
	log.Println("API layer initialized.")

	// 4. Set up the HTTP router and register our handlers.
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

	// 5. Configure and start the HTTP server with graceful shutdown.
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

package ws

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == "http://localhost:3000" || origin == ""
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
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
	log.Printf("WebSocket connection established for convoy %s", convoyID)

	defer func() {
		h.Unregister(convoyID, conn)
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
					log.Printf("Failed to send ping to convoy %s: %v", convoyID, err)
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
				log.Printf("WebSocket unexpected close for convoy %s: %v", convoyID, err)
			} else {
				log.Printf("WebSocket normal close for convoy %s: %v", convoyID, err)
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

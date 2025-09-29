package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	MaxConnectionsPerConvoy = 50   // Reasonable limit for convoy size
	MaxTotalConnections     = 1000 // Global connection limit
)

// Hub manages WebSocket connections.
type Hub struct {
	mu                sync.RWMutex
	connections       map[string]map[*websocket.Conn]bool  // Multiple connections per convoy
	memberConnections map[string]map[int64]*websocket.Conn // Track member-specific connections: convoyID -> memberID -> connection
}

// NewHub creates a new Hub.
func NewHub() *Hub {
	return &Hub{
		connections:       make(map[string]map[*websocket.Conn]bool),
		memberConnections: make(map[string]map[int64]*websocket.Conn),
	}
}

// Register adds a new connection with limits
func (h *Hub) Register(convoyID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Check global connection limit
	totalConns := 0
	for _, convoyConns := range h.connections {
		totalConns += len(convoyConns)
	}
	if totalConns >= MaxTotalConnections {
		log.Printf("Global connection limit reached, rejecting connection for convoy %s", convoyID)
		conn.Close()
		return
	}

	if h.connections[convoyID] == nil {
		h.connections[convoyID] = make(map[*websocket.Conn]bool)
	}

	// Check per-convoy connection limit
	if len(h.connections[convoyID]) >= MaxConnectionsPerConvoy {
		log.Printf("Convoy connection limit reached for %s, rejecting connection", convoyID)
		conn.Close()
		return
	}

	h.connections[convoyID][conn] = true
	log.Printf("WebSocket connection registered for convoy %s (total connections for convoy: %d)",
		convoyID, len(h.connections[convoyID]))
}

// RegisterMember associates a member ID with a WebSocket connection
func (h *Hub) RegisterMember(convoyID string, memberID int64, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.memberConnections[convoyID] == nil {
		h.memberConnections[convoyID] = make(map[int64]*websocket.Conn)
	}

	h.memberConnections[convoyID][memberID] = conn
	log.Printf("Member %d registered for convoy %s", memberID, convoyID)
}

// Unregister removes a connection from the hub.
func (h *Hub) Unregister(convoyID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if convoyConns, exists := h.connections[convoyID]; exists {
		if _, connExists := convoyConns[conn]; connExists {
			delete(convoyConns, conn)
			log.Printf("WebSocket connection unregistered for convoy %s (remaining connections for convoy: %d)",
				convoyID, len(convoyConns))

			// Also remove from member connections
			h.unregisterMemberConnection(convoyID, conn)

			// Clean up empty convoy entries
			if len(convoyConns) == 0 {
				delete(h.connections, convoyID)
				delete(h.memberConnections, convoyID) // Clean up member connections too
				log.Printf("All connections closed for convoy %s, removed from hub", convoyID)
			}
		} else {
			log.Printf("Attempted to unregister non-existent connection for convoy %s", convoyID)
		}
	} else {
		log.Printf("Attempted to unregister connection for non-existent convoy %s", convoyID)
	}
}

// UnregisterMember removes a member's connection association
func (h *Hub) UnregisterMember(convoyID string, memberID int64) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if memberConns, exists := h.memberConnections[convoyID]; exists {
		delete(memberConns, memberID)
		log.Printf("Member %d unregistered from convoy %s", memberID, convoyID)

		// Clean up empty convoy entries
		if len(memberConns) == 0 {
			delete(h.memberConnections, convoyID)
		}
	}
}

// unregisterMemberConnection removes member connection by connection object (internal helper)
func (h *Hub) unregisterMemberConnection(convoyID string, conn *websocket.Conn) {
	if memberConns, exists := h.memberConnections[convoyID]; exists {
		for memberID, memberConn := range memberConns {
			if memberConn == conn {
				delete(memberConns, memberID)
				log.Printf("Member %d connection unregistered from convoy %s", memberID, convoyID)
				break
			}
		}
	}
}

// Broadcast sends a message to all connections for a specific convoy.
func (h *Hub) Broadcast(convoyID string, message interface{}) {
	h.mu.RLock()
	convoyConns, exists := h.connections[convoyID]
	if !exists || len(convoyConns) == 0 {
		h.mu.RUnlock()
		log.Printf("No WebSocket connections found for convoy %s", convoyID)
		return
	}

	// Create a copy of connections to avoid holding the lock during broadcast
	connections := make([]*websocket.Conn, 0, len(convoyConns))
	for conn := range convoyConns {
		connections = append(connections, conn)
	}
	h.mu.RUnlock()

	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshalling WebSocket message for convoy %s: %v", convoyID, err)
		return
	}

	// Broadcast to all connections
	failedConnections := make([]*websocket.Conn, 0)
	successCount := 0

	for _, conn := range connections {
		conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Printf("Error writing to WebSocket connection for convoy %s: %v", convoyID, err)
			failedConnections = append(failedConnections, conn)
		} else {
			successCount++
		}
	}

	// Remove failed connections
	if len(failedConnections) > 0 {
		h.mu.Lock()
		if convoyConns, exists := h.connections[convoyID]; exists {
			for _, failedConn := range failedConnections {
				delete(convoyConns, failedConn)
				failedConn.Close()
			}
		}
		h.mu.Unlock()
		log.Printf("Removed %d failed connections for convoy %s", len(failedConnections), convoyID)
	}

	log.Printf("Successfully broadcasted message to %d connections for convoy %s", successCount, convoyID)
}

// HasActiveConnection checks if a specific member has an active WebSocket connection
func (h *Hub) HasActiveConnection(convoyID string, memberID int64) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if memberConns, exists := h.memberConnections[convoyID]; exists {
		if conn, memberExists := memberConns[memberID]; memberExists {
			// Verify the connection is still in the active connections map
			if convoyConns, convoyExists := h.connections[convoyID]; convoyExists {
				_, connActive := convoyConns[conn]
				log.Printf("DEBUG: Member %d connection check - exists: %v, active: %v", memberID, memberExists, connActive)
				return connActive
			}
		}
	}
	log.Printf("DEBUG: Member %d has no active connection in convoy %s", memberID, convoyID)
	return false
}

// GetMemberConnection returns the WebSocket connection for a specific member
func (h *Hub) GetMemberConnection(convoyID string, memberID int64) *websocket.Conn {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if memberConns, exists := h.memberConnections[convoyID]; exists {
		return memberConns[memberID]
	}
	return nil
}

// GetConnectionCount returns the number of active connections for a convoy
func (h *Hub) GetConnectionCount(convoyID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if convoyConns, exists := h.connections[convoyID]; exists {
		return len(convoyConns)
	}
	return 0
}

// GetActiveConvoyCount returns the number of active convoys
func (h *Hub) GetActiveConvoyCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	count := 0
	for _, convoyConns := range h.connections {
		if len(convoyConns) > 0 {
			count++
		}
	}
	return count
}

// GetTotalConnections returns the total number of active connections across all convoys
func (h *Hub) GetTotalConnections() int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	total := 0
	for _, convoyConns := range h.connections {
		total += len(convoyConns)
	}
	return total
}

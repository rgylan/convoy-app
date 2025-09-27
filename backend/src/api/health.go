package api

import (
    "encoding/json"
    "net/http"
    "time"
)

type HealthResponse struct {
    Status              string    `json:"status"`
    Timestamp          time.Time `json:"timestamp"`
    WebSocketConnections int      `json:"websocket_connections"`
    ActiveConvoys       int      `json:"active_convoys"`
}

func (a *API) HandleHealth(w http.ResponseWriter, r *http.Request) {
    totalConnections := a.wsHub.GetTotalConnections()
    activeConvoys := a.wsHub.GetActiveConvoyCount()
    
    response := HealthResponse{
        Status:              "healthy",
        Timestamp:          time.Now(),
        WebSocketConnections: totalConnections,
        ActiveConvoys:       activeConvoys,
    }
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(response)
}
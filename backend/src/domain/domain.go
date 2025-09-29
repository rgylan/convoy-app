package domain

import (
	"time"
)

// Convoy represents a group of members traveling together.
type Convoy struct {
	ID          string       `json:"id"`
	Members     []*Member    `json:"members"`
	Destination *Destination `json:"destination,omitempty"`
}

// Member represents a user in a convoy.
type Member struct {
	ID         int64     `json:"id"`
	Name       string    `json:"name"`
	Location   LatLng    `json:"location"`
	Status     string    `json:"status"`     // connected, lagging, disconnected
	LastUpdate time.Time `json:"lastUpdate"` // timestamp of last location update
}

// Destination represents a named location with coordinates and metadata.
type Destination struct {
	Name        string  `json:"name"`
	Description string  `json:"description,omitempty"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
}

// LatLng represents a geographical coordinate.
type LatLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// Member status constants
const (
	StatusConnected    = "connected"    // Active WebSocket + recent location updates
	StatusInactive     = "inactive"     // Active WebSocket + no recent location updates
	StatusLagging      = "lagging"      // Active WebSocket + far from convoy center
	StatusDisconnected = "disconnected" // No WebSocket connection
)

// ToLatLng converts a Destination to LatLng coordinates.
func (d *Destination) ToLatLng() LatLng {
	return LatLng{Lat: d.Lat, Lng: d.Lng}
}

// IsConnected returns true if the member is connected.
func (m *Member) IsConnected() bool {
	return m.Status == StatusConnected
}

// IsLagging returns true if the member is lagging.
func (m *Member) IsLagging() bool {
	return m.Status == StatusLagging
}

// IsDisconnected returns true if the member is disconnected.
func (m *Member) IsDisconnected() bool {
	return m.Status == StatusDisconnected
}

// UpdateStatus updates the member's status and last update time.
func (m *Member) UpdateStatus(status string) {
	m.Status = status
	m.LastUpdate = time.Now()
}

// WebSocket event types for convoy monitoring
const (
	EventMemberLagging      = "MEMBER_LAGGING"
	EventMemberDisconnected = "MEMBER_DISCONNECTED"
	EventMemberInactive     = "MEMBER_INACTIVE"
	EventMemberReactivated  = "MEMBER_REACTIVATED"
	EventConvoyScattered    = "CONVOY_SCATTERED"
	EventMemberReconnected  = "MEMBER_RECONNECTED"
)

// ConvoyAlert represents an alert event for WebSocket broadcasting
type ConvoyAlert struct {
	EventType      string    `json:"eventType"`
	ConvoyID       string    `json:"convoyId"`
	MemberID       int64     `json:"memberId,omitempty"`
	MemberName     string    `json:"memberName,omitempty"`
	Distance       float64   `json:"distance,omitempty"`
	LastSeen       time.Time `json:"lastSeen,omitempty"`
	ScatteredCount int       `json:"scatteredCount,omitempty"`
	Timestamp      time.Time `json:"timestamp"`
}

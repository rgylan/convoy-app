package storage

import (
	"context"
	"convoy-app/backend/src/domain"
	"convoy-app/backend/src/ierr"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

// MemoryStorage is an in-memory implementation of the Storage interface.
type MemoryStorage struct {
	mu      sync.RWMutex
	convoys map[string]*domain.Convoy
	wsHub   WebSocketHub // WebSocket hub for checking connection status
}

// NewMemoryStorage creates and returns a new MemoryStorage instance.
func NewMemoryStorage() *MemoryStorage {
	return &MemoryStorage{
		convoys: make(map[string]*domain.Convoy),
	}
}

// SetWebSocketHub sets the WebSocket hub for connection status checking
func (s *MemoryStorage) SetWebSocketHub(wsHub WebSocketHub) {
	s.wsHub = wsHub
}

// generateID creates a random, URL-friendly ID.
func generateID() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func (s *MemoryStorage) CreateConvoy(ctx context.Context) (*domain.Convoy, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	id, err := generateID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate convoy id: %w", err)
	}

	convoy := &domain.Convoy{
		ID:      id,
		Members: []*domain.Member{},
	}

	s.convoys[id] = convoy
	return convoy, nil
}

func (s *MemoryStorage) GetConvoy(ctx context.Context, convoyID string) (*domain.Convoy, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	convoy, ok := s.convoys[convoyID]
	if !ok {
		return nil, fmt.Errorf("convoy with id %s not found", convoyID)
	}
	return convoy, nil
}

func (s *MemoryStorage) AddMember(ctx context.Context, convoyID string, member *domain.Member) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	convoy, ok := s.convoys[convoyID]
	if !ok {
		return fmt.Errorf("convoy with id %s not found", convoyID)
	}

	// Initialize member status and timestamp
	if member.Status == "" {
		member.Status = domain.StatusConnected
	}
	member.LastUpdate = time.Now()

	// In a real application, you'd check for member ID conflicts
	convoy.Members = append(convoy.Members, member)
	return nil
}

func (s *MemoryStorage) UpdateMemberLocation(ctx context.Context, convoyID string, memberID int64, location domain.LatLng) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	convoy, ok := s.convoys[convoyID]
	if !ok {
		return fmt.Errorf("convoy with id %s not found", convoyID)
	}

	for _, member := range convoy.Members {
		if member.ID == memberID {
			member.Location = location
			member.LastUpdate = time.Now() // Update last seen timestamp

			// Only mark as connected if there's an active WebSocket connection
			// This fixes the race condition where location updates would override disconnected status
			if member.Status == "" || (member.Status == domain.StatusDisconnected && s.hasActiveConnection(convoyID, memberID)) {
				member.Status = domain.StatusConnected
			}
			return nil
		}
	}

	return fmt.Errorf("member with id %d not found in convoy %s", memberID, convoyID)
}

// hasActiveConnection checks if a member has an active WebSocket connection
func (s *MemoryStorage) hasActiveConnection(convoyID string, memberID int64) bool {
	if s.wsHub == nil {
		// If no WebSocket hub is set, fall back to old behavior for backward compatibility
		return true
	}
	return s.wsHub.HasActiveConnection(convoyID, memberID)
}

func (s *MemoryStorage) UpdateMemberStatus(ctx context.Context, convoyID string, memberID int64, status string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	convoy, ok := s.convoys[convoyID]
	if !ok {
		return fmt.Errorf("convoy with id %s not found", convoyID)
	}

	for _, member := range convoy.Members {
		if member.ID == memberID {
			member.UpdateStatus(status)
			return nil
		}
	}

	return fmt.Errorf("member with id %d not found in convoy %s", memberID, convoyID)
}

func (s *MemoryStorage) SetConvoyDestination(ctx context.Context, convoyID string, destination *domain.Destination) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	convoy, ok := s.convoys[convoyID]
	if !ok {
		return ierr.ErrNotFound
	}

	// Validate destination data
	if destination == nil {
		return fmt.Errorf("destination cannot be nil")
	}
	if destination.Name == "" {
		return fmt.Errorf("destination name is required")
	}

	convoy.Destination = destination
	return nil
}

// LeaveConvoy removes a member from a convoy in memory.
func (s *MemoryStorage) LeaveConvoy(ctx context.Context, convoyID string, memberID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	convoy, ok := s.convoys[convoyID]
	if !ok {
		return ierr.ErrNotFound
	}

	for i, member := range convoy.Members {
		if member.ID == memberID {
			convoy.Members = append(convoy.Members[:i], convoy.Members[i+1:]...)
			return nil
		}
	}

	return ierr.ErrNotFound // Member not found
}

// GetAllActiveConvoys returns all convoys that have at least one member.
func (s *MemoryStorage) GetAllActiveConvoys(ctx context.Context) ([]*domain.Convoy, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var activeConvoys []*domain.Convoy
	for _, convoy := range s.convoys {
		if len(convoy.Members) > 0 {
			activeConvoys = append(activeConvoys, convoy)
		}
	}

	return activeConvoys, nil
}

package storage

import (
	"context"
	"convoy-app/backend/src/domain"
	"convoy-app/backend/src/ierr"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
)

// MemoryStorage is an in-memory implementation of the Storage interface.
type MemoryStorage struct {
	mu      sync.RWMutex
	convoys map[string]*domain.Convoy
}

// NewMemoryStorage creates and returns a new MemoryStorage instance.
func NewMemoryStorage() *MemoryStorage {
	return &MemoryStorage{
		convoys: make(map[string]*domain.Convoy),
	}
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

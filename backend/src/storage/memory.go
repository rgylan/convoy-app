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
	mu            sync.RWMutex
	convoys       map[string]*domain.Convoy
	verifications map[string]*domain.ConvoyVerification // token -> verification
	wsHub         WebSocketHub                          // WebSocket hub for checking connection status
}

// NewMemoryStorage creates and returns a new MemoryStorage instance.
func NewMemoryStorage() *MemoryStorage {
	return &MemoryStorage{
		convoys:       make(map[string]*domain.Convoy),
		verifications: make(map[string]*domain.ConvoyVerification),
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

// generateVerificationID creates a verification ID
func generateVerificationID() string {
	return fmt.Sprintf("ver_%d", time.Now().UnixNano())
}

func (s *MemoryStorage) CreateConvoy(ctx context.Context) (*domain.Convoy, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	id, err := generateID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate convoy id: %w", err)
	}

	convoy := &domain.Convoy{
		ID:         id,
		Members:    []*domain.Member{},
		IsVerified: true, // Legacy convoys are automatically verified
		CreatedAt:  time.Now(),
	}

	s.convoys[id] = convoy
	return convoy, nil
}

func (s *MemoryStorage) CreateConvoyWithVerification(ctx context.Context, email, leaderName, token string, expiresAt time.Time) (*domain.Convoy, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	id, err := generateID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate convoy id: %w", err)
	}

	now := time.Now()
	convoy := &domain.Convoy{
		ID:                    id,
		Members:               []*domain.Member{},
		IsVerified:            false,
		CreatedByEmail:        email,
		LeaderName:            leaderName,
		VerificationToken:     token,
		VerificationExpiresAt: &expiresAt,
		CreatedAt:             now,
	}

	verification := &domain.ConvoyVerification{
		ID:        generateVerificationID(),
		ConvoyID:  id,
		Email:     email,
		Token:     token,
		ExpiresAt: expiresAt,
		CreatedAt: now,
	}

	s.convoys[id] = convoy
	s.verifications[token] = verification

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

// VerifyConvoy verifies a convoy using the verification token
func (s *MemoryStorage) VerifyConvoy(ctx context.Context, token string) (*domain.Convoy, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	verification, ok := s.verifications[token]
	if !ok {
		return nil, fmt.Errorf("verification token not found")
	}

	if verification.IsExpired() {
		return nil, fmt.Errorf("verification token has expired")
	}

	if verification.IsVerified() {
		return nil, fmt.Errorf("verification token has already been used")
	}

	convoy, ok := s.convoys[verification.ConvoyID]
	if !ok {
		return nil, fmt.Errorf("convoy not found")
	}

	// Mark verification as completed
	now := time.Now()
	verification.VerifiedAt = &now

	// Mark convoy as verified
	convoy.IsVerified = true
	convoy.VerifiedAt = &now

	return convoy, nil
}

// GetVerification retrieves verification information for a convoy
func (s *MemoryStorage) GetVerification(ctx context.Context, convoyID string) (*domain.ConvoyVerification, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, verification := range s.verifications {
		if verification.ConvoyID == convoyID {
			return verification, nil
		}
	}

	return nil, fmt.Errorf("verification not found for convoy %s", convoyID)
}

// UpdateVerificationToken updates the verification token for a convoy (for resend functionality)
func (s *MemoryStorage) UpdateVerificationToken(ctx context.Context, convoyID, token string, expiresAt time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	convoy, ok := s.convoys[convoyID]
	if !ok {
		return fmt.Errorf("convoy not found")
	}

	// Find existing verification
	var existingVerification *domain.ConvoyVerification
	for _, verification := range s.verifications {
		if verification.ConvoyID == convoyID {
			existingVerification = verification
			break
		}
	}

	if existingVerification == nil {
		return fmt.Errorf("verification not found for convoy")
	}

	// Remove old token
	delete(s.verifications, existingVerification.Token)

	// Update verification with new token
	existingVerification.Token = token
	existingVerification.ExpiresAt = expiresAt
	existingVerification.VerifiedAt = nil // Reset verification status

	// Update convoy
	convoy.VerificationToken = token
	convoy.VerificationExpiresAt = &expiresAt

	// Add with new token
	s.verifications[token] = existingVerification

	return nil
}

// CleanupExpiredVerifications removes expired verification records and unverified convoys
func (s *MemoryStorage) CleanupExpiredVerifications(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	var expiredTokens []string
	var expiredConvoyIDs []string

	// Find expired verifications
	for token, verification := range s.verifications {
		if verification.IsExpired() && !verification.IsVerified() {
			expiredTokens = append(expiredTokens, token)
			expiredConvoyIDs = append(expiredConvoyIDs, verification.ConvoyID)
		}
	}

	// Remove expired verifications
	for _, token := range expiredTokens {
		delete(s.verifications, token)
	}

	// Remove expired unverified convoys
	for _, convoyID := range expiredConvoyIDs {
		if convoy, exists := s.convoys[convoyID]; exists && !convoy.IsVerified {
			delete(s.convoys, convoyID)
		}
	}

	return nil
}

package storage

import (
	"context"
	"convoy-app/backend/src/domain"
)

// Storage defines the interface for data persistence.
type Storage interface {
	CreateConvoy(ctx context.Context) (*domain.Convoy, error)
	GetConvoy(ctx context.Context, convoyID string) (*domain.Convoy, error)
	AddMember(ctx context.Context, convoyID string, member *domain.Member) error
	UpdateMemberLocation(ctx context.Context, convoyID string, memberID int64, location domain.LatLng) error
	SetConvoyDestination(ctx context.Context, convoyID string, destination *domain.Destination) error
	LeaveConvoy(ctx context.Context, convoyID string, memberID int64) error
}

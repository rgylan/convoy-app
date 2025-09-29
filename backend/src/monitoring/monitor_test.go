package monitoring

import (
	"context"
	"convoy-app/backend/src/domain"
	"convoy-app/backend/src/storage"
	"convoy-app/backend/src/ws"
	"testing"
	"time"
)

func TestCalculateDistance(t *testing.T) {
	monitor := &ConvoyMonitor{}

	// Test distance between two known points
	// New York City to Los Angeles (approximately 3944 km)
	nyc := domain.LatLng{Lat: 40.7128, Lng: -74.0060}
	la := domain.LatLng{Lat: 34.0522, Lng: -118.2437}

	distance := monitor.calculateDistance(nyc, la)

	// Allow for some tolerance in the calculation
	expectedDistance := 3944.0 // km
	tolerance := 50.0 // km

	if distance < expectedDistance-tolerance || distance > expectedDistance+tolerance {
		t.Errorf("Expected distance around %.2f km, got %.2f km", expectedDistance, distance)
	}
}

func TestCalculateConvoyCenter(t *testing.T) {
	monitor := &ConvoyMonitor{}

	members := []*domain.Member{
		{
			ID:       1,
			Name:     "Member1",
			Location: domain.LatLng{Lat: 40.0, Lng: -74.0},
			Status:   domain.StatusConnected,
		},
		{
			ID:       2,
			Name:     "Member2",
			Location: domain.LatLng{Lat: 41.0, Lng: -73.0},
			Status:   domain.StatusConnected,
		},
		{
			ID:       3,
			Name:     "Member3",
			Location: domain.LatLng{Lat: 39.0, Lng: -75.0},
			Status:   domain.StatusDisconnected, // Should be excluded from center calculation
		},
	}

	center := monitor.calculateConvoyCenter(members)

	// Expected center should be average of first two members only
	expectedLat := (40.0 + 41.0) / 2
	expectedLng := (-74.0 + -73.0) / 2

	tolerance := 0.001

	if center.Lat < expectedLat-tolerance || center.Lat > expectedLat+tolerance {
		t.Errorf("Expected center lat %.3f, got %.3f", expectedLat, center.Lat)
	}

	if center.Lng < expectedLng-tolerance || center.Lng > expectedLng+tolerance {
		t.Errorf("Expected center lng %.3f, got %.3f", expectedLng, center.Lng)
	}
}

func TestDetermineMemberStatus(t *testing.T) {
	monitor := &ConvoyMonitor{}
	now := time.Now()

	convoyCenter := domain.LatLng{Lat: 40.0, Lng: -74.0}

	tests := []struct {
		name           string
		member         *domain.Member
		expectedStatus string
	}{
		{
			name: "Connected member",
			member: &domain.Member{
				ID:         1,
				Name:       "ConnectedMember",
				Location:   domain.LatLng{Lat: 40.001, Lng: -74.001}, // Very close to center
				LastUpdate: now.Add(-5 * time.Second),                // Recent update
			},
			expectedStatus: domain.StatusConnected,
		},
		{
			name: "Lagging member",
			member: &domain.Member{
				ID:         2,
				Name:       "LaggingMember",
				Location:   domain.LatLng{Lat: 40.05, Lng: -74.05}, // Far from center (>2km)
				LastUpdate: now.Add(-5 * time.Second),              // Recent update
			},
			expectedStatus: domain.StatusLagging,
		},
		{
			name: "Disconnected member",
			member: &domain.Member{
				ID:         3,
				Name:       "DisconnectedMember",
				Location:   domain.LatLng{Lat: 40.001, Lng: -74.001}, // Close to center
				LastUpdate: now.Add(-60 * time.Second),               // Old update (>30s)
			},
			expectedStatus: domain.StatusDisconnected,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status := monitor.determineMemberStatus(tt.member, convoyCenter, now)
			if status != tt.expectedStatus {
				t.Errorf("Expected status %s, got %s", tt.expectedStatus, status)
			}
		})
	}
}

func TestMonitoringIntegration(t *testing.T) {
	// Create test storage and WebSocket hub
	storage := storage.NewMemoryStorage()
	wsHub := ws.NewHub()

	// Create convoy monitor
	monitor := NewConvoyMonitor(storage, wsHub)

	// Create a test convoy
	convoy, err := storage.CreateConvoy(context.Background())
	if err != nil {
		t.Fatalf("Failed to create convoy: %v", err)
	}

	// Add test members
	member1 := &domain.Member{
		ID:       1,
		Name:     "TestMember1",
		Location: domain.LatLng{Lat: 40.0, Lng: -74.0},
		Status:   domain.StatusConnected,
	}

	member2 := &domain.Member{
		ID:       2,
		Name:     "TestMember2",
		Location: domain.LatLng{Lat: 40.05, Lng: -74.05}, // Far from member1 (>2km)
		Status:   domain.StatusConnected,
	}

	err = storage.AddMember(context.Background(), convoy.ID, member1)
	if err != nil {
		t.Fatalf("Failed to add member1: %v", err)
	}

	err = storage.AddMember(context.Background(), convoy.ID, member2)
	if err != nil {
		t.Fatalf("Failed to add member2: %v", err)
	}

	// Test convoy health check
	updatedConvoy, err := storage.GetConvoy(context.Background(), convoy.ID)
	if err != nil {
		t.Fatalf("Failed to get convoy: %v", err)
	}

	monitor.checkConvoyHealth(updatedConvoy)

	// Verify that member2 should be marked as lagging due to distance
	updatedConvoy, err = storage.GetConvoy(context.Background(), convoy.ID)
	if err != nil {
		t.Fatalf("Failed to get updated convoy: %v", err)
	}

	// Find member2 and check status
	var member2Updated *domain.Member
	for _, member := range updatedConvoy.Members {
		if member.ID == 2 {
			member2Updated = member
			break
		}
	}

	if member2Updated == nil {
		t.Fatalf("Member2 not found in updated convoy")
	}

	if member2Updated.Status != domain.StatusLagging {
		t.Errorf("Expected member2 to be lagging, got status: %s", member2Updated.Status)
	}
}

func TestMonitorStartStop(t *testing.T) {
	storage := storage.NewMemoryStorage()
	wsHub := ws.NewHub()
	monitor := NewConvoyMonitor(storage, wsHub)

	// Test starting the monitor
	monitor.Start()

	// Give it a moment to start
	time.Sleep(100 * time.Millisecond)

	// Test stopping the monitor
	monitor.Stop()

	// Test that multiple starts/stops don't cause issues
	monitor.Start()
	monitor.Start() // Should not cause problems
	monitor.Stop()
	monitor.Stop() // Should not cause problems
}

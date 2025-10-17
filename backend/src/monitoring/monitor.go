package monitoring

import (
	"context"
	"convoy-app/backend/src/domain"
	"convoy-app/backend/src/storage"
	"convoy-app/backend/src/ws"
	"log"
	"math"
	"sync"
	"time"
)

// Monitoring thresholds - Conservative values to reduce false alerts while maintaining safety
const (
	MaxDistanceFromConvoy        = 3.0  // kilometers - accommodates normal highway convoy spread and traffic separation
	DisconnectedTimeout          = 60   // seconds - reduces false alerts from temporary GPS/network issues while maintaining timely detection
	InactiveCleanupTimeout       = 3600 // 1 hour - time before closing inactive WebSocket connections
	ScatteredThreshold           = 0.5  // 50% of members far from center
	SingleMemberScatteredTimeout = 300  // 5 minutes for single-member convoys
	MonitoringInterval           = 10   // seconds
)

// ConvoyMonitor manages convoy health monitoring
type ConvoyMonitor struct {
	storage storage.Storage
	wsHub   *ws.Hub
	ctx     context.Context
	cancel  context.CancelFunc
	wg      sync.WaitGroup
	mu      sync.RWMutex
	running bool
}

// NewConvoyMonitor creates a new convoy monitoring service
func NewConvoyMonitor(storage storage.Storage, wsHub *ws.Hub) *ConvoyMonitor {
	ctx, cancel := context.WithCancel(context.Background())
	return &ConvoyMonitor{
		storage: storage,
		wsHub:   wsHub,
		ctx:     ctx,
		cancel:  cancel,
	}
}

// Start begins the monitoring process
func (cm *ConvoyMonitor) Start() {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if cm.running {
		log.Println("Convoy monitor is already running")
		return
	}

	cm.running = true
	cm.wg.Add(1)

	go func() {
		defer cm.wg.Done()
		cm.monitorLoop()
	}()

	log.Println("Convoy monitoring service started")
}

// Stop stops the monitoring process
func (cm *ConvoyMonitor) Stop() {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if !cm.running {
		return
	}

	cm.running = false
	cm.cancel()
	cm.wg.Wait()

	log.Println("Convoy monitoring service stopped")
}

// monitorLoop runs the main monitoring loop
func (cm *ConvoyMonitor) monitorLoop() {
	ticker := time.NewTicker(MonitoringInterval * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-cm.ctx.Done():
			return
		case <-ticker.C:
			cm.checkAllConvoys()
		}
	}
}

// checkAllConvoys monitors all active convoys
func (cm *ConvoyMonitor) checkAllConvoys() {
	convoys, err := cm.storage.GetAllActiveConvoys(cm.ctx)
	if err != nil {
		log.Printf("Error getting active convoys: %v", err)
		return
	}

	for _, convoy := range convoys {
		cm.checkConvoyHealth(convoy)
	}
}

// checkConvoyHealth analyzes a single convoy's health
func (cm *ConvoyMonitor) checkConvoyHealth(convoy *domain.Convoy) {
	if len(convoy.Members) == 0 {
		return
	}

	now := time.Now()
	convoyCenter := cm.calculateConvoyCenter(convoy.Members)

	var disconnectedMembers []*domain.Member
	var laggingMembers []*domain.Member
	var statusChanged bool

	// Check each member's status
	for _, member := range convoy.Members {
		oldStatus := member.Status
		newStatus := cm.determineMemberStatus(convoy.ID, member, convoyCenter, now)

		if oldStatus != newStatus {
			statusChanged = true
			err := cm.storage.UpdateMemberStatus(cm.ctx, convoy.ID, member.ID, newStatus)
			if err != nil {
				log.Printf("Error updating member %d status: %v", member.ID, err)
				continue
			}

			// Send appropriate alert
			cm.sendMemberStatusAlert(convoy.ID, member, newStatus, oldStatus, convoyCenter)
		}

		// Collect members by status for convoy-level analysis
		switch newStatus {
		case domain.StatusDisconnected:
			disconnectedMembers = append(disconnectedMembers, member)
		case domain.StatusInactive:
			// Don't immediately treat inactive members as scattered
			// They have WebSocket connection and may resume location tracking soon
			// Only count as scattered if inactive for extended period
			timeSinceUpdate := time.Since(member.LastUpdate)
			if timeSinceUpdate > 5*time.Minute {
				disconnectedMembers = append(disconnectedMembers, member)
			}
		case domain.StatusLagging:
			laggingMembers = append(laggingMembers, member)
		}
	}

	// Check for convoy-level alerts
	cm.checkConvoyScattered(convoy, laggingMembers, disconnectedMembers)

	// If any status changed, broadcast updated convoy data
	if statusChanged {
		cm.broadcastConvoyUpdate(convoy)
	}
}

// determineMemberStatus calculates the appropriate status for a member
func (cm *ConvoyMonitor) determineMemberStatus(convoyID string, member *domain.Member, convoyCenter domain.LatLng, now time.Time) string {
	// First check if member has an active WebSocket connection
	// If no WebSocket connection, member is definitely disconnected
	hasActiveConnection := cm.wsHub.HasActiveConnection(convoyID, member.ID)
	if !hasActiveConnection {
		log.Printf("Member %d (%s) marked as disconnected: no active WebSocket connection", member.ID, member.Name)
		return domain.StatusDisconnected
	}

	// If WebSocket is connected, check location update recency
	// This handles cases where connection exists but location tracking stopped
	timeSinceUpdate := now.Sub(member.LastUpdate)
	if timeSinceUpdate > DisconnectedTimeout*time.Second {
		// Check if member has been inactive for too long (cleanup threshold)
		if timeSinceUpdate > InactiveCleanupTimeout*time.Second {
			// Close the WebSocket connection for long-term inactive members
			log.Printf("Member %d inactive for %v (>%ds) - closing WebSocket connection", member.ID, timeSinceUpdate, InactiveCleanupTimeout)
			cm.closeInactiveConnection(convoyID, member.ID)
			return domain.StatusDisconnected
		}

		// Member has WebSocket connection but no recent location updates
		// Mark as inactive instead of disconnected to preserve the connection
		log.Printf("Member %d has active WebSocket but no location updates for %v - marking as inactive", member.ID, timeSinceUpdate)
		return domain.StatusInactive
	}

	// Check if member is lagging (too far from convoy center)
	distance := cm.calculateDistance(member.Location, convoyCenter)
	if distance > MaxDistanceFromConvoy {
		return domain.StatusLagging
	}

	return domain.StatusConnected
}

// closeInactiveConnection closes WebSocket connection for long-term inactive members
func (cm *ConvoyMonitor) closeInactiveConnection(convoyID string, memberID int64) {
	if conn := cm.wsHub.GetMemberConnection(convoyID, memberID); conn != nil {
		log.Printf("Closing inactive WebSocket connection for member %d in convoy %s", memberID, convoyID)
		conn.Close()
		cm.wsHub.UnregisterMember(convoyID, memberID)
	}
}

// sendMemberStatusAlert sends WebSocket alerts for member status changes
func (cm *ConvoyMonitor) sendMemberStatusAlert(convoyID string, member *domain.Member, newStatus, oldStatus string, convoyCenter domain.LatLng) {
	alert := &domain.ConvoyAlert{
		ConvoyID:   convoyID,
		MemberID:   member.ID,
		MemberName: member.Name,
		Timestamp:  time.Now(),
	}

	switch newStatus {
	case domain.StatusDisconnected:
		if oldStatus != domain.StatusDisconnected && oldStatus != domain.StatusInactive {
			alert.EventType = domain.EventMemberDisconnected
			alert.LastSeen = member.LastUpdate
			cm.wsHub.Broadcast(convoyID, alert)
			log.Printf("Member %s (%d) disconnected from convoy %s", member.Name, member.ID, convoyID)
		}

	case domain.StatusInactive:
		if oldStatus == domain.StatusConnected || oldStatus == domain.StatusLagging {
			alert.EventType = domain.EventMemberInactive
			alert.LastSeen = member.LastUpdate
			cm.wsHub.Broadcast(convoyID, alert)
			log.Printf("Member %s (%d) became inactive in convoy %s (no location updates)", member.Name, member.ID, convoyID)
		}

	case domain.StatusLagging:
		if oldStatus == domain.StatusConnected {
			alert.EventType = domain.EventMemberLagging
			alert.Distance = cm.calculateDistance(member.Location, convoyCenter)
			cm.wsHub.Broadcast(convoyID, alert)
			log.Printf("Member %s (%d) is lagging in convoy %s (%.2fkm from center)",
				member.Name, member.ID, convoyID, alert.Distance)
		}

	case domain.StatusConnected:
		if oldStatus == domain.StatusDisconnected {
			alert.EventType = domain.EventMemberReconnected
			cm.wsHub.Broadcast(convoyID, alert)
			log.Printf("Member %s (%d) reconnected to convoy %s", member.Name, member.ID, convoyID)
		} else if oldStatus == domain.StatusInactive {
			alert.EventType = domain.EventMemberReactivated
			cm.wsHub.Broadcast(convoyID, alert)
			log.Printf("Member %s (%d) reactivated location tracking in convoy %s", member.Name, member.ID, convoyID)
		}
	}
}

// checkConvoyScattered checks if the convoy is scattered
func (cm *ConvoyMonitor) checkConvoyScattered(convoy *domain.Convoy, laggingMembers, disconnectedMembers []*domain.Member) {
	totalMembers := len(convoy.Members)
	if totalMembers == 0 {
		return
	}

	scatteredCount := len(laggingMembers) + len(disconnectedMembers)
	scatteredRatio := float64(scatteredCount) / float64(totalMembers)

	// Special handling for single-member convoys to prevent immediate "scattered" alerts
	if totalMembers == 1 && len(disconnectedMembers) == 1 {
		// Only mark single-member convoy as scattered if disconnected for extended period
		disconnectedMember := disconnectedMembers[0]
		timeSinceDisconnect := time.Since(disconnectedMember.LastUpdate)

		if timeSinceDisconnect < SingleMemberScatteredTimeout*time.Second {
			// Don't mark as scattered yet - member might reconnect soon
			log.Printf("Single-member convoy %s: member %s disconnected for %v (threshold: %ds)",
				convoy.ID, disconnectedMember.Name, timeSinceDisconnect, SingleMemberScatteredTimeout)
			return
		}

		log.Printf("Single-member convoy %s marked as scattered: member %s disconnected for %v",
			convoy.ID, disconnectedMember.Name, timeSinceDisconnect)
	}

	// For multi-member convoys or single-member convoys with extended disconnection
	if scatteredRatio >= ScatteredThreshold {
		alert := &domain.ConvoyAlert{
			EventType:      domain.EventConvoyScattered,
			ConvoyID:       convoy.ID,
			ScatteredCount: scatteredCount,
			Timestamp:      time.Now(),
		}

		cm.wsHub.Broadcast(convoy.ID, alert)
		log.Printf("Convoy %s is scattered: %d/%d members are far from the group",
			convoy.ID, scatteredCount, totalMembers)
	}
}

// broadcastConvoyUpdate sends updated convoy data to all connected clients
func (cm *ConvoyMonitor) broadcastConvoyUpdate(convoy *domain.Convoy) {
	cm.wsHub.Broadcast(convoy.ID, convoy)
}

// calculateConvoyCenter calculates the geographic center of all connected members
func (cm *ConvoyMonitor) calculateConvoyCenter(members []*domain.Member) domain.LatLng {
	if len(members) == 0 {
		return domain.LatLng{}
	}

	var totalLat, totalLng float64
	connectedCount := 0

	for _, member := range members {
		// Only include connected members in center calculation
		if member.Status == domain.StatusConnected {
			totalLat += member.Location.Lat
			totalLng += member.Location.Lng
			connectedCount++
		}
	}

	if connectedCount == 0 {
		// If no connected members, use all members
		for _, member := range members {
			totalLat += member.Location.Lat
			totalLng += member.Location.Lng
		}
		connectedCount = len(members)
	}

	return domain.LatLng{
		Lat: totalLat / float64(connectedCount),
		Lng: totalLng / float64(connectedCount),
	}
}

// calculateDistance calculates the distance between two points in kilometers using Haversine formula
func (cm *ConvoyMonitor) calculateDistance(point1, point2 domain.LatLng) float64 {
	const earthRadius = 6371 // Earth's radius in kilometers

	lat1Rad := point1.Lat * math.Pi / 180
	lat2Rad := point2.Lat * math.Pi / 180
	deltaLatRad := (point2.Lat - point1.Lat) * math.Pi / 180
	deltaLngRad := (point2.Lng - point1.Lng) * math.Pi / 180

	a := math.Sin(deltaLatRad/2)*math.Sin(deltaLatRad/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(deltaLngRad/2)*math.Sin(deltaLngRad/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadius * c
}

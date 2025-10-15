package api

import (
	"context"
	"convoy-app/backend/src/domain"
	"convoy-app/backend/src/email"
	"convoy-app/backend/src/ierr"
	"convoy-app/backend/src/monitoring"
	"convoy-app/backend/src/ratelimit"
	"convoy-app/backend/src/storage"
	"convoy-app/backend/src/ws"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// BroadcastThrottler manages broadcast throttling to prevent excessive WebSocket messages
type BroadcastThrottler struct {
	mu            sync.RWMutex
	lastBroadcast map[string]time.Time
	minInterval   time.Duration
}

// NewBroadcastThrottler creates a new broadcast throttler
func NewBroadcastThrottler(minInterval time.Duration) *BroadcastThrottler {
	return &BroadcastThrottler{
		lastBroadcast: make(map[string]time.Time),
		minInterval:   minInterval,
	}
}

// ShouldBroadcast checks if enough time has passed since the last broadcast for a convoy
func (bt *BroadcastThrottler) ShouldBroadcast(convoyID string) bool {
	bt.mu.RLock()
	lastTime, exists := bt.lastBroadcast[convoyID]
	bt.mu.RUnlock()

	if !exists {
		return true
	}

	return time.Since(lastTime) >= bt.minInterval
}

// RecordBroadcast records that a broadcast was sent for a convoy
func (bt *BroadcastThrottler) RecordBroadcast(convoyID string) {
	bt.mu.Lock()
	defer bt.mu.Unlock()
	bt.lastBroadcast[convoyID] = time.Now()
}

// API provides the handlers for our REST endpoints.
type API struct {
	storage            storage.Storage
	wsHub              *ws.Hub
	monitor            *monitoring.ConvoyMonitor
	broadcastThrottler *BroadcastThrottler
	emailService       *email.Service
	rateLimiter        *ratelimit.Limiter
}

// New creates a new API instance.
func New(storage storage.Storage, wsHub *ws.Hub) *API {
	monitor := monitoring.NewConvoyMonitor(storage, wsHub)
	// Set up broadcast throttling with 1-second minimum interval
	throttler := NewBroadcastThrottler(1 * time.Second)

	// Initialize email service
	emailService := email.NewServiceFromEnv()

	// Initialize rate limiter
	rateLimiter := ratelimit.NewLimiter(ratelimit.DefaultConfig())

	return &API{
		storage:            storage,
		wsHub:              wsHub,
		monitor:            monitor,
		broadcastThrottler: throttler,
		emailService:       emailService,
		rateLimiter:        rateLimiter,
	}
}

// StartMonitoring starts the convoy monitoring service
func (a *API) StartMonitoring() {
	a.monitor.Start()
}

// StopMonitoring stops the convoy monitoring service
func (a *API) StopMonitoring() {
	a.monitor.Stop()
}

// HandleCreateConvoy creates a new convoy.
func (a *API) HandleCreateConvoy(w http.ResponseWriter, r *http.Request) {
	convoy, err := a.storage.CreateConvoy(r.Context())
	if err != nil {
		log.Printf("ERROR: failed to create convoy: %v", err)
		writeError(w, http.StatusInternalServerError, errors.New("internal server error"))
		return
	}

	log.Printf("SUCCESS: Convoy created with ID %s", convoy.ID)
	writeJSON(w, http.StatusCreated, convoy)
}

// HandleGetConvoy retrieves a convoy by its ID.
func (a *API) HandleGetConvoy(w http.ResponseWriter, r *http.Request) {
	convoyID := r.PathValue("convoyId")
	convoy, err := a.storage.GetConvoy(r.Context(), convoyID)
	if err != nil {
		writeError(w, http.StatusNotFound, errors.New("convoy not found"))
		return
	}
	writeJSON(w, http.StatusOK, convoy)
}

// HandleAddMember adds a member to a convoy.
func (a *API) HandleAddMember(w http.ResponseWriter, r *http.Request) {
	convoyID := r.PathValue("convoyId")

	var req struct {
		Name     string        `json:"name"`
		Location domain.LatLng `json:"location"` // Added Location field
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, errors.New("invalid request body"))
		return
	}

	// Use a shorter, more reliable ID generation
	memberID := time.Now().Unix()*1000 + int64(time.Now().Nanosecond()/1000000)

	member := &domain.Member{
		ID:       memberID,
		Name:     req.Name,
		Location: req.Location, // Assigned Location from request
	}

	if err := a.storage.AddMember(r.Context(), convoyID, member); err != nil {
		if errors.Is(err, ierr.ErrNotFound) {
			writeError(w, http.StatusNotFound, errors.New("convoy not found"))
		} else {
			log.Printf("ERROR: failed to add member to convoy %s: %v", convoyID, err)
			writeError(w, http.StatusInternalServerError, errors.New("internal server error"))
		}
		return
	}

	log.Printf("SUCCESS: Member %s (ID: %d) joined convoy %s", req.Name, memberID, convoyID)
	a.broadcastUpdate(r.Context(), convoyID)
	writeJSON(w, http.StatusCreated, member)
}

// HandleUpdateMemberLocation updates a member's location.
func (a *API) HandleUpdateMemberLocation(w http.ResponseWriter, r *http.Request) {
	convoyID := r.PathValue("convoyId")
	memberIDStr := r.PathValue("memberId")

	memberID, err := strconv.ParseInt(memberIDStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, fmt.Errorf("invalid member ID: %v", err))
		return
	}

	var req LocationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Errorf("invalid request body: %v", err))
		return
	}

	if err := req.Validate(); err != nil {
		writeValidationError(w, err)
		return
	}

	location := domain.LatLng{Lat: req.Lat, Lng: req.Lng}

	if err := a.storage.UpdateMemberLocation(r.Context(), convoyID, memberID, location); err != nil {
		log.Printf("ERROR: failed to update member location: %v", err)
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	// Log location update for testing
	log.Printf("LOCATION_UPDATE: Member %d in convoy %s updated location to [%.6f, %.6f]",
		memberID, convoyID, req.Lat, req.Lng)

	// Broadcast the updated convoy data
	a.broadcastUpdate(r.Context(), convoyID)

	writeJSON(w, http.StatusOK, map[string]string{"message": "location updated"})
}

// HandleSetConvoyDestination sets the destination for a convoy.
func (a *API) HandleSetConvoyDestination(w http.ResponseWriter, r *http.Request) {
	convoyID := r.PathValue("convoyId")

	var req DestinationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, errors.New("invalid request body"))
		return
	}

	// Validate the destination request
	if err := req.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	// Convert to domain object
	destination := req.ToDomain()

	if err := a.storage.SetConvoyDestination(r.Context(), convoyID, destination); err != nil {
		if errors.Is(err, ierr.ErrNotFound) {
			writeError(w, http.StatusNotFound, errors.New("convoy not found"))
		} else {
			log.Printf("ERROR: failed to set destination for convoy %s: %v", convoyID, err)
			writeError(w, http.StatusInternalServerError, errors.New("internal server error"))
		}
		return
	}

	log.Printf("INFO: Destination set for convoy %s: %s at [%.6f, %.6f]",
		convoyID, destination.Name, destination.Lat, destination.Lng)

	a.broadcastUpdate(r.Context(), convoyID)
	writeJSON(w, http.StatusOK, map[string]string{"message": "destination set"})
}

// HandleLeaveConvoy removes a member from a convoy.
func (a *API) HandleLeaveConvoy(w http.ResponseWriter, r *http.Request) {
	convoyID := r.PathValue("convoyId")
	memberIDStr := r.PathValue("memberId")
	memberID, err := strconv.ParseInt(memberIDStr, 10, 64)
	if err != nil {
		log.Printf("ERROR: invalid member ID format: %s", memberIDStr)
		writeError(w, http.StatusBadRequest, errors.New("invalid member ID"))
		return
	}

	log.Printf("INFO: Attempting to remove member %d from convoy %s", memberID, convoyID)

	if err := a.storage.LeaveConvoy(r.Context(), convoyID, memberID); err != nil {
		if errors.Is(err, ierr.ErrNotFound) {
			log.Printf("ERROR: convoy %s or member %d not found during leave operation", convoyID, memberID)
			writeError(w, http.StatusNotFound, errors.New("convoy or member not found"))
		} else {
			log.Printf("ERROR: failed to leave convoy for member %d in convoy %s: %v", memberID, convoyID, err)
			writeError(w, http.StatusInternalServerError, errors.New("internal server error"))
		}
		return
	}

	log.Printf("INFO: Member %d successfully left convoy %s", memberID, convoyID)
	a.broadcastUpdate(r.Context(), convoyID)
	writeJSON(w, http.StatusOK, map[string]string{"message": "member left convoy"})
}

func (a *API) broadcastUpdate(ctx context.Context, convoyID string) {
	// Check if we should throttle this broadcast
	if !a.broadcastThrottler.ShouldBroadcast(convoyID) {
		log.Printf("DEBUG: Throttling broadcast for convoy %s", convoyID)
		return
	}

	convoy, err := a.storage.GetConvoy(ctx, convoyID)
	if err != nil {
		log.Printf("ERROR: failed to get convoy %s for broadcast: %v", convoyID, err)
		return
	}

	// Record that we're broadcasting and send the update
	a.broadcastThrottler.RecordBroadcast(convoyID)
	a.wsHub.Broadcast(convoyID, convoy)
}

// broadcastUpdateForced forces a broadcast without throttling (for critical updates)
func (a *API) broadcastUpdateForced(ctx context.Context, convoyID string) {
	convoy, err := a.storage.GetConvoy(ctx, convoyID)
	if err != nil {
		log.Printf("ERROR: failed to get convoy %s for forced broadcast: %v", convoyID, err)
		return
	}

	// Record the broadcast and send
	a.broadcastThrottler.RecordBroadcast(convoyID)
	a.wsHub.Broadcast(convoyID, convoy)
}

// writeJSON is a helper function for writing JSON responses.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("ERROR: could not encode JSON response: %v", err)
	}
}

// writeError is a helper function for writing JSON error responses.
func writeError(w http.ResponseWriter, status int, err error) {
	writeErrorWithCode(w, status, err.Error(), "")
}

// HandleCreateConvoyWithVerification creates a new convoy with email verification
func (a *API) HandleCreateConvoyWithVerification(w http.ResponseWriter, r *http.Request) {
	var req CreateConvoyWithVerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, errors.New("invalid request body"))
		return
	}

	if err := req.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	// Get client IP for rate limiting
	clientIP := getClientIP(r)

	// Check rate limits
	if !a.rateLimiter.CheckEmailLimit(req.Email, 3) {
		remaining := a.rateLimiter.GetRemainingEmailRequests(req.Email, 3)
		writeErrorWithCode(w, http.StatusTooManyRequests,
			fmt.Sprintf("Too many verification emails sent. Try again later. Remaining: %d", remaining),
			"RATE_LIMIT_EMAIL")
		return
	}

	if !a.rateLimiter.CheckIPLimit(clientIP, 5) {
		remaining := a.rateLimiter.GetRemainingIPRequests(clientIP, 5)
		writeErrorWithCode(w, http.StatusTooManyRequests,
			fmt.Sprintf("Too many convoy creation attempts. Try again later. Remaining: %d", remaining),
			"RATE_LIMIT_IP")
		return
	}

	// Generate verification token
	token, err := email.GenerateVerificationToken()
	if err != nil {
		log.Printf("ERROR: failed to generate verification token: %v", err)
		writeError(w, http.StatusInternalServerError, errors.New("internal server error"))
		return
	}

	// Create convoy with verification
	expiresAt := time.Now().Add(30 * time.Minute)
	convoy, err := a.storage.CreateConvoyWithVerification(r.Context(), req.Email, req.LeaderName, token, expiresAt)
	if err != nil {
		log.Printf("ERROR: failed to create convoy with verification: %v", err)
		writeError(w, http.StatusInternalServerError, errors.New("internal server error"))
		return
	}

	// Send verification email
	if a.emailService.IsConfigured() {
		if err := a.emailService.SendVerificationEmail(req.Email, req.LeaderName, token); err != nil {
			log.Printf("ERROR: failed to send verification email: %v", err)
			writeError(w, http.StatusInternalServerError, errors.New("failed to send verification email"))
			return
		}
	} else {
		log.Printf("WARNING: Email service not configured, verification email not sent")
	}

	// Record rate limit usage
	a.rateLimiter.RecordEmailRequest(req.Email)
	a.rateLimiter.RecordIPRequest(clientIP)

	log.Printf("SUCCESS: Convoy created with verification - ID: %s, Email: %s", convoy.ID, req.Email)

	response := map[string]interface{}{
		"convoyId":             convoy.ID,
		"verificationRequired": true,
		"emailSent":            a.emailService.IsConfigured(),
		"expiresAt":            expiresAt.Format(time.RFC3339),
	}

	writeJSON(w, http.StatusCreated, response)
}

// HandleVerifyConvoy verifies a convoy using the verification token
func (a *API) HandleVerifyConvoy(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	if token == "" {
		writeError(w, http.StatusBadRequest, errors.New("verification token is required"))
		return
	}

	convoy, err := a.storage.VerifyConvoy(r.Context(), token)
	if err != nil {
		log.Printf("ERROR: verification failed for token %s: %v", token, err)
		if strings.Contains(err.Error(), "not found") {
			writeErrorWithCode(w, http.StatusNotFound, "Invalid verification token", "INVALID_TOKEN")
		} else if strings.Contains(err.Error(), "expired") {
			writeErrorWithCode(w, http.StatusGone, "Verification token has expired", "TOKEN_EXPIRED")
		} else if strings.Contains(err.Error(), "already been used") {
			writeErrorWithCode(w, http.StatusConflict, "Verification token has already been used", "TOKEN_USED")
		} else {
			writeError(w, http.StatusInternalServerError, errors.New("verification failed"))
		}
		return
	}

	log.Printf("SUCCESS: Convoy verified - ID: %s", convoy.ID)

	response := map[string]interface{}{
		"success":     true,
		"convoyId":    convoy.ID,
		"leaderName":  convoy.LeaderName,
		"redirectUrl": fmt.Sprintf("/convoy/%s", convoy.ID),
		"verifiedAt":  convoy.VerifiedAt.Format(time.RFC3339),
	}

	writeJSON(w, http.StatusOK, response)
}

// HandleResendVerification resends verification email for a convoy
func (a *API) HandleResendVerification(w http.ResponseWriter, r *http.Request) {
	convoyID := r.PathValue("convoyId")
	if convoyID == "" {
		writeError(w, http.StatusBadRequest, errors.New("convoy ID is required"))
		return
	}

	// Get convoy
	convoy, err := a.storage.GetConvoy(r.Context(), convoyID)
	if err != nil {
		writeError(w, http.StatusNotFound, errors.New("convoy not found"))
		return
	}

	if convoy.IsVerified {
		writeError(w, http.StatusConflict, errors.New("convoy is already verified"))
		return
	}

	// Check rate limits for email
	if !a.rateLimiter.CheckEmailLimit(convoy.CreatedByEmail, 3) {
		remaining := a.rateLimiter.GetRemainingEmailRequests(convoy.CreatedByEmail, 3)
		writeErrorWithCode(w, http.StatusTooManyRequests,
			fmt.Sprintf("Too many verification emails sent. Try again later. Remaining: %d", remaining),
			"RATE_LIMIT_EMAIL")
		return
	}

	// Generate new verification token
	newToken, err := email.GenerateVerificationToken()
	if err != nil {
		log.Printf("ERROR: failed to generate new verification token: %v", err)
		writeError(w, http.StatusInternalServerError, errors.New("internal server error"))
		return
	}

	// Update verification token
	expiresAt := time.Now().Add(30 * time.Minute)
	if err := a.storage.UpdateVerificationToken(r.Context(), convoyID, newToken, expiresAt); err != nil {
		log.Printf("ERROR: failed to update verification token: %v", err)
		writeError(w, http.StatusInternalServerError, errors.New("internal server error"))
		return
	}

	// Send new verification email
	if a.emailService.IsConfigured() {
		// Get leader name from convoy members or use default
		leaderName := "Convoy Leader"
		if len(convoy.Members) > 0 {
			leaderName = convoy.Members[0].Name
		}

		if err := a.emailService.SendVerificationEmail(convoy.CreatedByEmail, leaderName, newToken); err != nil {
			log.Printf("ERROR: failed to send verification email: %v", err)
			writeError(w, http.StatusInternalServerError, errors.New("failed to send verification email"))
			return
		}
	} else {
		log.Printf("WARNING: Email service not configured, verification email not sent")
	}

	// Record rate limit usage
	a.rateLimiter.RecordEmailRequest(convoy.CreatedByEmail)

	log.Printf("SUCCESS: Verification email resent for convoy %s", convoyID)

	response := map[string]interface{}{
		"emailSent":           a.emailService.IsConfigured(),
		"expiresAt":           expiresAt.Format(time.RFC3339),
		"rateLimitRemaining":  a.rateLimiter.GetRemainingEmailRequests(convoy.CreatedByEmail, 3),
	}

	writeJSON(w, http.StatusOK, response)
}

// getClientIP extracts the client IP address from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (for proxies)
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		// Take the first IP in the list
		ips := strings.Split(forwarded, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP header
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

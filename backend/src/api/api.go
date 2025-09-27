package api

import (
	"context"
	"convoy-app/backend/src/domain"
	"convoy-app/backend/src/ierr"
	"convoy-app/backend/src/storage"
	"convoy-app/backend/src/ws"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
)

// API provides the handlers for our REST endpoints.
type API struct {
	storage storage.Storage
	wsHub   *ws.Hub
}

// New creates a new API instance.
func New(storage storage.Storage, wsHub *ws.Hub) *API {
	return &API{
		storage: storage,
		wsHub:   wsHub,
	}
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
	convoy, err := a.storage.GetConvoy(ctx, convoyID)
	if err != nil {
		log.Printf("ERROR: failed to get convoy %s for broadcast: %v", convoyID, err)
		return
	}
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

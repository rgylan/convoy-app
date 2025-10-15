package api

import (
	"convoy-app/backend/src/domain"
	"errors"
	"regexp"
	"strings"
)

type ConvoyRequest struct {
	Name string `json:"name"`
}

type MemberRequest struct {
	Name     string         `json:"name"`
	Location *domain.LatLng `json:"location,omitempty"`
}

type LocationRequest struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type DestinationRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description,omitempty"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
}

type CreateConvoyWithVerificationRequest struct {
	LeaderName string `json:"leaderName"`
	Email      string `json:"email"`
}

type ResendVerificationRequest struct {
	ConvoyID string `json:"convoyId"`
}

func (r *ConvoyRequest) Validate() error {
	if strings.TrimSpace(r.Name) == "" {
		return errors.New("convoy name is required")
	}
	if len(r.Name) > 100 {
		return errors.New("convoy name too long")
	}
	return nil
}

func (r *MemberRequest) Validate() error {
	if strings.TrimSpace(r.Name) == "" {
		return errors.New("member name is required")
	}
	if len(r.Name) > 50 {
		return errors.New("member name too long")
	}
	return nil
}

func (r *LocationRequest) Validate() error {
	if r.Lat < -90 || r.Lat > 90 {
		return errors.New("latitude must be between -90 and 90")
	}
	if r.Lng < -180 || r.Lng > 180 {
		return errors.New("longitude must be between -180 and 180")
	}
	return nil
}

func (r *DestinationRequest) Validate() error {
	if strings.TrimSpace(r.Name) == "" {
		return errors.New("destination name is required")
	}
	if len(r.Name) > 100 {
		return errors.New("destination name too long")
	}
	if r.Lat < -90 || r.Lat > 90 {
		return errors.New("latitude must be between -90 and 90")
	}
	if r.Lng < -180 || r.Lng > 180 {
		return errors.New("longitude must be between -180 and 180")
	}
	return nil
}

func (r *DestinationRequest) ToDomain() *domain.Destination {
	// Smart name truncation: extract portion before first comma
	name := r.Name
	if commaIndex := strings.Index(name, ","); commaIndex != -1 {
		name = name[:commaIndex]
	}

	// Enforce 100-character limit after comma truncation
	if len(name) > 100 {
		name = name[:100]
	}

	return &domain.Destination{
		Name:        strings.TrimSpace(name),
		Description: strings.TrimSpace(r.Description),
		Lat:         r.Lat,
		Lng:         r.Lng,
	}
}

func (r *CreateConvoyWithVerificationRequest) Validate() error {
	if strings.TrimSpace(r.LeaderName) == "" {
		return errors.New("leader name is required")
	}
	if len(r.LeaderName) > 50 {
		return errors.New("leader name too long (max 50 characters)")
	}
	if strings.TrimSpace(r.Email) == "" {
		return errors.New("email is required")
	}
	if !isValidEmail(r.Email) {
		return errors.New("invalid email format")
	}
	return nil
}

func isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

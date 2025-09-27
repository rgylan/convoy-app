package domain

// Convoy represents a group of members traveling together.
type Convoy struct {
	ID          string       `json:"id"`
	Members     []*Member    `json:"members"`
	Destination *Destination `json:"destination,omitempty"`
}

// Member represents a user in a convoy.
type Member struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Location LatLng `json:"location"`
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

// ToLatLng converts a Destination to LatLng coordinates.
func (d *Destination) ToLatLng() LatLng {
	return LatLng{Lat: d.Lat, Lng: d.Lng}
}

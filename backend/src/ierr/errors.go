package ierr

import "errors"

var (
	// ErrNotFound is returned when a resource is not found.
	ErrNotFound = errors.New("not found")
	// ErrConflict is returned when creating a resource that already exists.
	ErrConflict = errors.New("resource already exists")
)

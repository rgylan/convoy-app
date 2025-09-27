package api

import (
	"encoding/json"
	"log"
	"net/http"
)

type ErrorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details string `json:"details,omitempty"`
}

func writeErrorWithCode(w http.ResponseWriter, statusCode int, message, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := ErrorResponse{
		Error: message,
		Code:  code,
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("ERROR: Failed to encode error response: %v", err)
	}
}

func writeValidationError(w http.ResponseWriter, err error) {
	writeErrorWithCode(w, http.StatusBadRequest, err.Error(), "VALIDATION_ERROR")
}

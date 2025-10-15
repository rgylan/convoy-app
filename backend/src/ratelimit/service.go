package ratelimit

import (
	"sync"
	"time"
)

// Limiter manages rate limiting for different types of requests
type Limiter struct {
	emailLimits map[string][]time.Time // email -> timestamps
	ipLimits    map[string][]time.Time // IP -> timestamps
	mu          sync.RWMutex
}

// Config holds rate limiting configuration
type Config struct {
	MaxEmailsPerHour     int
	MaxConvoysPerIPPerHour int
	CleanupInterval      time.Duration
}

// DefaultConfig returns default rate limiting configuration
func DefaultConfig() Config {
	return Config{
		MaxEmailsPerHour:       3,
		MaxConvoysPerIPPerHour: 5,
		CleanupInterval:        time.Hour,
	}
}

// NewLimiter creates a new rate limiter
func NewLimiter(config Config) *Limiter {
	limiter := &Limiter{
		emailLimits: make(map[string][]time.Time),
		ipLimits:    make(map[string][]time.Time),
	}

	// Start cleanup goroutine
	go limiter.startCleanup(config.CleanupInterval)

	return limiter
}

// CheckEmailLimit checks if an email address has exceeded the rate limit
func (l *Limiter) CheckEmailLimit(email string, maxPerHour int) bool {
	l.mu.RLock()
	defer l.mu.RUnlock()

	timestamps, exists := l.emailLimits[email]
	if !exists {
		return true // No previous requests, allow
	}

	// Count requests in the last hour
	cutoff := time.Now().Add(-time.Hour)
	count := 0
	for _, timestamp := range timestamps {
		if timestamp.After(cutoff) {
			count++
		}
	}

	return count < maxPerHour
}

// CheckIPLimit checks if an IP address has exceeded the rate limit
func (l *Limiter) CheckIPLimit(ip string, maxPerHour int) bool {
	l.mu.RLock()
	defer l.mu.RUnlock()

	timestamps, exists := l.ipLimits[ip]
	if !exists {
		return true // No previous requests, allow
	}

	// Count requests in the last hour
	cutoff := time.Now().Add(-time.Hour)
	count := 0
	for _, timestamp := range timestamps {
		if timestamp.After(cutoff) {
			count++
		}
	}

	return count < maxPerHour
}

// RecordEmailRequest records a request for an email address
func (l *Limiter) RecordEmailRequest(email string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	if l.emailLimits[email] == nil {
		l.emailLimits[email] = make([]time.Time, 0)
	}
	l.emailLimits[email] = append(l.emailLimits[email], now)
}

// RecordIPRequest records a request for an IP address
func (l *Limiter) RecordIPRequest(ip string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	if l.ipLimits[ip] == nil {
		l.ipLimits[ip] = make([]time.Time, 0)
	}
	l.ipLimits[ip] = append(l.ipLimits[ip], now)
}

// GetEmailRequestCount returns the number of requests for an email in the last hour
func (l *Limiter) GetEmailRequestCount(email string) int {
	l.mu.RLock()
	defer l.mu.RUnlock()

	timestamps, exists := l.emailLimits[email]
	if !exists {
		return 0
	}

	cutoff := time.Now().Add(-time.Hour)
	count := 0
	for _, timestamp := range timestamps {
		if timestamp.After(cutoff) {
			count++
		}
	}

	return count
}

// GetIPRequestCount returns the number of requests for an IP in the last hour
func (l *Limiter) GetIPRequestCount(ip string) int {
	l.mu.RLock()
	defer l.mu.RUnlock()

	timestamps, exists := l.ipLimits[ip]
	if !exists {
		return 0
	}

	cutoff := time.Now().Add(-time.Hour)
	count := 0
	for _, timestamp := range timestamps {
		if timestamp.After(cutoff) {
			count++
		}
	}

	return count
}

// GetRemainingEmailRequests returns the number of remaining requests for an email
func (l *Limiter) GetRemainingEmailRequests(email string, maxPerHour int) int {
	current := l.GetEmailRequestCount(email)
	remaining := maxPerHour - current
	if remaining < 0 {
		return 0
	}
	return remaining
}

// GetRemainingIPRequests returns the number of remaining requests for an IP
func (l *Limiter) GetRemainingIPRequests(ip string, maxPerHour int) int {
	current := l.GetIPRequestCount(ip)
	remaining := maxPerHour - current
	if remaining < 0 {
		return 0
	}
	return remaining
}

// startCleanup starts a goroutine that periodically cleans up old entries
func (l *Limiter) startCleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		l.cleanup()
	}
}

// cleanup removes entries older than 1 hour
func (l *Limiter) cleanup() {
	l.mu.Lock()
	defer l.mu.Unlock()

	cutoff := time.Now().Add(-time.Hour)

	// Clean up email limits
	for email, timestamps := range l.emailLimits {
		filtered := make([]time.Time, 0)
		for _, timestamp := range timestamps {
			if timestamp.After(cutoff) {
				filtered = append(filtered, timestamp)
			}
		}
		if len(filtered) == 0 {
			delete(l.emailLimits, email)
		} else {
			l.emailLimits[email] = filtered
		}
	}

	// Clean up IP limits
	for ip, timestamps := range l.ipLimits {
		filtered := make([]time.Time, 0)
		for _, timestamp := range timestamps {
			if timestamp.After(cutoff) {
				filtered = append(filtered, timestamp)
			}
		}
		if len(filtered) == 0 {
			delete(l.ipLimits, ip)
		} else {
			l.ipLimits[ip] = filtered
		}
	}
}

// Reset clears all rate limiting data (useful for testing)
func (l *Limiter) Reset() {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.emailLimits = make(map[string][]time.Time)
	l.ipLimits = make(map[string][]time.Time)
}

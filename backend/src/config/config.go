package config

import (
    "os"
    "strconv"
    "time"
)

type Config struct {
    Port                    string
    MaxConnectionsPerConvoy int
    MaxTotalConnections     int
    RequestTimeout          time.Duration
    WSReadTimeout           time.Duration
    WSWriteTimeout          time.Duration
    WSPingPeriod           time.Duration
}

func Load() *Config {
    return &Config{
        Port:                    getEnv("PORT", "8080"),
        MaxConnectionsPerConvoy: getEnvInt("MAX_CONNECTIONS_PER_CONVOY", 50),
        MaxTotalConnections:     getEnvInt("MAX_TOTAL_CONNECTIONS", 1000),
        RequestTimeout:          getEnvDuration("REQUEST_TIMEOUT", 30*time.Second),
        WSReadTimeout:           getEnvDuration("WS_READ_TIMEOUT", 60*time.Second),
        WSWriteTimeout:          getEnvDuration("WS_WRITE_TIMEOUT", 10*time.Second),
        WSPingPeriod:           getEnvDuration("WS_PING_PERIOD", 54*time.Second),
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
    if value := os.Getenv(key); value != "" {
        if intValue, err := strconv.Atoi(value); err == nil {
            return intValue
        }
    }
    return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
    if value := os.Getenv(key); value != "" {
        if duration, err := time.ParseDuration(value); err == nil {
            return duration
        }
    }
    return defaultValue
}
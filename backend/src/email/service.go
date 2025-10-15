package email

import (
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
	"regexp"
	"strings"
	"time"
)

// Service handles email sending functionality
type Service struct {
	host     string
	port     string
	username string
	password string
	fromName string
	fromEmail string
	baseURL  string
}

// Config holds email service configuration
type Config struct {
	Host      string
	Port      string
	Username  string
	Password  string
	FromName  string
	FromEmail string
	BaseURL   string
}

// NewService creates a new email service instance
func NewService(config Config) *Service {
	return &Service{
		host:      config.Host,
		port:      config.Port,
		username:  config.Username,
		password:  config.Password,
		fromName:  config.FromName,
		fromEmail: config.FromEmail,
		baseURL:   config.BaseURL,
	}
}

// NewServiceFromEnv creates a new email service from environment variables
func NewServiceFromEnv() *Service {
	return &Service{
		host:      getEnv("SMTP_HOST", "smtp.gmail.com"),
		port:      getEnv("SMTP_PORT", "587"),
		username:  getEnv("SMTP_USERNAME", ""),
		password:  getEnv("SMTP_PASSWORD", ""),
		fromName:  getEnv("SMTP_FROM_NAME", "Convoy App"),
		fromEmail: getEnv("SMTP_FROM_EMAIL", "convoy@example.com"),
		baseURL:   getEnv("APP_BASE_URL", "http://localhost:8000"),
	}
}

// VerificationEmail represents the data for verification email template
type VerificationEmail struct {
	LeaderName      string
	VerificationURL string
	ExpiresAt       time.Time
}

// GenerateVerificationToken creates a cryptographically secure verification token
func GenerateVerificationToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate verification token: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

// IsValidEmail validates email format and domain
func IsValidEmail(email string) bool {
	// Basic email format validation
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return false
	}

	// Check for blocked domains (disposable email services)
	domain := strings.ToLower(strings.Split(email, "@")[1])
	blockedDomains := []string{
		"10minutemail.com",
		"tempmail.org",
		"guerrillamail.com",
		"mailinator.com",
		"throwaway.email",
		"temp-mail.org",
		"getnada.com",
		"maildrop.cc",
	}

	for _, blocked := range blockedDomains {
		if domain == blocked {
			return false
		}
	}

	return true
}

// SendVerificationEmail sends a verification email with magic link
func (s *Service) SendVerificationEmail(to, leaderName, token string) error {
	if !IsValidEmail(to) {
		return fmt.Errorf("invalid email address: %s", to)
	}

	verificationURL := fmt.Sprintf("%s/verify/%s", s.baseURL, token)
	expiresAt := time.Now().Add(30 * time.Minute)

	data := VerificationEmail{
		LeaderName:      leaderName,
		VerificationURL: verificationURL,
		ExpiresAt:       expiresAt,
	}

	subject := "Verify Your Convoy - Convoy App"
	body, err := s.renderVerificationTemplate(data)
	if err != nil {
		return fmt.Errorf("failed to render email template: %w", err)
	}

	return s.sendEmail(to, subject, body)
}

// renderVerificationTemplate renders the HTML email template
func (s *Service) renderVerificationTemplate(data VerificationEmail) (string, error) {
	tmpl := `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Convoy</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f8f9fa;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2E86DE; font-size: 28px; font-weight: 600; margin: 0; letter-spacing: -0.5px;">
                🚗 Convoy App
            </h1>
        </div>
        
        <h2 style="color: #2E86DE; text-align: center; font-size: 24px; font-weight: 600; margin-bottom: 20px; letter-spacing: -0.5px;">
            Verify Your Convoy
        </h2>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi {{.LeaderName}},
        </p>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            You've created a new convoy! Click the button below to verify your email address and activate your convoy so your friends can join:
        </p>
        
        <div style="text-align: center; margin: 40px 0;">
            <a href="{{.VerificationURL}}" 
               style="background: #2E86DE; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(46, 134, 222, 0.3); transition: all 0.2s ease;">
                ✅ Verify & Start Convoy
            </a>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <strong>⏰ This link expires in 30 minutes</strong> ({{.ExpiresAt.Format "3:04 PM MST"}})
        </p>
        
        <p style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 0;">
            If you didn't create a convoy, please ignore this email. The convoy will be automatically deleted if not verified.
        </p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
                Convoy App - Real-time location sharing for groups
            </p>
        </div>
    </div>
</body>
</html>`

	t, err := template.New("verification").Parse(tmpl)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

// sendEmail sends an email using SMTP with support for both TLS (587) and SSL (465)
func (s *Service) sendEmail(to, subject, body string) error {
	if s.username == "" || s.password == "" {
		return fmt.Errorf("SMTP credentials not configured")
	}

	msg := fmt.Sprintf("From: %s <%s>\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"MIME-Version: 1.0\r\n"+
		"Content-Type: text/html; charset=UTF-8\r\n"+
		"\r\n"+
		"%s", s.fromName, s.fromEmail, to, subject, body)

	addr := fmt.Sprintf("%s:%s", s.host, s.port)
	auth := smtp.PlainAuth("", s.username, s.password, s.host)

	// Handle different SMTP configurations
	if s.port == "465" {
		// SSL connection (port 465)
		return s.sendEmailSSL(addr, auth, s.fromEmail, []string{to}, []byte(msg))
	} else {
		// TLS connection (port 587 or others)
		return smtp.SendMail(addr, auth, s.fromEmail, []string{to}, []byte(msg))
	}
}

// sendEmailSSL sends email using SSL connection (for port 465)
func (s *Service) sendEmailSSL(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	// Create TLS connection
	tlsConfig := &tls.Config{
		ServerName: s.host,
	}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer conn.Close()

	// Create SMTP client
	client, err := smtp.NewClient(conn, s.host)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Quit()

	// Authenticate
	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP authentication failed: %w", err)
	}

	// Set sender
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	// Set recipients
	for _, recipient := range to {
		if err := client.Rcpt(recipient); err != nil {
			return fmt.Errorf("failed to set recipient %s: %w", recipient, err)
		}
	}

	// Send message
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}

	_, err = writer.Write(msg)
	if err != nil {
		writer.Close()
		return fmt.Errorf("failed to write message: %w", err)
	}

	return writer.Close()
}

// IsConfigured returns true if the email service is properly configured
func (s *Service) IsConfigured() bool {
	return s.host != "" && s.port != "" && s.username != "" && s.password != "" && s.fromEmail != ""
}

// getEnv gets environment variable with fallback
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

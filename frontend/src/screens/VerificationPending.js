import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import convoyService from '../services/convoyService';
import './VerificationPending.css';

const VerificationPending = () => {
  const { convoyId } = useParams();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => {
    // Get verification data from sessionStorage
    const verificationData = sessionStorage.getItem('verificationData');
    if (verificationData) {
      try {
        const data = JSON.parse(verificationData);
        if (data.convoyId === convoyId && data.expiresAt) {
          setExpiresAt(new Date(data.expiresAt));
        }
      } catch (error) {
        console.error('Failed to parse verification data:', error);
      }
    }
  }, [convoyId]);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        toast.error('Verification link has expired. Please request a new one.');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleResendVerification = async () => {
    if (isResending) return;

    setIsResending(true);
    try {
      const response = await convoyService.resendVerification(convoyId);
      
      if (response.emailSent) {
        toast.success('Verification email sent! Check your inbox.');
        setResendCount(prev => prev + 1);
        
        // Update expiration time
        if (response.expiresAt) {
          setExpiresAt(new Date(response.expiresAt));
          
          // Update sessionStorage
          const verificationData = {
            convoyId,
            expiresAt: response.expiresAt,
            emailSent: true
          };
          sessionStorage.setItem('verificationData', JSON.stringify(verificationData));
        }
      } else {
        toast.warning('Email service is not configured. Please contact support.');
      }
    } catch (error) {
      console.error('Failed to resend verification:', error);
      
      if (error.code === 'RATE_LIMIT_EMAIL') {
        toast.error('Too many verification emails sent. Please wait before trying again.');
      } else if (error.status === 404) {
        toast.error('Convoy not found. It may have expired.');
        navigate('/');
      } else if (error.status === 409) {
        toast.info('Convoy is already verified! Redirecting...');
        navigate(`/convoy/${convoyId}`);
      } else {
        toast.error(error.message || 'Failed to resend verification email');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToHome = () => {
    // Clear verification data
    sessionStorage.removeItem('verificationData');
    navigate('/');
  };

  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return 'Expired';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div className="verification-pending-screen">
      <div className="verification-pending-container">
        <div className="verification-pending-content">
          {/* Header */}
          <div className="verification-header">
            <div className="verification-icon">
              <span className="material-icons">email</span>
            </div>
            <h1 className="verification-title">Check Your Email</h1>
            <p className="verification-subtitle">
              We've sent a verification link to activate your convoy
            </p>
          </div>

          {/* Instructions */}
          <div className="verification-instructions">
            <div className="instruction-item">
              <span className="instruction-number">1</span>
              <span className="instruction-text">Check your email inbox</span>
            </div>
            <div className="instruction-item">
              <span className="instruction-number">2</span>
              <span className="instruction-text">Click the "Verify & Start Convoy" button</span>
            </div>
            <div className="instruction-item">
              <span className="instruction-number">3</span>
              <span className="instruction-text">You'll be redirected to your convoy</span>
            </div>
          </div>

          {/* Timer */}
          {timeRemaining !== null && (
            <div className="verification-timer">
              <span className="timer-icon material-icons">schedule</span>
              <span className="timer-text">
                Link expires in: <strong>{formatTimeRemaining(timeRemaining)}</strong>
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="verification-actions">
            <button
              className="resend-button"
              onClick={handleResendVerification}
              disabled={isResending || (timeRemaining !== null && timeRemaining <= 0)}
            >
              {isResending ? (
                <>
                  <span className="material-icons spinning">refresh</span>
                  Sending...
                </>
              ) : (
                <>
                  <span className="material-icons">refresh</span>
                  {resendCount > 0 ? 'Resend Email' : 'Send Again'}
                </>
              )}
            </button>

            <button
              className="back-button"
              onClick={handleBackToHome}
            >
              <span className="material-icons">arrow_back</span>
              Back to Home
            </button>
          </div>

          {/* Help Text */}
          <div className="verification-help">
            <p className="help-text">
              <span className="material-icons">help_outline</span>
              Didn't receive the email? Check your spam folder or click "Send Again"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPending;

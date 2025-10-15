import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import convoyService from '../services/convoyService';
import { API_ENDPOINTS } from '../config/api';
import geolocationDebugger from '../utils/geolocationDebugger';
import { mobileLog } from '../utils/vconsole';
import './VerificationSuccess.css';

const VerificationSuccess = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  // Post-verification flow states
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [isAddingLeader, setIsAddingLeader] = useState(false);
  const [postVerificationError, setPostVerificationError] = useState(null);
  const [convoyActivated, setConvoyActivated] = useState(false);

  // Post-verification convoy activation (Option A: Verification-First)
  const activateConvoy = useCallback(async (convoyData, retryCount = 0) => {
    const maxRetries = 2;

    try {
      setIsRequestingLocation(true);
      setPostVerificationError(null);

      mobileLog.info('Starting post-verification convoy activation...', {
        convoyId: convoyData.convoyId,
        leaderEmail: convoyData.leaderEmail,
        retryAttempt: retryCount
      });

      // Step 1: Request geolocation permission
      mobileLog.info('Requesting geolocation permission...');
      const position = await geolocationDebugger.forcePermissionRequest();

      const { latitude, longitude } = position.coords;
      mobileLog.info('Geolocation permission granted:', {
        latitude,
        longitude,
        accuracy: position.coords.accuracy
      });

      setIsRequestingLocation(false);
      setIsAddingLeader(true);

      // Step 2: Add leader to convoy with location
      mobileLog.info('Adding leader to convoy...');
      const leader = {
        name: convoyData.leaderName || 'Convoy Leader',
        location: { lat: latitude, lng: longitude },
      };

      const apiUrl = API_ENDPOINTS.CONVOY_MEMBERS(convoyData.convoyId);
      mobileLog.network(apiUrl, 'POST', 'pending', leader);

      // Enhanced fetch with timeout and error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      let addLeaderResponse;
      try {
        addLeaderResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leader),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Network request timed out. Please check your connection.');
        }
        throw new Error(`Network error: ${fetchError.message}`);
      }

      if (!addLeaderResponse.ok) {
        let errorMessage = 'Failed to add leader to convoy';
        try {
          const errorData = await addLeaderResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          mobileLog.warn('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const leaderData = await addLeaderResponse.json();
      mobileLog.network(apiUrl, 'POST', 'success', leaderData);

      // Store leader information for convoy map
      sessionStorage.setItem('memberId', leaderData.id);
      sessionStorage.setItem('memberName', leader.name);

      setIsAddingLeader(false);
      setConvoyActivated(true);

      mobileLog.info('Convoy activation complete!', {
        convoyId: convoyData.convoyId,
        leaderId: leaderData.id,
        leaderName: leader.name
      });

      // Show success message and redirect
      toast.success('Convoy activated! Redirecting to convoy map...');

      setTimeout(() => {
        navigate(`/convoy/${convoyData.convoyId}`);
      }, 2000);

    } catch (error) {
      mobileLog.error('Post-verification convoy activation failed:', error);
      setIsRequestingLocation(false);
      setIsAddingLeader(false);

      // Retry logic for network errors
      if (retryCount < maxRetries &&
          (error.message?.includes('Failed to add leader') ||
           error.message?.includes('Network') ||
           error.message?.includes('fetch'))) {

        mobileLog.info(`Retrying convoy activation (attempt ${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => {
          activateConvoy(convoyData, retryCount + 1);
        }, 2000 * (retryCount + 1)); // Exponential backoff
        return;
      }

      setPostVerificationError(error);

      if (error.code === 1) {
        // Geolocation permission denied
        toast.error('Location permission is required to activate your convoy');
      } else if (error.message?.includes('Failed to add leader')) {
        toast.error('Failed to add you to the convoy. Please try again.');
      } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error(error.message || 'Failed to activate convoy. Please try again.');
      }
    }
  }, [navigate]);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('No verification token provided');
        setIsVerifying(false);
        return;
      }

      try {
        const result = await convoyService.verifyConvoy(token);
        setVerificationResult(result);

        // Clear any existing verification data
        sessionStorage.removeItem('verificationData');

        // Show success message
        toast.success('Convoy verified successfully!');

        // Option A: Verification-First - Activate convoy after verification
        await activateConvoy(result);
        
      } catch (error) {
        console.error('Verification failed:', error);
        setError(error);
        
        if (error.code === 'INVALID_TOKEN') {
          toast.error('Invalid verification link');
        } else if (error.code === 'TOKEN_EXPIRED') {
          toast.error('Verification link has expired');
        } else if (error.code === 'TOKEN_USED') {
          toast.error('This verification link has already been used');
        } else {
          toast.error(error.message || 'Verification failed');
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token, navigate, activateConvoy]);

  const handleRetryVerification = () => {
    navigate('/');
  };

  const handleGoToConvoy = () => {
    if (verificationResult?.convoyId) {
      navigate(`/convoy/${verificationResult.convoyId}`);
    }
  };

  if (isVerifying) {
    return (
      <div className="verification-success-screen">
        <div className="verification-success-container">
          <div className="verification-success-content">
            <div className="verification-loading">
              <div className="loading-spinner">
                <span className="material-icons spinning">refresh</span>
              </div>
              <h1 className="verification-title">Verifying Your Convoy</h1>
              <p className="verification-subtitle">
                Please wait while we verify your email...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Post-verification flow: Requesting location permission
  if (isRequestingLocation) {
    return (
      <div className="verification-success-screen">
        <div className="verification-success-container">
          <div className="verification-success-content">
            <div className="verification-loading">
              <div className="loading-spinner">
                <span className="material-icons spinning">location_searching</span>
              </div>
              <h1 className="verification-title">Requesting Location Access</h1>
              <p className="verification-subtitle">
                Please allow location access to activate your convoy...
              </p>
              <div className="location-permission-hint">
                <span className="material-icons">info</span>
                <span>Your location is needed to add you as the convoy leader</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Post-verification flow: Adding leader to convoy
  if (isAddingLeader) {
    return (
      <div className="verification-success-screen">
        <div className="verification-success-container">
          <div className="verification-success-content">
            <div className="verification-loading">
              <div className="loading-spinner">
                <span className="material-icons spinning">person_add</span>
              </div>
              <h1 className="verification-title">Activating Your Convoy</h1>
              <p className="verification-subtitle">
                Adding you as the convoy leader...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="verification-success-screen">
        <div className="verification-success-container">
          <div className="verification-success-content">
            <div className="verification-error">
              <div className="error-icon">
                <span className="material-icons">error_outline</span>
              </div>
              <h1 className="verification-title error">Verification Failed</h1>
              <p className="verification-subtitle">
                {error.code === 'INVALID_TOKEN' && 'The verification link is invalid or malformed.'}
                {error.code === 'TOKEN_EXPIRED' && 'The verification link has expired. Please request a new one.'}
                {error.code === 'TOKEN_USED' && 'This verification link has already been used.'}
                {!error.code && (error.message || 'An unexpected error occurred during verification.')}
              </p>
              
              <div className="verification-actions">
                <button
                  className="retry-button"
                  onClick={handleRetryVerification}
                >
                  <span className="material-icons">home</span>
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Post-verification error state
  if (postVerificationError) {
    const handleRetryActivation = () => {
      if (verificationResult) {
        activateConvoy(verificationResult);
      }
    };

    const handleSkipToConvoy = () => {
      if (verificationResult?.convoyId) {
        navigate(`/convoy/${verificationResult.convoyId}`);
      }
    };

    return (
      <div className="verification-success-screen">
        <div className="verification-success-container">
          <div className="verification-success-content">
            <div className="verification-error">
              <div className="error-icon">
                <span className="material-icons">warning</span>
              </div>
              <h1 className="verification-title error">Convoy Activation Failed</h1>
              <p className="verification-subtitle">
                {postVerificationError.code === 1 && 'Location permission is required to activate your convoy as the leader.'}
                {postVerificationError.message?.includes('Failed to add leader') && 'Failed to add you to the convoy. Please try again.'}
                {!postVerificationError.code && !postVerificationError.message?.includes('Failed to add leader') &&
                  (postVerificationError.message || 'An error occurred while activating your convoy.')}
              </p>

              <div className="verification-actions">
                <button
                  className="retry-button"
                  onClick={handleRetryActivation}
                >
                  <span className="material-icons">refresh</span>
                  Try Again
                </button>
                <button
                  className="convoy-button secondary"
                  onClick={handleSkipToConvoy}
                >
                  <span className="material-icons">arrow_forward</span>
                  Go to Convoy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-success-screen">
      <div className="verification-success-container">
        <div className="verification-success-content">
          <div className="verification-success">
            <div className="success-icon">
              <span className="material-icons">check_circle</span>
            </div>
            <h1 className="verification-title success">
              {convoyActivated ? 'Convoy Activated!' : 'Convoy Verified!'}
            </h1>
            <p className="verification-subtitle">
              {convoyActivated
                ? 'Your convoy has been verified and activated. You are now the convoy leader!'
                : 'Your convoy has been successfully verified and is now active.'
              }
            </p>

            <div className="success-details">
              <div className="detail-item">
                <span className="detail-icon material-icons">
                  {convoyActivated ? 'person' : 'group'}
                </span>
                <span className="detail-text">
                  {convoyActivated ? 'You are the convoy leader' : 'Convoy is ready for members'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-icon material-icons">share</span>
                <span className="detail-text">Share the convoy link with friends</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon material-icons">location_on</span>
                <span className="detail-text">
                  {convoyActivated ? 'Your location is being tracked' : 'Start tracking locations in real-time'}
                </span>
              </div>
            </div>

            <div className="verification-actions">
              <button
                className="convoy-button"
                onClick={handleGoToConvoy}
              >
                <span className="material-icons">arrow_forward</span>
                Go to Convoy
              </button>
            </div>

            <div className="auto-redirect-notice">
              <span className="material-icons">schedule</span>
              <span>Automatically redirecting in a few seconds...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationSuccess;

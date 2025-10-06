import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Home.css';
import convoyService from '../services/convoyService';
import { mobileLog } from '../utils/vconsole';
import { API_ENDPOINTS } from '../config/api';
import geolocationDebugger from '../utils/geolocationDebugger';

const Home = () => {
  const navigate = useNavigate();
  const [leaderName, setLeaderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const handleNameChange = (e) => {
    const value = e.target.value;
    // Limit to 50 characters to match backend validation
    if (value.length <= 50) {
      setLeaderName(value);
      setHasUserInteracted(true);
    }
  };

  const handleNameFocus = () => {
    // Auto-clear default "You" text on first focus if user hasn't interacted yet
    if (!hasUserInteracted && leaderName === '') {
      // Field is already empty, just mark as interacted
      setHasUserInteracted(true);
    }
  };

  const handleStartConvoy = async () => {
    // Validate name input - use "You" as fallback if empty
    const trimmedName = leaderName.trim() || 'You';

    // Set loading state
    setIsLoading(true);

    mobileLog.interaction('start-convoy-button', 'click', {
      timestamp: new Date().toISOString(),
      leaderName: trimmedName
    });

    try {
      mobileLog.info('Starting convoy creation process...');
      const convoy = await convoyService.createConvoy();
      const convoyId = convoy.id;

      // Log convoy creation
      console.log(`CONVOY_CREATED: Leader started convoy ${convoyId} at ${new Date().toISOString()}`);
      mobileLog.info(`Convoy created successfully with ID: ${convoyId}`);

      // 2. Get leader's geolocation and add to the convoy
      if (navigator.geolocation) {
        mobileLog.info('Geolocation is supported, checking permissions...');

        // Check current permission status
        const permissionCheck = await geolocationDebugger.quickPermissionCheck();
        mobileLog.info('Permission check result:', permissionCheck);

        mobileLog.info('Requesting position...');

        // Enhanced geolocation options for iOS compatibility
        const geoOptions = {
          enableHighAccuracy: true,
          timeout: 30000, // 30 seconds timeout for iOS
          maximumAge: 0 // Force fresh permission request, no cache
        };

        mobileLog.info('Requesting geolocation with options:', geoOptions);

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            mobileLog.info(`Position obtained: ${latitude}, ${longitude}`, {
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              altitude: position.coords.altitude,
              heading: position.coords.heading,
              speed: position.coords.speed
            });

            const leader = {
              name: trimmedName,
              location: { lat: latitude, lng: longitude },
            };

            const apiUrl = API_ENDPOINTS.CONVOY_MEMBERS(convoyId);
            mobileLog.network(apiUrl, 'POST', 'pending', leader);
            const addLeaderResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(leader),
            });

            if (!addLeaderResponse.ok) {
              mobileLog.network(apiUrl, 'POST', addLeaderResponse.status, 'Failed');
              throw new Error('Failed to add leader to convoy');
            }

            const leaderMember = await addLeaderResponse.json();
            mobileLog.network(apiUrl, 'POST', addLeaderResponse.status, leaderMember);
            sessionStorage.setItem('memberId', leaderMember.id);

            // Log leader joining their own convoy
            console.log(`LEADER_JOINED: Leader joined convoy ${convoyId} with member ID ${leaderMember.id} at ${new Date().toISOString()}`);
            mobileLog.info(`Leader joined convoy successfully with member ID: ${leaderMember.id}`);

            // Navigate to the convoy map after successfully adding leader
            mobileLog.info(`Navigating to convoy map: /convoy/${convoyId}`);
            setIsLoading(false);
            navigate(`/convoy/${convoyId}`);
          },
          (error) => {
            console.error("Error getting user's location:", error);

            // Enhanced error logging for iOS debugging
            const errorDetails = {
              code: error.code,
              message: error.message,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              permissions: 'unknown'
            };

            // Get human-readable error message
            let userMessage = 'Could not get your location. ';
            let debugMessage = '';

            switch (error.code) {
              case error.PERMISSION_DENIED:
                userMessage += 'Please allow location access in your browser settings.';
                debugMessage = 'User denied location permission or permission was revoked';
                errorDetails.permissions = 'denied';
                break;
              case error.POSITION_UNAVAILABLE:
                userMessage += 'Location information is unavailable. Please check your device GPS settings.';
                debugMessage = 'Location information unavailable (GPS disabled or no signal)';
                break;
              case error.TIMEOUT:
                userMessage += 'Location request timed out. Please try again.';
                debugMessage = 'Location request timed out after 30 seconds';
                break;
              default:
                userMessage += 'An unknown error occurred. Please try again.';
                debugMessage = 'Unknown geolocation error';
                break;
            }

            mobileLog.error("Geolocation error:", errorDetails);
            mobileLog.error("Debug info:", debugMessage);

            alert(userMessage);

            // Even if location fails, navigate to convoy, but leader won't be on map initially
            mobileLog.warn('Navigating to convoy without leader location');
            setIsLoading(false);
            navigate(`/convoy/${convoyId}`);
          },
          geoOptions // Pass the geolocation options
        );
      } else {
        mobileLog.error('Geolocation is not supported by this browser');
        alert('Geolocation is not supported by your browser. Cannot add leader with location.');
        // Navigate to convoy, but leader won't be on map initially
        mobileLog.warn('Navigating to convoy without geolocation support');
        setIsLoading(false);
        navigate(`/convoy/${convoyId}`);
      }
    } catch (error) {
      console.error('Error starting convoy:', error);
      mobileLog.error('Failed to start convoy:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      showErrorToast(`Failed to start convoy: ${error.message}`);
      setIsLoading(false);
    }
  };

  const showErrorToast = (message) => {
    toast.error(message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  const showSuccessToast = (message) => {
    toast.success(message, {
      position: "top-right",
      autoClose: 3000,
    });
  };

  return (
    <div className="home-screen">
      <header className="home-header">
        <img
          src="/convoy_logo.png"
          alt="Convoy App Logo"
          className="home-logo"
          loading="eager"
        />
        <h1>Convoy Tracker</h1>
      </header>
      <main className="home-main-content" role="main">
        <p className="slogan">
          Create a new convoy and invite your friends to share your journey in real-time.
        </p>

        <div className="leader-name-section">
          <label htmlFor="leader-name-input" className="leader-name-label">
            Your Name
          </label>
          <input
            id="leader-name-input"
            type="text"
            value={leaderName}
            onChange={handleNameChange}
            onFocus={handleNameFocus}
            placeholder="Enter your name (defaults to 'You')"
            className="leader-name-input"
            aria-label="Enter your name for the convoy"
            aria-describedby="name-hint"
            maxLength={50}
            disabled={isLoading}
            autoFocus
          />
          <div id="name-hint" className="name-hint">
            This name will be visible to other convoy members
          </div>
        </div>

        <button
          className="start-convoy-button"
          onClick={handleStartConvoy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleStartConvoy();
            }
          }}
          aria-label="Start a new convoy and begin location sharing"
          aria-busy={isLoading}
          type="button"
          disabled={isLoading}
        >
          <span className="button-text">Start New Convoy</span>
          {isLoading && (
            <div
              className="button-loading-spinner"
              aria-label="Creating convoy"
              role="status"
            >
              <span className="material-icons">refresh</span>
            </div>
          )}
        </button>
      </main>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default Home;

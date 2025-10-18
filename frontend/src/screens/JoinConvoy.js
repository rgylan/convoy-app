import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showErrorToast, showSuccessToast } from '../utils/errorHandler';
import { API_ENDPOINTS } from '../config/api';
import locationService from '../services/locationService';
import './JoinConvoy.css';

const JoinConvoy = () => {
  const { convoyId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Default fallback location: Luneta Park (Kilometer Zero), Manila
  const DEFAULT_LOCATION = {
    lat: 14.5832,
    lng: 120.9794
  };

  /**
   * Attempts to get the user's current location, falls back to Luneta Park if unsuccessful
   * @returns {Promise<{lat: number, lng: number}>} Location coordinates
   */
  const getMemberLocation = async () => {
    try {
      console.log('🌍 Attempting to fetch user\'s current location...');

      // Try to get the user's actual current location
      const position = await locationService.getCurrentPosition();
      const actualLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      console.log('✅ Successfully obtained user location:', actualLocation);
      return actualLocation;

    } catch (error) {
      console.warn('⚠️ Failed to get user location, using Luneta Park fallback:', error.message);
      console.log('📍 Using default location: Luneta Park (Kilometer Zero), Manila');
      return DEFAULT_LOCATION;
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      showErrorToast('Please enter your name.');
      return;
    }

    if (trimmedName.length > 50) {
      showErrorToast('Name must be 50 characters or less.');
      return;
    }

    setIsLoading(true);

    try {
      // Log API configuration for debugging
      console.log('📱 [MOBILE] JoinConvoy API Configuration:', {
        endpoint: API_ENDPOINTS.CONVOY_MEMBERS(convoyId),
        hostname: window.location.hostname,
        isNgrok: window.location.hostname.includes('.ngrok'),
        userAgent: navigator.userAgent
      });

      // Get member's location (actual location or Luneta Park fallback)
      const memberLocation = await getMemberLocation();

      const newMember = {
        name: trimmedName,
        location: memberLocation,
      };

      console.log('📱 [MOBILE] Attempting to join convoy with:', {
        ...newMember,
        locationSource: memberLocation === DEFAULT_LOCATION ? 'fallback (Luneta Park)' : 'user geolocation'
      });

      const addMemberResponse = await fetch(API_ENDPOINTS.CONVOY_MEMBERS(convoyId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      });

      console.log('📱 [MOBILE] Join convoy response status:', addMemberResponse.status);

      if (!addMemberResponse.ok) {
        const errorText = await addMemberResponse.text();
        console.error('📱 [MOBILE] Join convoy failed:', errorText);
        throw new Error(`Failed to add member to convoy: ${addMemberResponse.status} ${errorText}`);
      }

      const member = await addMemberResponse.json();
      console.log('📱 [MOBILE] Successfully joined convoy:', member);

      sessionStorage.setItem('memberId', member.id);

      // Log member joining convoy
      console.log(`MEMBER_JOINED: ${trimmedName} joined convoy ${convoyId} with member ID ${member.id} at ${new Date().toISOString()}`);

      showSuccessToast(`Welcome to the convoy, ${trimmedName}!`);
      navigate(`/convoy/${convoyId}`);
    } catch (error) {
      console.error('📱 [MOBILE ERROR] Error joining convoy:', error);

      // Enhanced error logging for mobile debugging
      const errorDetails = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        endpoint: API_ENDPOINTS.CONVOY_MEMBERS(convoyId),
        hostname: window.location.hostname,
        userAgent: navigator.userAgent
      };

      console.error('📱 [MOBILE ERROR] Detailed error info:', errorDetails);
      showErrorToast(`Failed to join convoy: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="join-convoy-screen">
      {/* Header Section */}
      <header className="join-convoy-header">
        <img
          src="/convoy_logo.png"
          alt="Convoy Tracker Logo"
          className="join-convoy-logo"
          loading="eager"
        />
        <h1>Join Convoy</h1>
      </header>

      {/* Main Content Card */}
      <main className="join-convoy-main-content">
        {/* Invitation Message */}
        <div className="join-convoy-invitation">
          <h2>You've been invited to a convoy!</h2>
        </div>

        {/* Join Form */}
        <form onSubmit={handleJoin} style={{ width: '100%' }}>
          {/* Name Input Section */}
          <div className="join-convoy-input-section">
            <label
              htmlFor="member-name-input"
              className="join-convoy-input-label"
            >
              Your Name
            </label>
            <input
              id="member-name-input"
              type="text"
              className="join-convoy-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={50}
              required
              disabled={isLoading}
              aria-describedby="name-hint"
              autoFocus
            />
            <span id="name-hint" className="join-convoy-input-hint">
              This name will be visible to other convoy members
            </span>
          </div>

          {/* Join Button */}
          <button
            type="submit"
            className="join-convoy-button"
            disabled={isLoading || !name.trim()}
            aria-busy={isLoading}
            aria-label={isLoading ? 'Joining convoy...' : 'Join convoy'}
          >
            <span className="button-text">
              {isLoading ? 'Joining...' : 'Join Convoy'}
            </span>
            {isLoading && (
              <div className="button-loading-spinner" role="status" aria-label="Loading">
                <span className="material-icons">refresh</span>
                <span className="sr-only">Joining convoy...</span>
              </div>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default JoinConvoy;



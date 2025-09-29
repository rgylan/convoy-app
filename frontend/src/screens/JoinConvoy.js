import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showErrorToast, showSuccessToast } from '../utils/errorHandler';
import { API_ENDPOINTS } from '../config/api';

const JoinConvoy = () => {
  const { convoyId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter your name.');
      return;
    }

    try {
      // Log API configuration for debugging
      console.log('📱 [MOBILE] JoinConvoy API Configuration:', {
        endpoint: API_ENDPOINTS.CONVOY_MEMBERS(convoyId),
        hostname: window.location.hostname,
        isNgrok: window.location.hostname.includes('.ngrok'),
        userAgent: navigator.userAgent
      });

      // Hardcode location to Makati City for viewing purposes
      const latitude = 14.5547;
      const longitude = 121.0244;

      const newMember = {
        name: name,
        location: { lat: latitude, lng: longitude },
      };

      console.log('📱 [MOBILE] Attempting to join convoy with:', newMember);

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
      console.log(`MEMBER_JOINED: ${name} joined convoy ${convoyId} with member ID ${member.id} at ${new Date().toISOString()}`);

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
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Join Convoy</h1>
      </header>
      <main className="join-main">
        <form onSubmit={handleJoin} className="join-form">
          <h2>You've been invited to a convoy!</h2>
          <p>Enter your name to join.</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            required
          />
          <button type="submit">Join Convoy</button>
        </form>
      </main>
    
    </div>
  );
};

export default JoinConvoy;



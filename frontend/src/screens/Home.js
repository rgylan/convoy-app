import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import convoyService from '../services/convoyService';

const Home = () => {
  const navigate = useNavigate();

  const handleStartConvoy = async () => {
    try {
      const convoy = await convoyService.createConvoy();
      const convoyId = convoy.id;
      
      // Log convoy creation
      console.log(`CONVOY_CREATED: Leader started convoy ${convoyId} at ${new Date().toISOString()}`);

      // 2. Get leader's geolocation and add to the convoy
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const leader = {
              name: 'You',
              location: { lat: latitude, lng: longitude },
            };

            const addLeaderResponse = await fetch(`http://localhost:8080/api/convoys/${convoyId}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(leader),
            });

            if (!addLeaderResponse.ok) {
              throw new Error('Failed to add leader to convoy');
            }
            const leaderMember = await addLeaderResponse.json();
            sessionStorage.setItem('memberId', leaderMember.id);
            
            // Log leader joining their own convoy
            console.log(`LEADER_JOINED: Leader joined convoy ${convoyId} with member ID ${leaderMember.id} at ${new Date().toISOString()}`);

            // Navigate to the convoy map after successfully adding leader
            navigate(`/convoy/${convoyId}`);
          },
          (error) => {
            console.error("Error getting user's location:", error);
            alert('Could not get your location. Please allow location access to start the convoy.');
            // Even if location fails, navigate to convoy, but leader won't be on map initially
            navigate(`/convoy/${convoyId}`);
          }
        );
      } else {
        alert('Geolocation is not supported by your browser. Cannot add leader with location.');
        // Navigate to convoy, but leader won't be on map initially
        navigate(`/convoy/${convoyId}`);
      }
    } catch (error) {
      console.error('Error starting convoy:', error);
      showErrorToast(`Failed to start convoy: ${error.message}`);
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
        <img src="/convoy_logo.png" alt="Convoy App Logo" className="home-logo" />
        <h1>Convoy Tracker</h1>
      </header>
      <main className="home-main-content">
        <p className="slogan">Create a new convoy and invite your friends to share your journey in real-time.</p>
        <button className="start-convoy-button" onClick={handleStartConvoy}>
          Start New Convoy
        </button>
      </main>
      <ToastContainer />
    </div>
  );
};

export default Home;

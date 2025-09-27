import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showErrorToast, showSuccessToast } from '../utils/errorHandler';

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
      // Hardcode location to Makati City for viewing purposes
      const latitude = 14.5547;
      const longitude = 121.0244;

      const newMember = {
        name: name,
        location: { lat: latitude, lng: longitude },
      };

      const addMemberResponse = await fetch(`http://localhost:8080/api/convoys/${convoyId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      });

      if (!addMemberResponse.ok) {
        throw new Error('Failed to add member to convoy');
      }
      const member = await addMemberResponse.json();
      sessionStorage.setItem('memberId', member.id);
      
      // Log member joining convoy
      console.log(`MEMBER_JOINED: ${name} joined convoy ${convoyId} with member ID ${member.id} at ${new Date().toISOString()}`);
      
      navigate(`/convoy/${convoyId}`);
    } catch (error) {
      console.error('Error joining convoy:', error);
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



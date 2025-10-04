import React from 'react';
import './LeaveConvoyModal.css';

const LeaveConvoyModal = ({ memberCount, isLeader, convoyHealth, onConfirm, onCancel }) => {
  return (
    <div
      className="leave-convoy-modal"
      role="dialog"
      aria-labelledby="leave-modal-title"
      aria-describedby="leave-modal-description"
      onClick={onCancel} // Backdrop click
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel(); // Escape key
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="leave-modal-title">Leave Convoy?</h2>
          <button
            className="standard-close-button"
            onClick={onCancel} // X button
            aria-label="Close leave convoy modal"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        <p id="leave-modal-description">
          You'll stop sharing your location and won't receive convoy updates.
        </p>
        {/* Add keyboard handler */}
        <div className="modal-actions">
          <button
            className="btn-danger"
            onClick={onConfirm}
            autoFocus // Move focus to the primary action
            aria-label="Confirm leaving convoy"
          >
            Leave Convoy
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveConvoyModal;

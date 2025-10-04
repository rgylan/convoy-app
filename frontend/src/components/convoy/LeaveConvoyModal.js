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
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="leave-modal-title">Leave Convoy?</h2>
        <p id="leave-modal-description">
          You'll stop sharing your location and won't receive convoy updates.
        </p>
        {/* Add keyboard handler */}
        <div
          className="modal-actions"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
          }}
        >
          <button
            className="btn-secondary"
            onClick={onCancel}
            autoFocus // Focus on safe action
          >
            Stay in Convoy
          </button>
          <button
            className="btn-danger"
            onClick={onConfirm}
          >
            Leave Convoy
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveConvoyModal;

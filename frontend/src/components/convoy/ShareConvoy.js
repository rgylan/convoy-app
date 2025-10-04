import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './ShareConvoy.css';

const ShareConvoy = ({ convoyId, onClose }) => {
  const joinUrl = `${window.location.origin}/join/${convoyId}`;
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle', 'copying', 'success', 'error'
  const [showNativeShare, setShowNativeShare] = useState(false);
  const copyButtonRef = useRef(null);
  const modalRef = useRef(null);

  // Check if Web Share API is supported (mobile devices)
  useEffect(() => {
    setShowNativeShare(navigator.share && /Mobi|Android/i.test(navigator.userAgent));
  }, []);

  // Focus management for accessibility
  useEffect(() => {
    if (copyButtonRef.current) {
      copyButtonRef.current.focus();
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopy = async () => {
    setCopyStatus('copying');

    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopyStatus('success');

      // Reset status after 2.5 seconds
      setTimeout(() => {
        setCopyStatus('idle');
      }, 2500);
    } catch (err) {
      console.error('Failed to copy link: ', err);
      setCopyStatus('error');

      // Fallback: Select text for manual copy
      const input = document.querySelector('.share-link-input');
      if (input) {
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices
      }

      // Reset status after 3 seconds
      setTimeout(() => {
        setCopyStatus('idle');
      }, 3000);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: 'Join My Convoy',
        text: 'Join my convoy and let\'s travel together!',
        url: joinUrl,
      });
    } catch (err) {
      // User cancelled or share failed, fallback to copy
      if (err.name !== 'AbortError') {
        handleCopy();
      }
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="share-modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      aria-describedby="share-modal-description"
    >
      <div className="share-modal-content" ref={modalRef}>
        <div className="share-modal-header">
          <h2 id="share-modal-title">Share Convoy</h2>
          <button
            className="standard-close-button"
            onClick={onClose}
            aria-label="Close share modal"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <p id="share-modal-description">
          Share this link or QR code with your friends to have them join your convoy.
        </p>

        <div className="share-content">
          <div className="qr-code-section">
            <div className="qr-code-container">
              <QRCodeCanvas
                value={joinUrl}
                size={160}
                bgColor={"#ffffff"}
                fgColor={"#1A2C42"}
                level={"M"}
                includeMargin={true}
              />
            </div>
          </div>

          <div className="link-section">
            <label htmlFor="convoy-link" className="link-label">
              Convoy Link
            </label>
            <div className="link-input-container">
              <input
                id="convoy-link"
                type="text"
                value={joinUrl}
                readOnly
                className="share-link-input"
                aria-label="Convoy join link"
              />
              <button
                ref={copyButtonRef}
                onClick={handleCopy}
                className={`copy-button ${copyStatus}`}
                disabled={copyStatus === 'copying'}
                aria-label="Copy convoy link to clipboard"
              >
                <span className="material-icons copy-icon">
                  {copyStatus === 'success' ? 'check' :
                   copyStatus === 'error' ? 'error' : 'content_copy'}
                </span>
                <span className="copy-text">
                  {copyStatus === 'copying' ? 'Copying...' :
                   copyStatus === 'success' ? 'Copied!' :
                   copyStatus === 'error' ? 'Failed' : 'Copy'}
                </span>
              </button>
            </div>

            {/* Success/Error feedback with aria-live for screen readers */}
            <div
              className={`copy-feedback ${copyStatus}`}
              aria-live="polite"
              aria-atomic="true"
            >
              {copyStatus === 'success' && (
                <span className="feedback-success">
                  <span className="material-icons">check_circle</span>
                  Link copied to clipboard!
                </span>
              )}
              {copyStatus === 'error' && (
                <span className="feedback-error">
                  <span className="material-icons">error</span>
                  Copy failed. Please select and copy manually.
                </span>
              )}
            </div>
          </div>

          {/* Native share button for mobile */}
          {showNativeShare && (
            <div className="native-share-section">
              <button
                onClick={handleNativeShare}
                className="native-share-button"
                aria-label="Share convoy using device share menu"
              >
                <span className="material-icons">share</span>
                <span>Share</span>
              </button>
            </div>
          )}
        </div>

        <div className="share-modal-actions">
          <button
            onClick={onClose}
            className="done-button"
            aria-label="Close share modal"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareConvoy;

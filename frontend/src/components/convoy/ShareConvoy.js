import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './ShareConvoy.css';

const ShareConvoy = ({ convoyId, onClose }) => {
  const joinUrl = `http://localhost:3000/join/${convoyId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl).then(
      () => {
        alert('Link copied to clipboard!');
      },
      (err) => {
        console.error('Failed to copy link: ', err);
      }
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Your Convoy is Ready!</h2>
        <p>Share this link or QR code with your friends to have them join.</p>
        
        <div className="share-info">
          <div className="qr-code-container">
            <QRCodeCanvas
              value={joinUrl}
              size={180}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"L"}
              includeMargin={true}
            />
          </div>
          <div className="link-container">
            <input type="text" value={joinUrl} readOnly />
            <button onClick={handleCopy} className="copy-button">Copy</button>
          </div>
        </div>
        
        <button onClick={onClose} className="close-button">Done</button>
      </div>
    </div>
  );
};

export default ShareConvoy;

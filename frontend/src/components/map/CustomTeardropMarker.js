import React from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import MemberStatusIndicator from '../convoy/MemberStatusIndicator';
import './CustomTeardropMarker.css';

const CustomTeardropMarker = ({ 
  member, 
  destination, 
  position, 
  opacity = 1.0 
}) => {
  // Get status-specific styling
  const getStatusInfo = (status) => {
    switch (status) {
      case 'connected':
        return {
          color: '#27ae60',
          glowColor: 'rgba(39, 174, 96, 0.4)',
          className: 'teardrop-marker-connected'
        };
      case 'lagging':
        return {
          color: '#f39c12',
          glowColor: 'rgba(243, 156, 18, 0.4)',
          className: 'teardrop-marker-lagging'
        };
      case 'disconnected':
        return {
          color: '#e74c3c',
          glowColor: 'rgba(231, 76, 60, 0.4)',
          className: 'teardrop-marker-disconnected'
        };
      case 'inactive':
        return {
          color: '#9b59b6',
          glowColor: 'rgba(155, 89, 182, 0.4)',
          className: 'teardrop-marker-inactive'
        };
      default:
        return {
          color: '#2E86DE',
          glowColor: 'rgba(46, 134, 222, 0.4)',
          className: 'teardrop-marker-default'
        };
    }
  };

  const statusInfo = getStatusInfo(member.status);

  // Create the custom DivIcon with teardrop shape
  const createTeardropIcon = () => {
    // Get 2-letter initials from member name
    const getInitials = (name) => {
      const words = name.trim().split(/\s+/);
      if (words.length >= 2) {
        return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
      } else {
        return name.substring(0, 2).toUpperCase();
      }
    };

    const initials = getInitials(member.name);

    const iconHtml = `
      <div class="teardrop-marker-container ${statusInfo.className}" data-status="${member.status}">
        <div class="teardrop-marker-body">
          <div class="teardrop-marker-inner"></div>
          <div class="teardrop-marker-content">
            <span class="teardrop-marker-initial">${initials}</span>
          </div>
          <div class="teardrop-marker-dot"></div>
        </div>
      </div>
    `;

    return new DivIcon({
      html: iconHtml,
      className: 'custom-teardrop-marker',
      iconSize: [48, 48], // Container size for circular marker + 8px red dot
      iconAnchor: [24, 44], // Point at the center of the red dot for precise positioning
      popupAnchor: [0, -44] // Point from which the popup should open relative to the iconAnchor
    });
  };

  const customIcon = createTeardropIcon();

  return (
    <Marker
      position={position}
      icon={customIcon}
      opacity={opacity}
    />
  );
};

export default CustomTeardropMarker;

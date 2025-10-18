import React from 'react';
import './CloseButton.css';

/**
 * Shared Close Button Component
 * 
 * Standardized close button following Apple Maps-inspired glassmorphism design standards.
 * Supports both standard header positioning and floating overlay positioning.
 * 
 * @param {Object} props
 * @param {Function} props.onClick - Close handler function (required)
 * @param {string} props.ariaLabel - Accessibility label (required)
 * @param {'standard'|'floating'} props.variant - Button variant (default: 'standard')
 * @param {string} props.className - Optional additional CSS classes for positioning
 * @param {Object} props.style - Optional inline styles
 * @param {Function} props.onKeyDown - Optional keyboard event handler
 * @param {string} props.type - Button type (default: 'button')
 * @param {boolean} props.disabled - Whether button is disabled (default: false)
 */
const CloseButton = ({
  onClick,
  ariaLabel,
  variant = 'standard',
  className = '',
  style = {},
  onKeyDown,
  type = 'button',
  disabled = false,
  ...otherProps
}) => {
  // Validate required props
  if (!onClick || typeof onClick !== 'function') {
    console.error('CloseButton: onClick prop is required and must be a function');
    return null;
  }

  if (!ariaLabel || typeof ariaLabel !== 'string') {
    console.error('CloseButton: ariaLabel prop is required and must be a string');
    return null;
  }

  // Build CSS classes
  const baseClass = 'close-button';
  const variantClass = variant === 'floating' ? 'close-button--floating' : 'close-button--standard';
  const classes = [baseClass, variantClass, className].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      type={type}
      disabled={disabled}
      style={style}
      {...otherProps}
    >
      <span className="material-icons">close</span>
    </button>
  );
};

export default CloseButton;

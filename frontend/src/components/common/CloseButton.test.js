import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CloseButton from './CloseButton';

describe('CloseButton', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  test('renders standard close button', () => {
    render(
      <CloseButton
        onClick={mockOnClick}
        ariaLabel="Close modal"
      />
    );

    const button = screen.getByRole('button', { name: 'Close modal' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('close-button', 'close-button--standard');
  });

  test('renders floating close button', () => {
    render(
      <CloseButton
        onClick={mockOnClick}
        ariaLabel="Dismiss alert"
        variant="floating"
      />
    );

    const button = screen.getByRole('button', { name: 'Dismiss alert' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('close-button', 'close-button--floating');
  });

  test('calls onClick when clicked', () => {
    render(
      <CloseButton
        onClick={mockOnClick}
        ariaLabel="Close modal"
      />
    );

    const button = screen.getByRole('button', { name: 'Close modal' });
    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('handles keyboard events', () => {
    const mockKeyDown = jest.fn();
    render(
      <CloseButton
        onClick={mockOnClick}
        ariaLabel="Close modal"
        onKeyDown={mockKeyDown}
      />
    );

    const button = screen.getByRole('button', { name: 'Close modal' });
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(mockKeyDown).toHaveBeenCalledTimes(1);
  });

  test('renders with additional className', () => {
    render(
      <CloseButton
        onClick={mockOnClick}
        ariaLabel="Close modal"
        className="custom-class"
      />
    );

    const button = screen.getByRole('button', { name: 'Close modal' });
    expect(button).toHaveClass('close-button', 'close-button--standard', 'custom-class');
  });

  test('handles disabled state', () => {
    render(
      <CloseButton
        onClick={mockOnClick}
        ariaLabel="Close modal"
        disabled={true}
      />
    );

    const button = screen.getByRole('button', { name: 'Close modal' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  test('shows error for missing onClick', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <CloseButton ariaLabel="Close modal" />
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'CloseButton: onClick prop is required and must be a function'
    );
    
    consoleSpy.mockRestore();
  });

  test('shows error for missing ariaLabel', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <CloseButton onClick={mockOnClick} />
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'CloseButton: ariaLabel prop is required and must be a string'
    );
    
    consoleSpy.mockRestore();
  });
});

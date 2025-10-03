import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlertPanel from './AlertPanel';

// Mock timers for testing auto-dismiss functionality
jest.useFakeTimers();

describe('AlertPanel Layout Tests', () => {
  const mockOnDismiss = jest.fn();
  
  const sampleAlert = {
    id: 'test-alert-1',
    type: 'error',
    message: 'Test Error Message',
    details: 'Test error details',
    timestamp: new Date().toISOString(),
    dismissible: true
  };

  beforeEach(() => {
    mockOnDismiss.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('renders alert with new layout structure', () => {
    render(
      <AlertPanel
        alerts={[sampleAlert]}
        onDismiss={mockOnDismiss}
        position="top-right"
      />
    );

    // Check for top bar elements
    expect(screen.getByText('Test Error Message')).toBeInTheDocument();
    expect(screen.getByText('Test error details')).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss alert')).toBeInTheDocument();
    
    // Check for timestamp (formatted time)
    const timestampElement = screen.getByText(/\d{1,2}:\d{2}/);
    expect(timestampElement).toBeInTheDocument();
  });

  test('displays correct alert type styling', () => {
    const { container } = render(
      <AlertPanel
        alerts={[sampleAlert]}
        onDismiss={mockOnDismiss}
        position="top-right"
      />
    );

    const alertItem = container.querySelector('.alert-item--error');
    expect(alertItem).toBeInTheDocument();
  });

  test('handles dismiss functionality', () => {
    render(
      <AlertPanel
        alerts={[sampleAlert]}
        onDismiss={mockOnDismiss}
        position="top-right"
      />
    );

    const dismissButton = screen.getByLabelText('Dismiss alert');
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledWith('test-alert-1');
  });

  test('renders different alert types correctly', () => {
    const alerts = [
      { ...sampleAlert, id: 'error-1', type: 'error' },
      { ...sampleAlert, id: 'warning-1', type: 'warning' },
      { ...sampleAlert, id: 'success-1', type: 'success' },
      { ...sampleAlert, id: 'info-1', type: 'info' }
    ];

    alerts.forEach(alert => {
      const { container, unmount } = render(
        <AlertPanel
          alerts={[alert]}
          onDismiss={mockOnDismiss}
          position="top-right"
        />
      );

      const alertItem = container.querySelector(`.alert-item--${alert.type}`);
      expect(alertItem).toBeInTheDocument();
      
      unmount();
    });
  });

  test('handles alert without details', () => {
    const alertWithoutDetails = {
      ...sampleAlert,
      details: undefined
    };

    render(
      <AlertPanel
        alerts={[alertWithoutDetails]}
        onDismiss={mockOnDismiss}
        position="top-right"
      />
    );

    expect(screen.getByText('Test Error Message')).toBeInTheDocument();
    expect(screen.queryByText('Test error details')).not.toBeInTheDocument();
  });

  test('handles non-dismissible alerts', () => {
    const nonDismissibleAlert = {
      ...sampleAlert,
      dismissible: false
    };

    render(
      <AlertPanel
        alerts={[nonDismissibleAlert]}
        onDismiss={mockOnDismiss}
        position="top-right"
      />
    );

    expect(screen.queryByLabelText('Dismiss alert')).not.toBeInTheDocument();
  });

  test('auto-dismisses alerts after delay', async () => {
    render(
      <AlertPanel
        alerts={[sampleAlert]}
        onDismiss={mockOnDismiss}
        position="top-right"
        autoCloseDelay={3000}
      />
    );

    // Fast-forward time
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledWith('test-alert-1');
    });
  });

  test('renders with different positions', () => {
    const positions = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];

    positions.forEach(position => {
      const { container, unmount } = render(
        <AlertPanel
          alerts={[sampleAlert]}
          onDismiss={mockOnDismiss}
          position={position}
        />
      );

      const alertPanel = container.querySelector(`.alert-panel--${position}`);
      expect(alertPanel).toBeInTheDocument();
      
      unmount();
    });
  });

  test('handles long content gracefully', () => {
    const longContentAlert = {
      ...sampleAlert,
      message: 'This is a very long alert message that should wrap properly across multiple lines to test the layout',
      details: 'This is also a very long details section that contains additional information about the alert and should also wrap properly to demonstrate how the layout handles longer content gracefully.'
    };

    render(
      <AlertPanel
        alerts={[longContentAlert]}
        onDismiss={mockOnDismiss}
        position="top-right"
      />
    );

    expect(screen.getByText(/This is a very long alert message/)).toBeInTheDocument();
    expect(screen.getByText(/This is also a very long details section/)).toBeInTheDocument();
  });

  test('processes alert queue correctly', async () => {
    const alerts = [
      { ...sampleAlert, id: 'alert-1', message: 'First Alert' },
      { ...sampleAlert, id: 'alert-2', message: 'Second Alert' }
    ];

    const { rerender } = render(
      <AlertPanel
        alerts={[alerts[0]]}
        onDismiss={mockOnDismiss}
        position="top-right"
      />
    );

    expect(screen.getByText('First Alert')).toBeInTheDocument();

    // Add second alert
    rerender(
      <AlertPanel
        alerts={alerts}
        onDismiss={mockOnDismiss}
        position="top-right"
      />
    );

    // First alert should still be visible
    expect(screen.getByText('First Alert')).toBeInTheDocument();
    expect(screen.queryByText('Second Alert')).not.toBeInTheDocument();
  });
});

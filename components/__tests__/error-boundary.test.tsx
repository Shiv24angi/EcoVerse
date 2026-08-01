import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../error-boundary';

/**
 * Tests for Error Boundary component (Issue #410)
 * Verifies that scanner errors don't crash the entire application
 */

describe('ErrorBoundary', () => {
  // Suppress console errors during testing
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Normal rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ErrorBoundary>
          <div>First</div>
          <div>Second</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    // Component that throws an error
    const ErrorComponent = () => {
      throw new Error('Test error message');
    };

    it('should catch errors and display error UI', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should display scope name if provided', () => {
      render(
        <ErrorBoundary scope="barcode scanner">
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(
        screen.getByText(/A component.*barcode scanner/)
      ).toBeInTheDocument();
    });

    it('should display error message in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test error message')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Recovery', () => {
    const ErrorComponent = () => {
      throw new Error('Test error');
    };

    it('should provide a try again button', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
    });

    it('should allow recovery from errors', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [shouldError, setShouldError] = React.useState(false);

        if (shouldError) {
          throw new Error('Triggered error');
        }

        return (
          <div>
            <button onClick={() => setShouldError(true)}>Trigger error</button>
            <div>Safe content</div>
          </div>
        );
      };

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Safe content')).toBeInTheDocument();

      const triggerButton = screen.getByRole('button', {
        name: /trigger error/i,
      });
      await user.click(triggerButton);

      rerender(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Custom fallback', () => {
    const ErrorComponent = () => {
      throw new Error('Custom error');
    };

    it('should render custom fallback if provided', () => {
      const customFallback = (error: Error) => (
        <div>Custom error UI: {error.message}</div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(
        screen.getByText('Custom error UI: Custom error')
      ).toBeInTheDocument();
    });

    it('should provide reset function in fallback', async () => {
      const user = userEvent.setup();

      const customFallback = (_error: Error, resetError: () => void) => (
        <div>
          <span>Custom error</span>
          <button onClick={resetError}>Reset</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error')).toBeInTheDocument();

      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      // After reset, should return to error state (since ErrorComponent still throws)
      expect(screen.getByText('Custom error')).toBeInTheDocument();
    });
  });

  describe('Error callback', () => {
    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary onError={onError}>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toEqual(Error('Test error'));
    });
  });

  describe('Camera-specific errors (Issue #410)', () => {
    it('should handle NotAllowedError (permission denied)', () => {
      const permissionError = new DOMException(
        'Permission denied',
        'NotAllowedError'
      );

      const fallback = (error: Error) => <div>{error.message}</div>;

      render(
        <ErrorBoundary fallback={fallback}>
          {(() => {
            throw permissionError;
          })()}
        </ErrorBoundary>
      );

      expect(screen.getByText('Permission denied')).toBeInTheDocument();
    });

    it('should handle NotFoundError (no camera device)', () => {
      const noDeviceError = new DOMException(
        'No camera found',
        'NotFoundError'
      );

      const fallback = (error: Error) => <div>{error.message}</div>;

      render(
        <ErrorBoundary fallback={fallback}>
          {(() => {
            throw noDeviceError;
          })()}
        </ErrorBoundary>
      );

      expect(screen.getByText('No camera found')).toBeInTheDocument();
    });

    it('should prevent app crash when scanner errors', () => {
      const ScannerError = () => {
        throw new Error('Camera access denied');
      };

      render(
        <div>
          <div>App header</div>
          <ErrorBoundary scope="scanner">
            <ScannerError />
          </ErrorBoundary>
          <div>App footer</div>
        </div>
      );

      // Both header and footer should still be present
      expect(screen.getByText('App header')).toBeInTheDocument();
      expect(screen.getByText('App footer')).toBeInTheDocument();
      // Error should be scoped
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });
  });
});

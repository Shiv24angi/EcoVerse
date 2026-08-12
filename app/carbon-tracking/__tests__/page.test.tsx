import { render, screen, waitFor } from '@testing-library/react';
import CarbonTrackingPage from '../page';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/components/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/components/dashboard-layout', () => {
  return function MockDashboardLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <div data-testid="dashboard-layout">{children}</div>;
  };
});

describe('CarbonTrackingPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it('renders loading state when auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
    });

    render(<CarbonTrackingPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects to signin and clears loading when auth resolves with user === null', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(<CarbonTrackingPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    });
  });

  it('fetches user data and renders carbon tracking page when user is logged in', async () => {
    const mockUser = {
      _id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      monthlyCarbon: 15,
      totalScanned: 5,
      joinedAt: '2026-01-01',
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    const mockScoreData = {
      monthlyCarbon: 12.5,
      monthlyCarbonGoal: 40,
      totalScanned: 5,
      streakCount: 3,
      bestStreakCount: 5,
      scans: [],
      sustainabilityLevel: 'Good',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockScoreData),
    } as unknown as Response);

    render(<CarbonTrackingPage />);

    await waitFor(() => {
      expect(screen.getByText('Carbon Tracking')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/user/score');
  });

  it('renders failed state when data fetch fails for an authenticated user', async () => {
    const mockUser = {
      _id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      monthlyCarbon: 15,
      totalScanned: 5,
      joinedAt: '2026-01-01',
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
    } as unknown as Response);

    render(<CarbonTrackingPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });
  });
});
